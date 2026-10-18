import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Run the existing desktop/mobile suite against production routing and robots
// policy. The caller supplies one existing mock build; no deploy or rebuild.
export default defineConfig({
  ...base,
  outputDir: 'test-results/selectel-production-browser',
  use: { ...base.use, baseURL: 'http://127.0.0.1:8791' },
  metadata: { ...base.metadata, staging: false },
  webServer: {
    command: 'node scripts/check-selectel-production.mjs --serve',
    url: 'http://127.0.0.1:8791/_health',
    reuseExistingServer: false,
    timeout: 30_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  },
})
