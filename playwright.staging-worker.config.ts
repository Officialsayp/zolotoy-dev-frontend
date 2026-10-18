import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Staging must package the exact artifact compared with Caddy. The default
// developer config builds first; this verification-only config serves dist.
export default defineConfig({
  ...base,
  outputDir: 'test-results/worker-browser',
  use: { ...base.use, baseURL: 'http://127.0.0.1:8787' },
  webServer: {
    command: 'wrangler dev --ip 127.0.0.1 --port 8787 --compatibility-date 2026-06-24',
    url: 'http://127.0.0.1:8787',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
