import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { setHttpClientsForTest } from '@/app/providers/http-clients-instance'
import type { HttpClients } from '@/app/providers/http-clients'
import type { HttpClient, HttpRequestOptions } from '@/shared/api/http-client'

import { serializeShortenerListQuery, shortenerApi } from './shortener-api'

/**
 * Shortener API facade tests (Prompt 04 TESTS): exact create request fields,
 * authoritative `short_url` passthrough, routes/methods and list serialization,
 * plus confirmation that no Redis/cache-inspection surface exists on the facade.
 */

function makeFake() {
  const calls: HttpRequestOptions[] = []
  const client = {
    request: vi.fn(async <T>(options: HttpRequestOptions): Promise<T> => {
      calls.push(options)
      return {} as T
    }),
  } as unknown as HttpClient
  const clients = { service: { shortener: client }, health: {} } as unknown as HttpClients
  return { clients, calls }
}

describe('shortener api facade', () => {
  let calls: HttpRequestOptions[]

  beforeEach(() => {
    const { clients, calls: c } = makeFake()
    calls = c
    setHttpClientsForTest(clients)
  })

  afterEach(() => {
    setHttpClientsForTest(undefined)
  })

  it('routes to source-backed endpoints with correct methods', async () => {
    await shortenerApi.createLink({ url: 'https://x.dev/a' })
    await shortenerApi.getLink('link-1')
    await shortenerApi.listLinks({ cursor: 'abc', limit: 5 })
    await shortenerApi.deleteLink('link-1')
    await shortenerApi.getLinkAnalytics('link-1')

    expect(calls[0]).toMatchObject({ path: '/links', method: 'POST' })
    expect(calls[1]).toMatchObject({ path: '/links/link-1', method: 'GET' })
    expect(calls[2]).toMatchObject({ path: '/links', method: 'GET', query: { cursor: 'abc', limit: 5 } })
    expect(calls[3]).toMatchObject({ path: '/links/link-1', method: 'DELETE' })
    expect(calls[4]).toMatchObject({ path: '/links/link-1/analytics', method: 'GET' })
  })

  it('sends ONLY url / custom_alias? / expires_at? and no extra fields', async () => {
    await shortenerApi.createLink({ url: 'https://x.dev/a' })
    const body = calls[0].body as Record<string, unknown>
    expect(body).toEqual({ url: 'https://x.dev/a' })
    expect(Object.keys(body)).toEqual(['url'])

    await shortenerApi.createLink({
      url: 'https://x.dev/a',
      custom_alias: 'docs',
      expires_at: '2026-12-31T00:00:00Z',
    })
    expect(calls[1].body).toEqual({
      url: 'https://x.dev/a',
      custom_alias: 'docs',
      expires_at: '2026-12-31T00:00:00Z',
    })
  })

  it('passes the backend `short_url` through verbatim (never reconstructs it)', async () => {
    const { clients } = makeFake()
    const client = clients.service.shortener as HttpClient
    client.request = vi.fn(
      async <T>() => Promise.resolve({
        id: 'l1',
        code: 'Ab3xP9qK',
        short_url: 'https://s.zolotoy.dev/Ab3xP9qK',
        url: 'https://x.dev/a',
        expires_at: null,
        created_at: '2026-09-02T12:00:00Z',
      } as T),
    ) as HttpClient['request']
    setHttpClientsForTest(clients)

    const created = await shortenerApi.createLink({ url: 'https://x.dev/a' })
    // The create-response contract requires short_url and uses it as-is;
    // no hostname+code reconstruction is allowed.
    expect(created.short_url).toBe('https://s.zolotoy.dev/Ab3xP9qK')
  })

  it('serializes only defined list query params', () => {
    expect(serializeShortenerListQuery({})).toEqual({})
    expect(serializeShortenerListQuery({ cursor: 'x', limit: 25 })).toEqual({ cursor: 'x', limit: 25 })
    expect(serializeShortenerListQuery({ cursor: '' })).toEqual({})
  })

  it('exposes no Redis/cache-inspection API surface', () => {
    // Only the fixed management routes are present — no cache/redis/singleflight.
    const methods = Object.keys(shortenerApi).sort()
    expect(methods).toEqual([
      'createLink',
      'deleteLink',
      'getLink',
      'getLinkAnalytics',
      'listLinks',
    ])
  })
})
