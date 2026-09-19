/**
 * Roadmap milestones mirroring the backend repository docs/roadmap.md
 * (revision e36b1025, reviewed 2026-09-17). States describe the roadmap, not
 * completion percentages; the first milestone is CURRENT, not completed.
 * Copy is localized; milestone IDs, service IDs and the source reference are
 * invariant technical data.
 */

import type { RoadmapMilestone } from './types'

const BACKEND_ROADMAP_REF = 'zolotoy-dev-backend docs/roadmap.md @ e36b1025'

export const ROADMAP_MILESTONES: readonly RoadmapMilestone[] = [
  {
    id: 'order-http-service',
    title: { en: 'Order HTTP service', ru: 'HTTP-сервис заказов' },
    state: 'current',
    serviceIds: ['order'],
    summary: {
      en: 'Finish HTTP/service boundaries: handler validation, service-layer results, errors.Is error mapping and handler/service/domain tests.',
      ru: 'Завершить границы HTTP/сервиса: валидация в хендлерах, результаты на уровне сервиса, сопоставление ошибок через errors.Is и тесты хендлеров/сервиса/домена.',
    },
    acceptanceEvidence: [
      {
        en: 'Handler and service tests cover validation, delegation and error mapping',
        ru: 'Тесты хендлеров и сервиса покрывают валидацию, делегирование и сопоставление ошибок',
      },
      {
        en: 'Domain transition methods exercised by unit tests',
        ru: 'Методы переходов домена покрыты юнит-тестами',
      },
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'order-persistence',
    title: { en: 'Order persistence', ru: 'Персистентность заказов' },
    state: 'future',
    serviceIds: ['order'],
    summary: {
      en: 'Agree OpenAPI/DTOs, add repository/PostgreSQL/migrations and durable create/read flows.',
      ru: 'Согласовать OpenAPI/DTO, добавить репозиторий/PostgreSQL/миграции и надёжные сценарии создания/чтения.',
    },
    acceptanceEvidence: [
      {
        en: 'Migration set reproducibly bootstraps the schema',
        ru: 'Набор миграций воспроизводимо создаёт схему',
      },
      {
        en: 'Created orders survive process restart',
        ru: 'Созданные заказы переживают перезапуск процесса',
      },
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'order-lifecycle',
    title: { en: 'Order lifecycle and concurrency', ru: 'Жизненный цикл и конкурентность заказов' },
    state: 'future',
    serviceIds: ['order'],
    summary: {
      en: 'Order/payment state matrix, cancellation/refund, versioning, idempotency, history and concurrency tests.',
      ru: 'Матрица состояний заказ/оплата, отмена/возврат, версионирование, идемпотентность, история и тесты конкурентности.',
    },
    acceptanceEvidence: [
      {
        en: 'Transition matrix rejects illegal transitions with typed errors',
        ru: 'Матрица переходов отклоняет недопустимые переходы типизированными ошибками',
      },
      {
        en: 'Concurrent operations serialize through version checks in tests',
        ru: 'Конкурентные операции сериализуются через проверки версий в тестах',
      },
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'auth-live-frontend',
    title: { en: 'Auth service with live frontend', ru: 'Auth-сервис с живым фронтендом' },
    state: 'future',
    serviceIds: ['auth'],
    summary: {
      en: 'Credentials, sessions, refresh rotation/reuse detection, RBAC, cookies/CORS/CSRF and real browser flows against the demo frontend.',
      ru: 'Учётные данные, сессии, ротация refresh/обнаружение повторного использования, RBAC, cookies/CORS/CSRF и реальные браузерные сценарии с демо-фронтендом.',
    },
    acceptanceEvidence: [
      {
        en: 'Browser flow: register → login → refresh rotation → logout',
        ru: 'Браузерный сценарий: регистрация → вход → ротация refresh → выход',
      },
      {
        en: 'Reuse of a rotated refresh credential revokes the session family',
        ru: 'Повторное использование ротированного refresh-токена отзывает семейство сессий',
      },
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'order-events-notification',
    title: { en: 'Order events → Notification', ru: 'События заказов → Notification' },
    state: 'future',
    serviceIds: ['order', 'notification'],
    summary: {
      en: 'Transactional outbox/event contract, inbox/jobs, delivery workers, retries and recovery.',
      ru: 'Transactional outbox/контракт событий, inbox/jobs, воркеры доставки, ретраи и восстановление.',
    },
    acceptanceEvidence: [
      {
        en: 'Outbox records commit atomically with order state changes',
        ru: 'Записи outbox коммитятся атомарно с изменениями состояния заказа',
      },
      {
        en: 'Duplicate event delivery commits once in the inbox',
        ru: 'Дубликат события фиксируется в inbox один раз',
      },
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'shortener-performance',
    title: { en: 'Shortener performance', ru: 'Производительность сокращателя' },
    state: 'future',
    serviceIds: ['shortener'],
    summary: {
      en: 'Database/redirect hot path, Redis fallback, per-instance singleflight, reproducible measurements and bounded analytics.',
      ru: 'Горячий путь редиректа через БД, фолбэк на Redis, per-instance singleflight, воспроизводимые измерения и ограниченная аналитика.',
    },
    acceptanceEvidence: [
      {
        en: 'Benchmark methodology and artifacts published',
        ru: 'Методология бенчмарков и артефакты опубликованы',
      },
      {
        en: 'Redis outage path bounded and measured',
        ru: 'Сценарий недоступности Redis ограничен и измерен',
      },
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
  {
    id: 'operations-evidence',
    title: { en: 'Operations evidence', ru: 'Эксплуатационные доказательства' },
    state: 'future',
    serviceIds: ['order', 'auth', 'notification', 'shortener'],
    summary: {
      en: 'Runbook, observability, backup/restore, integration CI and reproducible public evidence.',
      ru: 'Runbook, наблюдаемость, бэкап/восстановление, интеграционный CI и воспроизводимые публичные доказательства.',
    },
    acceptanceEvidence: [
      {
        en: 'Runbook covers start, health, backup/restore and incident steps',
        ru: 'Runbook покрывает запуск, health, бэкап/восстановление и действия при инцидентах',
      },
      {
        en: 'CI integration checks run on every backend change',
        ru: 'Интеграционные проверки CI выполняются на каждое изменение бэкенда',
      },
    ],
    sourceReference: BACKEND_ROADMAP_REF,
  },
]

export function currentMilestone(): RoadmapMilestone | null {
  return ROADMAP_MILESTONES.find((m) => m.state === 'current') ?? null
}
