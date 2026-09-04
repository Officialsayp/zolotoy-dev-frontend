import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resetScenario, setScenario } from '@/mocks/scenario-registry'

import {
  AUTH_ADMIN_EMAIL,
  AUTH_BLOCKED_EMAIL,
  AUTH_OTHER_EMAIL,
  AUTH_PASSWORD,
  AUTH_USER_EMAIL,
  SESSION_CURRENT,
} from './auth-fixtures'
import { createAuthRouter, resetAuthMockState, type AuthStoreAPI } from './auth-store'

/**
 * Deterministic Auth mock-store scenarios (Prompt 02, TESTS §scenarios, §RBAC,
 * §reuse). Drives the in-memory Auth store exactly as the MSW handlers would.
 */

let api: AuthStoreAPI

beforeEach(() => {
  resetScenario()
  resetAuthMockState()
  api = createAuthRouter()
})

afterEach(() => {
  resetScenario()
  resetAuthMockState()
})

function login(email: string) {
  return api.login(email, AUTH_PASSWORD)
}

describe('auth mock store', () => {
  it('normal user logs in; /me returns user role; sessions are token-free', async () => {
    const tokens = login(AUTH_USER_EMAIL)
    expect(tokens.accessToken).toBeTruthy()
    // The browser keeps the refresh token as a cookie — the mock still returns
    // it to the handler, but it must never reach component state.
    expect(typeof tokens.refreshToken).toBe('string')

    const me = api.getMe(tokens.accessToken)
    expect(me.roles).toEqual(['user'])
    expect(me.status).toBe('active')

    const sessions = api.listSessions(tokens.accessToken)
    expect(sessions.length).toBeGreaterThan(0)
    for (const s of sessions) {
      expect(s).not.toHaveProperty('refresh_token')
      expect(s).not.toHaveProperty('token')
      expect(s).not.toHaveProperty('family_id')
    }
  })

  it('admin user passes /admin/example; normal user is denied 403', () => {
    const adminTokens = login(AUTH_ADMIN_EMAIL)
    const admin = api.adminExample(adminTokens.accessToken)
    expect(admin.policies).toContain('role=admin')

    const userTokens = login(AUTH_USER_EMAIL)
    expect(() => api.adminExample(userTokens.accessToken)).toThrow(
      expect.objectContaining({ status: 403, code: 'AUTH_FORBIDDEN' }),
    )
  })

  it('wrong password and unknown email both return generic invalid credentials', () => {
    expect(() => api.login(AUTH_USER_EMAIL, 'wrong-password')).toThrow(
      expect.objectContaining({ status: 401, code: 'AUTH_INVALID_CREDENTIALS', message: expect.stringContaining('Invalid') }),
    )
    expect(() => api.login('nobody@zolotoy.dev', AUTH_PASSWORD)).toThrow(
      expect.objectContaining({ status: 401, code: 'AUTH_INVALID_CREDENTIALS' }),
    )
  })

  it('invalid-credentials scenario rejects even a correct password', () => {
    setScenario('auth-invalid-credentials')
    resetAuthMockState()
    api = createAuthRouter()
    expect(() => login(AUTH_USER_EMAIL)).toThrow(expect.objectContaining({ status: 401, code: 'AUTH_INVALID_CREDENTIALS' }))
  })

  it('an already-created router follows scenario switches without being recreated', () => {
    expect(() => login(AUTH_USER_EMAIL)).not.toThrow()

    setScenario('auth-rate-limited')
    expect(() => login(AUTH_USER_EMAIL)).toThrow(
      expect.objectContaining({ status: 429, code: 'AUTH_RATE_LIMITED' }),
    )

    setScenario('auth-invalid-credentials')
    expect(() => login(AUTH_USER_EMAIL)).toThrow(
      expect.objectContaining({ status: 401, code: 'AUTH_INVALID_CREDENTIALS' }),
    )
  })

  it('blocked user login returns 403 AUTH_USER_BLOCKED', () => {
    setScenario('auth-blocked')
    resetAuthMockState()
    api = createAuthRouter()
    expect(() => login(AUTH_BLOCKED_EMAIL)).toThrow(expect.objectContaining({ status: 403, code: 'AUTH_USER_BLOCKED' }))
  })

  it('rate-limited scenario rejects login with 429', () => {
    setScenario('auth-rate-limited')
    resetAuthMockState()
    api = createAuthRouter()
    expect(() => login(AUTH_USER_EMAIL)).toThrow(expect.objectContaining({ status: 429, code: 'AUTH_RATE_LIMITED' }))
  })

  it('register rejects a duplicate email but accepts a fresh one', () => {
    expect(() => api.register(AUTH_USER_EMAIL, AUTH_PASSWORD)).toThrow(
      expect.objectContaining({ status: 409, code: 'AUTH_EMAIL_ALREADY_EXISTS' }),
    )
    expect(() => api.register('brand-new@zolotoy.dev', AUTH_PASSWORD)).not.toThrow()
  })

  it('a plain duplicate-email scenario flags login accounts on register', () => {
    setScenario('auth-duplicate-email')
    resetAuthMockState()
    api = createAuthRouter()
    expect(() => api.register(AUTH_USER_EMAIL, AUTH_PASSWORD)).toThrow(
      expect.objectContaining({ status: 409, code: 'AUTH_EMAIL_ALREADY_EXISTS' }),
    )
  })

  it('refresh rotates tokens; replay revokes only that session family, not other devices', () => {
    const { refreshToken: t1, accessToken } = login(AUTH_USER_EMAIL)
    const before = api.listSessions(accessToken)
    expect(before.filter((s) => s.status === 'active')).toHaveLength(3)

    const t2 = api.refresh(t1)
    expect(t2.refreshToken).not.toBe(t1)
    expect(api.getMe(t2.accessToken).id).toBeTruthy()

    // Presenting the already-rotated token again is strict replay detection.
    expect(() => api.refresh(t1)).toThrow(
      expect.objectContaining({ status: 401, code: 'AUTH_REFRESH_REUSE_DETECTED' }),
    )
    // The newest token in that same family is rejected too.
    expect(() => api.refresh(t2.refreshToken)).toThrow(
      expect.objectContaining({ status: 401, code: 'AUTH_REFRESH_REUSE_DETECTED' }),
    )

    const after = api.listSessions(accessToken)
    expect(after.find((s) => s.id === SESSION_CURRENT)?.status).toBe('revoked')
    expect(after.filter((s) => s.id !== SESSION_CURRENT && s.status === 'active')).toHaveLength(2)
  })

  it('reuse-detected scenario immediately rejects refresh with replay', () => {
    setScenario('auth-reuse-detected')
    resetAuthMockState()
    api = createAuthRouter()
    const { refreshToken } = login(AUTH_USER_EMAIL)
    expect(() => api.refresh(refreshToken)).toThrow(
      expect.objectContaining({ status: 401, code: 'AUTH_REFRESH_REUSE_DETECTED' }),
    )
  })

  it('refresh-expired scenario returns AUTH_SESSION_EXPIRED', () => {
    setScenario('auth-refresh-expired')
    resetAuthMockState()
    api = createAuthRouter()
    const { refreshToken } = login(AUTH_USER_EMAIL)
    expect(() => api.refresh(refreshToken)).toThrow(
      expect.objectContaining({ status: 401, code: 'AUTH_SESSION_EXPIRED' }),
    )
  })

  it('session-revoked scenario returns AUTH_SESSION_REVOKED', () => {
    setScenario('auth-session-revoked')
    resetAuthMockState()
    api = createAuthRouter()
    const { refreshToken } = login(AUTH_USER_EMAIL)
    expect(() => api.refresh(refreshToken)).toThrow(
      expect.objectContaining({ status: 401, code: 'AUTH_SESSION_REVOKED' }),
    )
  })

  it('access-expired scenario issues an expired access token that refresh recovers', () => {
    setScenario('auth-access-expired-refresh-success')
    resetAuthMockState()
    api = createAuthRouter()
    const { accessToken, refreshToken } = login(AUTH_USER_EMAIL)
    // The issued access token is already expired -> protected /me fails.
    expect(() => api.getMe(accessToken)).toThrow(expect.objectContaining({ status: 401, code: 'AUTH_UNAUTHORIZED' }))
    // A silent refresh issues a fresh, valid access token.
    const next = api.refresh(refreshToken)
    expect(api.getMe(next.accessToken).id).toBeTruthy()
  })

  it('revokeSession marks one device revoked; logout-all revokes every session', () => {
    const tokens = login(AUTH_USER_EMAIL)
    const sessions = api.listSessions(tokens.accessToken)
    expect(sessions.length).toBe(3)

    const toRevoke = sessions.find((s) => s.id !== SESSION_CURRENT)
    expect(toRevoke).toBeDefined()
    api.revokeSession(tokens.accessToken, toRevoke!.id)

    const after = api.listSessions(tokens.accessToken)
    const revoked = after.find((s) => s.id === toRevoke!.id)
    expect(revoked?.status).toBe('revoked')

    api.logoutAll(tokens.accessToken)
    const all = api.listSessions(tokens.accessToken)
    expect(all.every((s) => s.status === 'revoked')).toBe(true)
  })

  it('logout revokes only the current session, not other devices', () => {
    const tokens = login(AUTH_USER_EMAIL)
    const { refreshToken, accessToken } = tokens
    api.logout(refreshToken)
    const sessions = api.listSessions(accessToken)
    const revoked = sessions.filter((s) => s.status === 'revoked')
    expect(revoked).toHaveLength(1)
    expect(revoked[0].id).toBe(SESSION_CURRENT)
  })

  it('revoking another user session is not found (404)', () => {
    const userTokens = login(AUTH_USER_EMAIL)
    const otherTokens = login(AUTH_OTHER_EMAIL)
    const otherSessions = api.listSessions(otherTokens.accessToken)
    expect(() => api.revokeSession(userTokens.accessToken, otherSessions[0].id)).toThrow(
      expect.objectContaining({ status: 404 }),
    )
  })
})
