import { http, HttpResponse, passthrough } from 'msw'

import {
  getServiceRegistry,
  type ServiceEntry,
} from '@/shared/config/service-registry'

type ServiceOrigin = Pick<ServiceEntry, 'apiBaseUrl'>

function readOrigin(value: string): string | null {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

/**
 * Returns true when a request targets one of the currently configured backend
 * service origins. Kept exported as a pure helper so the fail-closed policy can
 * be unit-tested without starting a Service Worker.
 */
export function isConfiguredServiceRequest(
  requestUrl: string,
  services: readonly ServiceOrigin[] = getServiceRegistry(),
): boolean {
  const requestOrigin = readOrigin(requestUrl)
  if (!requestOrigin) return false

  return services.some((service) => readOrigin(service.apiBaseUrl) === requestOrigin)
}

/**
 * Final MSW safety-net for MOCK mode.
 *
 * Any request to a configured backend origin that reaches this handler has no
 * deterministic fixture/handler. Returning a local 501 prevents an accidental
 * request from escaping to a live backend. Non-service requests are explicitly
 * passed through.
 *
 * Keep this handler LAST in the root handler list.
 */
export const failClosedHandler = http.all('*', ({ request }) => {
  if (!isConfiguredServiceRequest(request.url)) {
    return passthrough()
  }

  const url = new URL(request.url)

  return HttpResponse.json(
    {
      error: {
        code: 'MOCK_UNHANDLED_REQUEST',
        message: `No deterministic mock handler is registered for ${request.method} ${url.pathname}.`,
      },
    },
    { status: 501 },
  )
})
