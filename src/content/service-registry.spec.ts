import { describe, expect, it } from 'vitest'

import {
  SERVICE_CASES,
  assertContentConsistency,
  getServiceCase,
  serviceCaseStudyUrl,
  serviceDemoUrl,
} from './service-registry'
import { ROADMAP_MILESTONES } from './roadmap'
import { ARCHITECTURE_CONTENT } from './architecture'
import { SITE_CONTENT } from './site'

describe('content model', () => {
  it('contains exactly four service IDs in canonical order', () => {
    expect(SERVICE_CASES.map((s) => s.id)).toEqual(['order', 'auth', 'notification', 'shortener'])
  })

  it('maps shortener slug to url-shortener without renaming the module ID', () => {
    const shortener = getServiceCase('shortener')
    expect(shortener.slug).toBe('url-shortener')
    expect(shortener.id).toBe('shortener')
    expect(serviceCaseStudyUrl('shortener')).toBe('/services/url-shortener/')
    expect(serviceDemoUrl('shortener')).toBe('/demo/shortener/')
  })

  it('passes content consistency assertions', () => {
    expect(() => assertContentConsistency()).not.toThrow()
  })

  it('matches verified backend statuses', () => {
    const order = getServiceCase('order')
    expect(order.implementationStatus).toBe('in-development')
    expect(order.currentMilestone).toBe('order-http-service')
    expect(order.demoMode).toBe('mock')
    expect(order.runtime).toBe('local')
    for (const id of ['auth', 'notification', 'shortener'] as const) {
      const service = getServiceCase(id)
      expect(service.implementationStatus).toBe('planned')
      expect(service.currentMilestone).toBeNull()
      expect(service.runtime).toBe('not-deployed')
    }
  })

  it('planned services expose no fictitious source/OpenAPI/observability links', () => {
    for (const id of ['auth', 'notification', 'shortener'] as const) {
      const service = getServiceCase(id)
      expect(service.sourceUrl).toBeUndefined()
      expect(service.openApiUrl).toBeUndefined()
      expect(service.observabilityUrl).toBeUndefined()
      expect(service.specUrl).toBeDefined()
    }
    expect(getServiceCase('order').sourceUrl).toBeDefined()
  })

  it('has no measured claims without a complete measurement artifact', () => {
    // The initial measurement list is empty by design: no fabricated numbers.
    for (const service of SERVICE_CASES) {
      const measuredClaims = [
        ...service.currentImplementation,
        ...service.targetArchitecture,
      ].filter((claim) => claim.category === 'measured')
      expect(measuredClaims).toEqual([])
    }
  })

  it('planned services declare scope and not-scope in both locales', () => {
    for (const service of SERVICE_CASES) {
      expect(service.declaredScope.en.length).toBeGreaterThan(0)
      expect(service.declaredScope.ru.length).toBeGreaterThan(0)
      expect(service.notScope.length).toBeGreaterThan(0)
      for (const item of service.notScope) {
        expect(item.en.length).toBeGreaterThan(0)
        expect(item.ru.length).toBeGreaterThan(0)
      }
    }
  })

  it('roadmap has exactly one current milestone and valid ordering', () => {
    expect(ROADMAP_MILESTONES[0].id).toBe('order-http-service')
    expect(ROADMAP_MILESTONES[0].state).toBe('current')
    expect(ROADMAP_MILESTONES.filter((m) => m.state === 'current')).toHaveLength(1)
    expect(ROADMAP_MILESTONES.every((m) => m.serviceIds.length > 0)).toBe(true)
    expect(ROADMAP_MILESTONES.every((m) => m.acceptanceEvidence.length > 0)).toBe(true)
  })

  it('architecture content marks all planned infrastructure', () => {
    const target = ARCHITECTURE_CONTENT.diagrams.find((d) => d.category === 'target')
    expect(target).toBeDefined()
    const infra = target!.nodes.filter((n) => n.kind === 'infrastructure' || n.kind === 'data')
    expect(infra.length).toBeGreaterThan(0)
    expect(infra.every((n) => n.planned === true)).toBe(true)
  })

  it('home content derives from the same service facts', () => {
    expect(SITE_CONTENT.services.order).toBe(getServiceCase('order'))
    expect(SITE_CONTENT.roadmap).toEqual([...ROADMAP_MILESTONES])
  })
})
