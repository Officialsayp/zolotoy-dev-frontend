import { expect, test } from '@playwright/test'

/**
 * Auth → critical browser flow (Prompt 02 TESTS §Playwright). Runs against the
 * mock dev server. The default scenario is anonymous, so protected routes
 * redirect to sign-in; a normal-user login reaches /auth/profile and logout
 * clears the session. Admin RBAC is exercised by switching the demo scenario.
 */

const USER_EMAIL = 'user@zolotoy.dev'
const ADMIN_EMAIL = 'admin@zolotoy.dev'
const PASSWORD = 'DemoPassword!123'

test('anonymous visitor on a protected route is redirected to sign-in', async ({ page }) => {
  await page.goto('/auth/profile')
  await expect(page).toHaveURL(/\/auth\/login/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('normal user signs in, sees the profile, and signs out', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByTestId('auth-email').fill(USER_EMAIL)
  await page.getByTestId('auth-password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Session bootstrap + /me resolves the user; profile renders.
  await page.waitForURL(/\/auth\/profile/)
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
  await expect(page.getByText(USER_EMAIL)).toBeVisible()
  await expect(page.getByText('user', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL(/\/auth\/login/)
})

test('invalid credentials show a generic error, never account details', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByTestId('auth-email').fill('nobody@zolotoy.dev')
  await page.getByTestId('auth-password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByTestId('auth-error')).toContainText('Invalid email or password.')
  await expect(page.getByTestId('auth-error')).not.toContainText('nobody@zolotoy.dev')
  await expect(page.getByTestId('auth-error')).not.toContainText('wrong-password')
})

test('admin scenario reaches the admin demo; normal user gets backend 403 UX', async ({ page }) => {
  await page.goto('/auth/login')

  // Admin baseline: login resolves to profile, then the protected backend demo succeeds.
  await page.locator('select.scenario-switcher__select').selectOption('auth-active-admin')
  await page.getByTestId('auth-email').fill(ADMIN_EMAIL)
  await page.getByTestId('auth-password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/auth\/profile/)

  await page.goto('/auth/admin')
  await expect(page.getByTestId('admin-result')).toBeVisible()

  // End the admin browser session, switch to a normal-user baseline and verify
  // that frontend routing does not masquerade as authorization: the backend 403
  // is rendered as Access denied without forcing another logout/refresh loop.
  await page.goto('/auth/profile')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL(/\/auth\/login/)

  await page.locator('select.scenario-switcher__select').selectOption('auth-active-user')
  await page.getByTestId('auth-email').fill(USER_EMAIL)
  await page.getByTestId('auth-password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/auth\/profile/)

  const deniedResponse = page.waitForResponse((response) =>
    response.url().includes('/api/v1/admin/example'),
  )
  await page.goto('/auth/admin')
  expect((await deniedResponse).status()).toBe(403)
  await expect(page.getByText('Access denied', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/auth\/admin/)
})
