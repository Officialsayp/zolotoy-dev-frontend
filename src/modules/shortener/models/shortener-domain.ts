import type {
  ClicksByDay,
  ShortLinkAnalyticsDto,
} from './shortener-dto'
import { isDeviceCategory, parseShortLinkStatus } from './shortener-domain-guards'
import {
  SHORTENER_DEVICE_CATEGORIES,
  SHORT_LINK_STATUSES,
  type ShortLinkDeviceCategory,
  type ShortLinkStatus,
} from './shortener-types'

export { SHORTENER_DEVICE_CATEGORIES, SHORT_LINK_STATUSES }
export type { ShortLinkDeviceCategory, ShortLinkStatus } from './shortener-types'
export { isDeviceCategory, parseShortLinkStatus } from './shortener-domain-guards'

/**
 * URL Shortener domain/display policy (MASTER_FRONTEND_PLAN §17, `04_url_shortener.md`).
 *
 * Centralizes every rule that must not drift: URL/alias UX validation (backend is
 * authoritative), expiration handling, a PROPOSED status badge vocabulary, and the
 * analytics DTO → view-model mapping that both the SVG/CSS visualization and the
 * accessible table consume — so they can never show different numbers.
 */

export interface StatusMeta {
  label: string
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'
  dot: boolean
}

/** PROPOSED CONTRACT — display meta, not an agreed backend status enum. */
export const SHORT_LINK_STATUS_META: Record<ShortLinkStatus, StatusMeta> = {
  active: { label: 'Active', tone: 'success', dot: true },
  disabled: { label: 'Disabled', tone: 'warning', dot: true },
  deleted: { label: 'Deleted', tone: 'danger', dot: false },
}

const MAX_URL_LENGTH = 2048

/**
 * Map an arbitrary backend `status` (TBD enum) only when it matches the
 * PROPOSED display vocabulary. Missing/unknown backend values remain unknown;
 * the frontend must not silently reinterpret them as `active`.
 */
export function linkStatus(status: string | undefined): ShortLinkStatus | undefined {
  return parseShortLinkStatus(status)
}

/**
 * `expired` is a client-derived state from `expires_at` (source TBD on whether
 * it is a status). Optional expiration: without a timestamp the link never
 * expires from the frontend's perspective.
 */
export interface LinkDisplay {
  label: string
  tone: StatusMeta['tone']
  dot: boolean
  /** `expired` is derived from `expires_at`, not a backend status. */
  expired: boolean
}

export function isExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false
  return Date.parse(expiresAt) <= now.getTime()
}

/**
 * The single badge the UI renders. Known disabled/deleted states win; otherwise
 * a past `expires_at` may be shown as derived "Expired". Missing or unknown
 * backend status stays neutral "Unknown" rather than being invented as active.
 */
export function linkDisplay(
  status: string | undefined,
  expiresAt: string | null | undefined,
  now = new Date(),
): LinkDisplay {
  const base = linkStatus(status)

  // Explicit terminal/disabled metadata wins over derived expiry.
  if (base === 'disabled' || base === 'deleted') {
    return { ...SHORT_LINK_STATUS_META[base], expired: false }
  }

  // Expiration is source-backed metadata and can be derived without assuming
  // that an absent/unknown backend status means `active`.
  if (isExpired(expiresAt, now)) {
    return { label: 'Expired', tone: 'danger', dot: false, expired: true }
  }

  if (base === 'active') {
    return { ...SHORT_LINK_STATUS_META.active, expired: false }
  }

  return { label: 'Unknown', tone: 'neutral', dot: false, expired: false }
}

// ---------------------------------------------------------------------------
// UX validation — mirrors source rules; the backend stays authoritative.
// ---------------------------------------------------------------------------

export function urlValidationError(raw: string): string | null {
  const value = raw.trim()
  if (!value) return 'URL is required.'
  if (value.length > MAX_URL_LENGTH) return 'URL is too long.'
  // eslint-disable-next-line no-control-regex -- literal control chars must be rejected
  if (/[\x00-\x1f\x7f]/.test(value)) return 'URL contains invalid control characters.'

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return 'Enter a valid absolute URL.'
  }
  // Covers http/https allow-list and rejects javascript:/data:/file: by scheme.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Only http and https URLs are allowed.'
  }
  return null
}

/** Mini reserved-word coverage; the source blacklist (api/health/metrics/…) is TBD. */
const RESERVED_ALIASES = new Set([
  'api',
  'health',
  'metrics',
  'swagger',
  'swagger.json',
  'admin',
  'login',
  'favicon.ico',
  'robots.txt',
])

export function aliasValidationError(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null // alias is optional
  if (value.length < 4 || value.length > 32) return 'Alias must be 4–32 characters.'
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return 'Alias may contain only letters, digits, hyphen and underscore.'
  }
  if (RESERVED_ALIASES.has(value.toLowerCase())) return 'This alias is reserved.'
  return null
}

// ---------------------------------------------------------------------------
// Analytics view model — single source for visualization AND accessible tables.
// ---------------------------------------------------------------------------

export interface AnalyticsReferrerVM {
  domain: string
  clicks: number
  share: number
}

export interface AnalyticsDeviceVM {
  category: ShortLinkDeviceCategory
  clicks: number
  share: number
}

export interface ShortLinkAnalyticsViewModel {
  totalClicks: number
  byDay: ClicksByDay[]
  maxByDayClicks: number
  referrers: AnalyticsReferrerVM[]
  devices: AnalyticsDeviceVM[]
}

function percent(clicks: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((clicks / total) * 1000) / 10
}

export function analyticsViewModel(dto: ShortLinkAnalyticsDto): ShortLinkAnalyticsViewModel {
  const totalClicks = dto.total_clicks
  const byDay = [...dto.by_day].sort((a, b) => a.date.localeCompare(b.date))
  const maxByDayClicks = byDay.reduce((m, p) => Math.max(m, p.clicks), 0)
  const referrers = [...dto.by_referrer]
    .map((r) => ({ domain: r.referrer_domain, clicks: r.clicks, share: percent(r.clicks, totalClicks) }))
    .sort((a, b) => b.clicks - a.clicks)
  const deviceClicks = new Map<ShortLinkDeviceCategory, number>()
  for (const item of dto.by_device) {
    const category: ShortLinkDeviceCategory = isDeviceCategory(item.device_type)
      ? item.device_type
      : 'unknown'
    deviceClicks.set(category, (deviceClicks.get(category) ?? 0) + item.clicks)
  }
  const devices = [...deviceClicks.entries()]
    .map(([category, clicks]) => ({ category, clicks, share: percent(clicks, totalClicks) }))
    .sort((a, b) => b.clicks - a.clicks)
  return { totalClicks, byDay, maxByDayClicks, referrers, devices }
}
