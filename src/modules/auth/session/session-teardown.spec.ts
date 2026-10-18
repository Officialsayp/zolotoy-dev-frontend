import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient } from '@tanstack/vue-query'

import { getAppQueryClient, setAppQueryClient } from '@/app/providers/query-client'
import { createRefreshCoordinator, isAppErrorOfKind } from '@/shared/api/refresh-coordinator'
import { AUTH_ERROR_CODES } from '../models/auth-dto'
import { useSessionStore } from '../store/session-store'
import { handleAuthFailure, teardownAfterLogout } from './session-teardown'

/**
 * Auth teardown tests (Prompt 02, TESTS §refresh failure clears state/cache,
 * §reuse reason preserved): an unrecoverable refresh failure must clear auth
 * state + authenticated query caches and preserve a safe (non-revealing) reason.
 * Uses the real app QueryClient holder so cache-clearing is verified against
 * reality instead of a mock (module mocking is brittle here due to the
 * session-store/http-clients cycle).
 */

function client(): QueryClient {
  return getAppQueryClient()!
}

function seedQuery(): void {
  client().setQueryData(['auth', 'me'], { id: 'u1' })
  client().setQueryData(['orders', 'detail', 'o1'], { id: 'o1' })
  client().setQueryData(['notifications', 'list'], [{ id: 'n1' }])
  client().setQueryData(['shortener', 'list'], [{ id: 's1' }])
  client().setQueryData(['system', 'health', 'auth'], 'healthy')
}

beforeEach(() => {
  setActivePinia(createPinia())
  setAppQueryClient(new QueryClient({ defaultOptions: { queries: { retry: false } } }))
})

beforeAll(async () => {
  // teardown() navigates with `void router.push('/auth/login')`, whose lazy
  // route components (app-shell.vue + auth-login-page.vue and their import
  // closures) resolve asynchronously. Under vitest 5 an import that settles
  // after the jsdom environment is torn down is reported as an unhandled
  // EnvironmentTeardownError. Warming the module graph up front (same
  // registry the router uses) makes every navigation in these tests resolve
  // from cache instead of dangling past teardown.
  await import('@/app/shell/app-shell.vue')
  await import('@/modules/auth/pages/auth-login-page.vue')
})

afterEach(() => {
  setAppQueryClient(undefined as unknown as QueryClient)
})

describe('session teardown', () => {
  it('refresh-replay failure clears state + cache with safe reason', () => {
    seedQuery()
    expect(client().getQueryData(['auth', 'me'])).toBeTruthy()

    const store = useSessionStore()
    store.applyAuthenticated({ id: 'u1', email: 'u@z.dev', status: 'active', roles: ['user'] }, 'access-1')
    expect(store.isAuthenticated).toBe(true)

    handleAuthFailure({ kind: 'authentication', status: 401, code: AUTH_ERROR_CODES.REFRESH_REUSE, message: 'replay' })

    expect(store.status).toBe('anonymous')
    expect(store.accessToken).toBeNull()
    expect(store.lastReason).toBe('reuse-detected')
    expect(client().getQueryData(['auth', 'me'])).toBeUndefined()
    expect(client().getQueryData(['orders', 'detail', 'o1'])).toBeUndefined()
    expect(client().getQueryData(['notifications', 'list'])).toBeUndefined()
    expect(client().getQueryData(['shortener', 'list'])).toBeUndefined()
    expect(client().getQueryData(['system', 'health', 'auth'])).toBe('healthy')
  })

  it('expired refresh graceful-degrades to the expired reason; state + cache cleared', () => {
    seedQuery()
    const store = useSessionStore()
    handleAuthFailure({ kind: 'authentication', status: 401, code: AUTH_ERROR_CODES.SESSION_EXPIRED, message: 'x' })
    expect(store.status).toBe('anonymous')
    expect(store.lastReason).toBe('expired')
    expect(client().getQueryData(['auth', 'me'])).toBeUndefined()
  })

  it('session-revoked failure maps to the revoked reason', () => {
    const store = useSessionStore()
    handleAuthFailure({ kind: 'authentication', status: 401, code: AUTH_ERROR_CODES.SESSION_REVOKED, message: 'x' })
    expect(store.lastReason).toBe('revoked')
  })

  it('a bare 401 clears state and cache (no false reason banner)', () => {
    seedQuery()
    const store = useSessionStore()
    handleAuthFailure({ kind: 'authentication', status: 401, code: 'AUTH_UNAUTHORIZED', message: 'x' })
    expect(store.status).toBe('anonymous')
    expect(store.lastReason).toBe('expired')
    expect(client().getQueryData(['auth', 'me'])).toBeUndefined()
  })

  it('logout teardown clears state without an alarm reason', () => {
    seedQuery()
    const store = useSessionStore()
    store.applyAuthenticated({ id: 'u1', email: 'u@z.dev', status: 'active', roles: ['user'] }, 'access-1')
    teardownAfterLogout()
    expect(store.status).toBe('anonymous')
    expect(store.lastReason).toBe('none')
    expect(client().getQueryData(['auth', 'me'])).toBeUndefined()
  })

  it('transient refresh failures (network/timeout/server/rate-limit) keep the session', () => {
    seedQuery()
    const store = useSessionStore()
    store.applyAuthenticated({ id: 'u1', email: 'u@z.dev', status: 'active', roles: ['user'] }, 'access-1')

    for (const kind of ['network', 'timeout', 'server', 'rate-limit'] as const) {
      handleAuthFailure({ kind, message: `transient ${kind}` })
      expect(store.status, kind).toBe('authenticated')
      expect(store.lastReason, kind).toBe('none')
    }
    // Cache stays intact — the user is not logged out.
    expect(client().getQueryData(['auth', 'me'])).toBeTruthy()
    expect(client().getQueryData(['orders', 'detail', 'o1'])).toBeTruthy()
  })

  it('authentication verdicts still tear down after a transient pass-through', () => {
    const store = useSessionStore()
    store.applyAuthenticated({ id: 'u1', email: 'u@z.dev', status: 'active', roles: ['user'] }, 'access-1')
    handleAuthFailure({ kind: 'network', message: 'blip' })
    handleAuthFailure({ kind: 'authentication', status: 401, code: 'AUTH_UNAUTHORIZED', message: 'x' })
    expect(store.status).toBe('anonymous')
    expect(store.lastReason).toBe('expired')
  })
})

describe('refresh coordinator + teardown wiring (integration)', () => {
  /**
   * The full contract the app wires in http-clients.ts: onRefreshFailure →
   * handleAuthFailure. A transient refresh failure must (a) keep the session
   * and cache, (b) surface the refresh error itself to the caller so query
   * retry classification treats it as retryable; an auth verdict must tear the
   * session down and surface the original 401.
   */

  function authenticate(): ReturnType<typeof useSessionStore> {
    const store = useSessionStore()
    store.applyAuthenticated({ id: 'u1', email: 'u@z.dev', status: 'active', roles: ['user'] }, 'access-1')
    seedQuery()
    return store
  }

  it('transient refresh failure: session + cache kept, caller gets the retryable refresh error', async () => {
    const wired = createRefreshCoordinator({
      refresh: () => Promise.reject({ kind: 'network', message: 'blip' }),
      onRefreshFailure: (error) => handleAuthFailure(error),
    })
    const store = authenticate()

    await expect(
      wired.runWithAuthRetry(
        () => Promise.reject({ kind: 'authentication', status: 401, message: 'stale 401' }),
        isAppErrorOfKind,
      ),
    ).rejects.toMatchObject({ kind: 'network' })

    expect(store.status).toBe('authenticated')
    expect(store.lastReason).toBe('none')
    expect(client().getQueryData(['orders', 'detail', 'o1'])).toBeTruthy()
    expect(client().getQueryData(['auth', 'me'])).toBeTruthy()
  })

  it('auth-verdict refresh failure: session + cache torn down, caller gets the original 401', async () => {
    const wired = createRefreshCoordinator({
      refresh: () => Promise.reject({ kind: 'authentication', status: 401, code: AUTH_ERROR_CODES.SESSION_EXPIRED, message: 'expired' }),
      onRefreshFailure: (error) => handleAuthFailure(error),
    })
    const store = authenticate()
    const original = { kind: 'authentication', status: 401, message: 'stale 401' }

    await expect(
      wired.runWithAuthRetry(() => Promise.reject(original), isAppErrorOfKind),
    ).rejects.toBe(original)

    expect(store.status).toBe('anonymous')
    expect(store.lastReason).toBe('expired')
    expect(client().getQueryData(['orders', 'detail', 'o1'])).toBeUndefined()
  })
})
