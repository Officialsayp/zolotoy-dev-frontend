import { describe, expect, it } from 'vitest'

import { AppConfigError, loadAppConfig, parseApiMode } from './app-config'
import type { RuntimeEnv } from './runtime-env'

describe('parseApiMode', () => {
  it('defaults to mock when unset or empty', () => {
    expect(parseApiMode(undefined)).toBe('mock')
    expect(parseApiMode(null)).toBe('mock')
    expect(parseApiMode('')).toBe('mock')
  })

  it('accepts mock and real', () => {
    expect(parseApiMode('mock')).toBe('mock')
    expect(parseApiMode('real')).toBe('real')
  })

  it('throws a clear config error for invalid values', () => {
    expect(() => parseApiMode('staging')).toThrow(AppConfigError)
    expect(() => parseApiMode('staging')).toThrow(/VITE_API_MODE/)
    expect(() => parseApiMode(42)).toThrow(AppConfigError)
  })
})

describe('loadAppConfig', () => {
  it('builds a valid config', () => {
    const env: RuntimeEnv = { VITE_API_MODE: 'real', VITE_DEPLOY_ENV: 'demo' }
    expect(loadAppConfig(env)).toEqual({ apiMode: 'real', deployEnv: 'demo' })
  })

  it('defaults deploy env to local', () => {
    expect(loadAppConfig({}).deployEnv).toBe('local')
    expect(loadAppConfig({ VITE_DEPLOY_ENV: '  ' }).deployEnv).toBe('local')
  })

  it('spaceship: invalid api mode fails clearly at the config layer', () => {
    expect(() => loadAppConfig({ VITE_API_MODE: 'prod' })).toThrow(AppConfigError)
  })
})
