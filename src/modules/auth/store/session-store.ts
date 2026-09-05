import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { AppError } from '@/shared/api/api-error'

import { authApi as defaultAuthApi } from '../api/auth-api'
import { AUTH_ERROR_CODES, type AuthRole, type AuthUserDto } from '../models/auth-dto'
import { authCode } from '../models/auth-error'
import { clearAuthenticatedCache, type AuthFailureReason } from '../session/session-reason'

/**
 * Injectable auth seam. `authApi` sits in a module cycle (session-store ->
 * auth-api -> http-clients-instance -> http-clients -> session-store), which
 * stops Vitest from mocking it transitively. Tests override this binding instead
 * of mocking the module, so the state machine can be driven deterministically
 * without real network and without touching the cycle.
 */
let authBound: typeof defaultAuthApi = defaultAuthApi

export function __setAuthBoundForTest(api: typeof defaultAuthApi): void {
  authBound = api
}

/**
 * Narrow auth/session capability boundary (MASTER_FRONTEND_PLAN §13, §15).
 *
 * Owns only client-global auth lifecycle state:
 *  - explicit status machine `unknown | anonymous | authenticated`;
 *  - memory-only access token (never persisted);
 *  - the current principal / roles;
 *  - a safe `lastReason` for session-expiry/revocation/replay UX.
 *
 * Security invariants (never relaxed):
 *  - access token is memory-only, never written to Storage;
 *  - the refresh credential is browser-cookie compatible and is never held here
 *    or passed to components.
 */

export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated'

export const useSessionStore = defineStore('session', () => {
  const status = ref<SessionStatus>('unknown')
  const accessToken = ref<string | null>(null)
  const principal = ref<AuthUserDto | null>(null)
  const lastReason = ref<AuthFailureReason>('none')
  const bootstrapError = ref<AppError | null>(null)

  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isUnknown = computed(() => status.value === 'unknown')
  const roles = computed<AuthRole[]>(() => principal.value?.roles ?? [])
  const isAdmin = computed(() => roles.value.includes('admin'))
  const email = computed(() => principal.value?.email ?? '')

  /** Memory-only access-token setter (login/refresh/bootstrap). */
  function setAccessToken(token: string | null): void {
    accessToken.value = token
  }

  function applyAuthenticated(user: AuthUserDto, token: string | null): void {
    if (token !== null) accessToken.value = token
    principal.value = user
    status.value = 'authenticated'
    lastReason.value = 'none'
    bootstrapError.value = null
  }

  function setAnonymous(reason: AuthFailureReason = 'none'): void {
    accessToken.value = null
    principal.value = null
    status.value = 'anonymous'
    lastReason.value = reason
  }

  // --------------------------------------------------------------------------
  // Orchestration (login/logout/bootstrap)
  // --------------------------------------------------------------------------

  /** Login: memory access token + principal, then authenticated. */
  async function login(emailAddress: string, password: string): Promise<AuthUserDto> {
    const token = await authBound.login({ email: emailAddress, password })
    setAccessToken(token.access_token)

    try {
      const me = await authBound.getMe()
      applyAuthenticated(me, token.access_token)
      return me
    } catch (error) {
      // Login issued a browser session/access token but principal resolution did
      // not complete. Never leave a half-authenticated memory token behind.
      setAnonymous('none')
      clearAuthenticatedCache()
      throw error
    }
  }

  /** Logout current session; client state clears regardless of response. */
  async function logout(): Promise<void> {
    try {
      await authBound.logout()
    } catch {
      // Session may already be gone — client teardown is still required.
    }
    setAnonymous('none')
    clearAuthenticatedCache()
  }

  /** Logout all sessions; current browser session also ends. */
  async function logoutAll(): Promise<void> {
    try {
      await authBound.logoutAll()
    } catch {
      // Backend state is authoritative; clear client state regardless.
    }
    setAnonymous('none')
    clearAuthenticatedCache()
  }

  // Bootstrap -----------------------------------------------------------------

  let bootstrapPromise: Promise<SessionStatus> | null = null

  /**
   * Cookie-based bootstrap: unknown -> refresh -> memory access token -> GET /me
   * -> authenticated. No valid refresh session -> anonymous (not a fatal error).
   * An infrastructure/server failure sets `bootstrapError` so it is
   * distinguishable from a normal anonymous visitor.
   */
  async function runBootstrap(): Promise<SessionStatus> {
    status.value = 'unknown'
    bootstrapError.value = null

    let token: { access_token: string }
    try {
      token = await authBound.refresh()
    } catch (error) {
      handleBootstrapFailure(error)
      return status.value
    }

    setAccessToken(token.access_token)
    try {
      const me = await authBound.getMe()
      applyAuthenticated(me, token.access_token)
    } catch (error) {
      // /me rejected even after a fresh token — treat as no usable session.
      setAccessToken(null)
      handleBootstrapFailure(error)
    }
    return status.value
  }

  function handleBootstrapFailure(error: unknown): void {
    const appError = typeof error === 'object' && error !== null && 'kind' in error
      ? (error as AppError)
      : null

    const code = authCode(error)
    if (code === AUTH_ERROR_CODES.REFRESH_REUSE) {
      setAnonymous('reuse-detected')
      return
    }
    if (code === AUTH_ERROR_CODES.SESSION_REVOKED) {
      setAnonymous('revoked')
      return
    }
    if (code === AUTH_ERROR_CODES.SESSION_EXPIRED) {
      setAnonymous('expired')
      return
    }

    // A normal "no browser session" (401) or unknown session -> plain anonymous.
    const kind = appError?.kind
    if (kind === 'authentication' || kind === 'authorization' || kind === 'not-found' || !appError) {
      setAnonymous('none')
      return
    }

    // Infrastructure / server / network failure -> distinguishable from anonymous.
    setAnonymous('none')
    bootstrapError.value = appError
  }

  function startBootstrap(): Promise<SessionStatus> {
    if (!bootstrapPromise) {
      bootstrapPromise = runBootstrap().finally(() => {
        bootstrapPromise = null
      })
    }
    return bootstrapPromise
  }

  return {
    status,
    accessToken,
    principal,
    lastReason,
    bootstrapError,
    isAuthenticated,
    isUnknown,
    roles,
    isAdmin,
    email,
    setAccessToken,
    applyAuthenticated,
    setAnonymous,
    login,
    logout,
    logoutAll,
    bootstrap: startBootstrap,
    waitForBootstrap: startBootstrap,
  }
})
