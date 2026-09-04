import { describe, expect, it } from 'vitest'

import type { RuntimeEnv } from './runtime-env'
import { buildServiceRegistry } from './service-registry'

describe('service registry', () => {
  it('maps configured shell resource URLs into every service entry', () => {
    const env: RuntimeEnv = {
      VITE_GITHUB_REPO_URL: 'https://github.com/example/zolotoy-dev-frontend',
      VITE_GRAFANA_URL: 'https://grafana.example.test/d/zolotoy-dev',
      VITE_API_DOCS_URL: 'https://docs.example.test/openapi',
    }

    const registry = buildServiceRegistry(env)

    for (const service of registry) {
      expect(service.githubUrl).toBe('https://github.com/example/zolotoy-dev-frontend')
      expect(service.grafanaUrl).toBe('https://grafana.example.test/d/zolotoy-dev')
      expect(service.apiDocsUrl).toBe('https://docs.example.test/openapi')
    }
  })

  it('normalizes configured service base URLs and keeps shortener public URL isolated', () => {
    const env: RuntimeEnv = {
      VITE_ORDER_API_BASE_URL: 'https://orders.example.test/',
      VITE_SHORTENER_PUBLIC_BASE_URL: 'https://s.example.test',
    }

    const registry = buildServiceRegistry(env)
    const order = registry.find((service) => service.id === 'order')
    const shortener = registry.find((service) => service.id === 'shortener')

    expect(order?.apiBaseUrl).toBe('https://orders.example.test')
    expect(order?.publicBaseUrl).toBeUndefined()
    expect(shortener?.publicBaseUrl).toBe('https://s.example.test')
  })
})
