/**
 * Roadmap milestones mirroring the backend repository docs/roadmap.md
 * (revision e36b1025, reviewed 2026-09-17). States describe the roadmap, not
 * completion percentages; the first milestone is CURRENT, not completed.
 */

import type { RoadmapMilestone } from './types'

const BACKEND_ROADMAP_REF = 'zolotoy-dev-backend docs/roadmap.md @ e36b1025'

export const ROADMAP_MILESTONES: readonly RoadmapMilestone[] = [
  {
    id: 'order-http-service',
    title: 'Order HTTP service',
    state: 'current',
    serviceIds: ['order'],
    summary:
      'Finish HTTP/service boundaries: handler validation, service-layer results, errors.Is error mapping and handler/service/domain tests.',
    acceptanceEvidence: [
      'Handler and service tests cover validation, delegation and error mapping',
      'Domain transition methods exercised by unit tests',
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'order-persistence',
    title: 'Order persistence',
    state: 'future',
    serviceIds: ['order'],
    summary:
      'Agree OpenAPI/DTOs, add repository/PostgreSQL/migrations and durable create/read flows.',
    acceptanceEvidence: [
      'Migration set reproducibly bootstraps the schema',
      'Created orders survive process restart',
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'order-lifecycle',
    title: 'Order lifecycle and concurrency',
    state: 'future',
    serviceIds: ['order'],
    summary:
      'Order/payment state matrix, cancellation/refund, versioning, idempotency, history and concurrency tests.',
    acceptanceEvidence: [
      'Transition matrix rejects illegal transitions with typed errors',
      'Concurrent operations serialize through version checks in tests',
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'auth-live-frontend',
    title: 'Auth service with live frontend',
    state: 'future',
    serviceIds: ['auth'],
    summary:
      'Credentials, sessions, refresh rotation/reuse detection, RBAC, cookies/CORS/CSRF and real browser flows against the demo frontend.',
    acceptanceEvidence: [
      'Browser flow: register → login → refresh rotation → logout',
      'Reuse of a rotated refresh credential revokes the session family',
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'order-events-notification',
    title: 'Order events → Notification',
    state: 'future',
    serviceIds: ['order', 'notification'],
    summary:
      'Transactional outbox/event contract, inbox/jobs, delivery workers, retries and recovery.',
    acceptanceEvidence: [
      'Outbox records commit atomically with order state changes',
      'Duplicate event delivery commits once in the inbox',
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'shortener-performance',
    title: 'Shortener performance',
    state: 'future',
    serviceIds: ['shortener'],
    summary:
      'Database/redirect hot path, Redis fallback, per-instance singleflight, reproducible measurements and bounded analytics.',
    acceptanceEvidence: [
      'Benchmark methodology and artifacts published',
      'Redis outage path bounded and measured',
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'operations-evidence',
    title: 'Operations evidence',
    state: 'future',
    serviceIds: ['order', 'auth', 'notification', 'shortener'],
    summary:
      'Runbook, observability, backup/restore, integration CI and reproducible public evidence.',
    acceptanceEvidence: [
      'Runbook covers start, health, backup/restore and incident steps',
      'CI integration checks run on every backend change',
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
]

export function currentMilestone(): RoadmapMilestone | null {
  return ROADMAP_MILESTONES.find((m) => m.state === 'current') ?? null
}
