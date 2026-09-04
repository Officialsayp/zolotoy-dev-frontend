import { createHttpClient, type HttpClient } from '@/shared/api/http-client'
import { createRefreshCoordinator } from '@/shared/api/refresh-coordinator'
import { getServiceRegistry, type ServiceId } from '@/shared/config/service-registry'
import { useSessionStore } from '@/modules/auth/store/session-store'
import { handleAuthFailure } from '@/modules/auth/session/session-teardown'

/**
 * App-wide shared HTTP clients.
 *
 * Two clients per service:
 *  - `service`: rooted at host + `/api/v1` — used by module API facades;
 *  - `health`: rooted at the host — health/readiness live at the root, not under
 *    `/api/v1` (backend specs fix `/health/live` / `/health/ready`).
 *
 * All resource clients share one refresh coordinator so a burst of concurrent
 * protected `401`s across services triggers EXACTLY ONE cookie refresh. Health
 * clients stay anonymous/public and never attach bearer credentials.
 */
export interface HttpClients {
  service: Record<ServiceId, HttpClient>
  health: Record<ServiceId, HttpClient>
}

const AUTH_REFRESH_OPTIONS = {
  path: '/auth/refresh',
  method: 'POST',
  credentials: 'include',
  skipAuthRetry: true,
  skipAccessToken: true,
} as const

function accessTokenFromRefresh(result: unknown): string {
  if (typeof result === 'object' && result !== null && 'access_token' in result) {
    const value = (result as { access_token?: unknown }).access_token
    if (typeof value === 'string' && value.length > 0) return value
  }
  throw new Error('Auth refresh succeeded without a usable access token.')
}

export function createHttpClients(): HttpClients {
  const registry = getServiceRegistry()
  const getAccessToken = async (): Promise<string | null> => {
    const session = useSessionStore()
    return session.accessToken
  }

  const authEntry = registry.find((entry) => entry.id === 'auth')
  if (!authEntry) {
    throw new Error('Auth service is not registered.')
  }

  // Bootstrap the auth transport first. The coordinator uses this exact client
  // for its own cookie refresh request, explicitly without an Authorization
  // header and without recursive 401 recovery.
  const authRef: { client?: HttpClient } = {}
  const coordinator = createRefreshCoordinator<string>({
    refresh: async () => {
      const result = await (authRef.client as HttpClient).request<unknown>(AUTH_REFRESH_OPTIONS)
      return accessTokenFromRefresh(result)
    },
    onRefreshSuccess: (token) => {
      useSessionStore().setAccessToken(token)
    },
    onRefreshFailure: (error) => {
      handleAuthFailure(error)
    },
  })

  const authClient = createHttpClient({
    baseUrl: `${authEntry.apiBaseUrl}${authEntry.basePath}`,
    getAccessToken,
    coordinator,
  })
  authRef.client = authClient

  const service = {} as Record<ServiceId, HttpClient>
  const health = {} as Record<ServiceId, HttpClient>

  for (const entry of registry) {
    service[entry.id] =
      entry.id === 'auth'
        ? authClient
        : createHttpClient({
            baseUrl: `${entry.apiBaseUrl}${entry.basePath}`,
            getAccessToken,
            coordinator,
          })

    // Operational health endpoints are public probes. Attaching a user's bearer
    // token or starting an auth refresh from a health request is both unnecessary
    // and surprising, so they intentionally use a plain client.
    health[entry.id] = createHttpClient({
      baseUrl: entry.apiBaseUrl,
    })
  }

  return { service, health }
}
