/**
 * Auth MSW handlers (MOCK mode).
 *
 * These intercept the exact requests produced by the Auth API facade. The refresh
 * credential is modelled as an internal HttpOnly cookie over the mock boundary;
 * the VALUE is never exposed to components — the facade only relies on the cookie
 * being sent/rotated/cleared by the browser on `credentials: include` calls.
 *
 * Handlers are added to the root list BEFORE the final fail-closed handler.
 */

import { http, HttpResponse } from 'msw'

import { latencyMutation, latencyNormalRead } from '@/mocks/lib/latency'

import type { CredentialsDto, RegisterRequestDto } from '../models/auth-dto'
import {
  AuthMockError,
  clearRefreshCookieHeader,
  createAuthRouter,
  readRefreshCookie,
  refreshCookieHeader,
} from './auth-store'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const api = createAuthRouter()

type JsonBody = Parameters<typeof HttpResponse.json>[0]

function bearer(request: Request): string | undefined {
  const header = request.headers.get('authorization')
  if (!header) return undefined
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : undefined
}

function clearCookies(): Record<string, string> {
  return { 'Set-Cookie': clearRefreshCookieHeader() }
}

function toJson<T>(thunk: () => T, headers?: Record<string, string>) {
  try {
    return HttpResponse.json(thunk() as JsonBody, { status: 200, headers })
  } catch (error) {
    if (error instanceof AuthMockError) {
      const extra: Record<string, string> | undefined =
        headers ?? (error.status === 429 ? { 'Retry-After': '30' } : undefined)
      return HttpResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status, headers: extra },
      )
    }
    throw error
  }
}

function toEmpty(thunk: () => void, headers?: Record<string, string>) {
  try {
    thunk()
    return new HttpResponse(null, { status: 204, headers })
  } catch (error) {
    if (error instanceof AuthMockError) {
      return HttpResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      )
    }
    throw error
  }
}

export const authHandlers = [
  http.post('*/api/v1/auth/register', async ({ request }) => {
    await delay(latencyMutation())
    const body = (await request.json().catch(() => ({}))) as RegisterRequestDto
    return toJson(() => api.register(body.email, body.password))
  }),

  http.post('*/api/v1/auth/login', async ({ request }) => {
    await delay(latencyMutation())
    const body = (await request.json().catch(() => ({}))) as CredentialsDto
    // The mock sets the rotated refresh token as an HttpOnly cookie; only the
    // access token is returned in the body. The refresh token value stays
    // internal to the mock boundary.
    let cookie: string | undefined
    const response = toJson(() => {
      const result = api.login(body.email, body.password)
      cookie = refreshCookieHeader(result.refreshToken)
      return { access_token: result.accessToken, token_type: 'Bearer', expires_in: result.expiresIn }
    })
    if (cookie) {
      response.headers.set('Set-Cookie', cookie)
    }
    return response
  }),

  http.post('*/api/v1/auth/refresh', async ({ request }) => {
    await delay(latencyNormalRead())
    const token = readRefreshCookie(request.headers.get('cookie'))
    let cookie: string | undefined
    const response = toJson(() => {
      const result = api.refresh(token)
      cookie = refreshCookieHeader(result.refreshToken)
      return { access_token: result.accessToken, token_type: 'Bearer', expires_in: result.expiresIn }
    })
    if (cookie) {
      response.headers.set('Set-Cookie', cookie)
    }
    return response
  }),

  http.post('*/api/v1/auth/logout', async ({ request }) => {
    await delay(latencyMutation())
    const token = readRefreshCookie(request.headers.get('cookie'))
    return toEmpty(() => api.logout(token), clearCookies())
  }),

  http.post('*/api/v1/auth/logout-all', async ({ request }) => {
    await delay(latencyMutation())
    return toEmpty(() => api.logoutAll(bearer(request)), clearCookies())
  }),

  http.get('*/api/v1/me', async ({ request }) => {
    await delay(latencyNormalRead())
    return toJson(() => api.getMe(bearer(request)))
  }),

  http.get('*/api/v1/me/sessions', async ({ request }) => {
    await delay(latencyNormalRead())
    return toJson(() => api.listSessions(bearer(request)))
  }),

  http.delete('*/api/v1/me/sessions/:sessionId', async ({ request, params }) => {
    await delay(latencyMutation())
    return toEmpty(() => api.revokeSession(bearer(request), String(params.sessionId)))
  }),

  http.get('*/api/v1/admin/example', async ({ request }) => {
    await delay(latencyNormalRead())
    return toJson(() => api.adminExample(bearer(request)))
  }),
]
