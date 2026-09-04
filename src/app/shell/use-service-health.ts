import { useQuery } from '@tanstack/vue-query'

import { getService, type ServiceId } from '@/shared/config/service-registry'
import { getHttpClients } from '@/app/providers/http-clients-instance'

export type ServiceHealth = 'healthy' | 'degraded' | 'unknown'

/**
 * Lightweight per-service health/readiness check for the shell.
 *
 * The backend health response body is not fixed (P1-01 TBD), so any 2xx counts
 * as healthy. In mock mode the result is simulated by MSW (clearly labelled
 * "simulated"). Only a smoke check — never the source of backend truth.
 */
export function useServiceHealth(serviceId: ServiceId) {
  return useQuery({
    queryKey: ['system', 'health', serviceId],
    queryFn: async (): Promise<ServiceHealth> => {
      const service = getService(serviceId)
      try {
        await getHttpClients().health[serviceId].request<unknown>({
          path: service.healthLivePath,
          timeoutMs: 4000,
        })
        return 'healthy'
      } catch {
        return 'degraded'
      }
    },
    retry: 1,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
