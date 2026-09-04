/**
 * Notification Service exact source vocabulary (03_notification_service.md §5, §10).
 *
 * These are the ONLY meaningful values the frontend understands. In particular
 * there is deliberately NO generic `failed` job status: delivery failure is
 * expressed through attempt `result`/`error_code` and either the `retry_wait`
 * or terminal `dead` job status.
 */

/** Source-backed notification job statuses — exactly these six. */
export const NOTIFICATION_STATUSES = [
  'pending',
  'processing',
  'retry_wait',
  'sent',
  'dead',
  'cancelled',
] as const

export type NotificationJobStatus = (typeof NOTIFICATION_STATUSES)[number]

/** Delivery channels known to the UI. */
export const NOTIFICATION_CHANNELS = ['email', 'telegram'] as const

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

/** Source-backed event types Notification Service subscribes to (§4). */
export const NOTIFICATION_EVENT_TYPES = [
  'order.created.v1',
  'order.paid.v1',
  'order.cancelled.v1',
  'order.completed.v1',
] as const

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number]

/** Coarse classification of a delivery attempt for safe display. */
export type ProviderErrorCategory = 'retryable' | 'rate-limited' | 'permanent' | 'unknown'
