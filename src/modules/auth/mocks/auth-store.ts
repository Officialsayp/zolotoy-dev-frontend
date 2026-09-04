/**
 * Deterministic in-memory Auth mock store (MASTER_FRONTEND_PLAN §10, §19.4, §15.12).
 *
 * Simulates the Auth backend for MOCK mode: register/login, opaque refresh
 * sessions, rotation with strict replay detection, RBAC, blocked users, rate
 * limiting and safe error codes. The refresh token only exists as an opaque
 * HttpOnly-cookie simulation handled by `auth-handlers.ts` — it never reaches
 * components or the session store.
 *
 * The store is rebuilt from immutable fixtures whenever the scenario changes and
 * mutated in place during a session so demos can progress; reset/switch restores
 * the deterministic baseline.
 */

import { getScenario, type DemoScenarioId } from '@/mocks/scenario-registry'

import type {
  AdminExampleDto,
  AuthRole,
  AuthSessionDto,
  AuthUserDto,
} from '../models/auth-dto'
import {
  AUTH_ADMIN_EMAIL,
  AUTH_ADMIN_ID,
  AUTH_BLOCKED_EMAIL,
  AUTH_BLOCKED_ID,
  AUTH_OTHER_EMAIL,
  AUTH_OTHER_ID,
  AUTH_PASSWORD,
  AUTH_SCENARIO_EPOCH,
  AUTH_USER_EMAIL,
  AUTH_USER_ID,
  SESSION_CURRENT,
  SESSION_OLD,
  SESSION_PHONE,
} from './auth-fixtures'

export class AuthMockError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'AuthMockError'
    this.status = status
    this.code = code
  }
}

const COOKIE = 'zolotoy_refresh'

interface UserRecord {
  user: AuthUserDto
  password: string
}

interface SessionRecord {
  id: string
  familyId: string
  userId: string
  deviceLabel: string
  createdAt: string
  lastUsedAt: string
  expiresAt: string
  revokedAt: string | null
  revokeReason: string | null
  familyRevoked: boolean
  currentRefreshToken: string
  rotatedTokens: Set<string>
  isCurrent: boolean
}

interface StoreState {
  users: Map<string, UserRecord> // user id -> record
  /** Normalized email -> user id (login/register lookup). */
  emails: Map<string, string>
  sessionsById: Map<string, SessionRecord>
  /** Access token -> user id (+ optional expired marker for demos). */
  accessTokens: Map<string, { userId: string; expired?: boolean }>
  /** Refresh token -> session id (includes rotated/used tokens for replay detection). */
  refreshTokens: Map<string, string>
  challenge: number
  flags: {
    invalidCredentials: boolean
    duplicateEmail: boolean
    blockedLogin: boolean
    expiredAccess: boolean
    expiredRefresh: boolean
    revokedSession: boolean
    reuseDetected: boolean
    rateLimited: boolean
  }
}

interface LoginResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

type ScenarioConfig = DemoScenarioId

function at(offsetMinutes: number): string {
  return new Date(Date.parse(AUTH_SCENARIO_EPOCH) + offsetMinutes * 60_000).toISOString()
}

function nowIso(): string {
  return new Date().toISOString()
}

function makeUser(
  id: string,
  email: string,
  roles: AuthRole[],
  status: AuthUserDto['status'],
): UserRecord {
  return {
    user: { id, email, roles, status, created_at: at(-2000), updated_at: at(-100) },
    password: AUTH_PASSWORD,
  }
}

export function readRefreshCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined
  const match = cookieHeader.split(';').map((p) => p.trim())
  for (const pair of match) {
    const [name, value] = pair.split('=')
    if (name === COOKIE) return value
  }
  return undefined
}

export function refreshCookieHeader(token: string): string {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/`
}

export function clearRefreshCookieHeader(): string {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

function buildState(scenario: ScenarioConfig): StoreState {
  const adminRoles: AuthRole[] = ['admin']
  const userRoles: AuthRole[] = ['user']

  const store: StoreState = {
    users: new Map(),
    emails: new Map(),
    sessionsById: new Map(),
    accessTokens: new Map(),
    refreshTokens: new Map(),
    challenge: 0,
    flags: {
      invalidCredentials: scenario === 'auth-invalid-credentials',
      duplicateEmail: scenario === 'auth-duplicate-email',
      blockedLogin: scenario === 'auth-blocked',
      expiredAccess: scenario === 'auth-access-expired-refresh-success',
      expiredRefresh: scenario === 'auth-refresh-expired',
      revokedSession: scenario === 'auth-session-revoked',
      reuseDetected: scenario === 'auth-reuse-detected',
      rateLimited: scenario === 'auth-rate-limited',
    },
  }

  const user = makeUser(AUTH_USER_ID, AUTH_USER_EMAIL, userRoles, 'active')
  const admin = makeUser(AUTH_ADMIN_ID, AUTH_ADMIN_EMAIL, adminRoles, 'active')
  const blocked = makeUser(AUTH_BLOCKED_ID, AUTH_BLOCKED_EMAIL, userRoles, 'blocked')
  const other = makeUser(AUTH_OTHER_ID, AUTH_OTHER_EMAIL, userRoles, 'active')

  const seedUser = (record: UserRecord): void => {
    store.users.set(record.user.id, record)
    store.emails.set(normalize(record.user.email), record.user.id)
  }
  seedUser(user)
  seedUser(admin)
  seedUser(blocked)
  seedUser(other)

  return store
}

function normalize(email: string): string {
  return email.trim().toLowerCase()
}

function sessionIdFor(userId: string, deviceLabel: string, isCurrent: boolean): string {
  if (userId === AUTH_USER_ID) {
    if (isCurrent) return SESSION_CURRENT
    return deviceLabel.toLowerCase().includes('phone') ? SESSION_PHONE : SESSION_OLD
  }

  // Keep mock session ids UUID-shaped and deterministic without reusing the same
  // three ids across different users. The final 12 digits encode user + device.
  const userDigits = userId.replace(/\D/g, '').slice(-8).padStart(8, '0')
  const deviceCode = isCurrent ? '0001' : deviceLabel.toLowerCase().includes('phone') ? '0002' : '0003'
  return `20000000-0000-4000-8000-${userDigits}${deviceCode}`
}

function seedSession(
  store: StoreState,
  userId: string,
  deviceLabel: string,
  isCurrent: boolean,
  expiresOffset: number,
): SessionRecord {
  const id = sessionIdFor(userId, deviceLabel, isCurrent)
  store.challenge += 1
  const refreshToken = `mock-refresh-${id}-${store.challenge}`
  const session: SessionRecord = {
    id,
    familyId: `family-${id}`,
    userId,
    deviceLabel,
    createdAt: at(-500),
    lastUsedAt: at(-60),
    expiresAt: at(expiresOffset),
    revokedAt: null,
    revokeReason: null,
    familyRevoked: false,
    currentRefreshToken: refreshToken,
    rotatedTokens: new Set(),
    isCurrent,
  }
  store.sessionsById.set(id, session)
  store.refreshTokens.set(refreshToken, id)
  return session
}

function issueAccessToken(store: StoreState, userId: string, expired = false): string {
  store.challenge += 1
  const token = `mock-access-${userId}-${store.challenge}`
  store.accessTokens.set(token, { userId, expired })
  return token
}

/** Rotate a session to a fresh refresh token (strict rotation semantics). */
function rotateSession(store: StoreState, session: SessionRecord): string {
  const old = session.currentRefreshToken
  session.rotatedTokens.add(old)
  session.lastUsedAt = nowIso()
  store.challenge += 1
  const next = `mock-refresh-${session.id}-${store.challenge}`
  session.currentRefreshToken = next
  store.refreshTokens.set(next, session.id)
  return next
}

function revokeFamily(store: StoreState, session: SessionRecord, reason: string): void {
  for (const s of store.sessionsById.values()) {
    if (s.familyId === session.familyId) {
      s.familyRevoked = true
      s.revokedAt = nowIso()
      s.revokeReason = reason
    }
  }
}

function requireUserRecord(store: StoreState, email: string): UserRecord {
  const id = store.emails.get(normalize(email))
  const record = id ? store.users.get(id) : undefined
  if (!record) {
    throw new AuthMockError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.')
  }
  return record
}

function principalFromAccess(store: StoreState, accessToken: string | undefined): UserRecord {
  if (!accessToken) throw new AuthMockError(401, 'AUTH_UNAUTHORIZED', 'Authentication required.')
  const entry = store.accessTokens.get(accessToken)
  if (!entry || entry.expired) throw new AuthMockError(401, 'AUTH_UNAUTHORIZED', 'Authentication required.')
  const record = store.users.get(entry.userId)
  if (!record) throw new AuthMockError(401, 'AUTH_UNAUTHORIZED', 'Authentication required.')
  return record
}

function requireActive(record: UserRecord): void {
  if (record.user.status === 'blocked') {
    throw new AuthMockError(403, 'AUTH_USER_BLOCKED', 'This account is blocked.')
  }
}

function resetSessionFromLogin(store: StoreState, record: UserRecord): SessionRecord {
  // Re-seed the canonical device sessions for this user so the list is rich and
  // stable; revoke any previous state first.
  for (const s of store.sessionsById.values()) {
    if (s.userId === record.user.id) s.revokedAt = nowIso()
  }
  const current = seedSession(store, record.user.id, 'Desktop — zolotoy.dev', true, 14 * 24 * 60)
  seedSession(store, record.user.id, 'Phone', false, 7 * 24 * 60)
  seedSession(store, record.user.id, 'Old laptop', false, 2 * 24 * 60)
  return current
}

// ---------------------------------------------------------------------------
// Public store API (consumed by the MSW handlers)
// ---------------------------------------------------------------------------

export interface AuthStoreAPI {
  register(email: string, password: string): void
  login(email: string, password: string): LoginResult
  refresh(refreshToken?: string): LoginResult
  logout(refreshToken?: string): void
  logoutAll(accessToken?: string): void
  getMe(accessToken?: string): AuthUserDto
  listSessions(accessToken?: string): AuthSessionDto[]
  revokeSession(accessToken: string | undefined, sessionId: string): void
  adminExample(accessToken?: string): AdminExampleDto
}

export function createAuthRouter(): AuthStoreAPI {
  return {
    register(email, password) {
      const store = getAuthStore()
      if (store.flags.duplicateEmail && normalize(email) === normalize(AUTH_USER_EMAIL)) {
        throw new AuthMockError(409, 'AUTH_EMAIL_ALREADY_EXISTS', 'An account with this email already exists.')
      }
      if (!email || !email.includes('@')) {
        throw new AuthMockError(400, 'AUTH_VALIDATION', 'A valid email is required.')
      }
      if (!password || password.length < 8) {
        throw new AuthMockError(400, 'AUTH_VALIDATION', 'Password must be at least 8 characters.')
      }
      if (store.emails.has(normalize(email))) {
        throw new AuthMockError(409, 'AUTH_EMAIL_ALREADY_EXISTS', 'An account with this email already exists.')
      }
      store.challenge += 1
      // Deterministic id for a freshly registered demo account.
      const userId = `40000000-0000-4000-8000-${String(store.challenge).padStart(12, '0')}`
      const record: UserRecord = {
        user: {
          id: userId,
          email: email.trim(),
          roles: ['user'],
          status: 'active',
          created_at: nowIso(),
          updated_at: nowIso(),
        },
        password,
      }
      store.users.set(userId, record)
      store.emails.set(normalize(record.user.email), userId)
    },

    login(email, password) {
      const store = getAuthStore()
      if (store.flags.rateLimited) {
        throw new AuthMockError(429, 'AUTH_RATE_LIMITED', 'Too many login attempts. Try again later.')
      }
      if (store.flags.invalidCredentials) {
        throw new AuthMockError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.')
      }
      const record = requireUserRecord(store, email)
      if (record.password !== password) {
        throw new AuthMockError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.')
      }
      if (store.flags.blockedLogin || record.user.status === 'blocked') {
        throw new AuthMockError(403, 'AUTH_USER_BLOCKED', 'This account is blocked.')
      }
      requireActive(record)
      const current = resetSessionFromLogin(store, record)
      const refreshToken = rotateSession(store, current)
      const accessToken = issueAccessToken(store, record.user.id, store.flags.expiredAccess)
      return { accessToken, refreshToken, expiresIn: store.flags.expiredAccess ? 1 : 900 }
    },

    refresh(refreshToken) {
      const store = getAuthStore()
      if (!refreshToken) {
        throw new AuthMockError(401, 'AUTH_UNAUTHORIZED', 'No active session.')
      }
      const sessionId = store.refreshTokens.get(refreshToken)
      if (!sessionId) {
        throw new AuthMockError(401, 'AUTH_UNAUTHORIZED', 'No active session.')
      }
      const session = store.sessionsById.get(sessionId)
      if (!session) throw new AuthMockError(401, 'AUTH_REFRESH_REUSE_DETECTED', 'Refresh token replay detected.')

      // Family-level invalidation takes precedence and is surfaced as replay
      // (the whole family was revoked because a replay was detected).
      if (session.familyRevoked || store.flags.reuseDetected) {
        if (store.flags.reuseDetected) revokeFamily(store, session, 'reuse-detected')
        throw new AuthMockError(401, 'AUTH_REFRESH_REUSE_DETECTED', 'Refresh token replay detected.')
      }
      if (store.flags.revokedSession || session.revokedAt !== null) {
        throw new AuthMockError(401, 'AUTH_SESSION_REVOKED', 'This session was revoked.')
      }
      if (store.flags.expiredRefresh || Date.parse(session.expiresAt) < Date.now()) {
        throw new AuthMockError(401, 'AUTH_SESSION_EXPIRED', 'This session has expired.')
      }
      // Strict replay: a token that was already rotated and is presented again is reuse.
      if (session.rotatedTokens.has(refreshToken)) {
        revokeFamily(store, session, 'reuse-detected')
        throw new AuthMockError(401, 'AUTH_REFRESH_REUSE_DETECTED', 'Refresh token replay detected.')
      }

      const rotated = rotateSession(store, session)
      const accessToken = issueAccessToken(store, session.userId, false)
      return { accessToken, refreshToken: rotated, expiresIn: 900 }
    },

    logout(refreshToken) {
      const store = getAuthStore()
      if (!refreshToken) return
      const sessionId = store.refreshTokens.get(refreshToken)
      const session = sessionId ? store.sessionsById.get(sessionId) : undefined
      if (session) {
        session.revokedAt = nowIso()
        session.revokeReason = 'logged-out'
      }
    },

    logoutAll(accessToken) {
      const store = getAuthStore()
      const record = principalFromAccess(store, accessToken)
      for (const s of store.sessionsById.values()) {
        if (s.userId === record.user.id) {
          s.revokedAt = nowIso()
          s.revokeReason = 'logout-all'
        }
      }
    },

    getMe(accessToken) {
      const store = getAuthStore()
      const record = principalFromAccess(store, accessToken)
      requireActive(record)
      return record.user
    },

    listSessions(accessToken) {
      const store = getAuthStore()
      const record = principalFromAccess(store, accessToken)
      return [...store.sessionsById.values()]
        .filter((s) => s.userId === record.user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((s) => ({
          id: s.id,
          device_label: s.deviceLabel,
          current: s.isCurrent,
          created_at: s.createdAt,
          last_used_at: s.lastUsedAt ?? s.createdAt,
          expires_at: s.expiresAt,
          status: s.revokedAt !== null || s.familyRevoked ? 'revoked' : 'active',
        } satisfies AuthSessionDto))
    },

    revokeSession(accessToken, sessionId) {
      const store = getAuthStore()
      const record = principalFromAccess(store, accessToken)
      const session = store.sessionsById.get(sessionId)
      if (!session || session.userId !== record.user.id) {
        throw new AuthMockError(404, 'AUTH_SESSION_NOT_FOUND', 'Session not found.')
      }
      session.revokedAt = nowIso()
      session.revokeReason = 'revoked-by-user'
    },

    adminExample(accessToken) {
      const store = getAuthStore()
      const record = principalFromAccess(store, accessToken)
      if (!record.user.roles.includes('admin')) {
        throw new AuthMockError(403, 'AUTH_FORBIDDEN', 'Admin role is required.')
      }
      return {
        message: 'Admin demo endpoint reached.',
        policies: ['# RBAC demo — server enforced', `principal=${record.user.id}`, 'role=admin'],
      }
    },
  }
}

let cachedScenario: ScenarioConfig | null = null
let cachedStore: StoreState | undefined

function getAuthStore(): StoreState {
  const scenario = getScenario()
  if (cachedScenario !== scenario || !cachedStore) {
    cachedStore = buildState(scenario)
    cachedScenario = scenario
  }
  return cachedStore
}

export function resetAuthMockState(): void {
  cachedScenario = null
  cachedStore = undefined
}
