/**
 * URL Shortener MSW handlers (MOCK mode).
 *
 * Intercept the exact requests produced by the Shortener API facade so
 * components/query code never know the difference between mock and real mode.
 * Handlers mutate the deterministic in-memory store to reproduce link
 * lifecycle and analytics scenarios. Added to the root handler list BEFORE the
 * final fail-closed handler.
 */

import { http, HttpResponse } from 'msw'

import { latencyMutation, latencyNormalRead } from '@/mocks/lib/latency'

import { createShortenerRouter, ShortenerMockError } from './shortener-store'
import type { CreateShortLinkRequest, ShortLinkListQuery } from '../models/shortener-dto'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const api = createShortenerRouter()

/** JSON body accepted by `HttpResponse.json` (avoids an explicit `any`). */
type JsonBody = Parameters<typeof HttpResponse.json>[0]

function errorEnvelope(status: number, code: string, message: string) {
  const headers = status === 429 ? { 'Retry-After': '30' } : undefined
  return HttpResponse.json({ error: { code, message } }, { status, headers })
}

function toResponse<T>(thunk: () => T) {
  try {
    const value = thunk()
    return value === undefined
      ? new HttpResponse(null, { status: 204, headers: { 'Content-Type': 'application/json' } })
      : HttpResponse.json(value as JsonBody)
  } catch (error) {
    if (error instanceof ShortenerMockError) {
      return errorEnvelope(error.status, error.code, error.message)
    }
    throw error
  }
}

function readListQuery(url: URL): ShortLinkListQuery {
  const cursor = url.searchParams.get('cursor') ?? undefined
  const limit = url.searchParams.has('limit')
    ? Number(url.searchParams.get('limit')) || undefined
    : undefined
  return { cursor, limit }
}

export const shortenerHandlers = [
  http.post('*/api/v1/links', async ({ request }) => {
    await delay(latencyMutation())
    const body = (await request.json()) as CreateShortLinkRequest
    return toResponse(() => api.create(body))
  }),

  http.get('*/api/v1/links', async ({ request }) => {
    await delay(latencyNormalRead())
    const url = new URL(request.url)
    return toResponse(() => api.list(readListQuery(url)))
  }),

  http.get('*/api/v1/links/:id', async ({ params }) => {
    await delay(latencyNormalRead())
    return toResponse(() => api.get(String(params.id)))
  }),

  http.delete('*/api/v1/links/:id', async ({ params }) => {
    await delay(latencyMutation())
    return toResponse(() => api.remove(String(params.id)))
  }),

  http.get('*/api/v1/links/:id/analytics', async ({ params }) => {
    await delay(latencyNormalRead())
    return toResponse(() => api.getAnalytics(String(params.id)))
  }),
]
