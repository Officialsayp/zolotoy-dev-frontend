import { expect, test } from '@playwright/test'

/**
 * R2-01: the degraded mock scenario flips /health/live|ready to 503, and the
 * shell's health badges must follow the scenario switch promptly — not at the
 * next 30s polling tick. In mock mode system health IS scenario-scoped data.
 */

test('overview health badges follow the degraded scenario switch immediately', async ({ page }) => {
  await page.goto('/demo/')
  // Scoped to the service cards: the scenario switcher's own <option> "Degraded"
  // would otherwise match too.
  const badges = page.locator('.service-card')
  await expect(badges.getByText('Simulated', { exact: true })).toHaveCount(4)

  // degraded makes every mock /health/* answer 503 -> badges flip to Degraded
  // without waiting for the 30s polling interval.
  await page.locator('select.scenario-switcher__select').selectOption('degraded')
  await expect(badges.getByText('Degraded', { exact: true })).toHaveCount(4, { timeout: 5_000 })
  await expect(badges.getByText('Simulated', { exact: true })).toHaveCount(0)

  // Back to the default baseline: healthy again, just as promptly.
  await page.locator('select.scenario-switcher__select').selectOption('default')
  await expect(badges.getByText('Simulated', { exact: true })).toHaveCount(4, { timeout: 5_000 })
  await expect(badges.getByText('Degraded', { exact: true })).toHaveCount(0)
})
