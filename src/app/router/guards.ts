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

export function loginRedirectFor(from: RouteLocationNormalized): {
  path: '/auth/login'
  query?: { redirect?: string }
} {
  if (isSafeInternalPath(from.fullPath)) {
    return { path: '/auth/login', query: { redirect: from.fullPath } }
  }
  return { path: '/auth/login' }
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
  })
}
