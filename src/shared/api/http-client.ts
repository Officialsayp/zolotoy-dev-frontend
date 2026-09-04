import type { AppError } from './api-error'
import { errorFromResponse, mapNetworkError } from './error-mapper'

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
}

export interface HttpClientConfig {
  /** Resolved service base URL, e.g. `https://order-api.zolotoy.dev/api/v1`. */
  baseUrl: string
  /** Returns the in-memory access token or null when anonymous. */
  getAccessToken?: () => string | null | Promise<string | null>
  /**
   * Called when a transport-level 401 is encountered. The Auth stage plugs the
   * single-flight refresh coordinator / logout here. Returning nothing; the
   * request itself always surfaces the normalized auth error.
   */
  onUnauthorized?: (error: AppError) => void
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

  async function request<T>(options: HttpRequestOptions): Promise<T> {
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

    const token = await getAccessToken()
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

  return { request }
}
