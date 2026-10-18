import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Reuse every existing browser scenario against the exact Caddy route config.
// The caller builds once in mock mode; this server never rebuilds the artifact.
export default defineConfig({
  ...base,
  outputDir: 'test-results/selectel-browser',
  use: { ...base.use, baseURL: 'http://127.0.0.1:8790' },
  metadata: { staging: true },
  webServer: {
    command: 'npm run preview:selectel',
    url: 'http://127.0.0.1:8790/_health',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
