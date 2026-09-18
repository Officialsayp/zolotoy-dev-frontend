/**
 * Pure shared routing manifest for zolotoy.dev.
 *
 * One module owns the full URL topology:
 *  - six indexable public portfolio documents (trailing slashes);
 *  - the interactive demo SPA mounted at /demo/ (Vue Router internal paths);
 *  - legacy top-level service namespaces that redirect to /demo/... (308);
 *  - canonicalization and route classification helpers.
 *
 * This module must stay free of Vue components, Pinia, API clients, MSW and
 * content-body imports: the demo router, the Vite dev plugin and the Edge
 * Worker all consume these same patterns.
 */

/** Browser base path the demo SPA is served from. */
export const DEMO_BASE = '/demo/'

export const SITE_ORIGIN = 'https://zolotoy.dev'

/** External author/identity site (canonical Person source). */
export const AUTHOR_SITE_URL = 'https://maxzolotoy.com'

/** External backend source repository. */
export const BACKEND_REPO_URL = 'https://github.com/Officialsayp/zolotoy-dev-backend'

/** Frontend repository (this code). */
export const FRONTEND_REPO_URL = 'https://github.com/Officialsayp/zolotoy-dev-frontend'

/** Public portfolio document IDs (indexable, statically generated). */
export type PublicRouteId = 'home' | 'architecture' | 'order' | 'auth' | 'notification' | 'shortener'

export interface PublicRoute {
  id: PublicRouteId
  /** Canonical browser path with trailing slash. */
  path: string
  /** Output file inside dist (relative), matching the canonical path. */
  file: string
  title: string
  description: string
}

/**
 * The six indexable public documents. Order matters for navigation and the
 * generated sitemap.
 */
export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  {
    id: 'home',
    path: '/',
    file: 'index.html',
    title: 'zolotoy.dev — Go backend portfolio',
    description:
      'Maxim Zolotoy’s Go backend engineering portfolio: four service case studies with honest current-vs-target architecture and an interactive demo.',
  },
  {
    id: 'architecture',
    path: '/architecture/',
    file: 'architecture/index.html',
    title: 'System architecture — zolotoy.dev',
    description:
      'Current and target system architecture of the zolotoy.dev Go backend portfolio: service boundaries, data ownership, integration contracts and runtime modes.',
  },
  {
    id: 'order',
    path: '/services/order/',
    file: 'services/order/index.html',
    title: 'Order service case study — zolotoy.dev',
    description:
      'Order service case study: HTTP validation and service boundaries today, state machines, idempotency, optimistic concurrency and transactional outbox as the target.',
  },
  {
    id: 'auth',
    path: '/services/auth/',
    file: 'services/auth/index.html',
    title: 'Auth service case study — zolotoy.dev',
    description:
      'Auth service case study: planned Argon2id credentials, rotating refresh sessions, reuse detection, RBAC and rate limiting for the zolotoy.dev Go portfolio.',
  },
  {
    id: 'notification',
    path: '/services/notification/',
    file: 'services/notification/index.html',
    title: 'Notification service case study — zolotoy.dev',
    description:
      'Notification service case study: planned at-least-once event processing, durable inbox, retry with backoff and recovery for the zolotoy.dev Go portfolio.',
  },
  {
    id: 'shortener',
    path: '/services/url-shortener/',
    file: 'services/url-shortener/index.html',
    title: 'URL shortener case study — zolotoy.dev',
    description:
      'URL shortener case study: planned redirect hot path, Redis cache-aside with bounded fallback, per-instance singleflight and reproducible benchmarks.',
  },
]

/** Service identifiers shared with the runtime service registry. */
export type ServiceId = 'order' | 'auth' | 'notification' | 'shortener'

export interface ServiceRouteInfo {
  id: ServiceId
  /** Public case-study slug under /services/. */
  publicSlug: string
  /** Internal demo route root (Vue Router path, no base). */
  demoRoot: string
}

/** Public slug ↔ internal demo root per service. */
export const SERVICE_ROUTES: readonly ServiceRouteInfo[] = [
  { id: 'order', publicSlug: 'order', demoRoot: '/orders' },
  { id: 'auth', publicSlug: 'auth', demoRoot: '/auth' },
  { id: 'notification', publicSlug: 'notification', demoRoot: '/notifications' },
  { id: 'shortener', publicSlug: 'url-shortener', demoRoot: '/shortener' },
]

/** Demo router route names mirror the existing app router names exactly. */
export const DEMO_ROUTE_NAMES = {
  overview: 'overview',
  orders: 'orders',
  orderNew: 'order-new',
  orderDetail: 'order-detail',
  auth: 'auth',
  authLogin: 'auth-login',
  authRegister: 'auth-register',
  authProfile: 'auth-profile',
  authSessions: 'auth-sessions',
  authAdmin: 'auth-admin',
  notifications: 'notifications',
  notificationDetail: 'notification-detail',
  notificationEvent: 'notification-event',
  shortener: 'shortener',
  shortenerDetail: 'shortener-detail',
  notFound: 'not-found',
} as const

/**
 * Demo route patterns (internal paths). Query strings/fragments are preserved
 * by callers. Dynamic segments are literal colon patterns.
 */
export const DEMO_ROUTE_PATTERNS: readonly string[] = [
  '/',
  '/orders/',
  '/orders/new',
  '/orders/:orderId',
  '/auth/',
  '/auth/login',
  '/auth/register',
  '/auth/profile',
  '/auth/sessions',
  '/auth/admin',
  '/notifications/',
  '/notifications/events/:eventId',
  '/notifications/:notificationId',
  '/shortener/',
  '/shortener/:linkId',
]

/**
 * Legacy top-level namespaces that must 308-redirect to their /demo/... home.
 * Complete path segments only: /orders matches but /orders-extra does not.
 */
export const LEGACY_ROOTS: readonly string[] = ['/orders', '/auth', '/notifications', '/shortener']

/** Canonical URL of a public document, absolute. */
export function publicCanonicalUrl(id: PublicRouteId): string {
  const route = PUBLIC_ROUTES.find((r) => r.id === id)
  if (!route) throw new Error(`Unknown public route id: ${id}`)
  return SITE_ORIGIN + (route.path === '/' ? '/' : route.path)
}

/** Canonical browser URL for a demo internal path (query/hash appended verbatim). */
export function demoUrl(internalPath: string): string {
  const suffix = internalPath.startsWith('/') ? internalPath.slice(1) : internalPath
  return DEMO_BASE + suffix
}

/** Public case-study path for a service (trailing slash). */
export function serviceCaseStudyPath(id: ServiceId): string {
  const info = SERVICE_ROUTES.find((s) => s.id === id)
  if (!info) throw new Error(`Unknown service id: ${id}`)
  return `/services/${info.publicSlug}/`
}

/** Internal demo root for a service. */
export function serviceDemoRoot(id: ServiceId): string {
  const info = SERVICE_ROUTES.find((s) => s.id === id)
  if (!info) throw new Error(`Unknown service id: ${id}`)
  return info.demoRoot
}

export type RouteClass =
  | 'public-document'
  | 'demo-route'
  | 'legacy-redirect'
  | 'static-asset'
  | 'not-found'

/** Options for classifySiteRoute — precomputed sets for repeated classification. */
export interface RouteClassifier {
  publicPaths: ReadonlySet<string>
  demoPatterns: readonly string[]
  legacyRoots: readonly string[]
}

/** Build a classifier from the manifest (pure; no I/O). */
export function createRouteClassifier(manifest: {
  publicRoutes?: readonly PublicRoute[]
  demoPatterns?: readonly string[]
  legacyRoots?: readonly string[]
} = {}): RouteClassifier {
  return {
    publicPaths: new Set((manifest.publicRoutes ?? PUBLIC_ROUTES).map((r) => r.path)),
    demoPatterns: manifest.demoPatterns ?? DEMO_ROUTE_PATTERNS,
    legacyRoots: manifest.legacyRoots ?? LEGACY_ROOTS,
  }
}

/** Strip one trailing slash from a pathname (but not from the root "/"). */
function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

// Lazily constructed default classifier for pure helpers.
const defaultClassifier = createRouteClassifier()

/** True when pathname is exactly a canonical public document path. */
export function isPublicDocumentPath(pathname: string): boolean {
  return defaultClassifier.publicPaths.has(pathname)
}

/**
 * True when pathname matches a demo route pattern (internal path, i.e. after
 * the /demo/ prefix). Query/hash are the caller's concern.
 */
export function isDemoRoutePath(pathname: string): boolean {
  return matchDemoRoute(pathname) !== null
}

/**
 * Match an internal demo path against the manifest patterns.
 * Returns the matched pattern or null.
 */
export function matchDemoRoute(pathname: string): string | null {
  const bare = pathname === '' ? '/' : pathname
  const noSlash = bare.endsWith('/') && bare !== '/' ? bare.slice(0, -1) : bare
  for (const pattern of defaultClassifier.demoPatterns) {
    if (matchPattern(pattern, noSlash)) return pattern
  }
  return null
}

/**
 * Segment-aware pattern matcher. `:param` matches exactly one non-empty
 * segment. A trailing slash on the pattern (service roots) requires the path
 * to be the root itself.
 */
function matchPattern(pattern: string, pathname: string): boolean {
  const pSegs = pattern.split('/').filter((s) => s !== '')
  const uSegs = pathname.split('/').filter((s) => s !== '')
  if (pSegs.length !== uSegs.length) return false
  for (let i = 0; i < pSegs.length; i++) {
    const p = pSegs[i]
    if (p.startsWith(':')) {
      if (uSegs[i] === '' ) return false
      continue
    }
    if (p !== uSegs[i]) return false
  }
  return true
}

/**
 * True when pathname sits inside a legacy namespace (complete segments).
 * /orders matches, /orders/123 matches, /orders-extra does not.
 */
export function isLegacyNamespacePath(pathname: string): boolean {
  return legacyRedirectTarget(pathname) !== null
}

/**
 * Compute the canonical /demo/... destination for a legacy namespace path, or
 * null when the path is outside the legacy namespaces. Encoded segments are
 * preserved verbatim; the caller owns query/hash.
 */
export function legacyRedirectTarget(pathname: string): string | null {
  // Decode only for structure inspection; rebuild from raw segments so an
  // encoded "%2F" never becomes a new route segment.
  const rawSegments = pathname.split('/')
  const decoded = rawSegments.map((s) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  })
  const root = '/' + (decoded[1] ?? '')
  if (!defaultClassifier.legacyRoots.includes(root)) return null
  const rest = rawSegments.slice(2)
  const hasTrailingSlash = pathname.endsWith('/') && pathname !== '/'
  const restNoSlash = hasTrailingSlash ? rest.slice(0, -1) : rest
  const bare =
    '/' +
    (decoded[1] ?? '') +
    rest
      .slice(0, hasTrailingSlash ? -1 : undefined)
      .map((s) => '/' + s)
      .join('')
  const pattern = matchDemoRoute(bare)
  if (pattern === null) return null
  // Rebuild from raw segments to preserve encoding; nested demo pages use no
  // trailing slash, namespace roots map to the demo service root with one.
  if (restNoSlash.length === 0) {
    return DEMO_BASE + (decoded[1] ?? '') + '/'
  }
  return DEMO_BASE + (decoded[1] ?? '') + restNoSlash.map((s) => '/' + s).join('')
}

/** Normalized canonical URL for a public document given a request pathname. */
export function canonicalizePublicUrl(pathname: string): string | null {
  if (pathname === '/' || pathname === '/index.html') return '/'
  const bare = stripTrailingSlash(pathname)
  if (bare === '/index.html') return '/'
  const withSlash = bare + '/'
  if (defaultClassifier.publicPaths.has(withSlash)) return withSlash
  return null
}

export { canonicalizePublicUrl as canonicalizePublicPath }

