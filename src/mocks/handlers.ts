import type { HttpHandler } from 'msw'

import { healthHandlers } from './handlers/health'

/**
 * Root handler composition. Each service module contributes its own handlers;
 * the shell health handlers are the only infrastructure smoke examples in
 * Foundation. Components never import these — interception happens at the
 * network boundary. This module is transport-agnostic so the same handlers can
 * be used by the browser worker or a node server in tests.
 */
export const handlers: HttpHandler[] = [...healthHandlers]
