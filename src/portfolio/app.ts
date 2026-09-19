/**
 * Shared public app factory: selects the public page for a canonical path and
 * creates a fresh createSSRApp instance wrapped in the public shell. No Vue
 * Router, no Pinia, no demo runtime imports — public pages are documents,
 * not an SPA. The locale is derived from the URL: /ru/... renders Russian,
 * everything else renders English.
 */
import { createSSRApp, h, type App as VueApp, type Component } from 'vue'

import PortfolioShell from './layout/portfolio-shell.vue'
import HomePage from './pages/home-page.vue'
import ArchitecturePage from './pages/architecture-page.vue'
import ServiceCaseStudyPage from './pages/service-case-study-page.vue'
import {
  canonicalizePublicPath,
  resolvePublicPathForLocale,
  publicPathFor,
  type PublicRouteId,
} from '@/shared/routing/site-routes'
import { getServiceCase } from '@/content/service-registry'
import type { Locale } from '@/shared/i18n/locale'

export interface PublicPageResult {
  /** Inner page component (rendered inside PortfolioShell). */
  component: Component
  props: Record<string, unknown>
  routeId: PublicRouteId
  locale: Locale
  /** Canonical browser path for this locale (with trailing slash). */
  canonicalPath: string
}

interface ResolvedPage {
  component: Component
  props: Record<string, unknown>
  routeId: PublicRouteId
  /** EN canonical path used for content lookup. */
  enPath: string
}

/** Resolve a request pathname to the public page component (pure). */
export function resolvePublicPage(pathname: string): (ResolvedPage & { locale: Locale }) | null {
  const resolved = resolvePublicPathForLocale(pathname)
  if (resolved === null) return null
  const { id, locale } = resolved
  // EN canonical path drives content lookup (slugs are locale-invariant).
  const enPath = publicPathFor(id, 'en')

  if (enPath === '/') {
    return { component: HomePage, props: {}, routeId: 'home', enPath, locale }
  }
  if (enPath === '/architecture/') {
    return { component: ArchitecturePage, props: {}, routeId: 'architecture', enPath, locale }
  }
  const match = enPath.match(/^\/services\/([a-z-]+)\/$/)
  if (match) {
    const slug = match[1]
    const service = (['order', 'auth', 'notification', 'shortener'] as const)
      .find((sid) => getServiceCase(sid).slug === slug)
    if (service) {
      return {
        component: ServiceCaseStudyPage,
        props: { serviceId: service },
        routeId: service,
        enPath,
        locale,
      }
    }
  }
  return null
}

/**
 * Render a public page for a pathname. Returns null for unknown paths —
 * callers render the static 404 document instead.
 */
export function createPublicApp(pathname: string): {
  app: VueApp
  result: PublicPageResult
} | null {
  const result = resolvePublicPage(pathname)
  if (result === null) return null
  const locale = result.locale
  const canonicalPath = publicPathFor(result.routeId, locale)
  const app = createSSRApp({
    render: () =>
      h(
        PortfolioShell,
        { currentPath: canonicalPath, locale },
        () => h(result.component, { ...result.props, locale }),
      ),
  })
  return { app, result: { ...result, canonicalPath } }
}

// Re-exported for prerender tooling.
export { canonicalizePublicPath }
