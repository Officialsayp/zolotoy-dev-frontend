import type { Router, RouteLocationNormalized } from 'vue-router'

import { useSessionStore } from '@/modules/auth/store/session-store'

/**
 * App-wide guards installed once from `main.ts`.
 *
 * Auth routing policy (MASTER_FRONTEND_PLAN §15.4):
 *  - public: login, register;
 *  - requiresAuth: profile, sessions, admin.
 *
 * While the session is `unknown` the guard waits for the cookie bootstrap so a
 * protected page never flashes authenticated content or a login redirect.
 * Anonymous visitors on a protected route are sent to `/auth/login?redirect=<safe
 * internal path>`; the redirect target is restricted to internal paths (no open
 * redirect). Frontend authorization is UX only — backend RBAC stays authoritative.
 */

export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  if (value[0] !== '/') return false
  if (value.startsWith('//')) return false
  const rest = value.slice(1)
  if (rest.includes(':') || rest.includes('\\') || rest.includes('#')) return false
  // Never re-enter the login/register loop through the redirect target.
  if (value.startsWith('/auth/login') || value.startsWith('/auth/register')) return false
  return true
}

/**
 * Normalize a redirect target for the demo router. A supplied /demo/... browser
 * URL is unwrapped to the internal path exactly once (never /demo/demo/).
 * Returns null for anything that is not a safe internal demo route path.
 */
export function normalizeDemoRedirectTarget(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  // Strip a single /demo prefix from a browser-level target.
  let path = value
  if (path === '/demo' || path.startsWith('/demo/')) {
    path = path.slice('/demo'.length) || '/'
  }
  if (!isSafeInternalPath(path)) return null
  // Restrict to recognized demo route patterns (guards against crafted paths).
  if (matchDemoRoutePath(path) === null) return null
  return path
}

/** Local segment-pattern matcher (mirrors the shared manifest matcher). */
function matchDemoRoutePath(pathname: string): string | null {
  const patterns = [
    '/', '/orders/', '/orders/new', '/orders/:orderId',
    '/auth/', '/auth/login', '/auth/register', '/auth/profile',
    '/auth/sessions', '/auth/admin',
    '/notifications/', '/notifications/events/:eventId', '/notifications/:notificationId',
    '/shortener/', '/shortener/:linkId',
  ]
  const bare = pathname === '' ? '/' : pathname
  const noSlash = bare.endsWith('/') && bare !== '/' ? bare.slice(0, -1) : bare
  for (const pattern of patterns) {
    const pSegs = pattern.split('/').filter((s) => s !== '')
    const uSegs = noSlash.split('/').filter((s) => s !== '')
    if (pSegs.length !== uSegs.length) continue
    let ok = true
    for (let i = 0; i < pSegs.length; i++) {
      if (pSegs[i].startsWith(':')) continue
      if (pSegs[i] !== uSegs[i]) { ok = false; break }
    }
    if (ok) return pattern
  }
  return null
}

export function loginRedirectFor(from: RouteLocationNormalized): {
  path: '/auth/login'
  query?: { redirect?: string }
} {
  if (isSafeInternalPath(from.fullPath)) {
    return { path: '/auth/login', query: { redirect: from.fullPath } }
  }
  return { path: '/auth/login' }
}

export function updateRobotsMeta(routeName: unknown): void {
  // Every demo route stays noindex,follow — the overview exception is removed
  // with the /demo/ namespace migration (PORTFOLIO_ARCHITECTURE.md).
  void routeName
  const robots = document.querySelector('meta[name="robots"]')
  if (robots) {
    robots.setAttribute('content', 'noindex,follow')
  }
}

export function installAppGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const session = useSessionStore()

    // Protected content must not appear while the session is unknown.
    if (session.isUnknown) {
      await session.waitForBootstrap()
    }

    const requiresAuth = to.meta.requiresAuth === true
    if (requiresAuth && !session.isAuthenticated) {
      return loginRedirectFor(to)
    }

    // Authenticated users are taken away from the public login/register forms.
    if (to.meta.public === true && session.isAuthenticated) {
      return { path: '/auth/profile' }
    }

    return true
  })

  router.afterEach((to) => {
    const metaTitle = typeof to.meta.title === 'string' ? to.meta.title : undefined
    document.title = metaTitle ? `${metaTitle} · zolotoy.dev` : 'zolotoy.dev'
    updateRobotsMeta(to.name)
  })
}
