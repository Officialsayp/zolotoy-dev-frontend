import { expect, test, type Page } from '@playwright/test'

/**
 * R2-02: the auth mock rebuilds its store on every scenario switch (issued
 * access/refresh tokens are wiped), so a logged-in session belongs to the
 * previous baseline. The demo contract keeps the client session until the
 * normal 401 -> refresh -> verdict contract proves it dead (no special logout
 * rule) — but cached auth queries (me 60s, sessions 30s) must not keep serving
 * the previous baseline's data. Scenario switches therefore reset auth queries
 * like every other mock-scoped root: an active auth query refetches, gets the
 * rebuilt store's 401, and tears the session down with the standard 'expired'
 * reason; on pages without auth queries nothing happens until the next call.
 */

const USER_EMAIL = 'user@zolotoy.dev'
const PASSWORD = 'DemoPassword!123'
const EXPIRED_BANNER = 'Your session expired. Sign in again.'

async function signInAsUser(page: Page): Promise<void> {
  await page.goto('/demo/auth/login')
  await page.locator('select.scenario-switcher__select').selectOption('auth-active-user')
  await page.getByTestId('auth-email').fill(USER_EMAIL)
  await page.getByTestId('auth-password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/demo\/auth\/profile/)
}

test('switching the auth baseline while on the profile ends the stale session through the normal contract', async ({
  page,
}) => {
  await signInAsUser(page)
  await expect(page.getByText(USER_EMAIL)).toBeVisible()

  // auth-active-admin rebuilds the mock auth store: the previous session no
  // longer exists there. The cached me query must not keep presenting the old
  // baseline — it refetches, receives 401, and the standard contract tears the
  // session down to sign-in with the 'expired' reason (never 'reuse-detected').
  await page.locator('select.scenario-switcher__select').selectOption('auth-active-admin')
  await page.waitForURL(/\/demo\/auth\/login/)
  await expect(page.getByText(EXPIRED_BANNER)).toBeVisible()
})

test('switching a service scenario keeps the session until the next auth call', async ({ page }) => {
  await signInAsUser(page)

  // Scenario switch on a page without auth queries: no auth call happens, the
  // session display stays (lazy contract — like a token the backend has just
  // invalidated), and the orders demo keeps working.
  await page.getByRole('link', { name: 'Orders' }).click()
  await page.waitForURL(/\/demo\/orders/)
  await page.locator('select.scenario-switcher__select').selectOption('orders-prepaid')
  await expect(page.getByText(USER_EMAIL)).toBeVisible() // badge/session untouched
  await expect(page).toHaveURL(/\/demo\/orders/)

  // The next auth call meets the rebuilt store: 401 -> refresh 401 -> teardown.
  // The sidebar 'Auth' item is the no-API overview page (session-store data
  // only), so it never fires the call — the Profile page is what actually does
  // (its me query was rewound to pending by the switch). Relying on the
  // overview was race-dependent: the pass depended on the profile-phase me
  // fetch landing after the switch.
  await page.getByRole('banner').getByRole('link', { name: 'Profile' }).click()
  await page.waitForURL(/\/demo\/auth\/login/)
  await expect(page.getByText(EXPIRED_BANNER)).toBeVisible()
})
