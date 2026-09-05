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
  // Demo scenarios and the mock session are held in page memory and do NOT
  // survive a full reload. So protected-route navigation below is always
  // client-side (a RouterLink click, or a history `pushState` + `popstate` that
  // vue-router consumes) — never `page.goto`. Only the public login page is
  // reached by full reload, after which the scenario is re-selected and a fresh
  // sign-in restores the in-memory session.

  async function signIn(email: string, scenario: string): Promise<void> {
    await page.goto('/auth/login')
    await page.locator('select.scenario-switcher__select').selectOption(scenario)
    await page.getByTestId('auth-email').fill(email)
    await page.getByTestId('auth-password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL(/\/auth\/profile/)
  }

  // Admin baseline: login resolves to profile, then the protected demo succeeds
  // through the in-app link (client-side, so the session/scenario stay intact).
  await signIn(ADMIN_EMAIL, 'auth-active-admin')
  await page.getByRole('link', { name: 'Admin demo' }).click()
  await expect(page).toHaveURL(/\/auth\/admin/)
  await expect(page.getByTestId('admin-result')).toBeVisible()

  // Sign out from the header (client-side), then sign in as a normal user.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL(/\/auth\/login/)

  // A normal user has no Admin demo link; reaching /auth/admin via history must
  // not masquerade as authorization — the backend 403 renders as Access denied
  // in place, without a logout/refresh loop.
  await signIn(USER_EMAIL, 'auth-active-user')
  const deniedResponse = page.waitForResponse((response) =>
    response.url().includes('/api/v1/admin/example'),
  )
  await page.evaluate(() => {
    window.history.pushState({}, '', '/auth/admin')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  expect((await deniedResponse).status()).toBe(403)
  await expect(page.getByText('Access denied', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/auth\/admin/)
})
