/**
 * Normalized frontend error model (MASTER_FRONTEND_PLAN §12).
 *
 * Transport/network failures are collapsed into a small set of categories so
 * pages, toasts and forms can render consistent UX without re-deriving meaning
 * from raw HTTP statuses. Service modules may add their own interpretation of a
 * backend error `code` on top, but the category here is global.
 */

export type AppErrorKind =
  | 'network'
  | 'timeout'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not-found'
  | 'conflict'
  | 'rate-limit'
  | 'business'
  | 'server'
  | 'unknown'

export const APP_ERROR_KIND_LABEL: Record<AppErrorKind, string> = {
  network: 'Network error',
  timeout: 'Request timed out',
  validation: 'Invalid input',
  authentication: 'Authentication required',
  authorization: 'Access denied',
  'not-found': 'Not found',
  conflict: 'Conflict',
  'rate-limit': 'Too many requests',
  business: 'Request rejected',
  server: 'Server error',
  unknown: 'Unexpected error',
}

export interface AppErrorOptions {
  kind: AppErrorKind
  status?: number
  code?: string
  message?: string
  details?: unknown
  cause?: unknown
}

export interface AppError {
  kind: AppErrorKind
  status?: number
  /** Safe backend/envelope error code, e.g. `ORDER_INVALID_STATE`. */
  code?: string
  /** User-presentable, safe message (never raw stack/SQL/internal text). */
  message: string
  details?: unknown
  cause?: unknown
}

export function createAppError(options: AppErrorOptions): AppError {
  const message =
    options.message && options.message.trim() !== ''
      ? sanitizeMessage(options.message)
      : APP_ERROR_KIND_LABEL[options.kind]
  return {
    kind: options.kind,
    status: options.status,
    code: options.code,
    message,
    details: options.details,
    cause: options.cause,
  }
}

/**
 * Keep backend-supplied messages presentable. Backends must not send raw
 * stack/SQL; this is a safety net that caps length and strips obvious
 * trace-like/sensitive fragments.
 */
export function sanitizeMessage(message: string): string {
  const trimmed = message.trim()
  if (trimmed.length > 500) {
    return `${trimmed.slice(0, 500)}…`
  }
  if (/stack trace|at [A-Za-z_$][\w$]*\s*\(/i.test(trimmed)) {
    return APP_ERROR_KIND_LABEL.unknown
  }
  return trimmed
}
