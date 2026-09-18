import type { ServiceCase } from '../types'

/**
 * URL shortener case study. Backend implementation is absent; content covers
 * the planned redirect hot path, cache-aside strategy and honest limits of
 * per-instance singleflight and best-effort analytics.
 */
export const shortenerServiceCase: ServiceCase = {
  id: 'shortener',
  slug: 'url-shortener',
  name: 'URL Shortener',
  shortLabel: 'Shortener',
  summary:
    'A redirect service engineered around its hot path: PostgreSQL storage, Redis cache-aside with bounded fallback, per-instance singleflight and reproducible latency benchmarks.',
  declaredScope:
    'A backend engineering case study of a redirect hot path, caching strategy and bounded analytics for the zolotoy.dev demo environment.',
  notScope: [
    'Not a Bitly clone.',
    'Not a sharded analytics platform.',
    'Not a general-purpose link management product.',
  ],
  implementationStatus: 'planned',
  currentMilestone: null,
  nextMilestone: 'shortener-performance',
  demoMode: 'mock',
  runtime: 'not-deployed',
  runtimeLabel: 'No deployed runtime — specification stage',
  engineeringFocus:
    'Redis cache-aside, singleflight, hot path, bounded analytics.',
  currentImplementation: [
    {
      id: 'shortener-current-absent',
      category: 'current',
      text:
        'No backend implementation exists yet: the demo renders deterministic MSW scenarios of link management and analytics.',
      evidenceIds: ['shortener-spec'],
    },
  ],
  targetArchitecture: [
    {
      id: 'shortener-target-hotpath',
      category: 'target',
      text:
        'A redirect hot path that serves from Redis cache-aside, falls back to PostgreSQL with bounded concurrency, and returns 404/410 according to link state.',
      evidenceIds: ['shortener-spec'],
    },
    {
      id: 'shortener-target-cache',
      category: 'target',
      text:
        'Cache invalidation on link mutation, negative caching for missing keys, and TTL bounds that cap staleness after invalidation races.',
      evidenceIds: ['shortener-spec'],
    },
    {
      id: 'shortener-target-singleflight',
      category: 'target',
      text:
        'Per-instance singleflight collapses concurrent misses for the same key into one database read; it does not coordinate across service instances.',
      evidenceIds: ['shortener-spec'],
    },
    {
      id: 'shortener-target-benchmarks',
      category: 'target',
      text:
        'Reproducible latency/throughput benchmarks with published methodology — a measurement, not a marketing number.',
      evidenceIds: ['shortener-spec', 'shortener-roadmap-perf'],
    },
  ],
  decisions: [
    {
      id: 'shortener-dec-negative-caching',
      title: 'Negative caching bounds the missing-key stampede',
      text:
        'Target design: repeated lookups of a nonexistent alias cache a short-lived negative result so attackers or hot dead links cannot bypass the cache to the database.',
      claimIds: ['shortener-target-cache'],
    },
    {
      id: 'shortener-dec-singleflight-scope',
      title: 'Singleflight is per-instance by design',
      text:
        'Target design: in-flight request coalescing removes same-instance duplicate misses. Cross-instance coordination would add a distributed lock to a hot path — rejected; bounded fallback concurrency does that job instead.',
      claimIds: ['shortener-target-singleflight'],
    },
    {
      id: 'shortener-dec-analytics-loss',
      title: 'Analytics are best-effort and bounded',
      text:
        'Target design: click counts are incremented asynchronously and may lose data under failure; correctness of the redirect never depends on analytics.',
      claimIds: ['shortener-target-hotpath'],
    },
  ],
  failureModes: [
    {
      id: 'shortener-fm-collision',
      topic: 'Unique-key collision',
      text:
        'Generated alias collides on insert: retry with a new key under a uniqueness constraint; user-chosen aliases surface a 409-style conflict instead of overwriting.',
    },
    {
      id: 'shortener-fm-redis-outage',
      topic: 'Redis outage and bounded database fallback',
      text:
        'Redis unavailable: redirects continue through PostgreSQL with concurrency limits (and probably degraded latency) instead of failing closed or stampeding unprotected.',
    },
    {
      id: 'shortener-fm-invalidation-race',
      topic: 'Invalidation/refill races',
      text:
        'A read refills a stale value after an invalidation delete; TTL bounds how long the stale entry can mislead. Invalidation is not presented as race-free.',
    },
    {
      id: 'shortener-fm-expired-policy',
      topic: 'Expired/disabled link policy',
      text:
        'Expired links answer 410 Gone, disabled or deleted links answer 404 — the distinction is part of the API contract, not a UI detail.',
    },
    {
      id: 'shortener-fm-analytics-loss',
      topic: 'Best-effort analytics loss',
      text:
        'Under load or failure, analytics increments can be dropped; dashboards label the numbers as bounded estimates rather than exact counts.',
    },
  ],
  diagrams: [
    {
      id: 'shortener-diagram-target',
      caption: 'Target redirect hot path with cache-aside and bounded fallback.',
      category: 'target',
      nodes: [
        { id: 'browser', label: 'Visitor browser', description: 'GET /{alias} redirect', kind: 'browser' },
        { id: 'svc', label: 'Shortener service', description: 'Hot path: cache → fallback → redirect', kind: 'service', planned: true },
        { id: 'redis', label: 'Redis', description: 'Cache-aside + negative caching', kind: 'data', planned: true },
        { id: 'db', label: 'PostgreSQL', description: 'Links, state, bounded analytics', kind: 'data', planned: true },
      ],
      connections: [
        { from: 'browser', to: 'svc', label: 'GET alias' },
        { from: 'svc', to: 'redis', label: 'cache-aside lookup', planned: true },
        { from: 'svc', to: 'db', label: 'bounded fallback + singleflight', planned: true },
      ],
    },
  ],
  evidence: [
    {
      id: 'shortener-spec',
      kind: 'specification',
      repository: 'zolotoy-dev-frontend (this repository)',
      path: 'docs/backend-specs/04_url_shortener.md',
      label: 'URL shortener specification (target contract)',
      reviewedOn: '2026-09-17',
    },
    {
      id: 'shortener-roadmap-perf',
      kind: 'specification',
      repository: 'zolotoy-dev-backend',
      revision: 'e36b10252b3775b79278bb344b7522fb132eb414',
      path: 'docs/roadmap.md',
      label: 'Shortener performance milestone: measurements and bounded analytics (future)',
      reviewedOn: '2026-09-17',
    },
  ],
  specUrl: 'https://github.com/Officialsayp/zolotoy-dev-frontend/blob/main/docs/backend-specs/04_url_shortener.md',
  demoUrl: 'https://zolotoy.dev/demo/shortener/',
}
