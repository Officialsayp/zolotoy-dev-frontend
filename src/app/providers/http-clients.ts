import { createHttpClient, type HttpClient } from '@/shared/api/http-client'
import { getServiceRegistry, type ServiceId } from '@/shared/config/service-registry'
import { useSessionStore } from '@/modules/auth/store/session-store'

/**
 * App-wide shared HTTP clients.
 *
 * Two clients per service:
 *  - `service`: rooted at host + `/api/v1` — used by module API facades;
 *  - `health`: rooted at the host — health/readiness live at the root, not under
 *    `/api/v1` (backend specs fix `/health/live` / `/health/ready`).
 *
 * Both share the same transport, so mock and real mode are identical to callers.
 * Access-token attachment reads the memory-only session store (auth bootstrap).
 */
export interface HttpClients {
  service: Record<ServiceId, HttpClient>
  health: Record<ServiceId, HttpClient>
}

export function createHttpClients(): HttpClients {
  const registry = getServiceRegistry()
  const getAccessToken = async (): Promise<string | null> => {
    const session = useSessionStore()
    return session.accessToken
  }
  const onUnauthorized = (): void => {
    // Auth stage (Prompt 02) wires refresh coordination / clear here.
  }

  const service = {} as Record<ServiceId, HttpClient>
  const health = {} as Record<ServiceId, HttpClient>

  for (const entry of registry) {
    service[entry.id] = createHttpClient({
      baseUrl: `${entry.apiBaseUrl}${entry.basePath}`,
      getAccessToken,
      onUnauthorized,
    })
    health[entry.id] = createHttpClient({
      baseUrl: entry.apiBaseUrl,
      getAccessToken,
      onUnauthorized,
    })
  }

  return { service, health }
}
