import { getHttpClients } from '@/app/providers/http-clients-instance'
import type { HttpQueryValue } from '@/shared/api/http-client'

import type {
  NotificationEventViewDto,
  NotificationJobDetailDto,
  NotificationListDto,
  NotificationListQuery,
} from '../models/notification-dto'
import {
  isNotificationChannel,
  isNotificationEventType,
  isInputNotificationStatus,
} from '../models/notification-domain-guards'

/**
 * Notification module API facade (MASTER_FRONTEND_PLAN §18.3, §9).
 *
 * The only module code that talks to the shared HTTP client for Notification
 * endpoints. Components and query composables never see raw URLs/query strings;
 * mock mode intercepts the exact requests produced here, so this facade is
 * identical in mock and live mode.
 *
 * Filter/cursor query-parameter names are `PROPOSED CONTRACT` (the source
 * requires filtering + keyset pagination but leaves names open). They are
 * serialized in ONE place here so a future OpenAPI decision never touches UI.
 */

function client() {
  return getHttpClients().service.notification
}

export function encodeNotificationId(id: string): string {
  return encodeURIComponent(id)
}

/** Which source-backed filter values serialize to an HTTP query parameter. */
export interface NotificationQueryMapping {
  status: { param: string; allow: (v: unknown) => boolean }
  channel: { param: string; allow: (v: unknown) => boolean }
  eventType: { param: string; allow: (v: unknown) => boolean }
  cursor: string
  limit: string
}

/** PROPOSED CONTRACT — the only place filter/keyset param names live. */
export const NOTIFICATION_QUERY_MAPPING: NotificationQueryMapping = {
  status: { param: 'status', allow: isInputNotificationStatus },
  channel: { param: 'channel', allow: isNotificationChannel },
  eventType: { param: 'event_type', allow: isNotificationEventType },
  cursor: 'cursor',
  limit: 'limit',
}

/**
 * Serialize a typed list query into flat query params (PROPOSED names), dropping
 * undefined values. Pure so it can be unit-tested as the adapter seam.
 */
export function serializeNotificationQuery(
  query: NotificationListQuery,
  mapping: NotificationQueryMapping = NOTIFICATION_QUERY_MAPPING,
): Record<string, HttpQueryValue> {
  const result: Record<string, HttpQueryValue> = {}
  if (query.status && mapping.status.allow(query.status)) result[mapping.status.param] = query.status
  if (query.channel && mapping.channel.allow(query.channel)) result[mapping.channel.param] = query.channel
  if (query.event_type && mapping.eventType.allow(query.event_type)) {
    result[mapping.eventType.param] = query.event_type
  }
  if (query.cursor) result[mapping.cursor] = query.cursor
  if (query.limit !== undefined) result[mapping.limit] = query.limit
  return result
}

export const notificationApi = {
  /** Keyset-paginated, filterable job list. */
  async listNotifications(query: NotificationListQuery = {}): Promise<NotificationListDto> {
    return client().request<NotificationListDto>({
      path: '/notifications',
      query: serializeNotificationQuery(query),
    })
  },

  /** Job detail + ordered delivery attempts. */
  async getNotification(notificationId: string): Promise<NotificationJobDetailDto> {
    return client().request<NotificationJobDetailDto>({
      path: `/notifications/${encodeNotificationId(notificationId)}`,
    })
  },

  /** Manual retry of a terminal delivery job. Response/transition: TBD. */
  async retryNotification(notificationId: string): Promise<NotificationJobDetailDto> {
    return client().request<NotificationJobDetailDto>({
      path: `/notifications/${encodeNotificationId(notificationId)}/retry`,
      method: 'POST',
      body: {},
    })
  },

  /** Input event metadata + deduplication + related jobs. */
  async getEvent(eventId: string): Promise<NotificationEventViewDto> {
    return client().request<NotificationEventViewDto>({
      path: `/events/${encodeNotificationId(eventId)}`,
    })
  },
}
