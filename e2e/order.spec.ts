import { expect, test } from '@playwright/test'

/**
 * Order O1 demo flow — pay-on-receipt lifecycle, against the mock dev server.
 * The default scenario seeds:
 *   ORDER_RECEIPT_UNPAID = 10000000-0000-4000-8000-000000000001
 *     status=delivered, payment_status=awaiting, pay_on_receipt_online.
 * Anonymous mock viewer resolves to the buyer role, so Pay is available.
 */

const RECEIPT_UNPAID = '10000000-0000-4000-8000-000000000001'

test('order list renders seeded rows and links to detail', async ({ page }) => {
  await page.goto('/orders')
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Mechanical Keyboard/ }).first()).toBeVisible()
})

test('pay-on-receipt: buyer pays a delivered order and the payment becomes paid', async ({
  page,
}) => {
  await page.goto(`/orders/${RECEIPT_UNPAID}`)

  await expect(page.getByText('Pay on receipt (online)')).toBeVisible()
  // Still awaiting payment on load.
  await expect(page.getByText('Awaiting payment', { exact: true })).toBeVisible()

  const payButton = page.getByRole('button', { name: 'Pay' })
  await expect(payButton).toBeEnabled()
  await payButton.click()

  // After a successful mock payment the order re-fetches as paid.
  await expect(page.getByText('Paid', { exact: true })).toBeVisible()
  await expect(page.getByText('Awaiting payment', { exact: true })).toHaveCount(0)
})

test('create order posts a selected item and lands on the new order detail', async ({ page }) => {
  await page.goto('/orders/new')

  await page.getByLabel('Buyer ID').fill('11111111-1111-4111-8111-111111111111')
  await page.getByLabel(/product/i).first().fill('20000000-0000-4000-8000-0000000000b1')
  await page.getByLabel(/name/i).first().fill('Mechanical Keyboard')
  await page.getByLabel(/quantity/i).first().fill('1')
  await page.getByLabel(/unit price/i).first().fill('499000')

  await page.getByLabel(/payment method/i).selectOption('prepaid')
  await page.getByLabel(/delivery address/i).fill('Moscow, Test st 1')

  await page.getByRole('button', { name: /create order/i }).click()

  // New order starts at created / awaiting payment.
  await expect(page.getByText('Created', { exact: true })).toBeVisible()
  await expect(page.getByText('Awaiting payment', { exact: true })).toBeVisible()
})
