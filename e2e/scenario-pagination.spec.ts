import { expect, test, type Page } from '@playwright/test'

/**
 * Scenario switch must restart keyset pagination in every list module (review
 * finding #1). Page-local cursors are opaque tokens of the current mock
 * baseline: after a scenario switch the same cursor would target a foreign
 * page, so switching must land on page 1 of the new scenario with exactly one
 * first-page list request (no stale-cursor request, no double fetch).
 *
 * Default baselines: orders seeds 7 orders (page 2 exists at limit 5), the
 * shortener dashboard reaches a second page after 5 created links (4 seeded +
 * 5 > limit 8). Notifications cannot page (6 jobs < limit 10), so its check
 * asserts the same-switch first-page refetch and the absence of stale-cursor
 * requests instead.
 */

const ORDER_PAYMENT_FAILED = '10000000-0000-4000-8000-000000000003' // page-2-only row
const ORDER_PREPAID_AWAITING = '10000000-0000-4000-8000-000000000002'

function trackListRequests(page: Page, path: string): string[] {
  const urls: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'GET' && request.url().includes(path)) urls.push(request.url())
  })
  return urls
}

test('orders: page 2 -> scenario switch -> page 1 of the new scenario', async ({ page }) => {
  await page.goto('/demo/orders')
  const ordersUrls = trackListRequests(page, '/api/v1/orders')
  await expect(page.getByRole('link', { name: new RegExp(ORDER_PAYMENT_FAILED) })).toHaveCount(0)

  // Default seeds 7 orders at limit 5: advance to page 2 (the two oldest).
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('link', { name: new RegExp(ORDER_PAYMENT_FAILED) })).toBeVisible()
  const previous = page.getByRole('button', { name: 'Previous' })
  await expect(previous).toBeEnabled()
  ordersUrls.length = 0

  // orders-prepaid seeds a different baseline; the switch must restart on its
  // first page: the payment-failed order is gone, Previous is back to disabled.
  await page.locator('select.scenario-switcher__select').selectOption('orders-prepaid')
  await expect(page.getByRole('link', { name: new RegExp(ORDER_PREPAID_AWAITING) })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(ORDER_PAYMENT_FAILED) })).toHaveCount(0)
  await expect(previous).toBeDisabled()

  // Exactly one first-page request: no stale-cursor fetch, no double fetch.
  const cursorRequests = ordersUrls.filter((url) => url.includes('cursor='))
  expect(ordersUrls.length).toBe(1)
  expect(cursorRequests).toEqual([])
})

test('orders: page 1 -> scenario switch -> first page refetches exactly once', async ({ page }) => {
  await page.goto('/demo/orders')
  const ordersUrls = trackListRequests(page, '/api/v1/orders')
  await expect(page.getByRole('link', { name: new RegExp(ORDER_PREPAID_AWAITING) })).toBeVisible()
  ordersUrls.length = 0

  // The first-page key does not change on the switch, so the page must refresh
  // it explicitly — a missing refetch would keep serving the old baseline.
  await page.locator('select.scenario-switcher__select').selectOption('orders-prepaid')
  await expect(page.getByRole('link', { name: new RegExp(ORDER_PREPAID_AWAITING) })).toBeVisible()
  expect(ordersUrls.length).toBe(1)
  expect(ordersUrls.every((url) => !url.includes('cursor='))).toBe(true)
})

test('shortener: page 2 -> scenario switch -> page 1 of the new scenario', async ({ page }) => {
  await page.goto('/demo/shortener')
  const linksUrls = trackListRequests(page, '/api/v1/links')

  // Grow the list past the 8-per-page limit: create 5 links. A successful
  // create lands on the detail page; go back to the dashboard each time.
  for (let i = 0; i < 5; i += 1) {
    await page.getByTestId('create-url').fill(`https://example.com/page-${i}`)
    await page.getByTestId('create-submit').click()
    await page.waitForURL(/\/demo\/shortener\/[0-9a-f-]{36}$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/demo\/shortener\/?$/)
  }

  await expect(page.getByTestId('create-url')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  const previous = page.getByRole('button', { name: 'Previous' })
  await expect(previous).toBeEnabled()
  linksUrls.length = 0

  // shortener-happy-active seeds exactly one link; created links belong to the
  // previous baseline and must not survive the switch.
  await page.locator('select.scenario-switcher__select').selectOption('shortener-happy-active')
  await expect(page.getByTestId('link-row-Ab3xP9qK')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
  await expect(previous).toBeDisabled()

  expect(linksUrls.length).toBe(1)
  expect(linksUrls.every((url) => !url.includes('cursor='))).toBe(true)
})

test('notifications: scenario switch refetches the first page without cursor requests', async ({
  page,
}) => {
  await page.goto('/demo/notifications')
  const notificationsUrls = trackListRequests(page, '/api/v1/notifications')
  await expect(page.locator('.notification-list__card')).toHaveCount(6)
  notificationsUrls.length = 0

  await page.locator('select.scenario-switcher__select').selectOption('notifications-happy-sent')
  await expect(page.locator('.notification-list__card')).toHaveCount(1)
  await expect(page.locator('.notification-list__card').filter({ hasText: 'Sent' })).toBeVisible()

  expect(notificationsUrls.length).toBe(1)
  expect(notificationsUrls.every((url) => !url.includes('cursor='))).toBe(true)
})
