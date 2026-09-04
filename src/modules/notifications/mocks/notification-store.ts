/**
 * Deterministic in-memory Notification mock store (MASTER_FRONTEND_PLAN §16.11).
 *
 * Simulates the Notification backend for MOCK mode: durable delivery jobs,
 * ordered attempts, keyset pagination, at-least-once event consumption with
 * durable deduplication markers, manual retry for `dead` jobs, and failure
 * scenarios (forbidden / service-unavailable). The store is rebuilt from
 * immutable fixtures whenever the scenario changes and mutated in place during
 * a session so demos can progress; reset/switch restores the exact baseline.
 *
 * There is deliberately no `failed` job status and no fabricated Kafka DLQ
 * records — the source exposes no DLQ HTTP API.
 */

import { getScenario, type DemoScenarioId } from '@/mocks/scenario-registry'

import type {
  NotificationAttemptDto,
  NotificationEventDto,
  NotificationEventViewDto,
  NotificationJobDetailDto,
  NotificationJobDto,
  NotificationListDto,
  NotificationListQuery,
} from '../models/notification-dto'
import { parseNotificationStatus } from '../models/notification-domain-guards'
import {
  at,
  buildNotificationFixtures,
  EVENT_DUP,
  JOB_CREATED_EMAIL,
  JOB_DUP_EMAIL,
  JOB_INVALID_DEAD,
  JOB_MANUAL_RETRY,
  JOB_PAID_EMAIL,
  JOB_RATE_LIMIT_WAIT,
  JOB_RETRY_SUCCESS,
  JOB_TIMEOUT_DEAD,
} from './notification-fixtures'

type ScenarioConfig = DemoScenarioId

export class NotificationMockError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'NotificationMockError'
    this.status = status
    this.code = code
  }
}

interface EventRecord {
  dto: NotificationEventDto
  receivedCount: number
  duplicateReceived: boolean
}

interface NotificationStore {
  events: Map<string, EventRecord>
  jobs: Map<string, NotificationJobDto>
  attempts: Map<string, NotificationAttemptDto[]>
  readsForbidden: boolean
  serviceUnavailable: boolean
  /** Monotonic deterministic minutes-advance for runtime transitions (retry). */
  runtimeMinutes: number
}

const SCENARIO_JOBS: Partial<Record<ScenarioConfig, string[]>> = {
  default: [
    JOB_PAID_EMAIL,
    JOB_CREATED_EMAIL,
    JOB_RETRY_SUCCESS,
    JOB_MANUAL_RETRY,
    JOB_TIMEOUT_DEAD,
    JOB_INVALID_DEAD,
  ],
  'notifications-happy-sent': [JOB_PAID_EMAIL],
  'notifications-duplicate-event': [JOB_DUP_EMAIL],
  'notifications-retry-then-sent': [JOB_RETRY_SUCCESS],
  'notifications-rate-limited-retry-wait': [JOB_RATE_LIMIT_WAIT],
  'notifications-retry-to-dead': [JOB_TIMEOUT_DEAD],
  'notifications-permanent-error-dead': [JOB_INVALID_DEAD],
  'notifications-manual-retry-success': [JOB_MANUAL_RETRY],
  'notifications-empty': [],
  'notifications-forbidden': [],
  'notifications-service-unavailable': [],
}

function encode64(value: string): string {
  if (typeof btoa === 'function') return btoa(value)
  return Buffer.from(value, 'utf-8').toString('base64')
}

function decode64(value: string): string {
  if (typeof atob === 'function') return atob(value)
  return Buffer.from(value, 'base64').toString('utf-8')
}

export function encodeNotificationCursor(createdAt: string, id: string): string {
  return encode64(`${createdAt}|${id}`)
}

export function decodeNotificationCursor(cursor: string): { createdAt: string; id: string } {
  const [createdAt, id] = decode64(cursor).split('|')
  return { createdAt, id }
}

function buildState(scenario: ScenarioConfig): NotificationStore {
  const store: NotificationStore = {
    events: new Map(),
    jobs: new Map(),
    attempts: new Map(),
    readsForbidden: false,
    serviceUnavailable: false,
    runtimeMinutes: 0,
  }

  if (scenario === 'notifications-forbidden') store.readsForbidden = true
  if (scenario === 'notifications-service-unavailable') store.serviceUnavailable = true

  const seedsById = new Map(buildNotificationFixtures().map((seed) => [seed.job.id, seed]))
  const ids = SCENARIO_JOBS[scenario] ?? []

  for (const jobId of ids) {
    const seed = seedsById.get(jobId)
    if (!seed) continue
    store.jobs.set(jobId, { ...seed.job })
    store.attempts.set(jobId, seed.attempts.map((a) => ({ ...a })))
    const existing = store.events.get(seed.job.event_id)
    const record: EventRecord = existing ?? {
      dto: { ...seed.event },
      receivedCount: 1,
      duplicateReceived: false,
    }
    // Duplicate-event scenario marks the at-least-once duplicate arrival.
    if (scenario === 'notifications-duplicate-event' && seed.job.event_id === EVENT_DUP) {
      record.receivedCount = 2
      record.duplicateReceived = true
    }
    store.events.set(seed.job.event_id, record)
  }

  return store
}

/** Returns the (cached) store for the current scenario, rebuilding on switch. */
export function getNotificationStore(): NotificationStore {
  const scenario = getScenario()
  if (cachedScenario !== scenario || !cachedStore) {
    cachedStore = buildState(scenario)
    cachedScenario = scenario
  }
  return cachedStore
}

let cachedScenario: ScenarioConfig | null = null
let cachedStore: NotificationStore | undefined

export function resetNotificationMockState(): void {
  cachedScenario = null
  cachedStore = undefined
}

// ---------------------------------------------------------------------------
// Guards / errors
// ---------------------------------------------------------------------------

function requireAvailable(store: NotificationStore): void {
  if (store.serviceUnavailable) {
    throw new NotificationMockError(503, 'NOTIFICATION_UNAVAILABLE', 'Notification service is unavailable.')
  }
}

function requireReadable(store: NotificationStore): void {
  if (store.readsForbidden) {
    throw new NotificationMockError(403, 'NOTIFICATION_FORBIDDEN', 'You do not have access to these notifications.')
  }
}

function requireJob(store: NotificationStore, id: string): NotificationJobDto {
  const job = store.jobs.get(id)
  if (!job) throw new NotificationMockError(404, 'NOTIFICATION_NOT_FOUND', 'Notification job not found.')
  return job
}

function detail(store: NotificationStore, job: NotificationJobDto): NotificationJobDetailDto {
  const attempts = [...(store.attempts.get(job.id) ?? [])].sort(
    (a, b) => a.attempt_no - b.attempt_no,
  )
  return { job: { ...job }, attempts }
}

function eventView(store: NotificationStore, eventId: string): NotificationEventViewDto {
  const record = store.events.get(eventId)
  if (!record) {
    throw new NotificationMockError(
      404,
      'NOTIFICATION_EVENT_NOT_FOUND',
      'Notification input event not found.',
    )
  }
  const jobs = [...store.jobs.values()]
    .filter((j) => j.event_id === eventId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((j) => ({ ...j }))
  return {
    event: { ...record.dto },
    consumed: true,
    received_count: record.receivedCount,
    duplicate_received: record.duplicateReceived,
    jobs,
  }
}

// ---------------------------------------------------------------------------
// Public store API (consumed by the MSW handlers)
// ---------------------------------------------------------------------------

export interface NotificationStoreAPI {
  list(query: NotificationListQuery): NotificationListDto
  get(id: string): NotificationJobDetailDto
  retry(id: string): NotificationJobDetailDto
  getEvent(eventId: string): NotificationEventViewDto
}

export function createNotificationRouter(): NotificationStoreAPI {
  // MSW creates this router once, but Demo scenario can change at runtime.
  // Resolve the current scenario store inside each operation so handlers never
  // keep serving a stale store captured during module initialization.
  return {
    list(query: NotificationListQuery): NotificationListDto {
      const store = getNotificationStore()
      requireAvailable(store)
      requireReadable(store)

      const status = parseNotificationStatus(query.status)
      let all = [...store.jobs.values()].sort((a, b) => {
        const byCreate = b.created_at.localeCompare(a.created_at)
        if (byCreate !== 0) return byCreate
        return b.id.localeCompare(a.id)
      })

      if (status) all = all.filter((j) => j.status === status)
      if (query.channel) all = all.filter((j) => j.channel === query.channel)
      if (query.event_type) all = all.filter((j) => j.event_type === query.event_type)

      const limit = query.limit ?? 20
      let fromIndex = 0
      if (query.cursor) {
        const { createdAt, id } = decodeNotificationCursor(query.cursor)
        fromIndex = all.findIndex((j) => j.created_at === createdAt && j.id === id) + 1
        if (fromIndex <= 0) fromIndex = 0
      }

      const page = all.slice(fromIndex, fromIndex + limit)
      const hasMore = fromIndex + limit < all.length
      const last = page[page.length - 1]
      return {
        items: page.map((j) => ({ ...j })),
        has_more: hasMore,
        next_cursor: hasMore && last ? encodeNotificationCursor(last.created_at, last.id) : null,
      }
    },

    get(id: string): NotificationJobDetailDto {
      const store = getNotificationStore()
      requireAvailable(store)
      requireReadable(store)
      return detail(store, requireJob(store, id))
    },

    retry(id: string): NotificationJobDetailDto {
      const store = getNotificationStore()
      requireAvailable(store)
      requireReadable(store)
      const job = requireJob(store, id)
      if (job.status !== 'dead') {
        throw new NotificationMockError(
          409,
          'NOTIFICATION_NOT_RETRYABLE',
          'Manual retry is only allowed for dead delivery jobs.',
        )
      }
      // Manual retry delivers deterministically (dead -> new attempt -> sent).
      store.runtimeMinutes += 1
      const finishedAt = at(store.runtimeMinutes)
      const startedAt = at(store.runtimeMinutes - 0.02)
      const nextAttemptNo = job.attempt_count + 1
      const attempts = store.attempts.get(job.id) ?? []
      store.attempts.set(job.id, [
        ...attempts,
        {
          attempt_no: nextAttemptNo,
          started_at: startedAt,
          finished_at: finishedAt,
          result: 'sent',
          provider_status: 'accepted',
          error_code: null,
          latency_ms: 140,
        },
      ])
      const updated: NotificationJobDto = {
        ...job,
        status: 'sent',
        attempt_count: nextAttemptNo,
        next_attempt_at: null,
        last_error_code: null,
        updated_at: finishedAt,
        sent_at: finishedAt,
        provider_message_id: `prov-msg-retry-${job.id.slice(-4)}`,
      }
      store.jobs.set(job.id, updated)
      return detail(store, updated)
    },

    getEvent(eventId: string): NotificationEventViewDto {
      const store = getNotificationStore()
      requireAvailable(store)
      requireReadable(store)
      return eventView(store, eventId)
    },
  }
}
