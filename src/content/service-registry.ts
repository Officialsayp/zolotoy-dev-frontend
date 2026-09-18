/**
 * Content-level service registry: the four ServiceCase records plus derived
 * helpers shared by home cards, case studies, metadata and sitemap. This is
 * the presentation-independent source of truth; the runtime registry in
 * src/shared/config/service-registry.ts stays responsible for hosts/env.
 */

import { PUBLIC_ROUTES, SERVICE_ROUTES, type ServiceId } from '@/shared/routing/site-routes'
import type { ServiceCase } from './types'

import { orderServiceCase } from './services/order'
import { authServiceCase } from './services/auth'
import { notificationServiceCase } from './services/notification'
import { shortenerServiceCase } from './services/shortener'

/** All four service cases in canonical display order. */
export const SERVICE_CASES: readonly ServiceCase[] = [
  orderServiceCase,
  authServiceCase,
  notificationServiceCase,
  shortenerServiceCase,
]

const CASE_BY_ID: ReadonlyMap<ServiceId, ServiceCase> = new Map(
  SERVICE_CASES.map((service) => [service.id, service]),
)

/** Get a service case by ID (throws on unknown ID — content-level bug). */
export function getServiceCase(id: ServiceId): ServiceCase {
  const found = CASE_BY_ID.get(id)
  if (!found) throw new Error(`Unknown service case: ${id}`)
  return found
}

/** All ServiceCase IDs, canonical order. */
export function serviceCaseIds(): ServiceId[] {
  return SERVICE_CASES.map((s) => s.id)
}

/** Public case-study path for a service case (from the routing manifest). */
export function serviceCaseStudyUrl(id: ServiceId): string {
  const info = SERVICE_ROUTES.find((s) => s.id === id)
  if (!info) throw new Error(`Unknown service id: ${id}`)
  return `/services/${info.publicSlug}/`
}

/** Interactive demo URL for a service case (browser URL, from the manifest). */
export function serviceDemoUrl(id: ServiceId): string {
  return `/demo${SERVICE_ROUTES.find((s) => s.id === id)?.demoRoot ?? ''}/`
}

/** Evidence records for a service, with its case ID namespaced. */
export function evidenceFor(id: ServiceId): ServiceCase['evidence'] {
  return getServiceCase(id).evidence
}

/** Guard: exactly four service cases with unique IDs/slugs. */
export function assertContentConsistency(): void {
  const ids = new Set(SERVICE_CASES.map((s) => s.id))
  const slugs = new Set(SERVICE_CASES.map((s) => s.slug))
  if (ids.size !== 4 || slugs.size !== 4) {
    throw new Error('Service cases must contain exactly four unique IDs and slugs.')
  }
  for (const service of SERVICE_CASES) {
    if (service.implementationStatus === 'implemented' && service.evidence.length === 0) {
      throw new Error(`Service ${service.id}: implemented status requires evidence.`)
    }
    const evidenceIds = new Set(service.evidence.map((e) => e.id))
    const referenced = new Set<string>()
    for (const claim of [...service.currentImplementation, ...service.targetArchitecture]) {
      for (const id of claim.evidenceIds) referenced.add(id)
    }
    for (const id of referenced) {
      if (!evidenceIds.has(id)) {
        throw new Error(`Service ${service.id}: claim references unknown evidence "${id}".`)
      }
    }
  }
  // Every public route must resolve to a generated document; service slugs
  // must line up with the public routes.
  for (const service of SERVICE_CASES) {
    const expected = `/services/${service.slug}/`
    if (!PUBLIC_ROUTES.some((r) => r.path === expected)) {
      throw new Error(`Service ${service.id}: no public route for ${expected}.`)
    }
  }
}

export type { ServiceCase } from './types'
