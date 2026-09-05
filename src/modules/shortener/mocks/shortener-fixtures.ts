/**
 * Deterministic URL Shortener mock fixtures (MASTER_FRONTEND_PLAN §19).
 *
 * Stable link ids/codes, a fixed scenario clock and deterministic analytics data
 * so list/detail/analytics never drift between refreshes. `shortener-store`
 * seeds immutable baseline links from these; runtime transitions (e.g. created
 * links or logical delete) mutate copies and reset to baseline on scenario
 * switch/reset. No `Math.random()` and no fabricated Redis-state fixtures.
 */

import type {
  ClicksByDevice,
  ClicksByDay,
  ClicksByReferrer,
  ShortLinkAnalyticsDto,
  ShortLinkDto,
} from '../models/shortener-dto'

/** Fixed scenario clock (UTC). */
export const SHORTENER_SCENARIO_EPOCH = '2026-09-02T12:00:00Z'

/** `minutes` relative to the scenario clock. */
export function at(minutes: number): string {
  return new Date(Date.parse(SHORTENER_SCENARIO_EPOCH) + minutes * 60_000).toISOString()
}

// Stable link ids -------------------------------------------------------------
export const LINK_ACTIVE = '70000000-0000-4000-8000-000000000001' // code Ab3xP9qK
export const LINK_DISABLED = '70000000-0000-4000-8000-000000000002' // code Bc4yQ0rL
export const LINK_EXPIRED = '70000000-0000-4000-8000-000000000003' // code Cd5zR1sM
export const LINK_DELETED = '70000000-0000-4000-8000-000000000004' // code De6aS2tN
export const LINK_POPULAR = '70000000-0000-4000-8000-000000000005' // code Ef7bT3uO (analytics)

export function buildShortenerLinkFixtures(): ShortLinkDto[] {
  const base = (
    id: string,
    code: string,
    url: string,
    patch: Partial<ShortLinkDto> = {},
  ): ShortLinkDto => ({
    id,
    code,
    short_url: `https://s.zolotoy.dev/${code}`,
    url,
    expires_at: null,
    created_at: at(-60),
    updated_at: at(-60),
    ...patch,
  })

  return [
    base(LINK_ACTIVE, 'Ab3xP9qK', 'https://example.com/docs/guide', {
      status: 'active',
      created_at: at(-60),
    }),
    base(LINK_DISABLED, 'Bc4yQ0rL', 'https://example.com/releases', {
      status: 'disabled',
      created_at: at(-120),
    }),
    base(LINK_EXPIRED, 'Cd5zR1sM', 'https://example.com/promo/2025', {
      status: 'active',
      expires_at: at(-30),
      created_at: at(-400),
    }),
    base(LINK_DELETED, 'De6aS2tN', 'https://example.com/old-link', {
      status: 'deleted',
      created_at: at(-500),
    }),
    base(LINK_POPULAR, 'Ef7bT3uO', 'https://example.com/black-friday', {
      status: 'active',
      created_at: at(-72),
    }),
  ]
}

export function buildPopulatedAnalytics(): ShortLinkAnalyticsDto {
  const by_day: ClicksByDay[] = [
    { date: '2026-08-27', clicks: 96 },
    { date: '2026-08-28', clicks: 121 },
    { date: '2026-08-29', clicks: 88 },
    { date: '2026-08-30', clicks: 174 },
    { date: '2026-08-31', clicks: 203 },
    { date: '2026-09-01', clicks: 315 },
    { date: '2026-09-02', clicks: 243 },
  ]
  const by_referrer: ClicksByReferrer[] = [
    { referrer_domain: '(direct)', clicks: 412 },
    { referrer_domain: 'github.com', clicks: 338 },
    { referrer_domain: 'google.com', clicks: 290 },
    { referrer_domain: 'habr.com', clicks: 200 },
  ]
  const by_device: ClicksByDevice[] = [
    { device_type: 'mobile', clicks: 560 },
    { device_type: 'desktop', clicks: 520 },
    { device_type: 'bot', clicks: 110 },
    { device_type: 'unknown', clicks: 50 },
  ]
  const total_clicks = by_day.reduce((sum, p) => sum + p.clicks, 0)
  return { total_clicks, by_day, by_referrer, by_device }
}

export function buildEmptyAnalytics(): ShortLinkAnalyticsDto {
  return { total_clicks: 0, by_day: [], by_referrer: [], by_device: [] }
}
