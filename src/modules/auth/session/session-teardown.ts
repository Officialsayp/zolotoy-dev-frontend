import { router } from '@/app/router'

import { useSessionStore } from '../store/session-store'
import { clearAuthenticatedCache, mapErrorToReason, type AuthFailureReason } from './session-reason'

/**
 * Client-side auth teardown shared by the refresh coordinator and logout flows.
 * These run outside any component context, so they read the Pinia store and the
 * app-wide QueryClient holder directly.
 */

/** Called by the single-flight coordinator when a refresh attempt is terminal. */
export function handleAuthFailure(error: unknown): void {
  const reason = mapErrorToReason(error)
  teardown(reason)
}

/** Clear local auth state + authenticated caches and route to sign-in. */
export function teardown(reason: AuthFailureReason): void {
  useSessionStore().setAnonymous(reason)
  clearAuthenticatedCache()
  void router.push({ path: '/auth/login', query: reason !== 'none' ? { reason } : {} })
}

/** Explicit logout / logout-all cleanup (no alarm banner, current session ended). */
export function teardownAfterLogout(): void {
  teardown('none')
}
