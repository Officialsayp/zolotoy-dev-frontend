/**
 * Shared public app factory: selects the public page for a canonical path and
 * creates a fresh createSSRApp instance wrapped in the public shell. No Vue
 * Router, no Pinia, no demo runtime imports — public pages are documents,
 * not an SPA.
 */
import { createSSRApp, h, type App as VueApp, type Component } from 'vue'

import PortfolioShell from './layout/portfolio-shell.vue'
import HomePage from './pages/home-page.vue'
import ArchitecturePage from './pages/architecture-page.vue'
import ServiceCaseStudyPage from './pages/service-case-study-page.vue'
import { canonicalizePublicPath } from '@/shared/routing/site-routes'
import { getServiceCase } from '@/content/service-registry'
import type { PublicRouteId } from '@/shared/routing/site-routes'

export interface PublicPageResult {
  /** Inner page component (rendered inside PortfolioShell). */
  component: Component
  props: Record<string, unknown>
  routeId: PublicRouteId
  /** Canonical path with trailing slash; null for the 404 document. */
  canonicalPath: string
}

/** Resolve a request pathname to the public page component (pure). */
export function resolvePublicPage(pathname: string): PublicPageResult | null {
  const canonical = canonicalizePublicPath(pathname)
  if (canonical === null) return null

  if (canonical === '/') {
    return { component: HomePage, props: {}, routeId: 'home', canonicalPath: '/' }
  }
  if (canonical === '/architecture/') {
    return { component: ArchitecturePage, props: {}, routeId: 'architecture', canonicalPath: canonical }
  }
  const match = canonical.match(/^\/services\/([a-z-]+)\/$/)
  if (match) {
    const slug = match[1]
    const service = (['order', 'auth', 'notification', 'shortener'] as const)
      .find((id) => getServiceCase(id).slug === slug)
    if (service) {
      return {
        component: ServiceCaseStudyPage,
        props: { serviceId: service },
        routeId: service,
        canonicalPath: canonical,
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
  const app = createSSRApp({
    render: () =>
      h(PortfolioShell, { currentPath: result.canonicalPath }, () =>
        h(result.component, result.props),
      ),
  })
  return { app, result }
}
