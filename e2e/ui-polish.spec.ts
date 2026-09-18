import { expect, test, type Locator } from '@playwright/test'

async function expectContrast(control: Locator): Promise<void> {
  await expect.poll(() => control.evaluate((element) => {
    const style = getComputedStyle(element)
    const luminance = (color: string) => {
      const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((n) => {
        const value = n / 255
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      })
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    }
    const foreground = luminance(style.color)
    const background = luminance(style.backgroundColor)
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
  })).toBeGreaterThanOrEqual(4.5)
}

for (const theme of ['light', 'dark'] as const) {
  test(`primary links retain contrast in every interaction state: ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    for (const path of ['/', '/services/order/']) {
      await page.goto(path)
      const primary = page.locator('.portfolio-card__actions .is-primary').first()
      await expectContrast(primary)
      await primary.hover()
      await expectContrast(primary)
      await page.mouse.move(0, 0)
      await primary.focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      await expect(primary).toBeFocused()
      expect(await primary.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
      await expect(primary).not.toHaveCSS('box-shadow', 'none')
      await expectContrast(primary)
      await primary.hover()
      await page.mouse.down()
      try {
        expect(await primary.evaluate((el) => el.matches(':active'))).toBe(true)
        await expectContrast(primary)
      } finally {
        await page.mouse.move(0, 0)
        await page.mouse.up()
      }
    }
    // AppButton keeps its native disabled behavior and its shared primary palette.
    await page.goto('/demo/auth/login')
    const submit = page.getByRole('button', { name: 'Sign in', exact: true })
    await expect(submit).toBeDisabled()
    await expect(submit).toHaveCSS('opacity', '0.55')
    const disabledBackground = await submit.evaluate((el) => getComputedStyle(el).backgroundColor)
    await submit.hover({ force: true })
    await expect(submit).toHaveCSS('background-color', disabledBackground)
    await expect(submit).toHaveCSS('cursor', 'not-allowed')
    await page.getByTestId('auth-email').fill('user@zolotoy.dev')
    await page.getByTestId('auth-password').fill('DemoPassword!123')
    await expect(submit).toBeEnabled()
    await page.mouse.move(0, 0)
    await expectContrast(submit)
    await submit.hover()
    await expectContrast(submit)
    await submit.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(submit).toBeFocused()
    await expect(submit).not.toHaveCSS('box-shadow', 'none')
    await expectContrast(submit)
    await submit.hover()
    await page.mouse.down()
    try {
      expect(await submit.evaluate((el) => el.matches(':active'))).toBe(true)
      await expectContrast(submit)
    } finally {
      await page.mouse.move(0, 0)
      await page.mouse.up()
    }
  })
}

for (const path of ['/demo', '/demo/auth/login', '/demo/shortener/']) {
  test(`sidebar brand leaves demo and Back restores ${path}`, async ({ page }, testInfo) => {
    await page.goto(path)
    const brand = page.getByRole('link', { name: 'zolotoy.dev — Portfolio home' })
    await expect(brand).toBeVisible()
    await expect(brand).toHaveAttribute('href', '/')
    const demoUrl = page.url()
    await brand.hover()
    await brand.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(brand).toBeFocused()
    await expect(brand).not.toHaveCSS('box-shadow', 'none')
    await page.screenshot({ path: testInfo.outputPath('sidebar-focus.png') })
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/')
    await expect(page.locator('.portfolio')).toBeVisible()
    await expect(page.locator('.app-sidebar')).toHaveCount(0)
    await page.goBack()
    await expect(page).toHaveURL(demoUrl)
    await expect(brand).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })
}
