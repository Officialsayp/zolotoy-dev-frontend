import {
  SHORTENER_DEVICE_CATEGORIES,
  SHORT_LINK_STATUSES,
  type ShortLinkDeviceCategory,
  type ShortLinkStatus,
} from './shortener-types'

/**
 * Narrow the arbitrary values a backend/query string may carry into the PROPOSED
 * source vocabulary. Guards stay pure so display code never trusts raw strings.
 */

export function isShortLinkStatus(value: unknown): value is ShortLinkStatus {
  return typeof value === 'string' && (SHORT_LINK_STATUSES as readonly string[]).includes(value)
}

export function parseShortLinkStatus(value: unknown): ShortLinkStatus | undefined {
  return isShortLinkStatus(value) ? value : undefined
}

export function isDeviceCategory(value: unknown): value is ShortLinkDeviceCategory {
  return (
    typeof value === 'string' &&
    (SHORTENER_DEVICE_CATEGORIES as readonly string[]).includes(value)
  )
}
