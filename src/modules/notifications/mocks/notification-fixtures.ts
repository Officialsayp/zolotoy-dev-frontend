/**
 * Deterministic Notification mock fixtures (MASTER_FRONTEND_PLAN §19.5, §16.11).
 *
 * Fixed event/job ids and a fixed scenario clock so attempt history and
 * `next_attempt_at` never drift randomly between refreshes. `notification-store`
 * seeds immutable baseline jobs from these; runtime transitions (e.g. manual
 * retry) mutate a copy and reset back to the baseline on scenario switch/reset.
 */

import type { NotificationAttemptDto, NotificationEventDto, NotificationJobDto } from '../models/notification-dto'
import type { NotificationEventType } from '../models/notification-types'

/** Fixed scenario clock (UTC) anchored so all timestamps are deterministic. */
export const NOTIFICATION_SCENARIO_EPOCH = '2026-09-02T12:00:00Z'

/** `minutes` relative to the scenario clock. */
export function at(minutes: number): string {
  return new Date(Date.parse(NOTIFICATION_SCENARIO_EPOCH) + minutes * 60_000).toISOString()
}

// Fixed event ids -------------------------------------------------------------
export const EVENT_PAID = '50000000-0000-4000-8000-000000000001' // order.paid.v1
export const EVENT_CREATED = '50000000-0000-4000-8000-000000000002' // order.created.v1
export const EVENT_DUP = '50000000-0000-4000-8000-000000000003' // order.paid.v1 (duplicate)
export const EVENT_TIMEOUT = '50000000-0000-4000-8000-000000000004' // order.paid.v1
export const EVENT_INVALID = '50000000-0000-4000-8000-000000000005' // order.paid.v1
export const EVENT_MANUAL = '50000000-0000-4000-8000-000000000006' // order.paid.v1
export const EVENT_RATE_LIMITED = '50000000-0000-4000-8000-000000000007' // order.paid.v1

// Fixed job ids ---------------------------------------------------------------
export const JOB_PAID_EMAIL = '60000000-0000-4000-8000-000000000001'
export const JOB_CREATED_EMAIL = '60000000-0000-4000-8000-000000000002'
export const JOB_DUP_EMAIL = '60000000-0000-4000-8000-000000000003'
export const JOB_RETRY_SUCCESS = '60000000-0000-4000-8000-000000000004'
export const JOB_TIMEOUT_DEAD = '60000000-0000-4000-8000-000000000005'
export const JOB_INVALID_DEAD = '60000000-0000-4000-8000-000000000006'
export const JOB_MANUAL_RETRY = '60000000-0000-4000-8000-000000000007'
export const JOB_RATE_LIMIT_WAIT = '60000000-0000-4000-8000-000000000008'

export const NOTIFICATION_AUTHOR_ID = '50000000-0000-4000-8000-0000000000a1'

function event(
  eventId: string,
  eventType: NotificationEventType,
  aggregateId: string,
  correlationId: string,
): NotificationEventDto {
  return {
    event_id: eventId,
    event_type: eventType,
    occurred_at: at(-90),
    producer: 'order-service',
    aggregate_id: aggregateId,
    correlation_id: correlationId,
  }
}

interface JobSeed {
  job: NotificationJobDto
  attempts: NotificationAttemptDto[]
  event: NotificationEventDto
}

function attempt(no: number, patch: Partial<NotificationAttemptDto>): NotificationAttemptDto {
  return {
    attempt_no: no,
    started_at: at(-30 - no),
    finished_at: at(-29 - no),
    latency_ms: 120,
    ...patch,
  }
}

export function buildNotificationFixtures(): JobSeed[] {
  const emailOrderCreated = () => ({
    channel: 'email' as const,
    recipient: 'user@example.com',
    recipient_id: NOTIFICATION_AUTHOR_ID,
    template_key: 'order_created_email_v1',
  })
  const emailOrderPaid = () => ({
    channel: 'email' as const,
    recipient: 'buyer@example.com',
    recipient_id: NOTIFICATION_AUTHOR_ID,
    template_key: 'order_paid_email_v1',
  })

  const base = (
    jobId: string,
    eventId: string,
    eventType: NotificationEventType,
    body: Pick<NotificationJobDto, 'channel' | 'recipient' | 'recipient_id' | 'template_key'>,
    patch: Partial<NotificationJobDto>,
  ): JobSeed => ({
    job: {
      id: jobId,
      event_id: eventId,
      event_type: eventType,
      attempt_count: 0,
      next_attempt_at: null,
      status: 'pending',
      created_at: at(-60),
      updated_at: at(-60),
      sent_at: null,
      ...body,
      ...patch,
    },
    attempts: [],
    event: event(
      eventId,
      eventType,
      eventType.includes('created') ? 'order-a-0001' : 'order-a-0002',
      `corr-${eventId.slice(-4)}`,
    ),
  })

  return [
    // 1. successful sent email for order.paid.v1
    {
      ...base(JOB_PAID_EMAIL, EVENT_PAID, 'order.paid.v1', emailOrderPaid(), {
        status: 'sent',
        attempt_count: 1,
        created_at: at(-60),
        updated_at: at(-29),
        sent_at: at(-29),
        provider_message_id: 'prov-msg-paid-1',
      }),
      attempts: [
        attempt(1, {
          result: 'sent',
          provider_status: 'accepted',
          latency_ms: 184,
          finished_at: at(-29),
        }),
      ],
    },
    // 2. active processing email for order.created.v1 (live polling demo)
    {
      ...base(JOB_CREATED_EMAIL, EVENT_CREATED, 'order.created.v1', emailOrderCreated(), {
        status: 'processing',
        attempt_count: 1,
        next_attempt_at: null,
        updated_at: at(-2),
      }),
      attempts: [
        attempt(1, {
          started_at: at(-2),
          finished_at: null,
          result: 'processing',
          latency_ms: null,
        }),
      ],
    },
    // 3. duplicate-event dedupe: only ONE job exists for a twice-received event
    {
      ...base(JOB_DUP_EMAIL, EVENT_DUP, 'order.paid.v1', emailOrderPaid(), {
        status: 'sent',
        attempt_count: 1,
        created_at: at(-55),
        updated_at: at(-24),
        sent_at: at(-24),
      }),
      attempts: [attempt(1, { result: 'sent', provider_status: 'accepted', finished_at: at(-24) })],
    },
    // 4. retryable provider 500 then success (completed history)
    {
      ...base(JOB_RETRY_SUCCESS, EVENT_PAID, 'order.paid.v1', emailOrderPaid(), {
        status: 'sent',
        attempt_count: 2,
        created_at: at(-80),
        updated_at: at(-10),
        sent_at: at(-10),
      }),
      attempts: [
        attempt(1, { result: 'error', provider_status: '500', error_code: 'PROVIDER_5XX', latency_ms: 201, finished_at: at(-70) }),
        attempt(2, { result: 'sent', provider_status: 'accepted', error_code: null, latency_ms: 121, finished_at: at(-10) }),
      ],
    },
    // 5. provider 429 -> retry_wait (Retry-After/backoff demo)
    {
      ...base(JOB_RATE_LIMIT_WAIT, EVENT_RATE_LIMITED, 'order.paid.v1', emailOrderPaid(), {
        status: 'retry_wait',
        attempt_count: 1,
        created_at: at(-45),
        updated_at: at(-5),
        next_attempt_at: at(5),
        last_error_code: 'PROVIDER_RATE_LIMITED',
      }),
      attempts: [
        attempt(1, {
          result: 'error',
          provider_status: '429',
          error_code: 'PROVIDER_RATE_LIMITED',
          latency_ms: 76,
          finished_at: at(-5),
        }),
      ],
    },
    // 6. timeout/retries exhausted -> dead
    {
      ...base(JOB_TIMEOUT_DEAD, EVENT_TIMEOUT, 'order.paid.v1', emailOrderPaid(), {
        status: 'dead',
        attempt_count: 3,
        created_at: at(-150),
        updated_at: at(-5),
        next_attempt_at: null,
        last_error_code: 'PROVIDER_TIMEOUT',
      }),
      attempts: [
        attempt(1, { result: 'error', provider_status: 'timeout', error_code: 'PROVIDER_TIMEOUT', latency_ms: 5000, finished_at: at(-140) }),
        attempt(2, { result: 'error', provider_status: 'timeout', error_code: 'PROVIDER_TIMEOUT', latency_ms: 5000, finished_at: at(-80) }),
        attempt(3, { result: 'error', provider_status: 'connection_reset', error_code: 'PROVIDER_TIMEOUT', latency_ms: 5000, finished_at: at(-6) }),
      ],
    },
    // 7. permanent invalid-recipient terminal failure -> dead (no retry)
    {
      ...base(JOB_INVALID_DEAD, EVENT_INVALID, 'order.paid.v1', emailOrderPaid(), {
        status: 'dead',
        attempt_count: 1,
        created_at: at(-70),
        updated_at: at(-40),
        next_attempt_at: null,
        last_error_code: 'INVALID_RECIPIENT',
      }),
      attempts: [
        attempt(1, {
          result: 'error',
          provider_status: 'permanent_failure',
          error_code: 'INVALID_RECIPIENT',
          latency_ms: 90,
          finished_at: at(-41),
        }),
      ],
    },
    // 8. dead -> manual retry -> sent (retriable dead baseline)
    {
      ...base(JOB_MANUAL_RETRY, EVENT_MANUAL, 'order.paid.v1', emailOrderPaid(), {
        status: 'dead',
        attempt_count: 1,
        created_at: at(-65),
        updated_at: at(-35),
        next_attempt_at: null,
        last_error_code: 'PROVIDER_5XX',
      }),
      attempts: [
        attempt(1, { result: 'error', provider_status: '500', error_code: 'PROVIDER_5XX', latency_ms: 310, finished_at: at(-36) }),
      ],
    },
  ]
}
