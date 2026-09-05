/**
 * URL Shortener source vocabulary (MASTER_FRONTEND_PLAN §17, `04_url_shortener.md`).
 *
 * The exact link `status` enum is a source **TBD** (the schema stores a `status`
 * TEXT column and distinguishes active/expired/disabled/deleted behavior, but no
 * management enum is fixed). We therefore keep a *PROPOSED* frontend display
 * vocabulary for the badges and treat `expired` as a client-derived state from
 * `expires_at`, never as a backend status.
 *
 * The four device categories are fixed by the source analytics spec
 * (`04_url_shortener.md` §18: mobile / desktop / bot / unknown).
 */

/** PROPOSED CONTRACT — display-only statuses, not an agreed backend enum. */
export const SHORT_LINK_STATUSES = ['active', 'disabled', 'deleted'] as const
export type ShortLinkStatus = (typeof SHORT_LINK_STATUSES)[number]

/** Source-fixed coarse device categories. */
export const SHORTENER_DEVICE_CATEGORIES = ['mobile', 'desktop', 'bot', 'unknown'] as const
export type ShortLinkDeviceCategory = (typeof SHORTENER_DEVICE_CATEGORIES)[number]
