/**
 * Deterministic in-memory URL Shortener mock store (MASTER_FRONTEND_PLAN §17/§19).
 *
 * Simulates the Shortener management backend for MOCK mode. The store is
 * rebuilt from immutable fixtures whenever the Demo scenario changes and mutated
 * in place during a session (created links, logical delete) so demos can
 * progress; reset/switch restores the exact baseline. Keyset pagination is by
 * `(created_at, id)` with opaque cursors — no `Math.random()` and no fabricated
 * Redis / cache-inspection state.
 */

import { getScenario, type DemoScenarioId } from '@/mocks/scenario-registry'

import type {
  CreateShortLinkRequest,
  ShortLinkAnalyticsDto,
  ShortLinkDto,
  ShortLinkListDto,
  ShortLinkListQuery,
} from '../models/shortener-dto'
import {
  at,
  buildEmptyAnalytics,
  buildPopulatedAnalytics,
  buildShortenerLinkFixtures,
  LINK_ACTIVE,
  LINK_DELETED,
  LINK_DISABLED,
  LINK_EXPIRED,
  LINK_POPULAR,
} from './shortener-fixtures'

type ScenarioConfig = DemoScenarioId

export class ShortenerMockError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ShortenerMockError'
    this.status = status
    this.code = code
  }
}

interface ShortenerStore {
  links: Map<string, ShortLinkDto>
  /** Monotonic deterministic sequence for created ids/codes. */
  nextSeq: number
  /** Deterministic minute-advance for created timestamps. */
  runtimeMinutes: number
  serviceUnavailable: boolean
  notFound: boolean
  invalidUrlOnCreate: boolean
  aliasConflictOnCreate: boolean
  rateLimited: boolean
  retryAfterSeconds: number
  analyticsFor: (linkId: string) => ShortLinkAnalyticsDto
}

const SCENARIO_LINKS: Partial<Record<ScenarioConfig, string[]>> = {
  default: [LINK_ACTIVE, LINK_DISABLED, LINK_EXPIRED, LINK_POPULAR],
  'shortener-happy-active': [LINK_ACTIVE],
  'shortener-analytics-populated': [LINK_ACTIVE, LINK_POPULAR],
  'shortener-analytics-empty': [LINK_ACTIVE],
  'shortener-disabled': [LINK_DISABLED],
  'shortener-expired': [LINK_EXPIRED],
  'shortener-deleted': [LINK_DELETED],
  'shortener-alias-conflict': [LINK_ACTIVE],
  'shortener-invalid-url': [LINK_ACTIVE],
  'shortener-rate-limited': [LINK_ACTIVE],
  'shortener-not-found': [LINK_ACTIVE],
  'shortener-service-unavailable': [LINK_ACTIVE],
}

const CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/** Deterministic fixed-length code from a monotonic sequence (no randomness). */
function codeForSeq(seq: number): string {
  let n = seq
  let out = ''
  do {
    out = CODE_ALPHABET[n % CODE_ALPHABET.length] + out
    n = Math.floor(n / CODE_ALPHABET.length)
  } while (n > 0)
  return out.padStart(8, 'A')
}

function encode64(value: string): string {
  if (typeof btoa === 'function') return btoa(value)
  return Buffer.from(value, 'utf-8').toString('base64')
}

function decode64(value: string): string {
  if (typeof atob === 'function') return atob(value)
  return Buffer.from(value, 'base64').toString('utf-8')
}

export function encodeShortenerCursor(createdAt: string, id: string): string {
  return encode64(`${createdAt}|${id}`)
}

export function decodeShortenerCursor(cursor: string): { createdAt: string; id: string } {
  const [createdAt, id] = decode64(cursor).split('|')
  return { createdAt, id }
}

function buildAnalyticsResolver(scenario: ScenarioConfig): (linkId: string) => ShortLinkAnalyticsDto {
  if (scenario === 'shortener-analytics-populated') {
    const populated = buildPopulatedAnalytics()
    return () => populated
  }
  if (scenario === 'shortener-analytics-empty') {
    const empty = buildEmptyAnalytics()
    return () => empty
  }
  // DEFAULT: the popular link has populated analytics, everything else empty.
  const empty = buildEmptyAnalytics()
  const popular = buildPopulatedAnalytics()
  return (linkId) => (linkId === LINK_POPULAR ? popular : empty)
}

function buildState(scenario: ScenarioConfig): ShortenerStore {
  const store: ShortenerStore = {
    links: new Map(),
    nextSeq: 1,
    runtimeMinutes: 0,
    serviceUnavailable: false,
    notFound: false,
    invalidUrlOnCreate: false,
    aliasConflictOnCreate: false,
    rateLimited: false,
    retryAfterSeconds: 30,
    analyticsFor: buildAnalyticsResolver(scenario),
  }

  if (scenario === 'shortener-service-unavailable') store.serviceUnavailable = true
  if (scenario === 'shortener-not-found') store.notFound = true
  if (scenario === 'shortener-invalid-url') store.invalidUrlOnCreate = true
  if (scenario === 'shortener-alias-conflict') store.aliasConflictOnCreate = true
  if (scenario === 'shortener-rate-limited') store.rateLimited = true

  const ids = SCENARIO_LINKS[scenario] ?? []
  const seedsById = new Map(buildShortenerLinkFixtures().map((link) => [link.id, link]))
  for (const linkId of ids) {
    const seed = seedsById.get(linkId)
    if (seed) store.links.set(linkId, { ...seed })
  }

  return store
}

let cachedScenario: ScenarioConfig | null = null
let cachedStore: ShortenerStore | undefined

/** Returns the (cached) store for the current scenario, rebuilding on switch. */
export function getShortenerStore(): ShortenerStore {
  const scenario = getScenario()
  if (cachedScenario !== scenario || !cachedStore) {
    cachedStore = buildState(scenario)
    cachedScenario = scenario
  }
  return cachedStore
}

export function resetShortenerMockState(): void {
  cachedScenario = null
  cachedStore = undefined
}

// ---------------------------------------------------------------------------
// Guards / errors
// ---------------------------------------------------------------------------

function requireAvailable(store: ShortenerStore): void {
  if (store.serviceUnavailable) {
    throw new ShortenerMockError(
      503,
      'SHORTENER_UNAVAILABLE',
      'URL Shortener service is unavailable.',
    )
  }
}

function requireReadable(store: ShortenerStore): void {
  if (store.notFound) {
    throw new ShortenerMockError(404, 'LINK_NOT_FOUND', 'Link not found.')
  }
}

function requireLink(store: ShortenerStore, id: string): ShortLinkDto {
  const link = store.links.get(id)
  if (!link) throw new ShortenerMockError(404, 'LINK_NOT_FOUND', 'Link not found.')
  return link
}

function requireMutationAllowed(store: ShortenerStore): void {
  if (store.rateLimited) {
    throw new ShortenerMockError(
      429,
      'RATE_LIMITED',
      `Too many requests. Retry after ${store.retryAfterSeconds}s.`,
    )
  }
}

function shortUrl(code: string): string {
  // Simulated backend generates the authoritative short_url in MOCK mode.
  return `https://s.zolotoy.dev/${code}`
}

export interface ShortenerStoreAPI {
  list(query: ShortLinkListQuery): ShortLinkListDto
  get(id: string): ShortLinkDto
  create(request: CreateShortLinkRequest): ShortLinkDto
  remove(id: string): void
  getAnalytics(id: string): ShortLinkAnalyticsDto
}

export function createShortenerRouter(): ShortenerStoreAPI {
  // Resolve the current scenario store inside each operation so handlers never
  // keep serving a stale store captured during module initialization.
  return {
    list(query: ShortLinkListQuery): ShortLinkListDto {
      const store = getShortenerStore()
      requireAvailable(store)

      const all = [...store.links.values()].sort((a, b) => {
        const byCreate = b.created_at.localeCompare(a.created_at)
        if (byCreate !== 0) return byCreate
        return b.id.localeCompare(a.id)
      })

      const limit = query.limit ?? 10
      let fromIndex = 0
      if (query.cursor) {
        const { createdAt, id } = decodeShortenerCursor(query.cursor)
        fromIndex = all.findIndex((l) => l.created_at === createdAt && l.id === id) + 1
        if (fromIndex <= 0) fromIndex = 0
      }

      const page = all.slice(fromIndex, fromIndex + limit)
      const hasMore = fromIndex + limit < all.length
      const last = page[page.length - 1]
      return {
        items: page.map((l) => ({ ...l })),
        has_more: hasMore,
        next_cursor: hasMore && last ? encodeShortenerCursor(last.created_at, last.id) : null,
      }
    },

    get(id: string): ShortLinkDto {
      const store = getShortenerStore()
      requireAvailable(store)
      requireReadable(store)
      return { ...requireLink(store, id) }
    },

    create(request: CreateShortLinkRequest): ShortLinkDto {
      const store = getShortenerStore()
      requireAvailable(store)
      requireMutationAllowed(store)

      if (store.invalidUrlOnCreate) {
        throw new ShortenerMockError(
          400,
          'INVALID_URL',
          'Only http and https URLs are allowed.',
        )
      }

      if (request.custom_alias) {
        const collides = [...store.links.values()].some((l) => l.code === request.custom_alias)
        if (store.aliasConflictOnCreate || collides) {
          throw new ShortenerMockError(
            409,
            'ALIAS_TAKEN',
            `The alias "${request.custom_alias}" is already taken.`,
          )
        }
      }

      const seq = store.nextSeq++
      store.runtimeMinutes += 1
      const now = at(store.runtimeMinutes)
      const code = request.custom_alias ?? codeForSeq(seq)
      const created: ShortLinkDto = {
        id: `70000000-0000-4000-8000-${seq.toString(16).padStart(12, '0')}`,
        code,
        short_url: shortUrl(code),
        url: request.url,
        expires_at: request.expires_at ?? null,
        created_at: now,
        updated_at: now,
        status: 'active',
      }
      store.links.set(created.id, created)
      return { ...created }
    },

    remove(id: string): void {
      const store = getShortenerStore()
      requireAvailable(store)
      requireMutationAllowed(store)
      const link = requireLink(store, id)
      // Logical delete — status flips; the row stays so the list can show it.
      store.links.set(id, { ...link, status: 'deleted' })
    },

    getAnalytics(id: string): ShortLinkAnalyticsDto {
      const store = getShortenerStore()
      requireAvailable(store)
      requireReadable(store)
      requireLink(store, id)
      return store.analyticsFor(id)
    },
  }
}
