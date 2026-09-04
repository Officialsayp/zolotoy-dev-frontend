import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHttpClient } from './http-client'
import { createRefreshCoordinator } from './refresh-coordinator'

/**
 * Stage 02 concurrency/security regression: the shared HTTP layer must recover
 * from a burst of protected `401`s through ONE refresh and retry each original
 * request at most once — without recursive refresh, and never for `403`.
 */

function json(status: number, body?: unknown): Response {
  return new Response(body !== undefined ? JSON.stringify(body) : null, {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('http-client 401 refresh coordination', () => {
  it('concurrent protected 401s share exactly one refresh and each retries once', async () => {
    let token = 'expired-access'
    const refresh = vi.fn(async () => 'refreshed-access')
    const coordinator = createRefreshCoordinator({
      refresh,
      onRefreshSuccess: () => {
        token = 'refreshed-access'
      },
    })
    const client = createHttpClient({
      baseUrl: 'https://x.test/api/v1',
      getAccessToken: async () => token,
      coordinator,
    })

    const fetchMock = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      return headers.get('Authorization') === 'Bearer refreshed-access'
        ? json(200, { ok: true })
        : json(401, { error: { code: 'AUTH_UNAUTHORIZED', message: 'expired' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await Promise.all([
      client.request<{ ok: boolean }>({ path: '/me' }),
      client.request<{ ok: boolean }>({ path: '/me' }),
      client.request<{ ok: boolean }>({ path: '/me' }),
    ])

    expect(results).toHaveLength(3)
    expect(results.every((r) => r.ok)).toBe(true)
    // One refresh for all three; three initial 401s + three retries = 6 fetches.
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('403 never triggers a refresh', async () => {
    const refresh = vi.fn(async () => 't')
    const coordinator = createRefreshCoordinator({ refresh })
    const client = createHttpClient({
      baseUrl: 'https://x.test/api/v1',
      getAccessToken: async () => 'valid-token',
      coordinator,
    })
    vi.stubGlobal('fetch', vi.fn(async () => json(403, { error: { code: 'AUTH_FORBIDDEN', message: 'no' } })))

    await expect(client.request({ path: '/admin/example' })).rejects.toMatchObject({
      kind: 'authorization',
    })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('a 401 on the refresh retry does not recurse into another refresh', async () => {
    let token = 'expired-access'
    const refresh = vi.fn(async () => 't2')
    const onFailure = vi.fn()
    const coordinator = createRefreshCoordinator({
      refresh,
      onRefreshFailure: onFailure,
      onRefreshSuccess: () => {
        token = 't2'
      },
    })
    const client = createHttpClient({
      baseUrl: 'https://x.test/api/v1',
      getAccessToken: async () => token,
      coordinator,
    })
    // Always 401 even after "refresh" — the retry must surface, not re-refresh.
    vi.stubGlobal('fetch', vi.fn(async () => json(401, { error: { code: 'AUTH_UNAUTHORIZED', message: 'x' } })))

    await expect(client.request({ path: '/me' })).rejects.toMatchObject({
      kind: 'authentication',
    })
    // The shared refresh succeeded, but the retried request is still 401: that
    // error is surfaced without triggering a second (recursive) refresh.
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(onFailure).not.toHaveBeenCalled()
  })


  it('cookie-only auth requests never attach a stale Bearer token', async () => {
    const refresh = vi.fn(async () => 'unused')
    const coordinator = createRefreshCoordinator({ refresh })
    const client = createHttpClient({
      baseUrl: 'https://x.test/api/v1',
      getAccessToken: async () => 'expired-access',
      coordinator,
    })

    const fetchMock = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('Authorization')).toBeNull()
      return json(200, { access_token: 'fresh-access' })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      client.request({
        path: '/auth/refresh',
        method: 'POST',
        credentials: 'include',
        skipAuthRetry: true,
        skipAccessToken: true,
      }),
    ).resolves.toMatchObject({ access_token: 'fresh-access' })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('anonymous calls (no access token) are not wrapped and never refresh', async () => {
    const refresh = vi.fn(async () => 't')
    const coordinator = createRefreshCoordinator({ refresh })
    const client = createHttpClient({
      baseUrl: 'https://x.test/api/v1',
      getAccessToken: async () => null,
      coordinator,
    })
    vi.stubGlobal('fetch', vi.fn(async () => json(401, { error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'bad' } })))

    await expect(client.request({ path: '/auth/login', method: 'POST', skipAuthRetry: true })).rejects.toMatchObject({
      kind: 'authentication',
      code: 'AUTH_INVALID_CREDENTIALS',
    })
    expect(refresh).not.toHaveBeenCalled()
  })
})
