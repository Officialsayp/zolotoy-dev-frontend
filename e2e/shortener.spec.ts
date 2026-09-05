import { expect, test } from '@playwright/test'

/**
 * URL Shortener critical browser flows (Prompt 04 TESTS §Playwright). Runs against
 * the mock dev server. The critical flow is create → detail → analytics: creating
 * a link lands on its detail, and populated-analytics links show click totals.
 */

const LINK_ACTIVE = '70000000-0000-4000-8000-000000000001'

test('dashboard renders the create form and a keyed link list', async ({ page }) => {
  await page.goto('/shortener')
  await expect(page.getByRole('heading', { name: 'URL Shortener' })).toBeVisible()
  await expect(page.getByTestId('shortener-create-form')).toBeVisible()
  // Default scenario seeds several links.
  await expect(page.getByTestId('shortener-list')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Details' }).first()).toBeVisible()
})

test('create -> detail: a new link shows its authoritative short URL', async ({ page }) => {
  await page.goto('/shortener')
  await page
    .locator('select.scenario-switcher__select')
    .selectOption('shortener-happy-active')

  await page.getByTestId('create-url').fill('https://example.com/catalog/trail/route')
  await page.getByTestId('create-submit').click()

  // A successful create navigates to the new link's detail using the response id.
  await page.waitForURL(/\/shortener\/70000000-/)
  await expect(page.getByRole('heading', { name: 'Link detail' })).toBeVisible()
  await expect(page.getByTestId('simulate-short-url')).toHaveAttribute(
    'href',
    'https://example.com/catalog/trail/route',
  )
  // The created link has no clicks yet in this scenario.
  await expect(page.getByText('No clicks yet')).toBeVisible()
})

test('analytics: a populated link shows total clicks, chart and table', async ({ page }) => {
  await page.goto('/shortener')
  await page
    .locator('select.scenario-switcher__select')
    .selectOption('shortener-analytics-populated')

  // Navigate through Vue Router so the in-memory demo scenario is preserved.
  await page
    .getByTestId('link-row-Ab3xP9qK')
    .getByRole('link', { name: 'Details' })
    .click()
  await page.waitForURL(new RegExp(`/shortener/${LINK_ACTIVE}$`))
  await expect(page.getByRole('heading', { name: 'Link detail' })).toBeVisible()
  await expect(page.getByTestId('shortener-analytics')).toBeVisible()
  await expect(page.getByText('total clicks')).toBeVisible()
  // Deterministic populated analytics must be non-zero.
  await expect(page.getByTestId('shortener-analytics')).toContainText('1,240')
})
