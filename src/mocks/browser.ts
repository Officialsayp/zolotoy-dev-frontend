import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

export interface MockBootstrapOptions {
  /** URL the browser is served from; used to locate the worker script. */
  serviceWorkerUrl?: string
}

const worker = setupWorker(...handlers)

/**
 * Starts the MSW worker for `mock` mode. Called from `main.ts` before the app
 * mounts; no Go backend is required. In `real` mode this is never invoked.
 *
 * Requests targeting configured backend service origins are protected by the
 * final fail-closed MSW handler. Unrelated browser/dev-server requests are
 * allowed to bypass MSW normally.
 */
export async function startMockWorker(options: MockBootstrapOptions = {}): Promise<void> {
  await worker.start({
    serviceWorker: {
      url: options.serviceWorkerUrl ?? '/mockServiceWorker.js',
    },
    onUnhandledRequest: 'bypass',
  })
}
