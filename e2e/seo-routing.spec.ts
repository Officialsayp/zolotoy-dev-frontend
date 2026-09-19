import { expect, test } from '@playwright/test'

/**
 * HTTP-level routing semantics against the production-like wrangler dev
 * server: canonical public documents, demo shell deep links with noindex,
 * legacy 308 redirects with query preservation, genuine 404s and HEAD.
 */

const CANONICALS: [string, string][] = [
  ['/', 'https://zolotoy.dev/'],
  ['/architecture/', 'https://zolotoy.dev/architecture/'],
  ['/services/order/', 'https://zolotoy.dev/services/order/'],
  ['/services/auth/', 'https://zolotoy.dev/services/auth/'],
  ['/services/notification/', 'https://zolotoy.dev/services/notification/'],
  ['/services/url-shortener/', 'https://zolotoy.dev/services/url-shortener/'],
]

test.describe('public documents', () => {
  for (const [path, canonical] of CANONICALS) {
    test(`${path} serves indexable prerendered HTML`, async ({ request }) => {
      const response = await request.get(path)
      expect(response.status()).toBe(200)
      const html = await response.text()
      expect(html).toContain(`<link rel="canonical" href="${canonical}" />`)
      expect(html).toContain('<meta name="robots" content="index,follow" />')
      expect(html).toContain('hreflang="ru"')
      expect(html).toContain('hreflang="x-default"')
      // Meaningful body before JS: the app root is not empty and contains the
      // page H1 (the shared shell markup precedes it).
      const appStart = html.indexOf('<div id="app">')
      expect(html.slice(appStart)).toContain('<h1')
    })

    const ruPath = '/ru' + (path === '/' ? '/' : path)
    test(`${ruPath} serves the RU document`, async ({ request }) => {
      const response = await request.get(ruPath)
      expect(response.status()).toBe(200)
      const html = await response.text()
      expect(html).toContain(`<link rel="canonical" href="https://zolotoy.dev${ruPath}" />`)
      expect(html).toContain('<html lang="ru">')
      expect(html).toContain('hreflang="en"')
      // Russian copy renders before JS.
      expect(html).toMatch(/[А-Яа-яЁё]/)
    })
  }
})

test('demo document responses carry noindex in meta and X-Robots-Tag', async ({ request }) => {
  const response = await request.get('/demo/')
  expect(response.status()).toBe(200)
  expect(response.headers()['x-robots-tag']).toBe('noindex,follow')
  const html = await response.text()
  expect(html).toContain('noindex,follow')
})

test('deep demo link receives the demo shell without changing the URL', async ({ page }) => {
  const response = await page.goto('/demo/orders/123')
  await expect(page).toHaveURL(/\/demo\/orders\/123$/)
  // HTTP 200: the Worker serves the demo shell; record existence is an
  // application concern the static layer cannot resolve.
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Order detail' })).toBeVisible()
})

test('demo overview remains noindex after client-side navigation', async ({ page }) => {
  await page.goto('/demo/')
  const robots = page.locator('meta[name="robots"]')
  await expect(robots).toHaveAttribute('content', 'noindex,follow')
})

test('legacy namespaces 308-redirect to /demo/ preserving query', async ({ request }) => {
  const cases: [string, string][] = [
    ['/orders', '/demo/orders/'],
    ['/orders/123?details=true', '/demo/orders/123?details=true'],
    ['/auth/profile', '/demo/auth/profile'],
    ['/notifications/events/abc', '/demo/notifications/events/abc'],
    ['/shortener/abc', '/demo/shortener/abc'],
  ]
  for (const [from, to] of cases) {
    const response = await request.get(from, { maxRedirects: 0 })
    expect(response.status(), from).toBe(308)
    const location = response.headers().location ?? ''
    expect(new URL(location, 'http://localhost:8787').pathname + new URL(location, 'http://localhost:8787').search, from).toBe(to)
  }
})

test('/orders-extra is not a legacy namespace match', async ({ request }) => {
  const response = await request.get('/orders-extra', { maxRedirects: 0 })
  expect(response.status()).toBe(404)
})

test('unknown public path returns genuine 404 (never homepage HTML)', async ({ request }) => {
  const response = await request.get('/no-such-document/')
  expect(response.status()).toBe(404)
  const html = await response.text()
  expect(html).not.toContain('Go backend portfolio</h1>')
})

test('unknown direct demo route pattern returns 404', async ({ request }) => {
  const response = await request.get('/demo/definitely-not-a-demo-route')
  expect(response.status()).toBe(404)
  expect(response.headers()['x-robots-tag']).toContain('noindex')
})

test('missing asset returns 404, never a 200 success', async ({ request }) => {
  const response = await request.get('/assets/missing-file-abc123.js')
  expect(response.status()).toBe(404)
  // The 404-page fallback renders, but the status stays a genuine 404 — no
  // homepage/demo shell leak.
  expect(await response.text()).not.toContain('Go backend portfolio</h1>')
})

test('404.html direct URL is noindex', async ({ request }) => {
  const response = await request.get('/404.html')
  const html = await response.text()
  expect(html).toContain('noindex')
})

test('HEAD request has no body', async ({ request }) => {
  const response = await request.head('/')
  expect(response.status()).toBe(200)
  expect((await response.body()).length).toBe(0)
})

test('POST to a document path is not treated as a demo API call', async ({ request }) => {
  const response = await request.post('/demo/orders/')
  expect(response.status()).toBe(405)
})

test('hash is preserved through legacy redirects in a browser', async ({ page }) => {
  await page.goto('/orders/123?details=true#history')
  await page.waitForURL(/\/demo\/orders\/123\?details=true/)
  // Fragment inheritance: the browser preserves the fragment across redirects.
  const hash = await page.evaluate(() => window.location.hash)
  expect(hash).toBe('#history')
})

test('unknown /ru/ path serves the Russian 404 document', async ({ request }) => {
  const response = await request.get('/ru/no-such-document/')
  expect(response.status()).toBe(404)
  const html = await response.text()
  expect(html).toContain('<html lang="ru">')
  expect(html).toContain('Страница не найдена')
})
