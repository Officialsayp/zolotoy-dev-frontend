import { expect, test } from '@playwright/test'

/**
 * Foundation shell smoke checks (narrow scope). Service demo flows are added by
 * their own stages. Runs against the dev server in mock mode (no backend).
 */

test('overview shell renders with the mock data-source badge', async ({ page }) => {
  await page.goto('/demo/')
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await expect(page.getByText('Data source: Mock', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Auth' })).toBeVisible()
})

test('shortener route resolves inside the shell with the create form', async ({ page }) => {
  await page.goto('/demo/shortener')
  await expect(page.getByRole('heading', { name: 'URL Shortener', level: 2 })).toBeVisible()
  await expect(page.getByTestId('shortener-create-form')).toBeVisible()
})

test('unknown demo route pattern 404s at HTTP level (Worker policy)', async ({ request }) => {
  const response = await request.get('/demo/definitely-not-a-demo-route')
  expect(response.status()).toBe(404)
})

test('unknown public document URL serves the static 404 page', async ({ page }) => {
  const response = await page.goto('/definitely-not-a-route')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: '404 — Page not found' })).toBeVisible()
})

test('narrow viewport has no horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/demo/')
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasOverflow).toBe(false)
})
