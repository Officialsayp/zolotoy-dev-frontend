import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { setHttpClientsForTest } from '@/app/providers/http-clients-instance'
import type { HttpClients } from '@/app/providers/http-clients'
import type { HttpClient, HttpRequestOptions } from '@/shared/api/http-client'

import { authApi } from './auth-api'

/**
 * Facade routing test (Prompt 02): verifies the Auth API uses the shared HTTP
 * boundary with the correct browser-safe flags — cookie-only commands never
 * attach Bearer state or recurse into refresh, while authenticated commands and
 * resource reads rely on the shared Bearer + single-flight 401 coordinator.
 */

function makeFake() {
  const calls: HttpRequestOptions[] = []
  const client = {
    request: vi.fn(async <T>(options: HttpRequestOptions): Promise<T> => {
      calls.push(options)
      return {} as T
    }),
  } as unknown as HttpClient
  const clients = { service: { auth: client }, health: {} } as unknown as HttpClients
  return { clients, calls }
}

describe('auth-api facade', () => {
  let calls: HttpRequestOptions[]

  beforeEach(() => {
    const { clients, calls: c } = makeFake()
    calls = c
    setHttpClientsForTest(clients)
  })

  afterEach(() => {
    setHttpClientsForTest(undefined)
  })

  it('login uses cookie credentials without attaching Bearer and skips auth retry', async () => {
    await authApi.login({ email: 'user@zolotoy.dev', password: 'DemoPassword!123' })
    expect(calls[0]).toMatchObject({
      path: '/auth/login',
      method: 'POST',
      credentials: 'include',
      skipAuthRetry: true,
      skipAccessToken: true,
    })
  })

  it('register uses credentials include and skipAuthRetry', async () => {
    await authApi.register({ email: 'new@zolotoy.dev', password: 'DemoPassword!123' })
    expect(calls[0]).toMatchObject({ path: '/auth/register', method: 'POST', credentials: 'include', skipAuthRetry: true, skipAccessToken: true })
  })

  it('refresh uses credentials include and skipAuthRetry (cookie flow, no recursion)', async () => {
    await authApi.refresh()
    expect(calls[0]).toMatchObject({ path: '/auth/refresh', method: 'POST', credentials: 'include', skipAuthRetry: true, skipAccessToken: true })
  })

  it('logout is cookie-only while logout-all remains an authenticated protected command', async () => {
    await authApi.logout()
    await authApi.logoutAll()
    expect(calls[0]).toMatchObject({
      path: '/auth/logout',
      method: 'POST',
      credentials: 'include',
      skipAuthRetry: true,
      skipAccessToken: true,
    })
    expect(calls[1]).toMatchObject({ path: '/auth/logout-all', method: 'POST', credentials: 'include' })
    expect(calls[1].skipAuthRetry).toBeUndefined()
    expect(calls[1].skipAccessToken).toBeUndefined()
  })

  it('resource calls do NOT set skipAuthRetry (bearer + shared 401 recovery)', async () => {
    await authApi.getMe()
    await authApi.getSessions()
    await authApi.getAdminExample()
    for (const call of calls) {
      expect(call.skipAuthRetry).toBeUndefined()
    }
  })

  it('revokeSession targets the right DELETE path', async () => {
    await authApi.revokeSession('sess-9')
    expect(calls[0]).toMatchObject({ path: '/me/sessions/sess-9', method: 'DELETE' })
  })
})
