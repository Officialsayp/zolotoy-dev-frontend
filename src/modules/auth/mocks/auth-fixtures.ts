/**
 * Deterministic Auth mock fixtures (MASTER_FRONTEND_PLAN §19.4).
 *
 * Stable users/emails/ids and session ids; opaque token strings generated
 * deterministically inside the store. Refresh token values are never shown to
 * the UI — they only exist as the mock's HttpOnly-cookie simulation.
 */

export const AUTH_PASSWORD = 'DemoPassword!123'

export const AUTH_USER_EMAIL = 'user@zolotoy.dev'
export const AUTH_ADMIN_EMAIL = 'admin@zolotoy.dev'
export const AUTH_BLOCKED_EMAIL = 'blocked@zolotoy.dev'
export const AUTH_OTHER_EMAIL = 'other@zolotoy.dev'
export const AUTH_EXISTS_EMAIL = AUTH_USER_EMAIL

export const AUTH_USER_ID = '30000000-0000-4000-8000-000000000001'
export const AUTH_ADMIN_ID = '30000000-0000-4000-8000-000000000002'
export const AUTH_BLOCKED_ID = '30000000-0000-4000-8000-000000000003'
export const AUTH_OTHER_ID = '30000000-0000-4000-8000-000000000004'

export const SESSION_CURRENT = '20000000-0000-4000-8000-000000000001'
export const SESSION_PHONE = '20000000-0000-4000-8000-000000000002'
export const SESSION_OLD = '20000000-0000-4000-8000-000000000003'

/** Scenario epoch shared with the fixtures (UTC). */
export const AUTH_SCENARIO_EPOCH = '2026-09-01T12:00:00Z'
