import { describe, expect, it } from 'vitest'

import {
  aliasValidationError,
  analyticsViewModel,
  isExpired,
  linkDisplay,
  SHORTENER_DEVICE_CATEGORIES,
  urlValidationError,
} from './shortener-domain'
import type { ShortLinkAnalyticsDto } from './shortener-dto'

/**
 * URL Shortener domain/display policy tests (Prompt 04 TESTS): URL/alias UX
 * validation, derived expiration, PROPOSED status badge, device vocabulary and
 * the analytics DTO → view model used by BOTH the visualization and tables.
 */

describe('URL validation', () => {
  it('accepts http and https absolute URLs', () => {
    expect(urlValidationError('https://example.com/a/b')).toBeNull()
    expect(urlValidationError('http://example.com')).toBeNull()
  })

  it('rejects empty, malformed and non-http(s) schemes', () => {
    expect(urlValidationError('')).not.toBeNull()
    expect(urlValidationError('   ')).not.toBeNull()
    expect(urlValidationError('not a url')).not.toBeNull()
    expect(urlValidationError('javascript:alert(1)')).not.toBeNull()
    expect(urlValidationError('data:text/html,hello')).not.toBeNull()
    expect(urlValidationError('file:///etc/passwd')).not.toBeNull()
    expect(urlValidationError('ftp://example.com')).not.toBeNull()
  })

  it('rejects control characters and over-long URLs', () => {
    const control = `https://example.com/${String.fromCharCode(0)}boom`
    expect(urlValidationError(control)).not.toBeNull()
    expect(urlValidationError(`https://example.com/${'a'.repeat(3000)}`)).not.toBeNull()
  })
})

describe('custom alias validation', () => {
  it('is optional (empty passes)', () => {
    expect(aliasValidationError('')).toBeNull()
    expect(aliasValidationError('   ')).toBeNull()
  })

  it('requires 4–32 chars and allows only letters/digits/-/_', () => {
    expect(aliasValidationError('abc')).not.toBeNull()
    expect(aliasValidationError('a'.repeat(33))).not.toBeNull()
    expect(aliasValidationError('myDocs-2')).toBeNull()
    expect(aliasValidationError('my_docs')).toBeNull()
    expect(aliasValidationError('bad!alias')).not.toBeNull()
  })

  it('rejects reserved aliases', () => {
    expect(aliasValidationError('api')).not.toBeNull()
    expect(aliasValidationError('metrics')).not.toBeNull()
  })
})

describe('expiration / status display', () => {
  const past = '2020-01-01T00:00:00Z'
  const future = '2999-01-01T00:00:00Z'
  const now = new Date('2026-09-02T12:00:00Z')

  it('derives expired from expires_at for active links', () => {
    expect(isExpired(past, now)).toBe(true)
    expect(isExpired(future, now)).toBe(false)
    expect(isExpired(null, now)).toBe(false)
  })

  it('shows known/derived states without treating missing or unknown status as active', () => {
    expect(linkDisplay('active', future, now).label).toBe('Active')
    expect(linkDisplay('active', past, now).label).toBe('Expired')
    expect(linkDisplay('disabled', past, now).label).toBe('Disabled')
    expect(linkDisplay('deleted', past, now).label).toBe('Deleted')
    expect(linkDisplay(undefined, future, now).label).toBe('Unknown')
    expect(linkDisplay('backend-new-status', future, now).label).toBe('Unknown')
    expect(linkDisplay(undefined, past, now).label).toBe('Expired')
  })

  it('fixed device category vocabulary', () => {
    expect(SHORTENER_DEVICE_CATEGORIES).toEqual(['mobile', 'desktop', 'bot', 'unknown'])
  })
})

describe('analytics view model (single source for chart + table)', () => {
  // Internally consistent fixture: every dimension sums to total_clicks.
  const populated: ShortLinkAnalyticsDto = {
    total_clicks: 732,
    by_day: [
      { date: '2026-09-02', clicks: 243 },
      { date: '2026-08-30', clicks: 174 },
      { date: '2026-09-01', clicks: 315 },
    ],
    by_referrer: [
      { referrer_domain: 'github.com', clicks: 338 },
      { referrer_domain: '(direct)', clicks: 394 },
    ],
    by_device: [
      { device_type: 'unknown', clicks: 50 },
      { device_type: 'mobile', clicks: 682 },
    ],
  }

  it('maps total and sorts by-day ascending', () => {
    const vm = analyticsViewModel(populated)
    expect(vm.totalClicks).toBe(732)
    expect(vm.byDay.map((p) => p.date)).toEqual(['2026-08-30', '2026-09-01', '2026-09-02'])
    expect(vm.maxByDayClicks).toBe(315)
  })

  it('sorts referrer/device by clicks desc and computes share', () => {
    const vm = analyticsViewModel(populated)
    expect(vm.referrers.map((r) => r.domain)).toEqual(['(direct)', 'github.com'])
    expect(vm.referrers[0].share).toBe(53.8)
    expect(vm.devices.map((d) => d.category)).toEqual(['mobile', 'unknown'])
  })

  it('maps unsupported backend device values into the fixed unknown category', () => {
    const dto: ShortLinkAnalyticsDto = {
      total_clicks: 10,
      by_day: [{ date: '2026-09-02', clicks: 10 }],
      by_referrer: [{ referrer_domain: '(direct)', clicks: 10 }],
      by_device: [
        { device_type: 'tablet', clicks: 4 },
        { device_type: 'unknown', clicks: 1 },
        { device_type: 'mobile', clicks: 5 },
      ],
    }
    const vm = analyticsViewModel(dto)
    expect(vm.devices).toEqual([
      { category: 'mobile', clicks: 5, share: 50 },
      { category: 'unknown', clicks: 5, share: 50 },
    ])
  })

  it('handles empty analytics deterministically', () => {
    const empty: ShortLinkAnalyticsDto = {
      total_clicks: 0,
      by_day: [],
      by_referrer: [],
      by_device: [],
    }
    const vm = analyticsViewModel(empty)
    expect(vm.totalClicks).toBe(0)
    expect(vm.byDay).toEqual([])
    expect(vm.referrers).toEqual([])
    expect(vm.devices).toEqual([])
  })

  it('chart and accessible table share the same view model (no divergent totals)', () => {
    // The one mapping function drives both the SVG by-day line and every table;
    // its total must equal the sum of the by-day series it also exposes.
    const vm = analyticsViewModel(populated)
    const daySum = vm.byDay.reduce((s, p) => s + p.clicks, 0)
    expect(daySum).toBe(vm.totalClicks)
  })
})
