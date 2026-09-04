import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHttpClient } from './http-client'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(impl: () => Promise<Response>): ReturnType<typeof vi.fn> {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('http-client', () => {
  it('builds the URL, attaches bearer token, and parses JSON', async () => {
    const fetchMock = stubFetch(async () =>
      new Response('{"hello":"world"}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    const client = createHttpClient({ baseUrl: 'https://x.test/api/v1', getAccessToken: async () => 'tok' })
    const data = await client.request<{ hello: string }>({
      path: '/orders',
      query: { cursor: 'abc', n: 1, skip: undefined },
    })
    expect(data.hello).toBe('world')

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://x.test/api/v1/orders?cursor=abc&n=1')
    const headers = (init as RequestInit).headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer tok')
    expect(headers.get('Accept')).toBe('application/json')
  })

  it('serializes JSON bodies with Content-Type', async () => {
    const fetchMock = stubFetch(async () => new Response('{"id":"1"}', { status: 201 }))
    const client = createHttpClient({ baseUrl: 'https://x.test/api/v1' })
    await client.request({ path: '/orders', method: 'POST', body: { amount: 499000 } })
    const [, init] = fetchMock.mock.calls[0]
    const headers = (init as RequestInit).headers as Headers
    expect(headers.get('Content-Type')).toBe('application/json')
    expect((init as RequestInit).body).toBe('{"amount":499000}')
  })

  it('treats an empty 2xx body as no content', async () => {
    stubFetch(async () => new Response(null, { status: 204 }))
    const client = createHttpClient({ baseUrl: 'https://x.test/api/v1' })
    await expect(client.request({ path: '/orders/1/cancel', method: 'POST' })).resolves.toBeUndefined()
  })

  it('normalizes an error response and notifies on 401', async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ error: { code: 'AUTH_EXPIRED', message: 'expired' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const onUnauthorized = vi.fn()
    const client = createHttpClient({ baseUrl: 'https://x.test/api/v1', onUnauthorized })
    await expect(client.request({ path: '/me' })).rejects.toMatchObject({ kind: 'authentication', code: 'AUTH_EXPIRED' })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('maps an aborted fetch to a timeout error', async () => {
    stubFetch(async () => {
      throw new DOMException('The operation was aborted.', 'AbortError')
    })
    const client = createHttpClient({ baseUrl: 'https://x.test/api/v1' })
    await expect(client.request({ path: '/orders' })).rejects.toMatchObject({ kind: 'timeout' })
  })
})
