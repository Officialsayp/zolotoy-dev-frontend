import type { AppError } from './api-error'

/**
 * Single-flight refresh coordinator (MASTER_FRONTEND_PLAN §13.7).
 *
 * Guarantees that a burst of concurrent 401 responses shares exactly one refresh
 * attempt, retries the original request at most once on success, and never
 * triggers a refresh from within refresh (no infinite 401 → refresh → 401 loop).
 *
 * The Auth stage (Prompt 02) supplies the concrete `refresh` provider; Foundation
 * provides the coordination primitive and the browser-facing error hook.
 */

export interface RefreshCoordinatorConfig<TRefresh = unknown> {
  /** Performs one refresh; must resolve on success and reject on failure. */
  refresh: () => Promise<TRefresh>
  /** Called after a successful refresh (e.g. store new access token). */
  onRefreshSuccess?: (result: TRefresh) => void
  /** Called when a refresh attempt fails/revokes/expires. */
  onRefreshFailure?: (error: unknown) => void
}

export interface RefreshCoordinator {
  /**
   * Wraps a protected call. On an auth error it triggers a single shared refresh
   * and, if that succeeds, retries the original call exactly once. A second auth
   * error propagates (no loop). Non-auth errors pass through untouched.
   */
  runWithAuthRetry<TResult>(
    fn: () => Promise<TResult>,
    isAuthError: (error: unknown) => boolean,
  ): Promise<TResult>
}

export function createRefreshCoordinator<TRefresh = unknown>(
  config: RefreshCoordinatorConfig<TRefresh>,
): RefreshCoordinator {
  let inflight: Promise<TRefresh> | null = null

  function refreshOnce(): Promise<TRefresh> {
    if (!inflight) {
      inflight = config.refresh().finally(() => {
        inflight = null
      })
    }
    return inflight
  }

  async function runWithAuthRetry<TResult>(
    fn: () => Promise<TResult>,
    isAuthError: (error: unknown) => boolean,
  ): Promise<TResult> {
    try {
      return await fn()
    } catch (error) {
      if (!isAuthError(error)) throw error
      let result: TRefresh
      try {
        result = await refreshOnce()
      } catch (refreshError) {
        config.onRefreshFailure?.(refreshError)
        throw error
      }
      config.onRefreshSuccess?.(result)
      // Retry exactly once after a successful refresh. Any further auth error is
      // not wrapped, so it propagates and surfaces to the caller.
      return fn()
    }
  }

  return { runWithAuthRetry }
}

/** Convenience predicate used by modules: is this a transport-level auth (401)? */
export function isAppErrorOfKind(error: unknown, kind: AppError['kind'] = 'authentication'): boolean {
  if (typeof error === 'object' && error !== null) {
    return (error as AppError).kind === kind
  }
  return false
}
