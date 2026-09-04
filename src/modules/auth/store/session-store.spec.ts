import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import type { TokenResponseDto, AuthUserDto } from '../models/auth-dto'
import { AUTH_ERROR_CODES } from '../models/auth-dto'
import { __setAuthBoundForTest, useSessionStore } from './session-store'

/**
 * Auth/session state-machine tests (Prompt 02, TESTS §bootstrap, §storage).
 * `authApi` is injected through the store's test seam so the exact outcomes can
 * be driven deterministically without real network and without the module cycle.
 */

const authMock = vi.hoisted(() => ({
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

const USER: AuthUserDto = {
  id: 'u1',
  email: 'user@zolotoy.dev',
  status: 'active',
  roles: ['user'],
}

function token(accessToken = 'memory-access-token'): TokenResponseDto {
  return { access_token: accessToken }
}

function authError(code: string, kind: string, status = 401): unknown {
  return { kind, status, code, message: code }
}

beforeEach(() => {
  setActivePinia(createPinia())
  const api = {
    register: authMock.register,
    login: authMock.login,
    refresh: authMock.refresh,
    logout: authMock.logout,
    logoutAll: authMock.logoutAll,
    getMe: authMock.getMe,
    getSessions: authMock.getSessions,
    revokeSession: authMock.revokeSession,
    getAdminExample: authMock.getAdminExample,
  }
  __setAuthBoundForTest(api)
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('session-store auth state machine', () => {
  it('starts unknown', () => {
    const s = useSessionStore()
    expect(s.status).toBe('unknown')
    expect(s.isUnknown).toBe(true)
    expect(s.isAuthenticated).toBe(false)
  })

  it('bootstrap with no valid refresh session -> anonymous (not a fatal error)', async () => {
    authMock.refresh.mockRejectedValueOnce(authError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'authentication'))
    const s = useSessionStore()
    const status = await s.waitForBootstrap()
    expect(status).toBe('anonymous')
    expect(s.isAuthenticated).toBe(false)
    expect(s.lastReason).toBe('none')
    expect(s.bootstrapError).toBeNull()
  })

  it('bootstrap success -> authenticated with memory access token', async () => {
    authMock.refresh.mockResolvedValueOnce(token('access-123'))
    authMock.getMe.mockResolvedValueOnce(USER)
    const s = useSessionStore()
    await s.waitForBootstrap()
    expect(s.status).toBe('authenticated')
    expect(s.isAuthenticated).toBe(true)
    expect(s.roles).toEqual(['user'])
    expect(s.email).toBe('user@zolotoy.dev')
    expect(s.accessToken).toBe('access-123')
  })

  it('bootstrap refresh-replay -> anonymous with reuse-detected reason', async () => {
    authMock.refresh.mockRejectedValueOnce(authError(AUTH_ERROR_CODES.REFRESH_REUSE, 'authentication'))
    const s = useSessionStore()
    await s.waitForBootstrap()
    expect(s.status).toBe('anonymous')
    expect(s.lastReason).toBe('reuse-detected')
  })

  it('bootstrap revoked session -> anonymous with revoked reason', async () => {
    authMock.refresh.mockRejectedValueOnce(authError(AUTH_ERROR_CODES.SESSION_REVOKED, 'authentication'))
    const s = useSessionStore()
    await s.waitForBootstrap()
    expect(s.status).toBe('anonymous')
    expect(s.lastReason).toBe('revoked')
  })

  it('bootstrap expired refresh -> anonymous with expired reason', async () => {
    authMock.refresh.mockRejectedValueOnce(authError(AUTH_ERROR_CODES.SESSION_EXPIRED, 'authentication'))
    const s = useSessionStore()
    await s.waitForBootstrap()
    expect(s.status).toBe('anonymous')
    expect(s.lastReason).toBe('expired')
  })

  it('bootstrap infrastructure/server failure is distinguishable from anonymous', async () => {
    authMock.refresh.mockRejectedValueOnce(authError('SERVICE_UNAVAILABLE', 'service', 503))
    const s = useSessionStore()
    await s.waitForBootstrap()
    expect(s.status).toBe('anonymous')
    expect(s.bootstrapError).not.toBeNull()
    expect(s.lastReason).toBe('none')
  })

  it('bootstrap is a singleton: concurrent waiters share one call', async () => {
    authMock.refresh.mockResolvedValueOnce(token('access-1'))
    authMock.getMe.mockResolvedValueOnce(USER)
    const s = useSessionStore()
    await Promise.all([s.waitForBootstrap(), s.waitForBootstrap(), s.waitForBootstrap()])
    expect(authMock.refresh).toHaveBeenCalledTimes(1)
  })

  it('login -> authenticated with principal and memory access token', async () => {
    authMock.login.mockResolvedValueOnce(token('access-login'))
    authMock.getMe.mockResolvedValueOnce(USER)
    const s = useSessionStore()
    const me = await s.login('user@zolotoy.dev', 'DemoPassword!123')
    expect(me.id).toBe('u1')
    expect(s.status).toBe('authenticated')
    expect(s.principal?.email).toBe('user@zolotoy.dev')
    expect(s.accessToken).toBe('access-login')
  })

  it('login clears a newly issued access token when /me fails', async () => {
    authMock.login.mockResolvedValueOnce(token('partial-access'))
    authMock.getMe.mockRejectedValueOnce(authError('SERVICE_UNAVAILABLE', 'service', 503))
    const s = useSessionStore()

    await expect(s.login('user@zolotoy.dev', 'DemoPassword!123')).rejects.toMatchObject({
      kind: 'service',
    })

    expect(s.status).toBe('anonymous')
    expect(s.accessToken).toBeNull()
    expect(s.principal).toBeNull()
  })

  it('logout clears auth state and access token', async () => {
    authMock.login.mockResolvedValueOnce(token('access-login'))
    authMock.getMe.mockResolvedValueOnce(USER)
    const s = useSessionStore()
    await s.login('user@zolotoy.dev', 'DemoPassword!123')
    expect(s.isAuthenticated).toBe(true)

    await s.logout()
    expect(s.status).toBe('anonymous')
    expect(s.isAuthenticated).toBe(false)
    expect(s.accessToken).toBeNull()
    expect(s.principal).toBeNull()
  })

  it('logout-all clears auth state regardless of a failed backend call', async () => {
    authMock.login.mockResolvedValueOnce(token('access-login'))
    authMock.getMe.mockResolvedValueOnce(USER)
    authMock.logoutAll.mockRejectedValueOnce(new Error('boom'))
    const s = useSessionStore()
    await s.login('user@zolotoy.dev', 'DemoPassword!123')
    await s.logoutAll()
    expect(s.status).toBe('anonymous')
    expect(s.accessToken).toBeNull()
  })

  it('the access token is memory-only and never written to Storage', async () => {
    authMock.login.mockResolvedValueOnce(token('memory-access-token'))
    authMock.getMe.mockResolvedValueOnce(USER)
    const s = useSessionStore()
    await s.login('user@zolotoy.dev', 'DemoPassword!123')
    expect(s.accessToken).toBe('memory-access-token')
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })
})
