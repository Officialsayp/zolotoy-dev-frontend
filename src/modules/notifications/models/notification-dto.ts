/**
 * Notification Service network-boundary DTOs (MASTER_FRONTEND_PLAN §18.3).
 *
 * These are manual adapter-boundary types until the OpenAPI stabilizes. The
 * source fixes the ROUTES (`GET /notifications`, `GET /notifications/{id}`,
 * `POST /notifications/{id}/retry`, `GET /events/{event_id}`) and the persistence
 * fields, but not the JSON DTO shapes. Anything the source leaves open is a
 * `PROPOSED CONTRACT` implemented behind the API facade and testable in one
 * place so it can be swapped for generated types without rewriting UI.
 *
 * Privacy: only safe, non-secret fields are modeled here. Raw provider payloads,
 * SMTP/API credentials and raw headers are never represented.
 */

import type {
  NotificationChannel,
  NotificationEventType,
  NotificationJobStatus,
  ProviderErrorCategory,
} from './notification-types'

/** Safe recipient string used for display in the operational console. */
export interface SafeRecipientDto {
  /** The actual recipient value. Masking for the list is a frontend concern. */
  value: string
  /** PROPOSED — stable, non-secret display/hash label when the API offers one. */
  display?: string
}

/**
 * Notification job list/detail representation (PROPOSED based on source
 * `notification_jobs` fields §10). `event_type` is denormalized for filter/search.
 */
export interface NotificationJobDto {
  id: string
  event_id: string
  /** PROPOSED CONTRACT — denormalized onto the job for filter by event type. */
  event_type: NotificationEventType
  channel: NotificationChannel
  recipient: string
  recipient_id?: string | null
  /** Template key/version so retries render deterministically (§15). */
  template_key?: string | null
  status: NotificationJobStatus
  attempt_count: number
  next_attempt_at?: string | null
  provider_message_id?: string | null
  last_error_code?: string | null
  created_at: string
  updated_at: string
  sent_at?: string | null
}

/** A single provider delivery attempt (§10 `delivery_attempts`). */
export interface NotificationAttemptDto {
  attempt_no: number
  started_at?: string | null
  finished_at?: string | null
  result?: string | null
  provider_status?: string | null
  error_code?: string | null
  latency_ms?: number | null
}

/**
 * Job detail response (PROPOSED): the job plus attempts ordered by `attempt_no`.
 * Event-origin context is fetched separately via `GET /events/{event_id}`.
 */
export interface NotificationJobDetailDto {
  job: NotificationJobDto
  attempts: NotificationAttemptDto[]
}

/** Keyset paginated job list (PROPOSED envelope; source requires keyset §20). */
export interface NotificationListDto {
  items: NotificationJobDto[]
  has_more: boolean
  next_cursor: string | null
}

/**
 * List filters + keyset pagination. Query-parameter names are PROPOSED CONTRACT
 * (source requires filtering and keyset pagination but leaves names open).
 */
export interface NotificationListQuery {
  status?: NotificationJobStatus
  channel?: NotificationChannel
  event_type?: NotificationEventType
  cursor?: string
  limit?: number
}

/**
 * Input event metadata (`GET /events/{event_id}`, PROPOSED DTO). Only safe
 * metadata — no raw payload secrets are surfaced to this console.
 */
export interface NotificationEventDto {
  event_id: string
  event_type: NotificationEventType
  occurred_at?: string | null
  producer?: string | null
  /** Order/aggregate identity (partition key is `order_id`, source §6). */
  aggregate_id?: string | null
  correlation_id?: string | null
}

/** Event view response (PROPOSED): metadata + ingestion/dedup + related jobs. */
export interface NotificationEventViewDto {
  event: NotificationEventDto
  /** Whether the event was durably consumed (deduplication inbox). */
  consumed: boolean
  /** PROPOSED — how many times this event_id arrived (at-least-once duplicates). */
  received_count?: number
  /** PROPOSED — true when a duplicate was discarded without creating a new job. */
  duplicate_received?: boolean
  jobs?: NotificationJobDto[]
}

/** Coarse attempt view for safe rendering (never raw stack/secrets). */
export interface AttemptDisplay {
  label: string
  category: ProviderErrorCategory
  safeErrorMessage: string
}
