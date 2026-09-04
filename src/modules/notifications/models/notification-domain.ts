import type {
  AttemptDisplay,
  NotificationAttemptDto,
} from './notification-dto'
import {
  isNotificationChannel,
  isNotificationEventType,
  isInputNotificationStatus,
  parseNotificationStatus,
} from './notification-domain-guards'
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  type NotificationChannel,
  type NotificationEventType,
  type NotificationJobStatus,
} from './notification-types'

export {
  isNotificationChannel,
  isNotificationEventType,
  isInputNotificationStatus as isNotificationStatus,
  parseNotificationStatus,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
}
export type { NotificationChannel, NotificationEventType, NotificationJobStatus } from './notification-types'

/**
 * Notification Service domain/display policy (MASTER_FRONTEND_PLAN §16.4–§16.9).
 *
 * Centralizes every rule that must not drift: the exact six-status vocabulary,
 * which statuses are "active" (the worker is still trying) versus "terminal",
 * the polling behavior tied to active statuses, and manual-retry eligibility.
 * Kept pure and fully unit-tested so backend semantics are a single source of
 * truth rather than scattered component logic.
 */

export interface StatusMeta {
  label: string
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'
  dot: boolean
}

export const NOTIFICATION_STATUS_META: Record<NotificationJobStatus, StatusMeta> = {
  pending: { label: 'Pending', tone: 'neutral', dot: true },
  processing: { label: 'Processing', tone: 'info', dot: true },
  retry_wait: { label: 'Retry wait', tone: 'warning', dot: true },
  sent: { label: 'Sent', tone: 'success', dot: false },
  dead: { label: 'Dead', tone: 'danger', dot: false },
  cancelled: { label: 'Cancelled', tone: 'neutral', dot: false },
}

/** Worker is actively delivering or scheduled to retry — detail should poll. */
export function isActiveNotificationStatus(status: NotificationJobStatus): boolean {
  return status === 'pending' || status === 'processing' || status === 'retry_wait'
}

/** Delivery has concluded — no further automatic change is expected. */
export function isTerminalNotificationStatus(status: NotificationJobStatus): boolean {
  return status === 'sent' || status === 'dead' || status === 'cancelled'
}

/**
 * Centralized polling policy (MASTER_FRONTEND_PLAN §16.8): modest Query polling
 * while the job is active, no polling once it reaches a terminal status.
 * Returns `undefined` to stop polling.
 */
export function notificationPollInterval(
  status: NotificationJobStatus,
  activeMs = 5000,
): number | undefined {
  return isActiveNotificationStatus(status) ? activeMs : undefined
}

/**
 * Manual retry policy (source admin API + master plan §16.5): exposed ONLY for
 * terminal `dead` delivery jobs. No manual retry by assumption for `sent`,
 * `cancelled`, or the worker-controlled `pending|processing|retry_wait`.
 */
export function canManuallyRetry(status: NotificationJobStatus): boolean {
  return status === 'dead'
}

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Email',
  telegram: 'Telegram',
}

/**
 * Mask a recipient for the list (frontend privacy proposal, §16.10): `u***@…`
 * for email, truncated handle for others. The detail page may show the full
 * value only where the backend contract permits.
 */
export function maskRecipient(recipient: string, channel?: NotificationChannel): string {
  const value = recipient.trim()
  if (!value) return '—'
  if (channel === 'email' || value.includes('@')) {
    const at = value.indexOf('@')
    if (at > 0) {
      const local = value.slice(0, at)
      const domain = value.slice(at)
      const head = local.slice(0, 1)
      const tail = local.length > 1 ? local.slice(-1) : ''
      const mask = local.length > 1 ? '***' : '*'
      return `${head}${mask}${tail}${domain}`
    }
  }
  return value.length <= 8 ? value : `${value.slice(0, 3)}***${value.slice(-2)}`
}

/** Which channel each fixed event type routes through (§4 demonstration). */
export const EVENT_TYPE_CHANNEL_LABELS: Record<NotificationEventType, string> = {
  'order.created.v1': 'Email',
  'order.paid.v1': 'Email + Telegram',
  'order.cancelled.v1': 'Email',
  'order.completed.v1': 'Email',
}

/**
 * Build a SAFE, non-revealing rendering of a delivery attempt. Never returns
 * raw provider bodies, SMTP/API secrets, headers or stack traces — only the
 * normalized `error_code` plus a short category label.
 */
export function attemptDisplay(attempt: NotificationAttemptDto): AttemptDisplay {
  const code = attempt.error_code?.trim()
  const lower = code?.toLowerCase() ?? ''
  const result = attempt.result?.trim().toLowerCase() ?? ''
  const providerStatus = attempt.provider_status?.trim().toLowerCase() ?? ''

  // Successful and in-flight attempts have no provider error to explain.
  // Keep the existing category vocabulary stable, but return no failure hint.
  if (
    !code &&
    (result === 'sent' ||
      result === 'success' ||
      providerStatus === 'accepted' ||
      providerStatus === 'sent' ||
      providerStatus === 'delivered')
  ) {
    return {
      label: attempt.result?.trim() || 'Sent',
      category: 'unknown',
      safeErrorMessage: '',
    }
  }

  if (!code && (result === 'processing' || result === 'pending')) {
    return {
      label: attempt.result?.trim() || 'Processing',
      category: 'unknown',
      safeErrorMessage: '',
    }
  }

  let category: AttemptDisplay['category'] = 'unknown'
  if (code) {
    if (lower.includes('429') || lower.includes('rate') || lower.includes('ratelimit')) {
      category = 'rate-limited'
    } else if (
      lower.includes('permanent') ||
      lower.includes('invalid_recipient') ||
      lower.includes('invalid-recipient') ||
      lower.includes('disabled') ||
      lower.includes('bounce')
    ) {
      category = 'permanent'
    } else if (
      lower.includes('5xx') ||
      lower.includes('timeout') ||
      lower.includes('connection_reset') ||
      lower.includes('connection-reset') ||
      lower.includes('temporar') ||
      lower.includes('unavailable')
    ) {
      category = 'retryable'
    }
  }

  const label = attempt.result?.trim() || code || 'Attempt'
  let safeErrorMessage: string
  if (category === 'rate-limited') {
    safeErrorMessage = 'Provider rate-limited the request. A retry was scheduled with backoff.'
  } else if (category === 'permanent') {
    safeErrorMessage = 'Permanent provider rejection. The job will not be automatically retried.'
  } else if (category === 'retryable') {
    safeErrorMessage = 'Retryable provider error. A retry was scheduled with backoff.'
  } else if (code) {
    safeErrorMessage =
      'Provider reported an error. Retryability is determined by backend delivery policy.'
  } else {
    safeErrorMessage = ''
  }

  return { label, category, safeErrorMessage }
}
