import { describe, expect, it } from 'vitest'

import { isConfiguredServiceRequest } from './fail-closed'

const services = [
  { apiBaseUrl: 'https://order-api.zolotoy.dev' },
  { apiBaseUrl: 'http://localhost:8081/' },
] as const

describe('mock fail-closed request policy', () => {
  it('recognizes configured backend origins regardless of path', () => {
    expect(
      isConfiguredServiceRequest(
        'https://order-api.zolotoy.dev/api/v1/orders?limit=20',
        services,
      ),
    ).toBe(true)

    expect(
      isConfiguredServiceRequest('http://localhost:8081/health/live', services),
    ).toBe(true)
  })

  it('does not classify unrelated origins as backend service requests', () => {
    expect(isConfiguredServiceRequest('http://localhost:5173/src/main.ts', services)).toBe(false)
    expect(isConfiguredServiceRequest('https://example.com/resource', services)).toBe(false)
  })

  it('returns false for malformed URLs instead of throwing', () => {
    expect(isConfiguredServiceRequest('not a url', services)).toBe(false)
  })
})
