import { http, HttpResponse } from 'msw'

import { isScenario } from '../scenario-registry'
import { latencyNormalRead } from '../lib/latency'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Health/readiness handlers for the shell services.
 *
 * All four backend services expose `/health/live` and `/health/ready`, so one
 * matching pair per path covers them. The backend health response body is not
 * fixed by the specs (P1-01 TBD); the shell treats any 2xx as healthy and mock
 * health is clearly marked simulated. The `degraded` scenario returns 503 so
 * the shell's degraded state is demonstrable without a backend.
 *
 * Wildcard host keeps interception working even when Vite env overrides the
 * configured service base URL. Service-specific handlers arrive with each stage.
 */
async function respond() {
  await delay(latencyNormalRead())
  if (isScenario('degraded')) {
    return HttpResponse.json({ status: 'unavailable', source: 'mock' }, { status: 503 })
  }
  return HttpResponse.json({ status: 'ok', source: 'mock' })
}

export const healthHandlers = [
  http.get('*/health/live', respond),
  http.get('*/health/ready', respond),
]
