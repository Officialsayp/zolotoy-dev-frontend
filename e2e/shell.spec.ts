import { expect, test } from '@playwright/test'

/**
 * Foundation shell smoke checks (narrow scope). Service demo flows are added by
 * their own stages. Runs against the dev server in mock mode (no backend).
 */

test('overview shell renders with a visible MOCK badge', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await expect(page.getByText('MOCK', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Auth' })).toBeVisible()
})

test('shortener route resolves inside the shell with the create form', async ({ page }) => {
  await page.goto('/shortener')
  await expect(page.getByRole('heading', { name: 'URL Shortener' })).toBeVisible()
  await expect(page.getByTestId('shortener-create-form')).toBeVisible()
})

test('unknown route shows the 404 page', async ({ page }) => {
  await page.goto('/definitely-not-a-route')
  await expect(page.getByText('404', { exact: true })).toBeVisible()
})

test('narrow viewport has no horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasOverflow).toBe(false)
})
