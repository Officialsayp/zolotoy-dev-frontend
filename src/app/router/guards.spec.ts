import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'

import { __setAuthBoundForTest, useSessionStore } from '@/modules/auth/store/session-store'
import { installAppGuards, isSafeInternalPath, loginRedirectFor } from './guards'

/**
 * Route-guard tests (Prompt 02, TESTS §protected route redirect, §no flash
 * during unknown). Pure redirect-policy checks plus an integration through a
 * real in-memory router with the auth store (bootstrap injected to anonymous).
 */

const authApi = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  getMe: vi.fn(),
  getSessions: vi.fn(),
  revokeSession: vi.fn(),
  getAdminExample: vi.fn(),
}))

const Dummy = { template: '<div />' }

function makeRouter(): ReturnType<typeof createRouter> {
  const routes: RouteRecordRaw[] = [
    { path: '/', component: Dummy },
    { path: '/auth/login', component: Dummy, meta: { public: true } },
    { path: '/auth/register', component: Dummy, meta: { public: true } },
    { path: '/auth/profile', component: Dummy, meta: { requiresAuth: true } },
    { path: '/auth/admin', component: Dummy, meta: { requiresAuth: true, requiredRole: 'admin' } },
  ]
  const router = createRouter({ history: createMemoryHistory(), routes })
  installAppGuards(router)
  return router
}

beforeEach(() => {
  setActivePinia(createPinia())
  __setAuthBoundForTest({
    register: authApi.register,
    login: authApi.login,
    refresh: authApi.refresh,
    logout: authApi.logout,
    logoutAll: authApi.logoutAll,
    getMe: authApi.getMe,
    getSessions: authApi.getSessions,
    revokeSession: authApi.revokeSession,
    getAdminExample: authApi.getAdminExample,
  })
  authApi.refresh.mockReset()
  authApi.getMe.mockReset()
})

describe('redirect policy (open-redirect safety)', () => {
  it('accepts only safe internal paths', () => {
    expect(isSafeInternalPath('/orders/123')).toBe(true)
    expect(isSafeInternalPath('/auth/profile')).toBe(true)
    expect(isSafeInternalPath('https://evil.example')).toBe(false)
    expect(isSafeInternalPath('//evil.example')).toBe(false)
    expect(isSafeInternalPath('javascript:alert(1)')).toBe(false)
    expect(isSafeInternalPath('/auth/login')).toBe(false)
    expect(isSafeInternalPath('/auth/register?x=1')).toBe(false)
    expect(isSafeInternalPath('')).toBe(false)
    expect(isSafeInternalPath('relative/path')).toBe(false)
    expect(isSafeInternalPath('/auth/profile#frag')).toBe(false)
  })

  it('loginRedirectFor preserves a safe target and drops unsafe ones', () => {
    const to = (path: string) => ({ fullPath: path }) as never
    expect(loginRedirectFor(to('/orders/7'))).toEqual({ path: '/auth/login', query: { redirect: '/orders/7' } })
    expect(loginRedirectFor(to('/auth/login'))).toEqual({ path: '/auth/login' })
    expect(loginRedirectFor(to('//evil.example'))).toEqual({ path: '/auth/login' })
  })
})

describe('route guards integration', () => {
  it('anonymous visitor on a protected route is redirected to sign-in', async () => {
    authApi.refresh.mockRejectedValueOnce({ kind: 'authentication', status: 401, code: 'AUTH_UNAUTHORIZED' })
    const router = makeRouter()
    await router.push('/auth/profile')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/auth/login')
  })

  it('bootstrap success lets a protected route render (no flash of login)', async () => {
    authApi.refresh.mockResolvedValueOnce({ access_token: 'access-1' })
    authApi.getMe.mockResolvedValueOnce({ id: 'u1', email: 'u@z.dev', status: 'active', roles: ['user'] })
    const router = makeRouter()
    await router.push('/auth/profile')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/auth/profile')
    expect(useSessionStore().isAuthenticated).toBe(true)
  })

  it('an authenticated user is taken off the public login page', async () => {
    const session = useSessionStore()
    session.applyAuthenticated({ id: 'u1', email: 'u@z.dev', status: 'active', roles: ['user'] }, 'access-1')
    const router = makeRouter()
    await router.push('/auth/login')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/auth/profile')
  })
})
