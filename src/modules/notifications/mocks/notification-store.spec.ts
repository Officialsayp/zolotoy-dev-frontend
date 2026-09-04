import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resetScenario, setScenario } from '@/mocks/scenario-registry'

import {
  EVENT_DUP,
  EVENT_PAID,
  JOB_DUP_EMAIL,
  JOB_INVALID_DEAD,
  JOB_MANUAL_RETRY,
  JOB_PAID_EMAIL,
  JOB_RATE_LIMIT_WAIT,
  JOB_RETRY_SUCCESS,
  JOB_TIMEOUT_DEAD,
} from './notification-fixtures'
import {
  createNotificationRouter,
  resetNotificationMockState,
  type NotificationStoreAPI,
} from './notification-store'

/**
 * Deterministic Notification mock-store scenarios (Prompt 03). Covers the
 * source delivery semantics: exact statuses, at-least-once deduplication,
 * attempts ordering, manual retry for `dead`, keyset pagination, and
 * forbidden / service-unavailable. Scenario switches rebuild from baseline.
 */

let api: NotificationStoreAPI

beforeEach(() => {
  resetScenario()
  resetNotificationMockState()
  api = createNotificationRouter()
})

afterEach(() => {
  resetScenario()
  resetNotificationMockState()
})

describe('notification mock store', () => {
  it('happy-sent scenario returns exactly one sent job with a successful attempt', () => {
    setScenario('notifications-happy-sent')
    resetNotificationMockState()
    api = createNotificationRouter()

    const list = api.list({})
    expect(list.items).toHaveLength(1)
    expect(list.items[0].status).toBe('sent')

    const d = api.get(JOB_PAID_EMAIL)
    expect(d.job.status).toBe('sent')
    expect(d.attempts).toHaveLength(1)
    expect(d.attempts[0].result).toBe('sent')
  })

  it('never invents a failed job status in fixtures', () => {
    for (const scenario of [
      'notifications-happy-sent',
      'notifications-retry-then-sent',
      'notifications-rate-limited-retry-wait',
      'notifications-retry-to-dead',
      'notifications-permanent-error-dead',
      'notifications-manual-retry-success',
    ] as const) {
      setScenario(scenario)
      resetNotificationMockState()
      api = createNotificationRouter()
      for (const job of api.list({}).items) {
        expect(['pending', 'processing', 'retry_wait', 'sent', 'dead', 'cancelled']).toContain(
          job.status,
        )
        expect(job.status).not.toBe('failed')
      }
    }
  })

  it('duplicate-event scenario deduplicates to a single job (no fake DLQ)', () => {
    setScenario('notifications-duplicate-event')
    resetNotificationMockState()
    api = createNotificationRouter()

    const event = api.getEvent(EVENT_DUP)
    expect(event.received_count).toBe(2)
    expect(event.duplicate_received).toBe(true)
    // Only ONE job exists despite two receipts.
    expect(event.jobs).toHaveLength(1)
    expect(event.jobs![0].id).toBe(JOB_DUP_EMAIL)
    // No Kafka DLQ dataset is fabricated.
    expect(api.list({}).items).toHaveLength(1)
  })

  it('retry-then-sent shows a retryable 500 followed by a successful attempt', () => {
    setScenario('notifications-retry-then-sent')
    resetNotificationMockState()
    api = createNotificationRouter()

    const d = api.get(JOB_RETRY_SUCCESS)
    expect(d.job.status).toBe('sent')
    expect(d.attempts.map((a) => a.error_code)).toEqual(['PROVIDER_5XX', null])
    expect(d.attempts[0].result).toBe('error')
    expect(d.attempts[1].result).toBe('sent')
  })

  it('provider 429 scenario stays in retry_wait with a scheduled next attempt', () => {
    setScenario('notifications-rate-limited-retry-wait')
    resetNotificationMockState()
    api = createNotificationRouter()

    const d = api.get(JOB_RATE_LIMIT_WAIT)
    expect(d.job.status).toBe('retry_wait')
    expect(d.job.next_attempt_at).toBeTruthy()
    expect(d.job.last_error_code).toBe('PROVIDER_RATE_LIMITED')
    expect(d.job.attempt_count).toBe(1)
    expect(d.attempts).toHaveLength(1)
    expect(d.attempts[0]).toMatchObject({
      result: 'error',
      provider_status: '429',
      error_code: 'PROVIDER_RATE_LIMITED',
    })
  })

  it('retry-to-dead exhausted the budget: terminal dead, no next attempt', () => {
    setScenario('notifications-retry-to-dead')
    resetNotificationMockState()
    api = createNotificationRouter()

    const d = api.get(JOB_TIMEOUT_DEAD)
    expect(d.job.status).toBe('dead')
    expect(d.job.next_attempt_at).toBeNull()
    expect(d.job.attempt_count).toBe(3)
    expect(d.attempts.every((a) => a.result === 'error')).toBe(true)
  })

  it('permanent-error-dead is terminal without auto-retry', () => {
    setScenario('notifications-permanent-error-dead')
    resetNotificationMockState()
    api = createNotificationRouter()

    const d = api.get(JOB_INVALID_DEAD)
    expect(d.job.status).toBe('dead')
    expect(d.job.last_error_code).toBe('INVALID_RECIPIENT')
    expect(d.attempts).toHaveLength(1)
  })

  it('attempts are ordered by attempt_no', () => {
    setScenario('notifications-retry-then-sent')
    resetNotificationMockState()
    api = createNotificationRouter()
    const d = api.get(JOB_RETRY_SUCCESS)
    const nos = d.attempts.map((a) => a.attempt_no)
    expect(nos).toEqual([...nos].sort((a, b) => a - b))
  })

  it('keyset pagination returns opaque cursors and has_more', () => {
    setScenario('notifications-retry-to-dead')
    resetNotificationMockState()
    api = createNotificationRouter()
    // Seed a larger deterministic set via the default scenario for pagination.
    setScenario('default')
    resetNotificationMockState()
    api = createNotificationRouter()

    const page1 = api.list({ limit: 2 })
    expect(page1.items.length).toBeLessThanOrEqual(2)
    expect(page1.has_more).toBe(true)
    expect(page1.next_cursor).toBeTruthy()

    const firstId = page1.items[0].id
    const page2 = api.list({ limit: 2, cursor: page1.next_cursor! })
    expect(page2.items.length).toBeGreaterThan(0)
    // Cursor anchors strictly after the previous last item (no overlap).
    expect(page2.items.some((j) => j.id === firstId)).toBe(false)
  })

  it('default list is filterable by status/channel/event type', () => {
    const sent = api.list({ status: 'sent' })
    expect(sent.items.every((j) => j.status === 'sent')).toBe(true)

    const email = api.list({ channel: 'email' })
    expect(email.items.every((j) => j.channel === 'email')).toBe(true)

    const paid = api.list({ event_type: 'order.paid.v1' })
    expect(paid.items.every((j) => j.event_type === 'order.paid.v1')).toBe(true)
  })

  it('dead -> manual retry -> sent with a new attempt', () => {
    setScenario('notifications-manual-retry-success')
    resetNotificationMockState()
    api = createNotificationRouter()

    const before = api.get(JOB_MANUAL_RETRY)
    expect(before.job.status).toBe('dead')

    const after = api.retry(JOB_MANUAL_RETRY)
    expect(after.job.status).toBe('sent')
    expect(after.job.last_error_code).toBeNull()
    expect(after.job.attempt_count).toBe(2)
    const attemptNos = after.attempts.map((a) => a.attempt_no)
    expect(attemptNos).toEqual([1, 2])
    expect(after.attempts[1].result).toBe('sent')
  })

  it('manual retry is rejected for non-dead jobs', () => {
    setScenario('notifications-happy-sent')
    resetNotificationMockState()
    api = createNotificationRouter()
    expect(() => api.retry(JOB_PAID_EMAIL)).toThrow(
      expect.objectContaining({ status: 409, code: 'NOTIFICATION_NOT_RETRYABLE' }),
    )
  })

  it('retry on an unknown job returns 404', () => {
    expect(() => api.retry('00000000-0000-4000-8000-000000000000')).toThrow(
      expect.objectContaining({ status: 404 }),
    )
  })

  it('forbidden scenario returns 403 on reads', () => {
    setScenario('notifications-forbidden')
    resetNotificationMockState()
    api = createNotificationRouter()
    expect(() => api.list({})).toThrow(expect.objectContaining({ status: 403 }))
    expect(() => api.get(JOB_PAID_EMAIL)).toThrow(expect.objectContaining({ status: 403 }))
  })

  it('service-unavailable scenario returns 503 on reads', () => {
    setScenario('notifications-service-unavailable')
    resetNotificationMockState()
    api = createNotificationRouter()
    expect(() => api.list({})).toThrow(expect.objectContaining({ status: 503 }))
  })

  it('empty scenario returns an empty list', () => {
    setScenario('notifications-empty')
    resetNotificationMockState()
    api = createNotificationRouter()
    expect(api.list({}).items).toHaveLength(0)
  })

  it('an already-created router follows scenario switches without stale state', () => {
    expect(api.list({}).items.length).toBeGreaterThan(0)

    setScenario('notifications-empty')
    expect(api.list({}).items).toHaveLength(0)

    // Switching back restores the baseline (no stale mutations leaking).
    setScenario('notifications-happy-sent')
    const happy = api.list({})
    expect(happy.items).toHaveLength(1)
    expect(happy.items[0].id).toBe(JOB_PAID_EMAIL)
  })

  it('event view links related jobs for a shared event (default scenario)', () => {
    // Default seeds two jobs (JOB_PAID_EMAIL + JOB_RETRY_SUCCESS) for EVENT_PAID.
    const event = api.getEvent(EVENT_PAID)
    expect(event.consumed).toBe(true)
    expect(event.duplicate_received).toBe(false)
    expect(event.event.event_type).toBe('order.paid.v1')
    expect(event.jobs?.map((j) => j.id).sort()).toEqual(
      [JOB_PAID_EMAIL, JOB_RETRY_SUCCESS].sort(),
    )
  })
})
