/**
 * Auth Service network-boundary DTOs (MASTER_FRONTEND_PLAN §18.2, Prompt 02).
 *
 * Fields marked PROPOSED derive from the backend `User`/`Session` models where
 * the Auth MD leaves the exact OpenAPI shape TBD. The browser refresh token is
 * backend-owned and `HttpOnly` — it never appears here.
 *
 * Source-backed routes:
 *   POST /auth/register | login | refresh | logout | logout-all
 *   GET  /me | /me/sessions | /admin/example
 *   DELETE /me/sessions/{session_id}
 */

export interface CredentialsDto {
  email: string
  password: string
}

/** Register request body — SOURCE CONTRACT `{email,password}`. */
export interface RegisterRequestDto {
  email: string
  password: string
}

/**
 * Token response (source example for non-browser clients). In the browser the
 * refresh token is an HttpOnly cookie, so `refresh_token` is intentionally
 * optional and never stored by the frontend.
 */
export interface TokenResponseDto {
  access_token: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
}

export type UserStatus = 'active' | 'blocked'

export type AuthRole = 'user' | 'admin'

/**
 * Current principal returned by `GET /me`.
 * PROPOSED CONTRACT (master plan §18.2): safe subset of the backend User model.
 */
export interface AuthUserDto {
  id: string
  email: string
  status: UserStatus
  roles: AuthRole[]
  created_at?: string
  updated_at?: string
}

export interface AuthSessionDto {
  id: string
  /** Safe display label; neutral fallback when the API omits it. */
  device_label?: string | null
  /** PROPOSED CONTRACT — current-session marker is TBD in the source contract. */
  current?: boolean
  created_at?: string
  last_used_at?: string
  expires_at?: string
  status?: 'active' | 'revoked'
}

/** `GET /admin/example` demo payload — PROPOSED CONTRACT. */
export interface AdminExampleDto {
  message?: string
  policies: string[]
}

/** Safe external error codes fixed by the Auth service error model (§16). */
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  USER_BLOCKED: 'AUTH_USER_BLOCKED',
  SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  SESSION_REVOKED: 'AUTH_SESSION_REVOKED',
  REFRESH_REUSE: 'AUTH_REFRESH_REUSE_DETECTED',
  EMAIL_EXISTS: 'AUTH_EMAIL_ALREADY_EXISTS',
  RATE_LIMITED: 'AUTH_RATE_LIMITED',
} as const

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]
