import type { ServiceCase } from '../types'

/**
 * Notification service case study. Backend implementation is absent; content
 * is the planned event→job→attempt pipeline from the specification. Never
 * claim exactly-once email delivery without provider guarantees and evidence.
 */
export const notificationServiceCase: ServiceCase = {
  id: 'notification',
  slug: 'notification',
  name: 'Notification Service',
  shortLabel: 'Notifications',
  summary:
    'An event-driven delivery service: durable inbox, at-least-once consumption, bounded delivery workers and retry with backoff — designed around duplicates, poison messages and recovery.',
  declaredScope:
    'A backend engineering case study of reliable event consumption and outbound notification delivery for the zolotoy.dev demo environment.',
  notScope: [
    'Not a campaign or marketing platform.',
    'Not an email/HTML template builder.',
    'Not an aggregate analytics product.',
  ],
  implementationStatus: 'planned',
  currentMilestone: null,
  nextMilestone: 'order-events-notification',
  demoMode: 'mock',
  runtime: 'not-deployed',
  runtimeLabel: 'No deployed runtime — specification stage',
  engineeringFocus:
    'At-least-once processing, durable jobs, retry/DLQ semantics, bounded workers.',
  currentImplementation: [
    {
      id: 'notification-current-absent',
      category: 'current',
      text:
        'No backend implementation exists yet: the demo renders deterministic MSW scenarios of the planned event → job → attempts model.',
      evidenceIds: ['notification-spec'],
    },
  ],
  targetArchitecture: [
    {
      id: 'notification-target-inbox',
      category: 'target',
      text:
        'A durable inbox with deduplication by event ID so at-least-once delivery from the broker never produces duplicate processing.',
      evidenceIds: ['notification-spec'],
    },
    {
      id: 'notification-target-jobs',
      category: 'target',
      text:
        'Transactional job creation: delivery jobs are recorded atomically with inbox commits, so a crash never loses or orphans a notification.',
      evidenceIds: ['notification-spec'],
    },
    {
      id: 'notification-target-workers',
      category: 'target',
      text:
        'Bounded worker pool with per-attempt records, exponential backoff with jitter, terminal dead-job states and lease-based recovery of abandoned work.',
      evidenceIds: ['notification-spec'],
    },
  ],
  decisions: [
    {
      id: 'notification-dec-at-least-once',
      title: 'At-least-once everywhere; deduplication is the consumer’s job',
      text:
        'Target design: the broker and workers only promise at-least-once. The inbox deduplicates by event ID, and send-result recording is idempotent per attempt.',
      claimIds: ['notification-target-inbox'],
    },
    {
      id: 'notification-dec-dlq-scope',
      title: 'Kafka DLQ vs dead delivery jobs are different tools',
      text:
        'Target design: broker-level DLQ handles structurally unprocessable messages; application-level dead jobs handle provider-rejected or permanently failing deliveries with retry policies of their own.',
      claimIds: ['notification-target-workers'],
    },
    {
      id: 'notification-dec-lease-recovery',
      title: 'Leases recover abandoned processing jobs',
      text:
        'Target design: a worker holds a time-boxed lease; if it crashes, the lease expires and another worker takes over. Send-success-then-crash duplicates are resolved by idempotent result recording.',
      claimIds: ['notification-target-workers'],
    },
  ],
  failureModes: [
    {
      id: 'notification-fm-duplicates',
      topic: 'Duplicate events',
      text:
        'The same event ID delivered twice (broker retry, consumer rebalance) must commit once in the inbox; the second copy is acknowledged as already-processed.',
    },
    {
      id: 'notification-fm-poison',
      topic: 'Poison messages',
      text:
        'Messages that fail deserialization or validation permanently must not block the partition: bounded retries, then dead-letter with the reason recorded.',
    },
    {
      id: 'notification-fm-provider-errors',
      topic: 'Transient vs permanent provider errors',
      text:
        '429/5xx/timeouts retry with backoff and jitter; 4xx validation failures of the provider are terminal and move the job to dead with the provider reason preserved.',
    },
    {
      id: 'notification-fm-send-crash',
      topic: 'Send success then process crash',
      text:
        'Provider accepted the email but the worker died before recording it: retry produces a duplicate email. Bounded by idempotency keys where the provider supports them and by honest "at-least-once" wording.',
    },
    {
      id: 'notification-fm-abandoned',
      topic: 'Abandoned processing jobs',
      text:
        'Jobs stuck in "processing" after a worker death are reclaimed after lease expiry; the number of reclaim cycles is capped before the job is declared dead.',
    },
  ],
  diagrams: [
    {
      id: 'notification-diagram-target',
      caption: 'Target notification flow: events to durable delivery jobs.',
      category: 'target',
      nodes: [
        { id: 'order', label: 'Order service', description: 'Publishes order events via outbox', kind: 'service', planned: true },
        { id: 'kafka', label: 'Kafka', description: 'Event transport (planned infrastructure)', kind: 'infrastructure', planned: true },
        { id: 'inbox', label: 'Inbox + dedup', description: 'Idempotent event consumption', kind: 'data', planned: true },
        { id: 'jobs', label: 'Delivery jobs', description: 'Transactional records with attempts', kind: 'data', planned: true },
        { id: 'worker', label: 'Delivery workers', description: 'Bounded concurrency, backoff, leases', kind: 'service', planned: true },
        { id: 'provider', label: 'Email provider', description: 'External API', kind: 'infrastructure', planned: true },
      ],
      connections: [
        { from: 'order', to: 'kafka', label: 'order events', planned: true },
        { from: 'kafka', to: 'inbox', label: 'at-least-once consumption', planned: true },
        { from: 'inbox', to: 'jobs', label: 'transactional job creation', planned: true },
        { from: 'jobs', to: 'worker', label: 'lease + attempt records', planned: true },
        { from: 'worker', to: 'provider', label: 'send + record result', planned: true },
      ],
    },
  ],
  evidence: [
    {
      id: 'notification-spec',
      kind: 'specification',
      repository: 'zolotoy-dev-frontend (this repository)',
      path: 'docs/backend-specs/03_notification_service.md',
      label: 'Notification service specification (target contract)',
      reviewedOn: '2026-09-17',
    },
  ],
  specUrl: 'https://github.com/Officialsayp/zolotoy-dev-frontend/blob/main/docs/backend-specs/03_notification_service.md',
  demoUrl: 'https://zolotoy.dev/demo/notifications/',
}
