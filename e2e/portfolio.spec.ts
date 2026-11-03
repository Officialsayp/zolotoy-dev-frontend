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

test('mobile public header is centered and floating brand returns to navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })

  for (const path of ['/', '/ru/']) {
    await page.goto(path)
    const header = page.locator('#portfolio-header')
    const brand = header.locator('.portfolio__brand')
    const nav = header.locator('.portfolio__nav')
    const controls = header.locator('.portfolio__controls')
    const floatingBrand = page.locator('.portfolio__floating-brand')

    // The brand, nav rows, and language/theme controls share the viewport center.
    for (const element of [brand, nav, controls]) {
      const box = await element.boundingBox()
      expect(box, `${path}: header element is visible`).not.toBeNull()
      expect(Math.abs(box!.x + box!.width / 2 - 195), `${path}: centered element`).toBeLessThan(2)
    }
    await expect(nav).toHaveCSS('justify-content', 'center')
    await expect(floatingBrand).toHaveCount(1)
    await expect(floatingBrand).toHaveAttribute('aria-hidden', 'true')
    await expect(floatingBrand.locator('svg')).toBeVisible()
    expect((await floatingBrand.textContent())?.trim()).toBe('')

    // On hydration the overlay icon occupies the original header icon position.
    const sourceIcon = brand.locator('svg')
    await expect(brand).toHaveClass(/portfolio__brand--motion-ready/)
    await expect.poll(async () => {
      const source = await sourceIcon.boundingBox()
      const floating = await floatingBrand.locator('svg').boundingBox()
      return Math.abs((source!.x + source!.width / 2) - (floating!.x + floating!.width / 2))
    }).toBeLessThan(2)

    const origin = (await floatingBrand.boundingBox())!
    await page.evaluate(() => window.scrollTo({ top: 80, behavior: 'instant' }))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(70)
    await expect.poll(async () => (await floatingBrand.boundingBox())!.x).toBeLessThan(origin.x - 10)
    const midpoint = (await floatingBrand.boundingBox())!
    await expect(floatingBrand).toHaveAttribute('aria-hidden', 'true')

    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
    await expect(floatingBrand).toHaveAttribute('aria-hidden', 'false')
    const docked = (await floatingBrand.boundingBox())!
    expect(docked.x).toBeLessThan(midpoint.x - 10)
    const initialY = docked.y
    await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'instant' }))
    await expect.poll(async () => (await floatingBrand.boundingBox())!.y).toBeCloseTo(initialY, 0)

    await floatingBrand.click()
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeLessThan(3)
    await expect(floatingBrand).toHaveAttribute('aria-hidden', 'true')
    await expect(nav).toBeVisible()
    await expect.poll(async () => (await floatingBrand.boundingBox())!.x).toBeCloseTo(origin.x, 0)
  }
})

test('floating glyph respects reduced motion and restores the header', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 700 })
  await page.goto('/ru/services/order/')

  const glyph = page.locator('.portfolio__floating-brand')
  await expect(glyph).toHaveAttribute('aria-hidden', 'true')
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }))
  await expect(glyph).toHaveAttribute('aria-hidden', 'false')
  await glyph.click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(3)
  await expect(glyph).toHaveAttribute('aria-hidden', 'true')
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
