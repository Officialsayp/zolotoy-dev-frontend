import type { AppError } from '@/shared/api/api-error'

import { AUTH_ERROR_CODES, type AuthErrorCode } from './auth-dto'

/**
 * Auth-safe error interpretation. The shared transport normalizes the response;
 * this module maps specific backend codes to security-relevant outcomes so the
 * UI can show the right (safe) message without ever revealing token internals.
 */

export function authCode(error: unknown): AuthErrorCode | undefined {
  if (typeof error === 'object' && error !== null) {
    const code = (error as AppError).code
    if (typeof code === 'string') {
      const values = Object.values(AUTH_ERROR_CODES)
      if (values.includes(code as AuthErrorCode)) return code as AuthErrorCode
    }
  }
  return undefined
}

export function isReuseDetected(error: unknown): boolean {
  return authCode(error) === AUTH_ERROR_CODES.REFRESH_REUSE
}

export function isSessionExpired(error: unknown): boolean {
  return authCode(error) === AUTH_ERROR_CODES.SESSION_EXPIRED
}

export function isSessionRevoked(error: unknown): boolean {
  return authCode(error) === AUTH_ERROR_CODES.SESSION_REVOKED
}

export function isInvalidCredentials(error: unknown): boolean {
  return authCode(error) === AUTH_ERROR_CODES.INVALID_CREDENTIALS
}

export function isEmailExists(error: unknown): boolean {
  return authCode(error) === AUTH_ERROR_CODES.EMAIL_EXISTS
}

export function isUserBlocked(error: unknown): boolean {
  return authCode(error) === AUTH_ERROR_CODES.USER_BLOCKED
}
