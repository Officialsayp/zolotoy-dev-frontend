import { getAppQueryClient } from '@/app/providers/query-client'

import { AUTH_ERROR_CODES } from '../models/auth-dto'
import { authCode } from '../models/auth-error'

/**
 * Safe, non-revealing reasons for a session being unusable. Only these
 * high-level reasons are surfaced to the UI — never refresh token values,
 * family IDs or detection internals (MASTER_FRONTEND_PLAN §15.8).
 */
export type AuthFailureReason = 'none' | 'expired' | 'revoked' | 'reuse-detected'

const REASON_MESSAGE: Record<Exclude<AuthFailureReason, 'none'>, string> = {
  expired: 'Your session expired. Sign in again.',
  revoked: 'This session was revoked. Sign in again.',
  'reuse-detected':
    'This session was revoked because a refresh token replay was detected. Sign in again.',
}

export function reasonMessage(reason: AuthFailureReason): string {
  return reason === 'none' ? '' : REASON_MESSAGE[reason]
}

/** Map a normalizeable auth error to the safest user-facing reason. */
export function mapErrorToReason(error: unknown): AuthFailureReason {
  const code = authCode(error)
  switch (code) {
    case AUTH_ERROR_CODES.REFRESH_REUSE:
      return 'reuse-detected'
    case AUTH_ERROR_CODES.SESSION_REVOKED:
      return 'revoked'
    default:
      // SESSION_EXPIRED and any bare 401 degrade to the generic "expired" flow.
      return 'expired'
  }
}

/**
 * Remove server state that may belong to the previous authenticated principal.
 * Keep public shell/system queries (notably health) intact instead of clearing
 * the entire QueryClient. Every module whose queries may hold principal-scoped
 * data opts in here by listing its cache root — Auth, Orders, Notifications and
 * URL Shortener are authenticated/operator-scoped and must not leak cached data
 * across a logout or session expiry.
 */
export function clearAuthenticatedCache(): void {
  const client = getAppQueryClient()
  if (!client) return

  const authenticatedRoots = ['auth', 'orders', 'notifications', 'shortener']
  client.removeQueries({
    predicate: (query) => {
      const root = query.queryKey[0]
      return authenticatedRoots.includes(String(root))
    },
  })
}
