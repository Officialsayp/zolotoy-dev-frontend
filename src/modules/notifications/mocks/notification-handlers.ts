/**
 * Notification MSW handlers (MOCK mode).
 *
 * Intercept the exact requests produced by the Notification API facade so
 * components/query code never know the difference between mock and real mode.
 * Handlers mutate the deterministic in-memory store to reproduce delivery
 * jobs, attempts and failure scenarios (MASTER_FRONTEND_PLAN §16, §10). They are
 * added to the root handler list BEFORE the final fail-closed handler.
 */

import { http, HttpResponse } from 'msw'

import { latencyMutation, latencyNormalRead } from '@/mocks/lib/latency'

import type { NotificationListQuery } from '../models/notification-dto'
import { NotificationMockError, createNotificationRouter } from './notification-store'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const api = createNotificationRouter()

/** JSON body accepted by `HttpResponse.json` (avoids an explicit `any`). */
type JsonBody = Parameters<typeof HttpResponse.json>[0]

function notificationEnvelope(status: number, code: string, message: string) {
  const headers = status === 429 ? { 'Retry-After': '30' } : undefined
  return HttpResponse.json({ error: { code, message } }, { status, headers })
}

function toResponse<T>(thunk: () => T) {
  try {
    return HttpResponse.json(thunk() as JsonBody)
  } catch (error) {
    if (error instanceof NotificationMockError) {
      return notificationEnvelope(error.status, error.code, error.message)
    }
    throw error
  }
}

function readFilters(url: URL): NotificationListQuery {
  const status = url.searchParams.get('status') ?? undefined
  const channel = url.searchParams.get('channel') ?? undefined
  const eventType = url.searchParams.get('event_type') ?? undefined
  const cursor = url.searchParams.get('cursor') ?? undefined
  const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) || undefined : undefined
  // Narrow the arbitrary query-string strings to the source vocabulary.
  return {
    status: status as NotificationListQuery['status'],
    channel: channel as NotificationListQuery['channel'],
    event_type: eventType as NotificationListQuery['event_type'],
    cursor,
    limit,
  }
}

export const notificationHandlers = [
  http.get('*/api/v1/notifications', async ({ request }) => {
    await delay(latencyNormalRead())
    const url = new URL(request.url)
    return toResponse(() => api.list(readFilters(url)))
  }),

  http.post('*/api/v1/notifications/:id/retry', async ({ params }) => {
    await delay(latencyMutation())
    return toResponse(() => api.retry(String(params.id)))
  }),

  http.get('*/api/v1/notifications/:id', async ({ params }) => {
    await delay(latencyNormalRead())
    return toResponse(() => api.get(String(params.id)))
  }),

  http.get('*/api/v1/events/:eventId', async ({ params }) => {
    await delay(latencyNormalRead())
    return toResponse(() => api.getEvent(String(params.eventId)))
  }),
]
