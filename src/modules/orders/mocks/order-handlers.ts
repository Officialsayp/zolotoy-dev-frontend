/**
 * Order MSW handlers (MOCK mode).
 *
 * These intercept the exact requests produced by the Order API facade, so
 * components/query code never know the difference between mock and real mode.
 * Handlers mutate the deterministic in-memory store to reproduce backend
 * transitions, idempotency replay/conflict, optimistic locking, pagination and
 * failure scenarios (MASTER_FRONTEND_PLAN §10, §19.3).
 *
 * They are added to the root handler list BEFORE the final fail-closed handler.
 */

import { http, HttpResponse } from 'msw'

import { latencyMutation, latencyNormalRead } from '@/mocks/lib/latency'

import type { CreateOrderRequestDto } from '../models/order-dto'
import { OrderMockError, createOrderRouter } from './order-store'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const api = createOrderRouter()

/** JSON body accepted by `HttpResponse.json` (avoids an explicit `any`). */
type JsonBody = Parameters<typeof HttpResponse.json>[0]

function orderEnvelope(status: number, code: string, message: string) {
  return HttpResponse.json(
    { error: { code, message } },
    { status, headers: status === 429 ? { 'Retry-After': '30' } : undefined },
  )
}

function toResponse<T>(thunk: () => T) {
  try {
    return HttpResponse.json(thunk() as JsonBody)
  } catch (error) {
    if (error instanceof OrderMockError) {
      return orderEnvelope(error.status, error.code, error.message)
    }
    throw error
  }
}

const idempotencyHeader = (request: Request): string | undefined =>
  request.headers.get('Idempotency-Key') ?? undefined

export const orderHandlers = [
  http.get('*/api/v1/orders', async ({ request }) => {
    await delay(latencyNormalRead())
    const url = new URL(request.url)
    const cursor = url.searchParams.get('cursor') ?? undefined
    const limit = Number(url.searchParams.get('limit')) || 20
    return toResponse(() => api.list(cursor, limit))
  }),

  http.get('*/api/v1/orders/:id/history', async ({ params }) => {
    await delay(latencyNormalRead())
    return toResponse(() => api.getHistory(String(params.id)))
  }),

  http.get('*/api/v1/orders/:id', async ({ params }) => {
    await delay(latencyNormalRead())
    return toResponse(() => api.get(String(params.id)))
  }),

  http.post('*/api/v1/orders', async ({ request }) => {
    await delay(latencyMutation())
    const body = (await request.json().catch(() => ({}))) as CreateOrderRequestDto
    return toResponse(() => api.create(body, idempotencyHeader(request)))
  }),

  http.post('*/api/v1/orders/:id/pay', async ({ request, params }) => {
    await delay(latencyMutation())
    return toResponse(() => api.pay(String(params.id), idempotencyHeader(request)))
  }),

  http.post('*/api/v1/orders/:id/confirm', async ({ params }) => {
    await delay(latencyMutation())
    return toResponse(() => api.confirm(String(params.id)))
  }),

  http.post('*/api/v1/orders/:id/complete', async ({ params }) => {
    await delay(latencyMutation())
    return toResponse(() => api.complete(String(params.id)))
  }),

  http.post('*/api/v1/orders/:id/cancel', async ({ request, params }) => {
    await delay(latencyMutation())
    return toResponse(() => api.cancel(String(params.id), idempotencyHeader(request)))
  }),

  http.post('*/api/v1/orders/:id/request-cancellation', async ({ params }) => {
    await delay(latencyMutation())
    return toResponse(() => api.requestCancellation(String(params.id)))
  }),
]
