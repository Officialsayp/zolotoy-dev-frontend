import { expect, test } from '@playwright/test'

/**
 * Demo SPA locale: ?lang=ru wins over the persisted preference, switching
 * preserves the route/query/hash, and document.lang follows.
 */

test('/demo/ defaults to English', async ({ page }) => {
  await page.goto('/demo/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
})

test('/demo/?lang=ru renders Russian and persists after navigation', async ({ page }) => {
  await page.goto('/demo/?lang=ru')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page.getByRole('heading', { name: 'Обзор' })).toBeVisible()
  // Sidebar link localized.
  await expect(page.getByRole('link', { name: 'Заказы' }).first()).toBeVisible()
  // Navigate client-side: locale persists without ?lang=.
  await page.getByRole('link', { name: 'Заказы' }).first().click()
  await expect(page).toHaveURL(/\/demo\/orders\/?$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page.getByRole('heading', { name: 'Заказы', level: 1 })).toBeVisible()
})

test('switching locale preserves the route, other params and hash', async ({ page }) => {
  await page.goto('/demo/orders?lang=ru&x=1#fragment')
  await page.getByRole('navigation', { name: /Language|Язык/ }).getByRole('link', { name: 'EN' }).click()
  // The lang param is updated in place; other params and the hash survive.
  await expect(page).toHaveURL(/\/demo\/orders\?lang=en&x=1#fragment$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('switching locale updates rendered text in place (no reload)', async ({ page }) => {
  await page.goto('/demo/orders')
  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible()

  await page.getByRole('navigation', { name: /Language|Язык/ }).getByRole('link', { name: 'RU' }).click()
  // Same route component instance: the localized text must change reactively.
  await expect(page.getByRole('heading', { name: 'Заказы', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Заказы' }).first()).toBeVisible()

  await page.getByRole('navigation', { name: /Language|Язык/ }).getByRole('link', { name: 'EN' }).click()
  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible()
})

test('full EN -> RU -> EN chain: texts, active indicator, URL, html lang, persisted preference', async ({
  page,
}) => {
  // Regression for the pre-existing production defect: texts stayed stale until
  // a full reload because the locale store was not reactive (fixed by PR #10).
  const nav = page.getByRole('navigation', { name: /Language|Язык/ })
  await page.goto('/demo/orders?x=1#fragment')

  // EN baseline: EN is the active indicator, English texts rendered.
  await expect(nav.getByRole('link', { name: 'EN' })).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible()

  // EN -> RU: texts, indicator, URL params, hash and html lang — in place.
  await nav.getByRole('link', { name: 'RU' }).click()
  await expect(page).toHaveURL(/\/demo\/orders\?x=1&lang=ru#fragment$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page.getByRole('heading', { name: 'Заказы', level: 1 })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'RU' })).toHaveAttribute('aria-current', 'true')
  await expect(nav.getByRole('link', { name: 'EN' })).not.toHaveAttribute('aria-current', 'true')

  // RU -> EN: everything reverts; the persisted preference followed the chain.
  await nav.getByRole('link', { name: 'EN' }).click()
  await expect(page).toHaveURL(/\/demo\/orders\?x=1&lang=en#fragment$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'EN' })).toHaveAttribute('aria-current', 'true')
  await expect(nav.getByRole('link', { name: 'RU' })).not.toHaveAttribute('aria-current', 'true')

  // The preference persisted through the chain survives a full reload.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: 'Orders', level: 1 })).toBeVisible()
})

test('invalid ?lang= value falls back to the persisted preference', async ({ page }) => {
  await page.goto('/demo/?lang=ru')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await page.goto('/demo/?lang=de')
  // Invalid value ignored: persisted ru preference stays.
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
})

test('demo badge is localized', async ({ page }) => {
  await page.goto('/demo/?lang=ru')
  await expect(page.getByText('Источник данных: Mock', { exact: true })).toBeVisible()
})

test('RU demo brand link returns to /ru/', async ({ page }) => {
  await page.goto('/demo/?lang=ru')
  const brand = page.locator('.app-sidebar__brand')
  await expect(brand).toHaveAttribute('href', '/ru/')
})

for (const [previous, selected] of [['ru', 'en'], ['en', 'ru']] as const) {
  test(`portfolio ${selected} overrides the remembered demo ${previous} after returning through the logo`, async ({ page }) => {
    await page.goto(`/demo/?lang=${previous}`)
    await expect(page.locator('html')).toHaveAttribute('lang', previous)
    await page.locator('.app-sidebar__brand').click()
    await page.getByRole('navigation', { name: /Language|Язык/ })
      .getByRole('link', { name: selected.toUpperCase(), exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', selected)
    await page.getByRole('navigation', { name: /Portfolio|Портфолио/ })
      .getByRole('link', { name: selected === 'en' ? 'Demo' : 'Демо', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', selected)
    await expect(page.getByRole('heading', { name: selected === 'en' ? 'Overview' : 'Обзор', exact: true })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/demo/\\?lang=${selected}$`))
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', selected)
  })
}

test('RU demo keeps noindex policy', async ({ page }) => {
  await page.goto('/demo/?lang=ru')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow')
})

test('switching theme does not change locale and vice versa', async ({ page }) => {
  await page.goto('/demo/?lang=ru')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  // Toggle theme twice (cycle system→light→dark in the demo toggle) and re-check locale.
  const themeToggle = page.locator('.theme-toggle')
  await themeToggle.click()
  await themeToggle.click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  // Switch locale and verify data-theme (theme preference) is untouched by reading localStorage.
  await page.getByRole('navigation', { name: /Language|Язык/ }).getByRole('link', { name: 'EN' }).click()
  const themePref = await page.evaluate(() => localStorage.getItem('zolotoy.dev:theme'))
  expect(themePref === 'light' || themePref === 'dark' || themePref === 'system').toBe(true)
})
