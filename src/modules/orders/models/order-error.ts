import type { AppError } from '@/shared/api/api-error'

/**
 * Order-specific interpretation helpers on top of the shared normalized
 * `AppError`. The shared transport only normalizes HTTP status categories; these
 * helpers let the UI distinguish documented Order business errors so it can
 * render dedicated UX instead of a generic conflict (MASTER_FRONTEND_PLAN §9,
 * §14.7).
 */

export const ORDER_ERROR_CODES = {
  VERSION_CONFLICT: 'ORDER_VERSION_CONFLICT',
  IDEMPOTENCY_CONFLICT: 'ORDER_IDEMPOTENCY_CONFLICT',
  INVALID_STATE: 'ORDER_INVALID_STATE',
  PAYMENT_ALREADY_PROCESSING: 'PAYMENT_ALREADY_PROCESSING',
  ORDER_ALREADY_PAID: 'ORDER_ALREADY_PAID',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
} as const

export function isAppError(error: unknown): error is AppError {
  return typeof error === 'object' && error !== null && 'kind' in error
}

/** Optimistic-locking conflict (source §10 / sentinel `ErrVersionConflict`). */
export function isVersionConflict(error: unknown): boolean {
  return isAppError(error) && error.code === ORDER_ERROR_CODES.VERSION_CONFLICT
}

/** Same idempotency key used with a different payload (source §9). */
export function isIdempotencyConflict(error: unknown): boolean {
  return isAppError(error) && error.code === ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT
}

/** A state transition was rejected by the backend domain rule. */
export function isInvalidState(error: unknown): boolean {
  return isAppError(error) && error.code === ORDER_ERROR_CODES.INVALID_STATE
}
