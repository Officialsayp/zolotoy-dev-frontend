/**
 * Site-level content: hero, principles, and the aggregated typed content
 * record used by the public pages and metadata generation.
 */

import { SITE_ORIGIN } from '@/shared/routing/site-routes'
import { ARCHITECTURE_CONTENT } from './architecture'
import { SERVICE_CASES } from './service-registry'
import { ROADMAP_MILESTONES } from './roadmap'
import type { SiteContent } from './types'

export const SITE_CONTENT: SiteContent = {
  hero: {
    title: 'Maxim Zolotoy · Go Backend',
    subtitle: 'Go Backend Engineering Portfolio',
    intro:
      'Four backend case studies that separate current implementation from target architecture, backed by an interactive demo and a real Go repository.',
  },
  principles: [
    {
      id: 'principle-boundaries',
      title: 'Boundaries over shortcuts',
      text: 'Transport parsing never reaches business logic; services never read each other’s storage. Integration happens through APIs and explicit contracts.',
    },
    {
      id: 'principle-honesty',
      title: 'Honest status labels',
      text: 'Current, target and measured are different claims with different evidence. Planned infrastructure is never rendered as deployed.',
    },
    {
      id: 'principle-failures',
      title: 'Design the failure modes',
      text: 'Idempotency, optimistic concurrency, at-least-once delivery and cache-staleness bounds are first-class design content, not afterthoughts.',
    },
  ],
  architecture: ARCHITECTURE_CONTENT,
  services: Object.fromEntries(SERVICE_CASES.map((s) => [s.id, s])) as SiteContent['services'],
  roadmap: [...ROADMAP_MILESTONES],
}

export { SITE_ORIGIN }
