import { expect, test } from '@playwright/test'

/**
 * A single shared theme policy across statically rendered EN/RU documents
 * and the demo SPA. Runs against both Cloudflare Worker and Selectel/Caddy.
 */
test('first visit follows system theme, without writing localStorage', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  const theme = page.locator('.portfolio-theme-toggle')
  await expect(theme).toHaveAttribute('title', 'Theme: System (Dark)')
  expect(await page.evaluate(() => localStorage.getItem('zolotoy.dev:theme'))).toBeNull()
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-theme'))).toBe(false)

  const darkBackground = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim())
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(theme).toHaveAttribute('title', 'Theme: System (Light)')
  const lightBackground = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim())
  expect(lightBackground).not.toBe(darkBackground)
})

test('one System/Light/Dark cycle persists across RU public and RU demo', async ({ page }) => {
  await page.goto('/ru/')
  const publicTheme = page.locator('.portfolio-theme-toggle')
  await expect(publicTheme).toHaveAttribute('title', /Тема: системная/)
  await publicTheme.click()
  await expect(publicTheme).toHaveAttribute('title', 'Тема: светлая')
  expect(await page.evaluate(() => localStorage.getItem('zolotoy.dev:theme'))).toBe('light')

  await page.goto('/demo/orders?lang=ru')
  const demoTheme = page.locator('.theme-toggle')
  await expect(demoTheme).toHaveAttribute('title', 'Тема: светлая')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await demoTheme.click()
  await expect(demoTheme).toHaveAttribute('title', 'Тема: тёмная')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('.theme-toggle')).toHaveAttribute('title', 'Тема: тёмная')

  await demoTheme.click()
  await expect(demoTheme).toHaveAttribute('title', /Тема: системная/)
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-theme'))).toBe(false)
  expect(await page.evaluate(() => localStorage.getItem('zolotoy.dev:theme'))).toBe('system')

  await page.goto('/ru/architecture/')
  await expect(page.locator('.portfolio-theme-toggle')).toHaveAttribute('title', /Тема: системная/)
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-theme'))).toBe(false)
})

test('demo system theme follows OS changes but manual override stays fixed', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/demo/')
  const theme = page.locator('.theme-toggle')
  await expect(theme).toHaveAttribute('title', 'Theme: System (Dark)')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(theme).toHaveAttribute('title', 'Theme: System (Light)')

  await theme.click()
  await expect(theme).toHaveAttribute('title', 'Theme: Light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(theme).toHaveAttribute('title', 'Theme: Light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
