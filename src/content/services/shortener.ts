import type { ServiceCase } from '../types'

/**
 * URL shortener case study. Backend implementation is absent; content covers
 * the planned redirect hot path, cache-aside strategy and honest limits of
 * per-instance singleflight and best-effort analytics. Copy carries both locales.
 */
export const shortenerServiceCase: ServiceCase = {
  id: 'shortener',
  slug: 'url-shortener',
  name: 'URL Shortener',
  nameLocalized: { en: 'URL Shortener', ru: 'URL-сокращатель' },
  shortLabel: { en: 'Shortener', ru: 'Сокращатель' },
  summary: {
    en: 'A redirect service engineered around its hot path: PostgreSQL storage, Redis cache-aside with bounded fallback, per-instance singleflight and reproducible latency benchmarks.',
    ru: 'Сервис редиректов, спроектированный вокруг горячего пути: хранение в PostgreSQL, Redis cache-aside с ограниченным фолбэком, per-instance singleflight и воспроизводимые бенчмарки задержек.',
  },
  declaredScope: {
    en: 'A backend engineering case study of a redirect hot path, caching strategy and bounded analytics for the zolotoy.dev demo environment.',
    ru: 'Бэкенд-кейс о горячем пути редиректа, стратегии кэширования и ограниченной аналитике для демо-окружения zolotoy.dev.',
  },
  notScope: [
    { en: 'Not a Bitly clone.', ru: 'Не клон Bitly.' },
    { en: 'Not a sharded analytics platform.', ru: 'Не шардированная аналитическая платформа.' },
    { en: 'Not a general-purpose link management product.', ru: 'Не универсальный продукт управления ссылками.' },
  ],
  implementationStatus: 'planned',
  currentMilestone: null,
  nextMilestone: 'shortener-performance',
  demoMode: 'mock',
  runtime: 'not-deployed',
  runtimeLabel: { en: 'No deployed runtime — specification stage', ru: 'Нет развёрнутого рантайма — стадия спецификации' },
  engineeringFocus: {
    en: 'Redis cache-aside, singleflight, hot path, bounded analytics.',
    ru: 'Redis cache-aside, singleflight, горячий путь, ограниченная аналитика.',
  },
  currentImplementation: [
    {
      id: 'shortener-current-absent',
      category: 'current',
      text: {
        en: 'No backend implementation exists yet: the demo renders deterministic MSW scenarios of link management and analytics.',
        ru: 'Бэкенд-реализации пока нет: демо отображает детерминированные MSW-сценарии управления ссылками и аналитики.',
      },
      evidenceIds: ['shortener-spec'],
    },
  ],
  targetArchitecture: [
    {
      id: 'shortener-target-hotpath',
      category: 'target',
      text: {
        en: 'A redirect hot path that serves from Redis cache-aside, falls back to PostgreSQL with bounded concurrency, and returns 404/410 according to link state.',
        ru: 'Горячий путь редиректа: отдача из Redis cache-aside, фолбэк на PostgreSQL с ограниченной конкурентностью и ответы 404/410 по состоянию ссылки.',
      },
      evidenceIds: ['shortener-spec'],
    },
    {
      id: 'shortener-target-cache',
      category: 'target',
      text: {
        en: 'Cache invalidation on link mutation, negative caching for missing keys, and TTL bounds that cap staleness after invalidation races.',
        ru: 'Инвалидация кэша при изменении ссылки, negative caching для отсутствующих ключей и ограничения TTL, ограничивающие устаревание после гонок инвалидации.',
      },
      evidenceIds: ['shortener-spec'],
    },
    {
      id: 'shortener-target-singleflight',
      category: 'target',
      text: {
        en: 'Per-instance singleflight collapses concurrent misses for the same key into one database read; it does not coordinate across service instances.',
        ru: 'Per-instance singleflight сворачивает конкурентные промахи по одному ключу в одно чтение БД; между инстансами сервиса он не координирует.',
      },
      evidenceIds: ['shortener-spec'],
    },
    {
      id: 'shortener-target-benchmarks',
      category: 'target',
      text: {
        en: 'Reproducible latency/throughput benchmarks with published methodology — a measurement, not a marketing number.',
        ru: 'Воспроизводимые бенчмарки задержек/пропускной способности с опубликованной методологией — измерение, а не маркетинговая цифра.',
      },
      evidenceIds: ['shortener-spec', 'shortener-roadmap-perf'],
    },
  ],
  decisions: [
    {
      id: 'shortener-dec-negative-caching',
      title: {
        en: 'Negative caching bounds the missing-key stampede',
        ru: 'Negative caching ограничивает шторм отсутствующих ключей',
      },
      text: {
        en: 'Target design: repeated lookups of a nonexistent alias cache a short-lived negative result so attackers or hot dead links cannot bypass the cache to the database.',
        ru: 'Целевой дизайн: повторные запросы несуществующего алиаса кэшируют кратковременный отрицательный результат, чтобы атакующие или «горячие» мёртвые ссылки не обходили кэш в обход БД.',
      },
      claimIds: ['shortener-target-cache'],
    },
    {
      id: 'shortener-dec-singleflight-scope',
      title: {
        en: 'Singleflight is per-instance by design',
        ru: 'Singleflight — per-instance по дизайну',
      },
      text: {
        en: 'Target design: in-flight request coalescing removes same-instance duplicate misses. Cross-instance coordination would add a distributed lock to a hot path — rejected; bounded fallback concurrency does that job instead.',
        ru: 'Целевой дизайн: слияние in-flight запросов убирает дублирующиеся промахи внутри инстанса. Межинстансовая координация добавила бы распределённый лок на горячий путь — отклонено; эту роль выполняет ограниченная конкурентность фолбэка.',
      },
      claimIds: ['shortener-target-singleflight'],
    },
    {
      id: 'shortener-dec-analytics-loss',
      title: {
        en: 'Analytics are best-effort and bounded',
        ru: 'Аналитика — best-effort и ограниченная',
      },
      text: {
        en: 'Target design: click counts are incremented asynchronously and may lose data under failure; correctness of the redirect never depends on analytics.',
        ru: 'Целевой дизайн: счётчики кликов инкрементируются асинхронно и при сбоях могут терять данные; корректность редиректа никогда не зависит от аналитики.',
      },
      claimIds: ['shortener-target-hotpath'],
    },
  ],
  failureModes: [
    {
      id: 'shortener-fm-collision',
      topic: { en: 'Unique-key collision', ru: 'Коллизия уникального ключа' },
      text: {
        en: 'Generated alias collides on insert: retry with a new key under a uniqueness constraint; user-chosen aliases surface a 409-style conflict instead of overwriting.',
        ru: 'Сгенерированный алиас конфликтует при вставке: ретрай с новым ключом под ограничением уникальности; выбранные пользователем алиасы дают конфликт вида 409 вместо перезаписи.',
      },
    },
    {
      id: 'shortener-fm-redis-outage',
      topic: {
        en: 'Redis outage and bounded database fallback',
        ru: 'Недоступность Redis и ограниченный фолбэк на БД',
      },
      text: {
        en: 'Redis unavailable: redirects continue through PostgreSQL with concurrency limits (and probably degraded latency) instead of failing closed or stampeding unprotected.',
        ru: 'Redis недоступен: редиректы продолжаются через PostgreSQL с лимитами конкурентности (вероятно, с деградацией задержек) вместо отказа или неконтролируемого шторма.',
      },
    },
    {
      id: 'shortener-fm-invalidation-race',
      topic: { en: 'Invalidation/refill races', ru: 'Гонки инвалидации/перезаписи' },
      text: {
        en: 'A read refills a stale value after an invalidation delete; TTL bounds how long the stale entry can mislead. Invalidation is not presented as race-free.',
        ru: 'Чтение перезаписывает устаревшее значение после инвалидации; TTL ограничивает, как долго устаревшая запись может вводить в заблуждение. Инвалидация не подаётся как свободная от гонок.',
      },
    },
    {
      id: 'shortener-fm-expired-policy',
      topic: { en: 'Expired/disabled link policy', ru: 'Политика для истёкших/отключённых ссылок' },
      text: {
        en: 'Expired links answer 410 Gone, disabled or deleted links answer 404 — the distinction is part of the API contract, not a UI detail.',
        ru: 'Истёкшие ссылки отвечают 410 Gone, отключённые или удалённые — 404; это различие — часть API-контракта, а не деталь UI.',
      },
    },
    {
      id: 'shortener-fm-analytics-loss',
      topic: { en: 'Best-effort analytics loss', ru: 'Потери best-effort-аналитики' },
      text: {
        en: 'Under load or failure, analytics increments can be dropped; dashboards label the numbers as bounded estimates rather than exact counts.',
        ru: 'Под нагрузкой или при сбоях инкременты аналитики могут теряться; дашборды помечают числа как ограниченные оценки, а не точные счётчики.',
      },
    },
  ],
  diagrams: [
    {
      id: 'shortener-diagram-target',
      caption: {
        en: 'Target redirect hot path with cache-aside and bounded fallback.',
        ru: 'Целевой горячий путь редиректа: cache-aside и ограниченный фолбэк.',
      },
      category: 'target',
      nodes: [
        {
          id: 'browser',
          label: { en: 'Visitor browser', ru: 'Браузер посетителя' },
          description: { en: 'GET /{alias} redirect', ru: 'GET /{alias} — редирект' },
          kind: 'browser',
        },
        {
          id: 'svc',
          label: { en: 'Shortener service', ru: 'Shortener-сервис' },
          description: {
            en: 'Hot path: cache → fallback → redirect',
            ru: 'Горячий путь: кэш → фолбэк → редирект',
          },
          kind: 'service',
          planned: true,
        },
        {
          id: 'redis',
          label: { en: 'Redis', ru: 'Redis' },
          description: {
            en: 'Cache-aside + negative caching',
            ru: 'Cache-aside + negative caching',
          },
          kind: 'data',
          planned: true,
        },
        {
          id: 'db',
          label: { en: 'PostgreSQL', ru: 'PostgreSQL' },
          description: { en: 'Links, state, bounded analytics', ru: 'Ссылки, состояние, ограниченная аналитика' },
          kind: 'data',
          planned: true,
        },
      ],
      connections: [
        { from: 'browser', to: 'svc', label: { en: 'GET alias', ru: 'GET алиаса' } },
        { from: 'svc', to: 'redis', label: { en: 'cache-aside lookup', ru: 'поиск cache-aside' }, planned: true },
        { from: 'svc', to: 'db', label: { en: 'bounded fallback + singleflight', ru: 'ограниченный фолбэк + singleflight' }, planned: true },
      ],
    },
  ],
  evidence: [
    {
      id: 'shortener-spec',
      kind: 'specification',
      repository: 'zolotoy-dev-frontend (this repository)',
      path: 'docs/backend-specs/04_url_shortener.md',
      label: {
        en: 'URL shortener specification (target contract)',
        ru: 'Спецификация URL-сокращателя (целевой контракт)',
      },
      reviewedOn: '2026-09-17',
    },
    {
      id: 'shortener-roadmap-perf',
      kind: 'specification',
      repository: 'zolotoy-dev-backend',
      revision: 'e36b10252b3775b79278bb344b7522fb132eb414',
      path: 'docs/roadmap.md',
      label: {
        en: 'Shortener performance milestone: measurements and bounded analytics (future)',
        ru: 'Веха производительности сокращателя: измерения и ограниченная аналитика (будущее)',
      },
      reviewedOn: '2026-09-17',
    },
  ],
  specUrl: 'https://github.com/Officialsayp/zolotoy-dev-frontend/blob/main/docs/backend-specs/04_url_shortener.md',
  demoUrl: 'https://zolotoy.dev/demo/shortener/',
}
