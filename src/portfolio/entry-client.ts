/**
 * Public client entry: hydrates the server-rendered page (same app factory as
 * the server, so markup matches). Also retires the legacy root-scoped MSW
 * worker (moved to /demo/) without importing MSW.
 */
import { createPublicApp } from './app'
import { retireLegacyMockWorker } from '@/shared/browser/retire-legacy-mock-worker'

import './styles/portfolio.css'

const container = document.getElementById('app')
if (container) {
  const mounted = createPublicApp(window.location.pathname)
  if (mounted) {
    mounted.app.mount(container)
  }
  // No hydration case: the prerendered document is already complete.
}

void retireLegacyMockWorker()
