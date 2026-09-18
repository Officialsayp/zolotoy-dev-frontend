import { defineConfig, devices } from '@playwright/test'

/**
 * E2E setup. The demo specs run against the production-like static build
 * served by the local Wrangler dev server (Worker routing + prerendered
 * assets) in mock API mode; a separate dev-server project is not needed.
 * Portfolio/SEO specs assert Worker redirects, headers and 404 semantics and
 * therefore require this server too.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8787',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // Local workerd in wrangler 4.x may lag the configured compatibility_date;
    // the local dev server pins its own supported date (production deploy is
    // unaffected — Cloudflare honors wrangler.jsonc).
    command: 'npm run build:e2e && npx wrangler dev --port 8787 --compatibility-date 2026-06-24',
    url: 'http://localhost:8787',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      VITE_API_MODE: 'mock',
    },
  },
})
