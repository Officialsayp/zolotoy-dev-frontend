import { expect, test } from '@playwright/test'

/**
 * Notification critical browser flows (Prompt 03 TESTS §Playwright). Runs against
 * the mock dev server. The default scenario seeds several delivery jobs visible
 * on /notifications, including a terminal `dead` job whose manual retry must
 * move it to `sent` through the confirmation dialog.
 */

const JOB_ID_PAID_SENT = '60000000-0000-4000-8000-000000000001'
const JOB_ID_MANUAL_RETRY = '60000000-0000-4000-8000-000000000007'

test('notification list renders seeded jobs masked and links to a detail page', async ({ page }) => {
  await page.goto('/notifications')
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()

  // A sent email job is seeded in the default scenario.
  const row = page.getByRole('row', { name: /Sent/ }).first()
  await expect(row).toBeVisible()
  // Recipient is masked in the list, never the raw address on its own line.
  await expect(page.getByText('buyer@example.com', { exact: true })).toHaveCount(0)

  await page.getByRole('link', { name: new RegExp(JOB_ID_PAID_SENT.slice(-4)) }).click()
  await expect(page).toHaveURL(/\/notifications\/60000000-0000-4000-8000-000000000001/)
  await expect(page.getByRole('heading', { name: 'Notification detail' })).toBeVisible()
})

test('dead -> confirmation -> retry -> sent (operational retry flow)', async ({ page }) => {
  await page.goto('/notifications')

  // Terminal `dead` job is already seeded in the default scenario. A full
  // page.goto to the detail reloads the mock baseline, but this job is present
  // in default — so no scenario switch is needed (in-memory scenarios do not
  // survive a reload anyway).
  await page.goto(`/notifications/${JOB_ID_MANUAL_RETRY}`)

  await expect(page.getByTestId('retry-button')).toBeVisible()
  await expect(page.getByText('Dead', { exact: true }).first()).toBeVisible()
  // Attempt history shows one failed attempt, order shown by attempt_no.
  await expect(page.getByText('PROVIDER_5XX')).toBeVisible()

  // Manual retry is guarded by a confirmation that states the crash-window risk.
  await page.getByTestId('retry-button').click()
  await expect(page.getByRole('heading', { name: 'Retry delivery?' })).toBeVisible()

  // The retry succeeds and the server state (not a local patch) becomes sent.
  await page.getByRole('button', { name: 'Retry now' }).click()
  await expect(page.getByText('Sent', { exact: true }).first()).toBeVisible()
  // The retry button disappears once the job is terminal and non-retryable.
  await expect(page.getByTestId('retry-button')).toHaveCount(0)
})
