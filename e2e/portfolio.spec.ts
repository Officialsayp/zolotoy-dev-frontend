import { expect, test } from '@playwright/test'

/**
 * Public portfolio pages: content, hydration without console errors, no-JS
 * readability, both themes and horizontal-overflow checks. Runs against the
 * production-like wrangler dev server (prerendered documents + Worker).
 */

const PUBLIC_PAGES = ['/', '/architecture/', '/services/order/', '/services/auth/', '/services/notification/', '/services/url-shortener/']

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
    test(`switch ${docPath} EN→RU→EN preserves the semantic document`, async ({ page }) => {
      const ruPath = '/ru' + (docPath === '/' ? '/' : docPath)
      await page.goto(docPath)
      await page.getByRole('navigation', { name: 'Language' }).getByRole('link', { name: 'RU' }).click()
      await expect(page).toHaveURL(new RegExp(ruPath.replace(/\//g, '\\/') + '$'))
      await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
      await expect(page.getByRole('navigation', { name: 'Портфолио' }).getByRole('link', { name: 'Главная' })).toBeVisible()
      // Switch back.
      await page.getByRole('navigation', { name: 'Язык' }).getByRole('link', { name: 'EN' }).click()
      await expect(page).toHaveURL(new RegExp(docPath.replace(/\//g, '\\/') + '$'))
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
