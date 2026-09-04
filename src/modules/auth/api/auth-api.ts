import { getHttpClients } from '@/app/providers/http-clients-instance'
import type { HttpClient, HttpRequestOptions } from '@/shared/api/http-client'

import type {
  AdminExampleDto,
  AuthSessionDto,
  AuthUserDto,
  CredentialsDto,
  RegisterRequestDto,
  TokenResponseDto,
} from '../models/auth-dto'

/**
 * Auth Service API facade (MASTER_FRONTEND_PLAN §9, §18.2).
 *
 * The only module code that talks to the shared HTTP client for Auth endpoints.
 * Browser-safe semantics:
 *  - login/register/refresh/logout use `credentials: include`, never attach a
 *    Bearer access token, and opt out of 401 refresh recursion;
 *  - logout-all is an authenticated command: it sends the Bearer token and may
 *    use the shared refresh coordinator once if that token has expired;
 *  - resource calls (me/sessions/admin) rely on the shared HTTP layer to attach
 *    `Authorization: Bearer <memory access token>` and to recover from a 401 via
 *    the single-flight refresh coordinator.
 *
 * Components never receive a refresh token value.
 */

function client(): HttpClient {
  return getHttpClients().service.auth
}

function request<T>(options: HttpRequestOptions): Promise<T> {
  return client().request<T>(options)
}

export const authApi = {
  register(body: RegisterRequestDto): Promise<unknown> {
    return request({
      path: '/auth/register',
      method: 'POST',
      body,
      credentials: 'include',
      skipAuthRetry: true,
      skipAccessToken: true,
    })
  },

  login(body: CredentialsDto): Promise<TokenResponseDto> {
    return request({
      path: '/auth/login',
      method: 'POST',
      body,
      credentials: 'include',
      skipAuthRetry: true,
      skipAccessToken: true,
    })
  },

  refresh(): Promise<TokenResponseDto> {
    return request({
      path: '/auth/refresh',
      method: 'POST',
      credentials: 'include',
      skipAuthRetry: true,
      skipAccessToken: true,
    })
  },

  logout(): Promise<unknown> {
    return request({
      path: '/auth/logout',
      method: 'POST',
      credentials: 'include',
      skipAuthRetry: true,
      skipAccessToken: true,
    })
  },

  logoutAll(): Promise<unknown> {
    return request({
      path: '/auth/logout-all',
      method: 'POST',
      credentials: 'include',
    })
  },

  getMe(): Promise<AuthUserDto> {
    return request({ path: '/me' })
  },

  getSessions(): Promise<AuthSessionDto[]> {
    return request({ path: '/me/sessions' })
  },

  revokeSession(sessionId: string): Promise<unknown> {
    return request({
      path: `/me/sessions/${encodeURIComponent(sessionId)}`,
      method: 'DELETE',
    })
  },

  getAdminExample(): Promise<AdminExampleDto> {
    return request({ path: '/admin/example' })
  },
}
