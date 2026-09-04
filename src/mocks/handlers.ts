import type { HttpHandler } from 'msw'

import { healthHandlers } from './handlers/health'
import { failClosedHandler } from './handlers/fail-closed'
import { orderHandlers } from '@/modules/orders/mocks/order-handlers'

/**
 * Root handler composition. Each service module contributes its own handlers;
 * the shell health handlers are the only infrastructure smoke examples in
 * Foundation. Components never import these — interception happens at the
 * network boundary. This module is transport-agnostic so the same handlers can
 * be used by the browser worker or a node server in tests.
 *
 * IMPORTANT: `failClosedHandler` must remain LAST. Service-specific handlers
 * added by later stages must be inserted before it.
 */
export const handlers: HttpHandler[] = [...healthHandlers, ...orderHandlers, failClosedHandler]
