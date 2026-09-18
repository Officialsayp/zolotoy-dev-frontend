/**
 * Architecture page content: current system state, current/target
 * architecture, boundaries, data ownership, integration contracts, runtime
 * modes and principles. All "current" claims trace to the verified backend
 * baseline (2026-09-17); planned infrastructure never renders as deployed.
 */

import type { ArchitectureContent } from './types'

export const ARCHITECTURE_CONTENT: ArchitectureContent = {
  sections: [
    {
      id: 'current-state',
      title: 'Current System State',
      paragraphs: [
        'Today zolotoy.dev is one Vue 3 SPA (the interactive demo) served as static assets, plus a statically generated portfolio layer describing the work. The demo runs fully on MSW-mocked APIs in mock mode; VITE_API_MODE=real switches transport targets to configured hosts without loading the mock graph.',
        'The backend repository contains one implemented Go module: the order HTTP service at the Service Layer milestone. It validates requests, calls a service layer, and returns demonstration results. Domain state machines exist as separate packages and are not yet wired into the HTTP flow. PostgreSQL, Redis, Kafka, auth and live frontend integration are not connected.',
      ],
    },
    {
      id: 'current-architecture',
      title: 'Current Architecture',
      paragraphs: [
        'Browser → frontend typed transport (native fetch through module API facades) → MSW interception for the mock demo. TanStack Query owns server state; Pinia stores are deliberately narrow (session, runtime, theme).',
        'In parallel, the Go order service runs locally: POST /orders and GET /orders/{id} validate input and delegate to a service layer. There is no live connection between the public demo and the Go service — the demo is mocked by design until the auth and contract work lands.',
      ],
      claims: [
        {
          id: 'arch-current-msw',
          category: 'current',
          text: 'Demo flows run on deterministic MSW scenarios; unhandled requests to configured service origins fail closed with 501 MOCK_UNHANDLED_REQUEST.',
          evidenceIds: [],
        },
        {
          id: 'arch-current-order-local',
          category: 'current',
          text: 'The Go order service is a separate local implementation: HTTP validation → service call, no persistence, no tests yet.',
          evidenceIds: [],
        },
        {
          id: 'arch-current-domain-separate',
          category: 'current',
          text: 'Order domain models and transition methods exist but are not integrated with the HTTP flow.',
          evidenceIds: [],
        },
      ],
    },
    {
      id: 'target-architecture',
      title: 'Target Architecture',
      paragraphs: [
        'The target is four independently owned services behind /api/v1 with explicit data ownership and an event contract between Order and Notification. All infrastructure in the target diagram — PostgreSQL, Redis, Kafka — is planned, not deployed.',
      ],
      claims: [
        {
          id: 'arch-target-auth',
          category: 'target',
          text: 'Auth owns users, credentials and sessions. Other services never read credential tables.',
          evidenceIds: [],
        },
        {
          id: 'arch-target-order',
          category: 'target',
          text: 'Order owns orders, payment-related state, history and outbox records.',
          evidenceIds: [],
        },
        {
          id: 'arch-target-notification',
          category: 'target',
          text: 'Notification owns inbox records, delivery jobs and delivery attempts.',
          evidenceIds: [],
        },
        {
          id: 'arch-target-shortener',
          category: 'target',
          text: 'Shortener owns links and bounded analytics.',
          evidenceIds: [],
        },
        {
          id: 'arch-target-no-cross-tables',
          category: 'target',
          text: 'Services do not query each other’s private tables; shared deployment infrastructure does not imply shared business-data ownership.',
          evidenceIds: [],
        },
        {
          id: 'arch-target-events',
          category: 'target',
          text: 'Order events feed Notification through a defined event contract via a transactional outbox.',
          evidenceIds: [],
        },
      ],
    },
    {
      id: 'service-boundaries',
      title: 'Service Boundaries',
      paragraphs: [
        'Each service exposes its own /api/v1 namespace and owns its storage. The frontend treats them as independent modules behind one shared transport and error model. Cross-service claims (for example order-role vs auth-role mapping) are explicit integration contracts, not implicit database joins.',
      ],
    },
    {
      id: 'data-ownership',
      title: 'Data Ownership',
      paragraphs: [
        'Order: orders, lifecycle history, payment state transitions, outbox records. Auth: users, credentials, sessions and refresh families. Notification: inbox, delivery jobs, attempts. Shortener: links and bounded analytics. Nothing else reads these tables directly; integrations go through APIs or the event contract.',
      ],
    },
    {
      id: 'mock-vs-live',
      title: 'Mock vs Live Runtime',
      paragraphs: [
        'Mock mode is the default: MSW intercepts the same network path the real transport uses, with deterministic scenarios and reset. Real mode never loads the mock handler graph. The demoMode field in each case study (mock/mixed/live) is portfolio evidence about the visible demo flow — it does not claim backend deployment.',
      ],
    },
    {
      id: 'principles',
      title: 'Architectural Principles',
      paragraphs: [
        'Boundaries over shortcuts: transport parsing never reaches business logic; services never reach into each other’s storage. Honesty over marketing: current ≠ target ≠ measured, and planned infrastructure is always labelled. Failure modes are designed, not discovered: idempotency, concurrency and at-least-once semantics are first-class content.',
      ],
    },
    {
      id: 'roadmap-relationship',
      title: 'Roadmap Relationship',
      paragraphs: [
        'The architecture above is the destination of the milestone sequence: Order → persistence → lifecycle/concurrency → Auth → live frontend → events → Notification → Shortener → observability. Each case study’s Next Milestone section names the immediate step and its acceptance evidence.',
      ],
    },
  ],
  diagrams: [
    {
      id: 'arch-diagram-current',
      caption: 'Current topology: mocked demo SPA and a local Go order service, not connected.',
      category: 'current',
      nodes: [
        { id: 'browser', label: 'Browser', description: 'Portfolio + demo SPA', kind: 'browser' },
        { id: 'spa', label: 'Vue SPA (demo)', description: 'Typed transport → MSW mock APIs', kind: 'frontend' },
        { id: 'order-go', label: 'Go order service (local)', description: 'POST/GET /orders, validation → service layer', kind: 'service' },
      ],
      connections: [
        { from: 'browser', to: 'spa', label: 'static assets' },
        { from: 'spa', to: 'order-go', label: 'no live connection', planned: true },
      ],
    },
    {
      id: 'arch-diagram-target',
      caption: 'Target topology: four services, owned data, event contract. All infrastructure planned.',
      category: 'target',
      nodes: [
        { id: 'browser', label: 'Browser', description: 'Portfolio + demo', kind: 'browser' },
        { id: 'apiv1', label: '/api/v1 gateways', description: 'One namespace per service', kind: 'frontend', planned: true },
        { id: 'auth', label: 'Auth', description: 'Users, credentials, sessions', kind: 'service', planned: true },
        { id: 'order', label: 'Order', description: 'Orders, payment state, outbox', kind: 'service', planned: true },
        { id: 'notification', label: 'Notification', description: 'Inbox, delivery jobs, attempts', kind: 'service', planned: true },
        { id: 'shortener', label: 'Shortener', description: 'Links, bounded analytics', kind: 'service', planned: true },
        { id: 'pg', label: 'PostgreSQL', description: 'Per-service schemas', kind: 'data', planned: true },
        { id: 'redis', label: 'Redis', description: 'Sessions/cache (planned)', kind: 'data', planned: true },
        { id: 'kafka', label: 'Kafka', description: 'Event transport (planned)', kind: 'infrastructure', planned: true },
      ],
      connections: [
        { from: 'browser', to: 'apiv1', label: 'HTTPS JSON' },
        { from: 'apiv1', to: 'auth', label: 'auth API', planned: true },
        { from: 'apiv1', to: 'order', label: 'order API', planned: true },
        { from: 'apiv1', to: 'notification', label: 'notification API', planned: true },
        { from: 'apiv1', to: 'shortener', label: 'shortener API', planned: true },
        { from: 'order', to: 'kafka', label: 'order events (outbox)', planned: true },
        { from: 'kafka', to: 'notification', label: 'event consumption', planned: true },
        { from: 'order', to: 'pg', label: 'own schema', planned: true },
        { from: 'auth', to: 'pg', label: 'own schema', planned: true },
        { from: 'auth', to: 'redis', label: 'session/rate-limit state', planned: true },
      ],
      groups: [
        { id: 'g-order', label: 'Order boundary', nodeIds: ['order'] },
        { id: 'g-auth', label: 'Auth boundary', nodeIds: ['auth'] },
        { id: 'g-notification', label: 'Notification boundary', nodeIds: ['notification'] },
        { id: 'g-shortener', label: 'Shortener boundary', nodeIds: ['shortener'] },
      ],
    },
  ],
  unresolvedContracts: [
    {
      id: 'contract-cookies',
      title: 'Cookie/CORS/CSRF behavior',
      description: 'Refresh cookie attributes, CORS origins and CSRF protection are not yet agreed with the backend.',
      openQuestions: ['SameSite/Domain policy for the refresh cookie', 'CSRF token transport', 'Allowed origins per environment'],
    },
    {
      id: 'contract-error-health',
      title: 'Error envelopes and health contracts',
      description: 'Shared error envelope and health endpoints are standardized per service but not yet contractually frozen.',
      openQuestions: ['Error code namespace', 'health/live vs health/ready semantics', 'Rate-limit response shape'],
    },
    {
      id: 'contract-roles',
      title: 'Auth roles versus Order roles',
      description: 'How Auth RBAC roles map to order-actions roles (buyer/manager/admin) is undecided.',
      openQuestions: ['Role claim format in access tokens', 'Demo role switching vs real roles'],
    },
    {
      id: 'contract-order-dto',
      title: 'Order DTO/list/history/fulfillment/cancel/refund contracts',
      description: 'List pagination, history representation and lifecycle endpoints beyond create/get are TBD.',
      openQuestions: ['DTO fields for list vs detail', 'Cancel/refund request/response shapes', 'Idempotency header name'],
    },
    {
      id: 'contract-auth-dto',
      title: 'Auth cookie/body/session DTO behavior',
      description: 'Exact login/register/refresh request and response bodies, and session listing shape, are TBD.',
      openQuestions: ['Refresh request body vs cookie-only', 'Session DTO fields', 'Logout-all semantics'],
    },
    {
      id: 'contract-notification-dto',
      title: 'Notification jobs/attempts/filter/manual retry contracts',
      description: 'Job listing filters, attempt representation and manual retry semantics are TBD.',
      openQuestions: ['Filter parameter names', 'Manual retry authorization', 'Dead-job requeue policy'],
    },
    {
      id: 'contract-shortener-dto',
      title: 'Shortener ownership/status/analytics/404-versus-410 behavior',
      description: 'Link ownership rules, status codes for expired vs disabled, and analytics shapes are TBD.',
      openQuestions: ['Ownership model', '404 vs 410 mapping', 'Analytics granularity'],
    },
  ],
}
