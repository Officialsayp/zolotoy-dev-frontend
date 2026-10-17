import { router } from '@/app/router'

import type { AppError } from '@/shared/api/api-error'

import { useSessionStore } from '../store/session-store'
import { clearAuthenticatedCache, mapErrorToReason, type AuthFailureReason } from './session-reason'

/**
 * Client-side auth teardown shared by the refresh coordinator and logout flows.
 * These run outside any component context, so they read the Pinia store and the
 * app-wide QueryClient holder directly.
 */

/**
 * AppError kinds that describe infrastructure trouble, not an auth verdict.
 * A refresh that failed because the service was unreachable (network blip,
 * 5xx, timeout, backpressure) does not prove the session is invalid: tearing
 * down on it would log users out on transient errors. The original request's
 * error still propagates to its caller as retryable.
 */
const TRANSIENT_REFRESH_KINDS: ReadonlySet<AppError['kind']> = new Set([
  'network',
  'timeout',
  'server',
  'rate-limit',
])

/** Called by the single-flight coordinator when a refresh attempt fails. */
export function handleAuthFailure(error: unknown): void {
  const appError = typeof error === 'object' && error !== null && 'kind' in error
    ? (error as AppError)
    : null
  if (appError && TRANSIENT_REFRESH_KINDS.has(appError.kind)) {
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
