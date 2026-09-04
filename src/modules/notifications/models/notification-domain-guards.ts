import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_STATUSES,
  type NotificationChannel,
  type NotificationEventType,
  type NotificationJobStatus,
} from './notification-types'

/**
 * Narrow type guards for source vocabulary. `parseNotificationStatus` tolerates
 * an unknown string (e.g. a future backend value) and returns `undefined` rather
 * than crashing — but the UI must never invent labels for unknown statuses.
 */

export function isInputNotificationStatus(value: unknown): value is NotificationJobStatus {
  return (
    typeof value === 'string' && (NOTIFICATION_STATUSES as readonly string[]).includes(value)
  )
}

export function isNotificationChannel(value: unknown): value is NotificationChannel {
  return (
    typeof value === 'string' && (NOTIFICATION_CHANNELS as readonly string[]).includes(value)
  )
}

export function isNotificationEventType(value: unknown): value is NotificationEventType {
  return (
    typeof value === 'string' && (NOTIFICATION_EVENT_TYPES as readonly string[]).includes(value)
  )
}

export function parseNotificationStatus(value: unknown): NotificationJobStatus | undefined {
  return isInputNotificationStatus(value) ? value : undefined
}
