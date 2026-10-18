import { router } from '@/app/router'

import type { AppError } from '@/shared/api/api-error'
import { isTransientRefreshError } from '@/shared/api/refresh-coordinator'

import { useSessionStore } from '../store/session-store'
import { clearAuthenticatedCache, mapErrorToReason, type AuthFailureReason } from './session-reason'

/**
 * Client-side auth teardown shared by the refresh coordinator and logout flows.
 * These run outside any component context, so they read the Pinia store and the
 * app-wide QueryClient holder directly.
 */

/** Called by the single-flight coordinator when a refresh attempt fails. */
export function handleAuthFailure(error: unknown): void {
  const appError = typeof error === 'object' && error !== null && 'kind' in error
    ? (error as AppError)
    : null
  // Transient infrastructure failures keep the session; the coordinator also
  // propagates the same error to the caller, so the request surfaces as
  // retryable (kind network/timeout/server/rate-limit) instead of the stale 401.
  if (appError && isTransientRefreshError(appError)) {
    return
  }
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
