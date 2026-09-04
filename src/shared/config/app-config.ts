import type { RuntimeEnv } from './runtime-env'

/**
 * Runtime application configuration, validated at bootstrap.
 *
 * `mock` uses MSW network interception and needs no Go backend.
 * `real` targets the live backend hosts from the service registry.
 * An unknown or malformed value fails fast with a clear fatal config error.
 */

export type ApiMode = 'mock' | 'real'

export interface AppConfig {
  apiMode: ApiMode
  deployEnv: string
}

const VALID_MODES: readonly ApiMode[] = ['mock', 'real']

/** Thrown when Vite runtime configuration is invalid; blocks app mount. */
export class AppConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppConfigError'
  }
}

export function parseApiMode(raw: unknown): ApiMode {
  if (raw === undefined || raw === null || raw === '') {
    // Convenience default so a fresh checkout runs mock-first without a local env file.
    return 'mock'
  }
  if (typeof raw !== 'string') {
    throw new AppConfigError(`Invalid VITE_API_MODE: expected "mock" or "real", got ${String(raw)}.`)
  }
  if (VALID_MODES.includes(raw as ApiMode)) {
    return raw as ApiMode
  }
  throw new AppConfigError(
    `Invalid VITE_API_MODE="${raw}". Expected one of: ${VALID_MODES.join(', ')}.`,
  )
}

export function loadAppConfig(env: RuntimeEnv): AppConfig {
  const apiMode = parseApiMode(env.VITE_API_MODE)
  const deployEnv = (env.VITE_DEPLOY_ENV ?? '').trim() || 'local'
  return { apiMode, deployEnv }
}

let cached: AppConfig | undefined

/** Lazily resolved, memoized runtime config. Throws `AppConfigError` on invalid config. */
export function getRuntimeConfig(env: RuntimeEnv = import.meta.env as RuntimeEnv): AppConfig {
  cached ??= loadAppConfig(env)
  return cached
}
