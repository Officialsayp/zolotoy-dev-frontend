import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resetScenario, setScenario } from '@/mocks/scenario-registry'

import {
  buildEmptyAnalytics,
  buildPopulatedAnalytics,
  LINK_ACTIVE,
  LINK_DELETED,
  LINK_DISABLED,
  LINK_EXPIRED,
} from './shortener-fixtures'
import {
  createShortenerRouter,
  resetShortenerMockState,
  type ShortenerStoreAPI,
} from './shortener-store'

/**
 * Deterministic URL Shortener mock-store scenarios (Prompt 04). Covers the
 * management semantics: exact scenarios, deterministic create, keyset
 * pagination, alias conflict, invalid URL, rate limit, not found, service
 * unavailable, logical delete and scenario switch/reset (stale-store guard).
 */

let api: ShortenerStoreAPI

beforeEach(() => {
  resetScenario()
  resetShortenerMockState()
  api = createShortenerRouter()
})

afterEach(() => {
  resetScenario()
  resetShortenerMockState()
})

describe('shortener scenarios', () => {
  it('happy-active returns one active link with a short_url', () => {
    setScenario('shortener-happy-active')
    resetShortenerMockState()
    api = createShortenerRouter()

    const list = api.list({})
    expect(list.items).toHaveLength(1)
    expect(list.items[0].id).toBe(LINK_ACTIVE)
    expect(list.items[0].status).toBe('active')
    expect(list.items[0].short_url).toBe('https://s.zolotoy.dev/Ab3xP9qK')
  })

  it('populated-analytics returns deterministic totals', () => {
    setScenario('shortener-analytics-populated')
    resetShortenerMockState()
    api = createShortenerRouter()

    const analytics = api.getAnalytics(LINK_ACTIVE)
    expect(analytics.total_clicks).toBeGreaterThan(0)
    expect(analytics.by_day.length).toBeGreaterThan(0)
    expect(analytics.by_device.map((d) => d.device_type).sort()).toEqual([
      'bot',
      'desktop',
      'mobile',
      'unknown',
    ])
    expect(analytics).toEqual(buildPopulatedAnalytics())
  })

  it('empty-analytics returns zeros', () => {
    setScenario('shortener-analytics-empty')
    resetShortenerMockState()
    api = createShortenerRouter()

    expect(api.getAnalytics(LINK_ACTIVE)).toEqual(buildEmptyAnalytics())
  })

  it('disabled scenario exposes disabled status', () => {
    setScenario('shortener-disabled')
    resetShortenerMockState()
    api = createShortenerRouter()
    expect(api.get(LINK_DISABLED).status).toBe('disabled')
  })

  it('expired scenario has an expires_at in the past', () => {
    setScenario('shortener-expired')
    resetShortenerMockState()
    api = createShortenerRouter()
    const link = api.get(LINK_EXPIRED)
    expect(link.expires_at).toBeTruthy()
    expect(Date.parse(link.expires_at!)).toBeLessThan(Date.parse('2026-09-02T12:00:00Z'))
  })

  it('deleted scenario exposes deleted metadata', () => {
    setScenario('shortener-deleted')
    resetShortenerMockState()
    api = createShortenerRouter()
    expect(api.get(LINK_DELETED).status).toBe('deleted')
  })
})

describe('create', () => {
  it('is deterministic and returns authoritative code + short_url', () => {
    setScenario('shortener-happy-active')
    resetShortenerMockState()
    api = createShortenerRouter()

    const a = api.create({ url: 'https://a.dev/1' })
    expect(a.code).toBeTruthy()
    expect(a.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    expect(a.id).toHaveLength(36)
    expect(a.short_url).toBe(`https://s.zolotoy.dev/${a.code}`)
    expect(a.url).toBe('https://a.dev/1')
    expect(a.status).toBe('active')

    const b = api.create({ url: 'https://b.dev/2' })
    expect(b.code).not.toBe(a.code) // monotonic sequence, no collision
  })

  it('accepts custom_alias and uses it as the code', () => {
    setScenario('shortener-happy-active')
    resetShortenerMockState()
    api = createShortenerRouter()
    const created = api.create({ url: 'https://a.dev/1', custom_alias: 'myAlias' })
    expect(created.code).toBe('myAlias')
    expect(created.short_url).toBe('https://s.zolotoy.dev/myAlias')
  })

  it('alias-conflict returns 409', () => {
    setScenario('shortener-alias-conflict')
    resetShortenerMockState()
    api = createShortenerRouter()
    expect(() => api.create({ url: 'https://a.dev/1', custom_alias: 'taken' })).toThrow(
      expect.objectContaining({ status: 409, code: 'ALIAS_TAKEN' }),
    )
  })

  it('invalid-url returns 400', () => {
    setScenario('shortener-invalid-url')
    resetShortenerMockState()
    api = createShortenerRouter()
    expect(() => api.create({ url: 'https://a.dev/1' })).toThrow(
      expect.objectContaining({ status: 400, code: 'INVALID_URL' }),
    )
  })

  it('rate-limited returns 429', () => {
    setScenario('shortener-rate-limited')
    resetShortenerMockState()
    api = createShortenerRouter()
    expect(() => api.create({ url: 'https://a.dev/1' })).toThrow(
      expect.objectContaining({ status: 429, code: 'RATE_LIMITED' }),
    )
  })
})

describe('read / delete failures', () => {
  it('not-found returns 404 on detail', () => {
    setScenario('shortener-not-found')
    resetShortenerMockState()
    api = createShortenerRouter()
    expect(() => api.get(LINK_ACTIVE)).toThrow(expect.objectContaining({ status: 404 }))
  })

  it('service-unavailable returns 503 on reads', () => {
    setScenario('shortener-service-unavailable')
    resetShortenerMockState()
    api = createShortenerRouter()
    expect(() => api.list({})).toThrow(expect.objectContaining({ status: 503 }))
    expect(() => api.get(LINK_ACTIVE)).toThrow(expect.objectContaining({ status: 503 }))
  })
})

describe('keyset pagination', () => {
  it('returns opaque cursors and no overlapping pages', () => {
    setScenario('default')
    resetShortenerMockState()
    api = createShortenerRouter()

    const page1 = api.list({ limit: 2 })
    expect(page1.items.length).toBeLessThanOrEqual(2)
    expect(page1.has_more).toBe(true)
    expect(page1.next_cursor).toBeTruthy()

    const page2 = api.list({ limit: 2, cursor: page1.next_cursor! })
    expect(page2.items.length).toBeGreaterThan(0)
    expect(page2.items.some((l) => l.id === page1.items[0].id)).toBe(false)
  })
})

describe('logical delete', () => {
  it('flips status to deleted, keeping the row listed', () => {
    setScenario('shortener-happy-active')
    resetShortenerMockState()
    api = createShortenerRouter()

    expect(api.get(LINK_ACTIVE).status).toBe('active')
    api.remove(LINK_ACTIVE)
    expect(api.get(LINK_ACTIVE).status).toBe('deleted')
  })

  it('rate-limited delete returns 429', () => {
    setScenario('shortener-rate-limited')
    resetShortenerMockState()
    api = createShortenerRouter()
    expect(() => api.remove(LINK_ACTIVE)).toThrow(expect.objectContaining({ status: 429 }))
  })
})

describe('scenario switching / stale-store guard', () => {
  it('an already-created router follows scenario switches without stale state', () => {
    expect(api.list({}).items.length).toBeGreaterThan(0)

    setScenario('shortener-happy-active')
    expect(api.list({}).items.length).toBe(1)
    expect(api.list({}).items[0].id).toBe(LINK_ACTIVE)

    // Switching back restores the exact baseline (no stale mutations leaking).
    setScenario('default')
    expect(api.list({}).items.length).toBe(4)
  })

  it('reset restores the exact baseline after mutations', () => {
    setScenario('shortener-happy-active')
    resetShortenerMockState()
    api = createShortenerRouter()
    expect(api.get(LINK_ACTIVE).status).toBe('active')

    api.remove(LINK_ACTIVE)
    expect(api.get(LINK_ACTIVE).status).toBe('deleted')

    resetScenario()
    resetShortenerMockState()
    api = createShortenerRouter()
    expect(api.get(LINK_ACTIVE).status).toBe('active')
  })
})
