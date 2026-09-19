/**
 * Cloudflare Edge Worker for zolotoy.dev.
 *
 * Routing policy (see PORTFOLIO_ARCHITECTURE.md):
 *  - selective assets.run_worker_first for /demo, /demo/* and the legacy
 *    namespaces (/orders, /auth, /notifications, /shortener + descendants) —
 *    the only paths that genuinely need custom logic;
 *  - native assets.html_handling "auto-trailing-slash" serves the six
 *    prerendered public documents without Worker invocation;
 *  - native assets.not_found_handling "404-page" serves dist/404.html with
 *    HTTP 404 for unknown public paths and missing assets;
 *  - demo document responses carry X-Robots-Tag: noindex,follow.
 *
 * Responsibilities here (document GET/HEAD only):
 *  1. 308-redirect legacy namespaces to /demo/... preserving query;
 *  2. serve the demo shell for recognized demo route patterns;
 *  3. return genuine 404 for unknown demo route patterns;
 *  4. never serve HTML for missing assets.
 */

export interface Env {
  ASSETS: { fetch: (request: Request | URL) => Promise<Response> }
}

/** Demo internal route patterns (browser URLs after /demo). */
const DEMO_PATTERNS: readonly string[] = [
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

const LEGACY_ROOTS: readonly string[] = ['/orders', '/auth', '/notifications', '/shortener']

function matchPattern(pattern: string, pathname: string): boolean {
  const pSegs = pattern.split('/').filter((s) => s !== '')
  const uSegs = pathname.split('/').filter((s) => s !== '')
  if (pSegs.length !== uSegs.length) return false
  for (let i = 0; i < pSegs.length; i++) {
    const p = pSegs[i]
    if (p.startsWith(':')) continue
    if (p !== uSegs[i]) return false
  }
  return true
}

/** Match an internal demo path (starting with /) against the patterns. */
function matchDemoRoute(pathname: string): string | null {
  const bare = pathname === '' ? '/' : pathname
  const noSlash = bare.endsWith('/') && bare !== '/' ? bare.slice(0, -1) : bare
  for (const pattern of DEMO_PATTERNS) {
    if (matchPattern(pattern, noSlash)) return pattern
  }
  return null
}

/** Legacy namespace redirect target, or null. Encoded segments preserved. */
function legacyRedirectTarget(pathname: string): string | null {
  const rawSegments = pathname.split('/')
  const decoded = rawSegments.map((s) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  })
  const root = '/' + (decoded[1] ?? '')
  if (!LEGACY_ROOTS.includes(root)) return null
  const rest = rawSegments.slice(2)
  const hasTrailingSlash = pathname.endsWith('/') && pathname !== '/'
  const restNoSlash = hasTrailingSlash ? rest.slice(0, -1) : rest
  const bare =
    '/' +
    (decoded[1] ?? '') +
    restNoSlash.map((s) => '/' + s).join('')
  if (matchDemoRoute(bare) === null) return null
  if (restNoSlash.length === 0) {
    return '/demo/' + (decoded[1] ?? '') + '/'
  }
  return '/demo/' + (decoded[1] ?? '') + restNoSlash.map((s) => '/' + s).join('')
}

/** Canonicalize /index.html and trailing-slash aliases of public documents. */
const PUBLIC_PATHS = new Set<string>([
  '/',
  '/architecture/',
  '/services/order/',
  '/services/auth/',
  '/services/notification/',
  '/services/url-shortener/',
  // RU locale documents (prerendered under /ru/ in dist).
  '/ru/',
  '/ru/architecture/',
  '/ru/services/order/',
  '/ru/services/auth/',
  '/ru/services/notification/',
  '/ru/services/url-shortener/',
])

function canonicalizePublic(pathname: string): string | null {
  const bare = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  if (bare === '/index.html') return '/'
  if (bare.endsWith('/index.html')) {
    const withoutIndex = bare.slice(0, -'/index.html'.length)
    const withSlash = withoutIndex + '/'
    return PUBLIC_PATHS.has(withSlash) ? withSlash : null
  }
  const withSlash = bare + '/'
  if (PUBLIC_PATHS.has(withSlash)) return withSlash
  return null
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname

    // Only GET/HEAD are handled; other methods fall through to assets (which
    // will 405/404) — never treated as successful demo API calls.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 })
    }

    // 1. Legacy namespaces: 308 to /demo/... preserving query, no /demo/demo/.
    if (isLegacyNamespacePath(pathname)) {
      const target = legacyRedirectTarget(pathname)
      if (target) {
        return Response.redirect(new URL(target + url.search, url.origin), 308)
      }
      // Path inside a legacy namespace but not a valid demo pattern → 404.
      return new Response('Not found', { status: 404, headers: noindexHeaders() })
    }

    // 2. Demo namespace.
    if (pathname === '/demo' || pathname.startsWith('/demo/')) {
      const internal = pathname === '/demo' ? '/' : pathname.slice('/demo'.length)

      // /demo/index.html alias → canonical /demo/.
      if (pathname === '/demo/index.html') {
        return Response.redirect(new URL('/demo/' + url.search, url.origin), 308)
      }

      if (matchDemoRoute(internal) !== null) {
        const asset = await env.ASSETS.fetch(new URL('/demo/index.html', url.origin))
        const headers = new Headers(asset.headers)
        headers.set('X-Robots-Tag', 'noindex,follow')
        return new Response(asset.body, { status: asset.status, headers })
      }

      // Non-document files inside /demo/ (mockServiceWorker.js and any future
      // static files) pass through to the asset layer; missing files 404.
      const asset = await env.ASSETS.fetch(new URL(pathname, url.origin))
      if (asset.status !== 404) {
        return asset
      }
      return new Response('Not found', { status: 404, headers: noindexHeaders() })
    }

    // 3. Public document canonicalization. html_handling handles trailing
    // slashes natively; here we only normalize explicit /index.html aliases
    // to avoid duplicate-content canonical URLs.
    if (pathname.endsWith('/index.html')) {
      const canonical = canonicalizePublic(pathname)
      if (canonical && canonical !== pathname) {
        return Response.redirect(new URL(canonical + url.search, url.origin), 308)
      }
    }

    // 4. Everything else: static asset or native 404 handling. The ASSETS
    // binding forwards to the asset layer (html_handling and
    // not_found_handling still apply). Unknown /ru/... paths get the RU 404
    // document so the error page language matches the namespace.
    const assetResponse = await env.ASSETS.fetch(request)
    if (
      assetResponse.status === 404 &&
      (pathname === '/ru' || pathname.startsWith('/ru/')) &&
      !pathname.startsWith('/ru/assets/')
    ) {
      const ru404 = await env.ASSETS.fetch(new URL('/ru/404.html', url.origin))
      return new Response(ru404.body, { status: 404, headers: ru404.headers })
    }
    return assetResponse
  },
}

function noindexHeaders(): Headers {
  const headers = new Headers()
  headers.set('X-Robots-Tag', 'noindex')
  headers.set('Content-Type', 'text/plain; charset=utf-8')
  return headers
}

// Re-exported for unit tests.
export { matchDemoRoute, legacyRedirectTarget, canonicalizePublic, isLegacyNamespacePath }

function isLegacyNamespacePath(pathname: string): boolean {
  return legacyRedirectTarget(pathname) !== null
}
