/**
 * Public client entry: hydrates the server-rendered page (same app factory as
 * the server, so markup matches). Also retires the legacy root-scoped MSW
 * worker (moved to /demo/) without importing MSW.
 */
import { createPublicApp } from './app'
import { resolvePublicPathForLocale, publicPathFor } from '@/shared/routing/site-routes'
import { browserPreferredLocale, readPersistedLocale } from '@/shared/i18n/locale'
import { retireLegacyMockWorker } from '@/shared/browser/retire-legacy-mock-worker'

import './styles/portfolio.css'

const container = document.getElementById('app')
const page = resolvePublicPathForLocale(window.location.pathname)
// An explicit /ru/ link remains Russian on a first visit. Otherwise persisted
// manual choice (when present) wins; the browser supplies the initial default.
// Only published counterpart documents are eligible for client redirects:
// static assets, 404s, bots and no-JS document rendering stay untouched.
const preferred = readPersistedLocale() ??
  (page?.locale === 'ru' ? 'ru' : browserPreferredLocale())
const counterpart = page ? publicPathFor(page.id, preferred) : null
if (counterpart && counterpart !== window.location.pathname) {
  window.location.replace(counterpart + window.location.search + window.location.hash)
} else if (container) {
  const mounted = createPublicApp(window.location.pathname)
  if (mounted) mounted.app.mount(container)
  // No hydration case: the prerendered document is already complete.
}

void retireLegacyMockWorker()
