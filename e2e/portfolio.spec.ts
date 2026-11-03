import { expect, test, type Page } from '@playwright/test'

/**
 * Public portfolio pages: content, hydration without console errors, no-JS
 * readability, both themes and horizontal-overflow checks. Runs against the
 * production-like wrangler dev server (prerendered documents + Worker).
 */

const PUBLIC_PAGES = ['/', '/architecture/', '/services/order/', '/services/auth/', '/services/notification/', '/services/url-shortener/']

/**
 * Exact full-URL comparison with auto-retry: expected URL is built from the
 * trusted playwright.config.ts baseURL (never from page.url()) via the URL
 * API, so protocol, host, port, pathname, query and hash must all match.
 */
function expectFullUrl(page: Page, path: string, baseURL: string): Promise<void> {
  return expect(page).toHaveURL(new URL(path, baseURL).href)
}

for (const path of PUBLIC_PAGES) {
  test(`public page ${path} renders with one H1 and no console errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto(path)
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
    await expect(h1).toBeVisible()
    // Hydration completed without errors.
    await page.waitForTimeout(300)
    expect(errors).toEqual([])
  })
}

test('public navigation works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Go Backend/ })).toBeVisible()
  await page.getByRole('navigation', { name: 'Portfolio' }).getByRole('link', { name: 'Architecture' }).click()
  await expect(page.getByRole('heading', { name: 'System Architecture' })).toBeVisible()
  // Case-study navigation through ordinary anchors.
  await page.getByRole('navigation', { name: 'Portfolio' }).getByRole('link', { name: 'Order' }).click()
  await expect(page.getByRole('heading', { name: 'Order Service' })).toBeVisible()
  await context.close()
})

test('theme toggle keeps working on public pages in both locales', async ({ page }) => {
  await page.goto('/')
  const toggle = page.getByRole('button', { name: /Theme:/ })
  await expect(toggle).toBeVisible()
  await toggle.click()
  await expect(toggle).toHaveAccessibleDescription(/Theme:/)
  // RU page keeps the localized label with the same semantics.
  await page.goto('/ru/')
  const toggleRu = page.getByRole('button', { name: /Тема:/ })
  await expect(toggleRu).toBeVisible()
  await toggleRu.click()
  await expect(toggleRu).toHaveAccessibleDescription(/Тема:/)
})

test('portfolio pages have no horizontal overflow at narrow widths', async ({ page }) => {
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 800 })
    for (const path of PUBLIC_PAGES) {
      await page.goto(path)
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(hasOverflow, `${path} overflows at ${width}px`).toBe(false)
    }
  }
})

test('mobile header is centered and logo completes travel after scrolling stops', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  for (const path of ['/', '/ru/']) {
    await page.goto(path)
    const header = page.locator('#portfolio-header')
    const brand = header.locator('.portfolio__brand')
    const source = brand.locator('svg')
    const nav = header.locator('.portfolio__nav')
    const floating = page.locator('.portfolio__floating-brand')
    for (const element of [brand, nav, header.locator('.portfolio__controls')]) {
      const rect = await element.boundingBox()
      expect(rect).not.toBeNull()
      expect(Math.abs(rect!.x + rect!.width / 2 - 195)).toBeLessThan(2)
    }
    await expect(nav).toHaveCSS('justify-content', 'center')
    await expect(source).toHaveCSS('opacity', '1')
    await expect(floating).toHaveCSS('opacity', '0')
    expect((await floating.textContent())?.trim()).toBe('')

    const bottom = await source.evaluate(el => el.getBoundingClientRect().bottom)
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.ceil(bottom - 18 + 4))

    // Scroll is stopped while the menu remains partially visible.
    // The time-based motion still reaches one of the two final positions.
    await expect(floating).toHaveAttribute('aria-hidden', 'false', { timeout: 3000 })
    await expect(floating).toHaveCSS('opacity', '1')
    await expect(source).toHaveCSS('opacity', '0')
    const docked = (await floating.boundingBox())!
    expect(docked.x).toBeGreaterThanOrEqual(0)
    expect(docked.x).toBeLessThan(40)
    await page.waitForTimeout(140)
    const settled = (await floating.boundingBox())!
    expect(Math.abs(settled.x - docked.x)).toBeLessThan(0.5)
    expect(Math.abs(settled.y - docked.y)).toBeLessThan(0.5)

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await expect(source).toHaveCSS('opacity', '1', { timeout: 3000 })
    await expect(floating).toHaveCSS('opacity', '0')
    await expect(nav).toBeVisible()
  }
})

test('logo reverses mid-flight without a gap or an unfinished intermediate state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await page.goto('/ru/')
  const source = page.locator('.portfolio__brand svg')
  const floating = page.locator('.portfolio__floating-brand')
  const bottom = await source.evaluate(el => el.getBoundingClientRect().bottom)
  const trigger = Math.ceil(bottom - 18 + 7)
  const expectOneVisual = async () => {
    const sum = await page.evaluate(() => {
      const source = document.querySelector<SVGSVGElement>('.portfolio__brand svg')!
      const floating = document.querySelector<HTMLAnchorElement>('.portfolio__floating-brand')!
      return Number(getComputedStyle(source).opacity) + Number(getComputedStyle(floating).opacity)
    })
    expect(sum).toBeGreaterThanOrEqual(0.99)
    expect(sum).toBeLessThanOrEqual(1.01)
  }
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), trigger)
  await page.waitForTimeout(55)
  await expectOneVisual()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(55)
  await expectOneVisual()
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), trigger)
  await expect(floating).toHaveAttribute('aria-hidden', 'false', { timeout: 3000 })
  await expectOneVisual()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(source).toHaveCSS('opacity', '1', { timeout: 3000 })
  await expect(floating).toHaveCSS('opacity', '0')
  await expectOneVisual()
})

test('docked logo returns smoothly to the header on the same public document', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await page.goto('/ru/services/order/')
  const source = page.locator('.portfolio__brand svg')
  const floating = page.locator('.portfolio__floating-brand')
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
  await expect(floating).toHaveAttribute('aria-hidden', 'false', { timeout: 3000 })
  await floating.click()
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeLessThan(3)
  await expect(source).toHaveCSS('opacity', '1', { timeout: 3000 })
  await expect(floating).toHaveCSS('opacity', '0')
  await expect(page.locator('#portfolio-header .portfolio__nav')).toBeVisible()
  await expect(page).toHaveURL('/ru/services/order/')
})

test('floating logo supports keyboard return and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 700 })
  await page.goto('/ru/services/order/')
  const source = page.locator('.portfolio__brand svg')
  const floating = page.locator('.portfolio__floating-brand')
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }))
  await expect(floating).toHaveAttribute('aria-hidden', 'false')
  await floating.focus()
  await expect(floating).toBeFocused()
  await page.keyboard.press('Enter')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(3)
  await expect(source).toHaveCSS('opacity', '1')
  await expect(floating).toHaveAttribute('aria-hidden', 'true')
})

test('rapid fling and scrollend leave the floating logo at the fixed dock', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 720 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })

  for (const path of ['/', '/ru/']) {
    await page.goto(path)
    const source = page.locator('.portfolio__brand svg')
    const floating = page.locator('.portfolio__floating-brand')
    await expect(floating).toHaveCount(1)

    // A real flick generates multiple fast scroll updates *after* touchend.
    // Emulate coalesced momentum updates, then deliver the authoritative end.
    for (const y of [80, 240, 610, 1200, 890, 1400]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
    }
    await page.evaluate(() => document.dispatchEvent(new Event('scrollend')))
    await expect(floating).toHaveAttribute('aria-hidden', 'false', { timeout: 3000 })
    await expect(source).toHaveCSS('opacity', '0')
    await expect(floating).toHaveCSS('opacity', '1')
    await expect(floating).toHaveCSS('transform', 'none')
    const docked = (await floating.boundingBox())!

    // No stale translate3d() should survive an idle spell or a scrollend.
    await page.waitForTimeout(250)
    const settled = (await floating.boundingBox())!
    expect(Math.abs(settled.x - docked.x)).toBeLessThan(1)
    expect(Math.abs(settled.y - docked.y)).toBeLessThan(1)

    for (const y of [1150, 600, 290, 130, 270, 0]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
    }
    await page.evaluate(() => document.dispatchEvent(new Event('scrollend')))
    await expect(source).toHaveCSS('opacity', '1', { timeout: 3000 })
    await expect(floating).toHaveCSS('opacity', '0')
    await expect(floating).toHaveAttribute('aria-hidden', 'true')
  }
})

test('Safari-style out-of-range scrollY cannot poison the cached logo position', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 720 })
  await page.goto('/ru/')
  const source = page.locator('.portfolio__brand svg')
  const floating = page.locator('.portfolio__floating-brand')

  // Simulate Safari exposing overscroll while the compositor has not moved
  // layout rects. Restore the real property descriptor after each sample.
  const emulateScrollY = async (reportedY: number): Promise<void> => {
    await page.evaluate((y) => {
      const original = Object.getOwnPropertyDescriptor(window, 'scrollY')
      if (!original?.configurable) throw new Error('Cannot emulate scrollY in this browser')
      try {
        Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y })
        window.dispatchEvent(new Event('scroll'))
        document.dispatchEvent(new Event('scrollend'))
      } finally {
        Object.defineProperty(window, 'scrollY', original)
      }
    }, reportedY)
  }

  await emulateScrollY(-120)
  await expect(source).toHaveCSS('opacity', '1')
  // Out-of-range positive value must be clamped rather than persisted as
  // a bogus source-document coordinate during scrollend.
  await emulateScrollY(100000)
  await page.evaluate(() => document.dispatchEvent(new Event('scrollend')))
  await expect(source).toHaveCSS('opacity', '1', { timeout: 3000 })
  await expect(floating).toHaveCSS('opacity', '0')

  // A normal scroll still moves to the dock and returns afterwards.
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
  await expect(floating).toHaveAttribute('aria-hidden', 'false', { timeout: 3000 })
  await expect(floating).toHaveCSS('transform', 'none')
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(source).toHaveCSS('opacity', '1', { timeout: 3000 })
})

test('viewport changes during a flick retain a fixed final icon position', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 720 })
  await page.goto('/ru/')
  const floating = page.locator('.portfolio__floating-brand')
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }))
  await page.setViewportSize({ width: 320, height: 640 })
  await page.evaluate(() => document.dispatchEvent(new Event('scrollend')))
  await expect(floating).toHaveAttribute('aria-hidden', 'false', { timeout: 3000 })
  await expect(floating).toHaveCSS('transform', 'none')
  const rect = (await floating.boundingBox())!
  expect(rect.x).toBeGreaterThanOrEqual(0)
  expect(rect.x + rect.width).toBeLessThan(320)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(page.locator('.portfolio__brand svg')).toHaveCSS('opacity', '1', { timeout: 3000 })
})

test('case-study TOC links scroll to rendered sections', async ({ page }) => {
  await page.goto('/services/order/')
  const toc = page.getByRole('navigation', { name: 'Case study sections' })
  await expect(toc).toBeVisible()
  await toc.getByRole('link', { name: 'Evidence' }).click()
  await expect(page.getByRole('heading', { name: 'Evidence', level: 2 })).toBeVisible()
})

test.describe('language switching (public)', () => {
  const PAGES = ['/', '/architecture/', '/services/auth/']

  for (const docPath of PAGES) {
    test(`switch ${docPath} EN→RU→EN preserves the semantic document`, async ({ page, baseURL }) => {
      const ruPath = '/ru' + (docPath === '/' ? '/' : docPath)
      await page.goto(docPath)
      await page.getByRole('navigation', { name: /Language|Язык/ }).getByRole('link', { name: 'RU' }).click()
      await expectFullUrl(page, ruPath, baseURL!)
      await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
      await expect(page.getByRole('navigation', { name: 'Портфолио' }).getByRole('link', { name: 'Главная' })).toBeVisible()
      // Switch back.
      await page.getByRole('navigation', { name: 'Язык' }).getByRole('link', { name: 'EN' }).click()
      await expectFullUrl(page, docPath, baseURL!)
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    })
  }

  test('RU pages work without JavaScript (anchors only)', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/ru/')
    await expect(page.getByRole('heading', { name: /Go Backend/ })).toBeVisible()
    await page.getByRole('navigation', { name: 'Портфолио' }).getByRole('link', { name: 'Архитектура' }).click()
    await expect(page.getByRole('heading', { name: 'Архитектура системы' })).toBeVisible()
    await context.close()
  })
})

test.describe('primary button hover regression (section 32)', () => {
  const combos: [string, 'dark' | 'light'][] = [
    ['/', 'dark'],
    ['/', 'light'],
    ['/ru/', 'dark'],
    ['/ru/', 'light'],
  ]
  for (const [docPath, theme] of combos) {
    test(`primary button text stays readable in ${docPath} ${theme}`, async ({ page }) => {
      await page.goto(docPath)
      // Set explicit theme via localStorage (init script runs before paint).
      await page.evaluate((t) => localStorage.setItem('zolotoy.dev:theme', t), theme)
      await page.reload()
      const primary = page.locator('.portfolio-btn--primary').first()
      await expect(primary).toBeVisible()
      const colors = await primary.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { text: cs.color, bg: cs.backgroundColor }
      })
      expect(colors.text).not.toBe(colors.bg)
      // Hover state keeps text readable (CSS :hover keeps accent-contrast).
      await primary.hover()
      const hoverColors = await primary.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { text: cs.color, bg: cs.backgroundColor }
      })
      expect(hoverColors.text).not.toBe(hoverColors.bg)
    })
  }
})
