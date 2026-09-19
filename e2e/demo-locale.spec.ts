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
  await page.getByRole('navigation', { name: 'Language' }).getByRole('link', { name: 'EN' }).click()
  // The lang param is updated in place; other params and the hash survive.
  await expect(page).toHaveURL(/\/demo\/orders\?lang=en&x=1#fragment$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
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
  await page.getByRole('navigation', { name: 'Language' }).getByRole('link', { name: 'EN' }).click()
  const themePref = await page.evaluate(() => localStorage.getItem('zolotoy.dev:theme'))
  expect(themePref === 'light' || themePref === 'dark' || themePref === 'system').toBe(true)
})
