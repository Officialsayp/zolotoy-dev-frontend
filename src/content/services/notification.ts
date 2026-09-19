import type { ServiceCase } from '../types'

/**
 * Notification service case study. Backend implementation is absent; content
 * is the planned event→job→attempt pipeline from the specification. Never
 * claim exactly-once email delivery without provider guarantees and evidence.
 * Copy carries both locales.
 */
export const notificationServiceCase: ServiceCase = {
  id: 'notification',
  slug: 'notification',
  name: 'Notification Service',
  nameLocalized: { en: 'Notification Service', ru: 'Notification-сервис' },
  shortLabel: { en: 'Notifications', ru: 'Уведомления' },
  summary: {
    en: 'An event-driven delivery service: durable inbox, at-least-once consumption, bounded delivery workers and retry with backoff — designed around duplicates, poison messages and recovery.',
    ru: 'Событийный сервис доставки: durable inbox, консьюминг at-least-once, ограниченные воркеры доставки и ретраи с backoff — спроектирован вокруг дубликатов, poison-сообщений и восстановления.',
  },
  declaredScope: {
    en: 'A backend engineering case study of reliable event consumption and outbound notification delivery for the zolotoy.dev demo environment.',
    ru: 'Бэкенд-кейс о надёжном потреблении событий и доставке исходящих уведомлений для демо-окружения zolotoy.dev.',
  },
  notScope: [
    { en: 'Not a campaign or marketing platform.', ru: 'Не платформа рассылок и маркетинга.' },
    { en: 'Not an email/HTML template builder.', ru: 'Не конструктор email/HTML-шаблонов.' },
    { en: 'Not an aggregate analytics product.', ru: 'Не продукт агрегатной аналитики.' },
  ],
  implementationStatus: 'planned',
  currentMilestone: null,
  nextMilestone: 'order-events-notification',
  demoMode: 'mock',
  runtime: 'not-deployed',
  runtimeLabel: { en: 'No deployed runtime — specification stage', ru: 'Нет развёрнутого рантайма — стадия спецификации' },
  engineeringFocus: {
    en: 'At-least-once processing, durable jobs, retry/DLQ semantics, bounded workers.',
    ru: 'Обработка at-least-once, durable-задачи, семантика ретраев/DLQ, ограниченные воркеры.',
  },
  currentImplementation: [
    {
      id: 'notification-current-absent',
      category: 'current',
      text: {
        en: 'No backend implementation exists yet: the demo renders deterministic MSW scenarios of the planned event → job → attempts model.',
        ru: 'Бэкенд-реализации пока нет: демо отображает детерминированные MSW-сценарии запланированной модели событие → задача → попытки.',
      },
      evidenceIds: ['notification-spec'],
    },
  ],
  targetArchitecture: [
    {
      id: 'notification-target-inbox',
      category: 'target',
      text: {
        en: 'A durable inbox with deduplication by event ID so at-least-once delivery from the broker never produces duplicate processing.',
        ru: 'Durable inbox с дедупликацией по ID события, чтобы доставка at-least-once от брокера никогда не приводила к двойной обработке.',
      },
      evidenceIds: ['notification-spec'],
    },
    {
      id: 'notification-target-jobs',
      category: 'target',
      text: {
        en: 'Transactional job creation: delivery jobs are recorded atomically with inbox commits, so a crash never loses or orphans a notification.',
        ru: 'Транзакционное создание задач: задачи доставки фиксируются атомарно с коммитами inbox, поэтому падение не теряет и не осиротивает уведомление.',
      },
      evidenceIds: ['notification-spec'],
    },
    {
      id: 'notification-target-workers',
      category: 'target',
      text: {
        en: 'Bounded worker pool with per-attempt records, exponential backoff with jitter, terminal dead-job states and lease-based recovery of abandoned work.',
        ru: 'Ограниченный пул воркеров с записями по попыткам, экспоненциальный backoff с джиттером, терминальные состояния dead-задач и восстановление брошенной работы на основе аренды (lease).',
      },
      evidenceIds: ['notification-spec'],
    },
  ],
  decisions: [
    {
      id: 'notification-dec-at-least-once',
      title: {
        en: 'At-least-once everywhere; deduplication is the consumer’s job',
        ru: 'Везде at-least-once; дедупликация — ответственность потребителя',
      },
      text: {
        en: 'Target design: the broker and workers only promise at-least-once. The inbox deduplicates by event ID, and send-result recording is idempotent per attempt.',
        ru: 'Целевой дизайн: брокер и воркеры гарантируют только at-least-once. Inbox дедуплицирует по ID события, а запись результата отправки идемпотентна.',
      },
      claimIds: ['notification-target-inbox'],
    },
    {
      id: 'notification-dec-dlq-scope',
      title: {
        en: 'Kafka DLQ vs dead delivery jobs are different tools',
        ru: 'Kafka DLQ и dead-задачи доставки — разные механизмы',
      },
      text: {
        en: 'Target design: broker-level DLQ handles structurally unprocessable messages; application-level dead jobs handle provider-rejected or permanently failing deliveries with retry policies of their own.',
        ru: 'Целевой дизайн: DLQ уровня брокера обрабатывает структурно необрабатываемые сообщения; dead-задачи уровня приложения — отклонённые провайдером или постоянно падающие доставки со своими политиками ретраев.',
      },
      claimIds: ['notification-target-workers'],
    },
    {
      id: 'notification-dec-lease-recovery',
      title: {
        en: 'Leases recover abandoned processing jobs',
        ru: 'Lease-аренда восстанавливает брошенные задачи',
      },
      text: {
        en: 'Target design: a worker holds a time-boxed lease; if it crashes, the lease expires and another worker takes over. Send-success-then-crash duplicates are resolved by idempotent result recording.',
        ru: 'Целевой дизайн: воркер держит lease с ограниченным сроком; при падении lease истекает и задачу подхватывает другой воркер. Дубликаты «отправка удалась, потом падение» решаются идемпотентной записью результата.',
      },
      claimIds: ['notification-target-workers'],
    },
  ],
  failureModes: [
    {
      id: 'notification-fm-duplicates',
      topic: { en: 'Duplicate events', ru: 'Дубликаты событий' },
      text: {
        en: 'The same event ID delivered twice (broker retry, consumer rebalance) must commit once in the inbox; the second copy is acknowledged as already-processed.',
        ru: 'Один и тот же ID события, доставленный дважды (ретрай брокера, rebalance консьюмера), должен закоммититься в inbox один раз; вторая копия подтверждается как уже обработанная.',
      },
    },
    {
      id: 'notification-fm-poison',
      topic: { en: 'Poison messages', ru: 'Poison-сообщения' },
      text: {
        en: 'Messages that fail deserialization or validation permanently must not block the partition: bounded retries, then dead-letter with the reason recorded.',
        ru: 'Сообщения, постоянно падающие на десериализации или валидации, не должны блокировать партицию: ограниченные ретраи, затем dead-letter с записанной причиной.',
      },
    },
    {
      id: 'notification-fm-provider-errors',
      topic: {
        en: 'Transient vs permanent provider errors',
        ru: 'Временные против постоянных ошибок провайдера',
      },
      text: {
        en: '429/5xx/timeouts retry with backoff and jitter; 4xx validation failures of the provider are terminal and move the job to dead with the provider reason preserved.',
        ru: '429/5xx/таймауты ретраятся с backoff и джиттером; 4xx-ошибки валидации провайдера терминальны — задача уходит в dead с сохранённой причиной провайдера.',
      },
    },
    {
      id: 'notification-fm-send-crash',
      topic: { en: 'Send success then process crash', ru: 'Успешная отправка, затем падение процесса' },
      text: {
        en: 'Provider accepted the email but the worker died before recording it: retry produces a duplicate email. Bounded by idempotency keys where the provider supports them and by honest "at-least-once" wording.',
        ru: 'Провайдер принял письмо, но воркер умер до записи результата: ретрай даёт дубликат письма. Ограничивается ключами идемпотентности, где провайдер их поддерживает, и честной формулировкой «at-least-once».',
      },
    },
    {
      id: 'notification-fm-abandoned',
      topic: { en: 'Abandoned processing jobs', ru: 'Брошенные задачи в processing' },
      text: {
        en: 'Jobs stuck in "processing" after a worker death are reclaimed after lease expiry; the number of reclaim cycles is capped before the job is declared dead.',
        ru: 'Задачи, застрявшие в «processing» после смерти воркера, забираются повторно после истечения lease; число циклов перехвата ограничено до объявления задачи dead.',
      },
    },
  ],
  diagrams: [
    {
      id: 'notification-diagram-target',
      caption: {
        en: 'Target notification flow: events to durable delivery jobs.',
        ru: 'Целевой поток уведомлений: события → durable-задачи доставки.',
      },
      category: 'target',
      nodes: [
        {
          id: 'order',
          label: { en: 'Order service', ru: 'Order-сервис' },
          description: { en: 'Publishes order events via outbox', ru: 'Публикует события заказов через outbox' },
          kind: 'service',
          planned: true,
        },
        {
          id: 'kafka',
          label: { en: 'Kafka', ru: 'Kafka' },
          description: { en: 'Event transport (planned infrastructure)', ru: 'Транспорт событий (планируемая инфраструктура)' },
          kind: 'infrastructure',
          planned: true,
        },
        {
          id: 'inbox',
          label: { en: 'Inbox + dedup', ru: 'Inbox + дедупликация' },
          description: { en: 'Idempotent event consumption', ru: 'Идемпотентное потребление событий' },
          kind: 'data',
          planned: true,
        },
        {
          id: 'jobs',
          label: { en: 'Delivery jobs', ru: 'Задачи доставки' },
          description: { en: 'Transactional records with attempts', ru: 'Транзакционные записи с попытками' },
          kind: 'data',
          planned: true,
        },
        {
          id: 'worker',
          label: { en: 'Delivery workers', ru: 'Воркеры доставки' },
          description: {
            en: 'Bounded concurrency, backoff, leases',
            ru: 'Ограниченная конкурентность, backoff, lease',
          },
          kind: 'service',
          planned: true,
        },
        {
          id: 'provider',
          label: { en: 'Email provider', ru: 'Email-провайдер' },
          description: { en: 'External API', ru: 'Внешний API' },
          kind: 'infrastructure',
          planned: true,
        },
      ],
      connections: [
        { from: 'order', to: 'kafka', label: { en: 'order events', ru: 'события заказов' }, planned: true },
        { from: 'kafka', to: 'inbox', label: { en: 'at-least-once consumption', ru: 'консьюминг at-least-once' }, planned: true },
        { from: 'inbox', to: 'jobs', label: { en: 'transactional job creation', ru: 'транзакционное создание задач' }, planned: true },
        { from: 'jobs', to: 'worker', label: { en: 'lease + attempt records', ru: 'lease + записи попыток' }, planned: true },
        { from: 'worker', to: 'provider', label: { en: 'send + record result', ru: 'отправка + запись результата' }, planned: true },
      ],
    },
  ],
  evidence: [
    {
      id: 'notification-spec',
      kind: 'specification',
      repository: 'zolotoy-dev-frontend (this repository)',
      path: 'docs/backend-specs/03_notification_service.md',
      label: {
        en: 'Notification service specification (target contract)',
        ru: 'Спецификация Notification-сервиса (целевой контракт)',
      },
      reviewedOn: '2026-09-17',
    },
  ],
  specUrl: 'https://github.com/Officialsayp/zolotoy-dev-frontend/blob/main/docs/backend-specs/03_notification_service.md',
  demoUrl: 'https://zolotoy.dev/demo/notifications/',
}
