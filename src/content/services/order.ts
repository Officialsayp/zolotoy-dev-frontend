import type { ServiceCase } from '../types'
import { BACKEND_REPO_URL } from '@/shared/routing/site-routes'

const BACKEND_REVISION = 'e36b10252b3775b79278bb344b7522fb132eb414'

/**
 * Order service case study.
 *
 * Status derives from the backend repository at revision
 * e36b1025 (reviewed 2026-09-17): the order-service module contains an
 * implemented Go HTTP service (POST /orders, GET /orders/{id}) at the Service
 * Layer milestone — HTTP validation → service call, demonstration responses,
 * no persistence yet. Domain models and transition methods exist but are not
 * connected to the HTTP flow. No automated *_test.go files existed in the
 * inspected inventory.
 */
export const orderServiceCase: ServiceCase = {
  id: 'order',
  slug: 'order',
  name: 'Order Service',
  shortLabel: 'Order',
  summary:
    'An order HTTP service demonstrating validation-driven boundaries today and a full lifecycle core — state machines, idempotency, optimistic concurrency and a transactional outbox — as the target.',
  declaredScope:
    'A backend engineering case study of order creation, lifecycle state and payment semantics for a technical demo environment.',
  notScope: [
    'Not a storefront or product catalog.',
    'Not an inventory system.',
    'Not a real acquiring/payment-provider integration.',
  ],
  implementationStatus: 'in-development',
  currentMilestone: 'order-http-service',
  nextMilestone: 'order-persistence',
  demoMode: 'mock',
  runtime: 'local',
  runtimeLabel: 'Local development only',
  engineeringFocus:
    'State machines, transactions, idempotency, optimistic concurrency, transactional outbox.',
  currentImplementation: [
    {
      id: 'order-current-http',
      category: 'current',
      text:
        'POST /orders validates the product field (trim + non-empty) and calls the service layer; GET /orders/{id} validates a positive integer ID and an optional details flag. Handlers return demonstration text without persistence.',
      evidenceIds: ['order-src-handler', 'order-src-service'],
    },
    {
      id: 'order-current-domain',
      category: 'current',
      text:
        'Independent domain models and transition methods exist in the module but are not yet connected to the HTTP flow.',
      evidenceIds: ['order-src-domain'],
    },
    {
      id: 'order-current-no-persistence',
      category: 'current',
      text:
        'No storage integration yet: created orders are not persisted and GET does not retrieve from storage.',
      evidenceIds: ['order-src-handler'],
    },
    {
      id: 'order-current-no-tests',
      category: 'current',
      text:
        'No automated backend tests existed in the inspected inventory — handler/service/domain tests are part of the current milestone, not a completed fact.',
      evidenceIds: ['order-backend-readme'],
    },
  ],
  targetArchitecture: [
    {
      id: 'order-target-state-machines',
      category: 'target',
      text:
        'Independent order and payment state machines with an explicit allowed-transition matrix, cancellation and refund paths, and versioned updates.',
      evidenceIds: ['order-spec'],
    },
    {
      id: 'order-target-persistence',
      category: 'target',
      text:
        'PostgreSQL persistence with migrations, durable create/read, and transactions that keep external payment calls outside open database transactions.',
      evidenceIds: ['order-spec', 'order-roadmap-persistence'],
    },
    {
      id: 'order-target-concurrency',
      category: 'target',
      text:
        'Optimistic concurrency (version checks) and idempotency keys so repeated create/pay operations converge instead of duplicating side effects.',
      evidenceIds: ['order-spec'],
    },
    {
      id: 'order-target-outbox',
      category: 'target',
      text:
        'A transactional outbox records order events atomically with state changes; publication is at-least-once and consumers deduplicate.',
      evidenceIds: ['order-spec', 'order-roadmap-events'],
    },
  ],
  decisions: [
    {
      id: 'order-dec-http-boundary',
      title: 'Validation lives at the HTTP boundary, business rules in the service layer',
      text:
        'Handlers trim and validate input shape (product, ID, flags) and delegate; the service layer owns the result. Keeping transport parsing out of the service keeps the boundary testable without HTTP.',
      claimIds: ['order-current-http'],
    },
    {
      id: 'order-dec-domain-separate',
      title: 'Domain models are built separately before wiring the HTTP flow',
      text:
        'Order/payment state machines and transition methods are developed as an independent domain package first, so lifecycle semantics can be designed and tested before they are coupled to handlers and storage.',
      claimIds: ['order-current-domain'],
    },
    {
      id: 'order-dec-idempotency-scope',
      title: 'Idempotency keys scope to operation + payload',
      text:
        'Target design: a repeated idempotency key with the same payload returns the original result; the same key with a different payload is a client error. This prevents both duplicate side effects and silent payload substitution.',
    },
    {
      id: 'order-dec-payment-outside-tx',
      title: 'External payment calls stay outside open database transactions',
      text:
        'Target design: reserve state in a short transaction, call the provider outside it, then apply the result in a guarded transition. A crash between the two steps is recovered by reconciliation, not by holding locks across network I/O.',
    },
  ],
  failureModes: [
    {
      id: 'order-fm-idempotency-payload',
      topic: 'Repeated idempotency key: same payload vs different payload',
      text:
        'Same payload → return the recorded result (no second side effect). Different payload → 409-style client error instead of silently reprocessing. The stored key must bind to a request fingerprint.',
    },
    {
      id: 'order-fm-competing-ops',
      topic: 'Competing Pay/Cancel operations',
      text:
        'Two concurrent transitions on one order must serialize through the version check: exactly one wins, the loser gets a concurrency conflict and re-reads current state.',
    },
    {
      id: 'order-fm-payment-crash',
      topic: 'External payment call vs process crash',
      text:
        'If the process dies between charging and recording, reconciliation (not a live transaction) resolves the outcome; the order records an in-flight payment state rather than pretending nothing happened.',
    },
    {
      id: 'order-fm-outbox-duplicates',
      topic: 'Outbox publication duplicates',
      text:
        'Outbox delivery is at-least-once: consumers must deduplicate by event ID. Publishers do not promise exactly-once.',
    },
  ],
  diagrams: [
    {
      id: 'order-diagram-current',
      caption: 'Current order flow: HTTP boundary into the service layer, no storage.',
      category: 'current',
      nodes: [
        { id: 'client', label: 'HTTP client', description: 'curl / Bruno manual collection', kind: 'browser' },
        {
          id: 'handler',
          label: 'Handler (net/http)',
          description: 'POST /orders, GET /orders/{id}: trim, validate, delegate',
          kind: 'frontend',
        },
        {
          id: 'service',
          label: 'Order service',
          description: 'Business result construction (in development)',
          kind: 'service',
        },
        {
          id: 'domain',
          label: 'Domain models',
          description: 'Status/payment transitions — present but not connected',
          kind: 'data',
          planned: true,
        },
      ],
      connections: [
        { from: 'client', to: 'handler', label: 'POST /orders {product}' },
        { from: 'handler', to: 'service', label: 'validated call' },
        { from: 'service', to: 'domain', label: 'not yet integrated', planned: true },
      ],
    },
    {
      id: 'order-diagram-target',
      caption: 'Target order flow: state machines, persistence, outbox.',
      category: 'target',
      nodes: [
        { id: 'client', label: 'HTTP client', description: 'JSON API consumers', kind: 'browser' },
        { id: 'handler', label: 'Handler', description: 'DTO validation and error envelopes', kind: 'frontend' },
        { id: 'service', label: 'Order service', description: 'Transition matrix, idempotency, version checks', kind: 'service' },
        { id: 'db', label: 'PostgreSQL', description: 'Orders, history, outbox records', kind: 'data', planned: true },
        { id: 'outbox', label: 'Outbox publisher', description: 'At-least-once event delivery', kind: 'infrastructure', planned: true },
      ],
      connections: [
        { from: 'client', to: 'handler', label: 'JSON API' },
        { from: 'handler', to: 'service', label: 'application boundary' },
        { from: 'service', to: 'db', label: 'transactional writes', planned: true },
        { from: 'db', to: 'outbox', label: 'atomic event records', planned: true },
      ],
    },
  ],
  evidence: [
    {
      id: 'order-src-handler',
      kind: 'source-code',
      repository: BACKEND_REPO_URL,
      revision: BACKEND_REVISION,
      path: 'services/order-service/cmd/order-service/main.go',
      label: 'HTTP handlers: POST /orders, GET /orders/{id} validation and service delegation',
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-src-service',
      kind: 'source-code',
      repository: BACKEND_REPO_URL,
      revision: BACKEND_REVISION,
      path: 'services/order-service/internal/service/order_service.go',
      label: 'Service layer producing the demonstration result',
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-src-domain',
      kind: 'source-code',
      repository: BACKEND_REPO_URL,
      revision: BACKEND_REVISION,
      path: 'services/order-service/internal/order',
      label: 'Domain models and transition methods (separate from the HTTP flow)',
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-spec',
      kind: 'specification',
      repository: 'zolotoy-dev-frontend (this repository)',
      path: 'docs/backend-specs/01_order_service.md',
      label: 'Order service specification (target contract)',
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-backend-readme',
      kind: 'specification',
      repository: 'zolotoy-dev-backend',
      revision: BACKEND_REVISION,
      path: 'docs/roadmap.md',
      label: 'Backend roadmap: Service Layer milestone in progress',
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-roadmap-persistence',
      kind: 'specification',
      repository: 'zolotoy-dev-backend',
      revision: BACKEND_REVISION,
      path: 'docs/roadmap.md',
      label: 'Persistence milestone: PostgreSQL repository and migrations (future)',
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-roadmap-events',
      kind: 'specification',
      repository: 'zolotoy-dev-backend',
      revision: BACKEND_REVISION,
      path: 'docs/roadmap.md',
      label: 'Events milestone: outbox contract feeding Notification (future)',
      reviewedOn: '2026-09-17',
    },
  ],
  sourceUrl: BACKEND_REPO_URL,
  specUrl: 'https://github.com/Officialsayp/zolotoy-dev-frontend/blob/main/docs/backend-specs/01_order_service.md',
  demoUrl: 'https://zolotoy.dev/demo/orders/',
}

export const ORDER_SERVICE_CASE = orderServiceCase
