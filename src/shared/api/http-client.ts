import type { AppError } from './api-error'
import { errorFromResponse, mapNetworkError } from './error-mapper'
import { isAppErrorOfKind, type RefreshCoordinator } from './refresh-coordinator'

/**
 * Shared typed native-`fetch` transport boundary (MASTER_FRONTEND_PLAN §9).
 *
 * Owns: URL construction from a resolved service base URL, default headers,
 * bearer access-token attachment, timeout/abort, and normalized error
 * conversion. It deliberately does NOT own service/domain semantics — modules
 * interpret backend error codes.
 *
 * Mock and real mode share this exact boundary: MSW intercepts the same
 * requests produced here.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type HttpQueryValue = string | number | boolean | undefined

export interface HttpRequestOptions<TBody = unknown> {
  path: string
  method?: HttpMethod
  query?: Record<string, HttpQueryValue>
  headers?: Record<string, string>
  body?: TBody
  /** Browser cookie mode; used by auth/bootstrap calls. Default `omit`. */
  credentials?: RequestCredentials
  timeoutMs?: number
  /** External cancellation; an internal timeout is ignored when provided. */
  signal?: AbortSignal
  /**
   * Do not attach the in-memory Bearer token to this request. Public/cookie-only
   * auth endpoints such as login/register/refresh/logout must use this so an
   * expired access token cannot interfere with the refresh-cookie flow.
   */
  skipAccessToken?: boolean
  /**
   * Opt out of the shared `401 → refresh → retry` flow for this request.
   * Used by public auth commands (login/register/refresh/logout) so an auth
   * error there is never interpreted as an expired access token.
   */
  skipAuthRetry?: boolean
}

export interface HttpClientConfig {
  /** Resolved service base URL, e.g. `https://order-api.zolotoy.dev/api/v1`. */
  baseUrl: string
  /** Returns the in-memory access token or null when anonymous. */
  getAccessToken?: () => string | null | Promise<string | null>
  /**
   * Optional informational 401 hook. The Auth stage wires the single-flight
   * refresh coordinator here and sets `coordinator`; when a coordinator is
   * present, 401 recovery is handled by it (single-flight refresh + one retry).
   */
  onUnauthorized?: (error: AppError) => void | Promise<boolean>
  /**
   * Shared single-flight refresh coordinator (Foundation primitive). When set,
   * protected calls (those carrying an access token) are wrapped so a 401
   * triggers exactly one shared refresh and a single retry with the new token.
   */
  coordinator?: RefreshCoordinator
  credentials?: RequestCredentials
  timeoutMs?: number
}

export interface HttpClient {
  request<T>(options: HttpRequestOptions): Promise<T>
}

export function buildQueryString(query: Record<string, HttpQueryValue>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  const qIndex = p.indexOf('?')
  const cleanPath = qIndex === -1 ? p : p.slice(0, qIndex)
  return `${base}${cleanPath}`
}

const DEFAULT_TIMEOUT_MS = 15_000

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const { baseUrl } = config
  const defaultCredentials = config.credentials ?? 'omit'

  async function getAccessToken(): Promise<string | null> {
    const token = config.getAccessToken ? await config.getAccessToken() : null
    return token && token.length > 0 ? token : null
  }

  async function doRequest<T>(options: HttpRequestOptions): Promise<T> {
    const method = options.method ?? 'GET'
    const url = joinUrl(baseUrl, options.path) + buildQueryString(options.query ?? {})
    const headers = new Headers(options.headers)
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json')
    }
    const hasBody = options.body !== undefined
    if (hasBody && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const token = options.skipAccessToken === true ? null : await getAccessToken()
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const init: RequestInit = {
      method,
      headers,
      credentials: options.credentials ?? defaultCredentials,
    }
    if (hasBody) {
      init.body = JSON.stringify(options.body)
    }

    // Timeout: only when no external abort signal is provided.
    const controller =
      typeof AbortController !== 'undefined' && !options.signal ? new AbortController() : null
    let timer: ReturnType<typeof setTimeout> | undefined
    if (controller) {
      timer = setTimeout(() => controller.abort(), options.timeoutMs ?? config.timeoutMs ?? DEFAULT_TIMEOUT_MS)
      init.signal = controller.signal
    } else if (options.signal) {
      init.signal = options.signal
    }

    let response: Response
    try {
      response = await fetch(url, init)
    } catch (cause) {
      const isTimeout = Boolean(controller?.signal.aborted)
      throw mapNetworkError(cause, isTimeout)
    } finally {
      if (timer) clearTimeout(timer)
    }

    if (!response.ok) {
      const error = await errorFromResponse(response)
      if (error.kind === 'authentication') {
        config.onUnauthorized?.(error)
      }
      throw error
    }

    const text = await response.text()
    if (!text) return undefined as unknown as T
    try {
      return JSON.parse(text) as T
    } catch {
      return text as unknown as T
    }
  }

  /**
   * Entry point. When a shared refresh coordinator is configured and this is a
   * protected call (a Bearer access token is present and neither
   * `skipAuthRetry` nor `skipAccessToken` is set), wrap the attempt so a 401
   * runs one single-flight refresh and retries
   * the request once with the refreshed token. Anonymous calls (no token) and
   * explicitly opted-out auth commands never trigger refresh.
   */
  async function request<T>(options: HttpRequestOptions): Promise<T> {
    const coordinator = config.coordinator
    if (coordinator && options.skipAuthRetry !== true && options.skipAccessToken !== true) {
      const token = await getAccessToken()
      const isProtected = token !== null
      if (isProtected) {
        return coordinator.runWithAuthRetry(
          () => doRequest<T>(options),
          (error) => isAppErrorOfKind(error, 'authentication'),
        )
      }
    }
    return doRequest<T>(options)
  }

  return { request }
}
