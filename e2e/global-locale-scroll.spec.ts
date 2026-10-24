import { expect, test } from '@playwright/test'

/**
 * Cross-boundary regression: 12 prerendered documents and the demo SPA share
 * one manual language preference, without rewriting SEO canonical URLs.
 */
for (const [browserLanguage, expectedPath] of [
  ['ru-RU', '/ru/'],
  ['be-BY', '/ru/'],
  ['en-US', '/'],
  ['sr-RS', '/'],
] as const) {
  test(`first visit uses browser language ${browserLanguage}`, async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:8787',
      locale: browserLanguage,
    })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page).toHaveURL(`http://localhost:8787${expectedPath}`)
    await expect(page.locator('html')).toHaveAttribute('lang', expectedPath === '/ru/' ? 'ru' : 'en')
    expect(await page.evaluate(() => localStorage.getItem('zolotoy.locale'))).toBeNull()
    await context.close()
  })
}

test('manual RU choice remains across public pages, demo and refresh', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: /Language|Язык/ })
    .getByRole('link', { name: 'RU' }).click()
  await expect(page).toHaveURL(/\/ru\/$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  expect(await page.evaluate(() => localStorage.getItem('zolotoy.locale'))).toBe('ru')

  // Even an English document URL follows the saved explicit preference.
  await page.goto('/services/order/')
  await expect(page).toHaveURL(/\/ru\/services\/order\/$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')

  await page.goto('/demo/orders')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page.getByRole('heading', { name: 'Заказы', level: 1 })).toBeVisible()
  await page.getByRole('navigation', { name: /Language|Язык/ })
    .getByRole('link', { name: 'EN' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.goto('/architecture/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveURL(/\/architecture\/$/)
  expect(await page.evaluate(() => localStorage.getItem('zolotoy.locale'))).toBe('en')
})

test('exact pixel offset survives public document reload without anchor sections', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 680 })
  await page.goto('/services/order/')
  const before = await page.evaluate(() => {
    window.scrollTo({ top: 623, behavior: 'instant' })
    return window.scrollY
  })
  expect(before).toBeGreaterThan(300)
  await page.reload()
  await expect.poll(async () => page.evaluate(() => window.scrollY), {
    timeout: 5500,
  }).toBeGreaterThan(before - 5)
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(6)
})

test('exact pixel offset survives demo reload; route switches do not inherit it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 680 })
  await page.goto('/demo/orders')
  // Mock bootstrap and the route component are async. A scroll before the
  // Orders UI mounts would trivially be zero (no document height yet).
  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible()
  await expect.poll(async () => page.evaluate(() =>
    document.documentElement.scrollHeight - window.innerHeight), {
    timeout: 10_000,
  }).toBeGreaterThan(450)
  const before = await page.evaluate(() => {
    window.scrollTo({ top: 423, behavior: 'instant' })
    return window.scrollY
  })
  expect(before).toBeGreaterThan(180)
  await page.reload()
  await expect.poll(async () => page.evaluate(() => window.scrollY), {
    timeout: 5500,
  }).toBeGreaterThan(before - 5)
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(6)
  await page.goto('/demo/notifications')
  await expect(page).toHaveURL(/\/demo\/notifications\/?$/)
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeLessThan(35)
})

test('normal public navigation does not reuse another page scroll offset', async ({ page }) => {
  await page.goto('/services/order/')
  await page.evaluate(() => window.scrollTo({ top: 510, behavior: 'instant' }))
  await page.goto('/architecture/')
  await expect(page).toHaveURL(/\/architecture\/$/)
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeLessThan(40)
})
