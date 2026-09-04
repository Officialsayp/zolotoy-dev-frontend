import { createHttpClients, type HttpClients } from './http-clients'

/**
 * Lazily-created singleton http clients shared across modules and the shell.
 * Created on first use so it can be overridden in tests.
 */
let instance: HttpClients | undefined

export function getHttpClients(): HttpClients {
  instance ??= createHttpClients()
  return instance
}

/** Test hook: replace the singleton or reset it (`undefined`). */
export function setHttpClientsForTest(next: HttpClients | undefined): void {
  instance = next
}
