import { describe, expect, it } from 'vitest'

import {
  attemptDisplay,
  canManuallyRetry,
  isActiveNotificationStatus,
  isNotificationStatus,
  isTerminalNotificationStatus,
  maskRecipient,
  NOTIFICATION_STATUSES,
  notificationPollInterval,
} from './notification-domain'
import type { NotificationAttemptDto } from './notification-dto'

/**
 * Notification domain/display policy tests (Prompt 03 TESTS): exact source
 * status vocabulary (no invented `failed`), retry eligibility, active/terminal
 * polling behavior, safe attempt/recipient rendering.
 */

describe('job status vocabulary', () => {
  it('is exactly the six source statuses', () => {
    expect(NOTIFICATION_STATUSES).toEqual([
      'pending',
      'processing',
      'retry_wait',
      'sent',
      'dead',
      'cancelled',
    ])
  })

  it('never knows an invented `failed` status', () => {
    expect(NOTIFICATION_STATUSES).not.toContain('failed')
    expect(isNotificationStatus('failed')).toBe(false)
  })

  it('accepts only the source vocabulary', () => {
    for (const s of NOTIFICATION_STATUSES) expect(isNotificationStatus(s)).toBe(true)
    expect(isNotificationStatus('FAILED')).toBe(false)
    expect(isNotificationStatus(42)).toBe(false)
  })
})

describe('active vs terminal statuses', () => {
  it('treats pending/processing/retry_wait as active', () => {
    for (const s of ['pending', 'processing', 'retry_wait'] as const) {
      expect(isActiveNotificationStatus(s)).toBe(true)
    }
  })

  it('treats sent/dead/cancelled as terminal', () => {
    for (const s of ['sent', 'dead', 'cancelled'] as const) {
      expect(isTerminalNotificationStatus(s)).toBe(true)
      expect(isActiveNotificationStatus(s)).toBe(false)
    }
  })
})

describe('centralized polling policy', () => {
  it('polls active statuses and stops at terminal statuses', () => {
    expect(notificationPollInterval('pending')).toBe(5000)
    expect(notificationPollInterval('processing')).toBe(5000)
    expect(notificationPollInterval('retry_wait')).toBe(5000)
    expect(notificationPollInterval('sent')).toBeUndefined()
    expect(notificationPollInterval('dead')).toBeUndefined()
    expect(notificationPollInterval('cancelled')).toBeUndefined()
  })

  it('honors a custom interval for active states', () => {
    expect(notificationPollInterval('processing', 3000)).toBe(3000)
  })
})

describe('manual retry eligibility', () => {
  it('is only available for dead', () => {
    expect(canManuallyRetry('dead')).toBe(true)
  })

  it('is never shown for sent/cancelled/pending/processing/retry_wait', () => {
    for (const s of ['sent', 'cancelled', 'pending', 'processing', 'retry_wait'] as const) {
      expect(canManuallyRetry(s)).toBe(false)
    }
  })
})

describe('safe recipient masking', () => {
  it('masks email local part but keeps domain', () => {
    expect(maskRecipient('user@example.com', 'email')).toBe('u***r@example.com')
    expect(maskRecipient('a@example.com', 'email')).toBe('a*@example.com')
  })

  it('returns a placeholder for empty input', () => {
    expect(maskRecipient('  ', 'email')).toBe('—')
  })
})

describe('safe provider attempt rendering', () => {
  const attempt = (patch: Partial<NotificationAttemptDto> = {}): NotificationAttemptDto => ({
    attempt_no: 1,
    error_code: null,
    ...patch,
  })

  it('marks a 429 code as rate-limited with a safe retry explanation', () => {
    const d = attemptDisplay(attempt({ error_code: 'PROVIDER_RATE_LIMITED' }))
    expect(d.category).toBe('rate-limited')
    expect(d.safeErrorMessage).toContain('retry was scheduled')
    expect(d.safeErrorMessage).not.toMatch(/secret|api[_-]?key|header|stack/i)
  })

  it('marks invalid-recipient as permanent with no auto-retry wording', () => {
    const d = attemptDisplay(attempt({ error_code: 'INVALID_RECIPIENT' }))
    expect(d.category).toBe('permanent')
    expect(d.safeErrorMessage).toContain('not be automatically retried')
  })

  it('marks provider 5xx as retryable', () => {
    expect(attemptDisplay(attempt({ error_code: 'PROVIDER_5XX' })).category).toBe('retryable')
  })

  it('does not describe a successful attempt as failed when error_code is absent', () => {
    const d = attemptDisplay(
      attempt({ result: 'sent', provider_status: 'accepted', error_code: null }),
    )
    expect(d.safeErrorMessage).toBe('')
    expect(d.label).toBe('sent')
  })

  it('keeps an unknown provider error unclassified instead of assuming it is retryable', () => {
    const d = attemptDisplay(attempt({ result: 'error', error_code: 'PROVIDER_CUSTOM_X' }))
    expect(d.category).toBe('unknown')
    expect(d.safeErrorMessage).toContain('backend delivery policy')
    expect(d.safeErrorMessage).not.toContain('Retryable provider error')
  })

  it('never exposes raw provider details in the safe message', () => {
    for (const code of ['PROVIDER_5XX', 'INVALID_RECIPIENT', 'PROVIDER_TIMEOUT', 'PROVIDER_RATE_LIMITED']) {
      const { safeErrorMessage, label } = attemptDisplay(attempt({ error_code: code }))
      expect(`${safeErrorMessage} ${label}`).not.toMatch(/trace|at \w+\(/i)
    }
  })
})
