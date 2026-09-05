import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient } from '@tanstack/vue-query'

import { getAppQueryClient, setAppQueryClient } from '@/app/providers/query-client'
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
})
