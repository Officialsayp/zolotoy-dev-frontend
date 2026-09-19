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
 * inspected inventory. Copy carries both locales; IDs, URLs and evidence
 * paths are invariant.
 */
export const orderServiceCase: ServiceCase = {
  id: 'order',
  slug: 'order',
  name: 'Order Service',
  nameLocalized: { en: 'Order Service', ru: 'Order-сервис' },
  shortLabel: { en: 'Order', ru: 'Заказы' },
  summary: {
    en: 'An order HTTP service demonstrating validation-driven boundaries today and a full lifecycle core — state machines, idempotency, optimistic concurrency and a transactional outbox — as the target.',
    ru: 'HTTP-сервис заказов: сегодня — границы, построенные на валидации; цель — полноценное ядро жизненного цикла: машина состояний, идемпотентность, оптимистичная конкурентность и transactional outbox.',
  },
  declaredScope: {
    en: 'A backend engineering case study of order creation, lifecycle state and payment semantics for a technical demo environment.',
    ru: 'Бэкенд-кейс о создании заказов, состоянии жизненного цикла и семантике оплаты для технического демо-окружения.',
  },
  notScope: [
    { en: 'Not a storefront or product catalog.', ru: 'Не витрина или каталог товаров.' },
    { en: 'Not an inventory system.', ru: 'Не система управления запасами.' },
    {
      en: 'Not a real acquiring/payment-provider integration.',
      ru: 'Не реальная интеграция с эквайрингом/платёжным провайдером.',
    },
  ],
  implementationStatus: 'in-development',
  currentMilestone: 'order-http-service',
  nextMilestone: 'order-persistence',
  demoMode: 'mock',
  runtime: 'local',
  runtimeLabel: { en: 'Local development only', ru: 'Только локальная разработка' },
  engineeringFocus: {
    en: 'State machines, transactions, idempotency, optimistic concurrency, transactional outbox.',
    ru: 'Машины состояний, транзакции, идемпотентность, оптимистичная конкурентность, transactional outbox.',
  },
  currentImplementation: [
    {
      id: 'order-current-http',
      category: 'current',
      text: {
        en: 'POST /orders validates the product field (trim + non-empty) and calls the service layer; GET /orders/{id} validates a positive integer ID and an optional details flag. Handlers return demonstration text without persistence.',
        ru: 'POST /orders валидирует поле product (обрезка + непустое) и вызывает слой сервиса; GET /orders/{id} валидирует положительный целочисленный ID и необязательный флаг details. Хендлеры возвращают демонстрационный текст без персистентности.',
      },
      evidenceIds: ['order-src-handler', 'order-src-service'],
    },
    {
      id: 'order-current-domain',
      category: 'current',
      text: {
        en: 'Independent domain models and transition methods exist in the module but are not yet connected to the HTTP flow.',
        ru: 'В модуле есть независимые доменные модели и методы переходов, но они пока не подключены к HTTP-потоку.',
      },
      evidenceIds: ['order-src-domain'],
    },
    {
      id: 'order-current-no-persistence',
      category: 'current',
      text: {
        en: 'No storage integration yet: created orders are not persisted and GET does not retrieve from storage.',
        ru: 'Интеграции с хранилищем пока нет: созданные заказы не сохраняются, GET не читает из хранилища.',
      },
      evidenceIds: ['order-src-handler'],
    },
    {
      id: 'order-current-no-tests',
      category: 'current',
      text: {
        en: 'No automated backend tests existed in the inspected inventory — handler/service/domain tests are part of the current milestone, not a completed fact.',
        ru: 'В проверенной инвентаризации автоматических бэкенд-тестов не было — тесты хендлеров/сервиса/домена входят в текущую веху, а не являются свершившимся фактом.',
      },
      evidenceIds: ['order-backend-readme'],
    },
  ],
  targetArchitecture: [
    {
      id: 'order-target-state-machines',
      category: 'target',
      text: {
        en: 'Independent order and payment state machines with an explicit allowed-transition matrix, cancellation and refund paths, and versioned updates.',
        ru: 'Независимые машины состояний заказа и оплаты с явной матрицей допустимых переходов, путями отмены и возврата и версионированными обновлениями.',
      },
      evidenceIds: ['order-spec'],
    },
    {
      id: 'order-target-persistence',
      category: 'target',
      text: {
        en: 'PostgreSQL persistence with migrations, durable create/read, and transactions that keep external payment calls outside open database transactions.',
        ru: 'Персистентность в PostgreSQL с миграциями, надёжными созданием/чтением и транзакциями, в которых внешние вызовы провайдера остаются за пределами открытых транзакций БД.',
      },
      evidenceIds: ['order-spec', 'order-roadmap-persistence'],
    },
    {
      id: 'order-target-concurrency',
      category: 'target',
      text: {
        en: 'Optimistic concurrency (version checks) and idempotency keys so repeated create/pay operations converge instead of duplicating side effects.',
        ru: 'Оптимистичная конкурентность (проверки версий) и ключи идемпотентности: повторные create/pay-операции сходятся к одному результату, а не дублируют побочные эффекты.',
      },
      evidenceIds: ['order-spec'],
    },
    {
      id: 'order-target-outbox',
      category: 'target',
      text: {
        en: 'A transactional outbox records order events atomically with state changes; publication is at-least-once and consumers deduplicate.',
        ru: 'Transactional outbox записывает события заказа атомарно с изменениями состояния; публикация — at-least-once, потребители дедуплицируют.',
      },
      evidenceIds: ['order-spec', 'order-roadmap-events'],
    },
  ],
  decisions: [
    {
      id: 'order-dec-http-boundary',
      title: {
        en: 'Validation lives at the HTTP boundary, business rules in the service layer',
        ru: 'Валидация живёт на HTTP-границе, бизнес-правила — в слое сервиса',
      },
      text: {
        en: 'Handlers trim and validate input shape (product, ID, flags) and delegate; the service layer owns the result. Keeping transport parsing out of the service keeps the boundary testable without HTTP.',
        ru: 'Хендлеры обрезают и валидируют форму входных данных (product, ID, флаги) и делегируют; результат принадлежит слою сервиса. Вынос транспортного разбора из сервиса делает границу тестируемой без HTTP.',
      },
      claimIds: ['order-current-http'],
    },
    {
      id: 'order-dec-domain-separate',
      title: {
        en: 'Domain models are built separately before wiring the HTTP flow',
        ru: 'Доменные модели строятся отдельно до связывания с HTTP-потоком',
      },
      text: {
        en: 'Order/payment state machines and transition methods are developed as an independent domain package first, so lifecycle semantics can be designed and tested before they are coupled to handlers and storage.',
        ru: 'Машины состояний заказа/оплаты и методы переходов разрабатываются как независимый доменный пакет, чтобы семантику жизненного цикла можно было спроектировать и протестировать до связывания с хендлерами и хранилищем.',
      },
      claimIds: ['order-current-domain'],
    },
    {
      id: 'order-dec-idempotency-scope',
      title: {
        en: 'Idempotency keys scope to operation + payload',
        ru: 'Ключи идемпотентности привязаны к операции + payload',
      },
      text: {
        en: 'Target design: a repeated idempotency key with the same payload returns the original result; the same key with a different payload is a client error. This prevents both duplicate side effects and silent payload substitution.',
        ru: 'Целевой дизайн: повторный ключ идемпотентности с тем же payload возвращает исходный результат; тот же ключ с другим payload — клиентская ошибка. Это защищает и от дублирования побочных эффектов, и от тихой подмены payload.',
      },
    },
    {
      id: 'order-dec-payment-outside-tx',
      title: {
        en: 'External payment calls stay outside open database transactions',
        ru: 'Внешние платёжные вызовы остаются за пределами открытых транзакций БД',
      },
      text: {
        en: 'Target design: reserve state in a short transaction, call the provider outside it, then apply the result in a guarded transition. A crash between the two steps is recovered by reconciliation, not by holding locks across network I/O.',
        ru: 'Целевой дизайн: зарезервировать состояние в короткой транзакции, вызвать провайдера вне её, затем применить результат в защищённом переходе. Падение между шагами разбирается сверкой (reconciliation), а не удержанием блокировок на время сетевого I/O.',
      },
    },
  ],
  failureModes: [
    {
      id: 'order-fm-idempotency-payload',
      topic: {
        en: 'Repeated idempotency key: same payload vs different payload',
        ru: 'Повторный ключ идемпотентности: тот же payload vs другой payload',
      },
      text: {
        en: 'Same payload → return the recorded result (no second side effect). Different payload → 409-style client error instead of silently reprocessing. The stored key must bind to a request fingerprint.',
        ru: 'Тот же payload → вернуть записанный результат (без второго побочного эффекта). Другой payload → клиентская ошибка вида 409 вместо тихой повторной обработки. Сохранённый ключ должен быть привязан к отпечатку запроса.',
      },
    },
    {
      id: 'order-fm-competing-ops',
      topic: { en: 'Competing Pay/Cancel operations', ru: 'Конкурирующие операции Pay/Cancel' },
      text: {
        en: 'Two concurrent transitions on one order must serialize through the version check: exactly one wins, the loser gets a concurrency conflict and re-reads current state.',
        ru: 'Два конкурентных перехода одного заказа сериализуются через проверку версии: выигрывает ровно один, проигравший получает конфликт конкурентности и перечитывает актуальное состояние.',
      },
    },
    {
      id: 'order-fm-payment-crash',
      topic: { en: 'External payment call vs process crash', ru: 'Платёжный вызов против падения процесса' },
      text: {
        en: 'If the process dies between charging and recording, reconciliation (not a live transaction) resolves the outcome; the order records an in-flight payment state rather than pretending nothing happened.',
        ru: 'Если процесс умирает между списанием и записью результата, исход разбирает сверка (reconciliation), а не живая транзакция; заказ фиксирует состояние «платёж в обработке», а не делает вид, что ничего не было.',
      },
    },
    {
      id: 'order-fm-outbox-duplicates',
      topic: { en: 'Outbox publication duplicates', ru: 'Дубликаты публикации outbox' },
      text: {
        en: 'Outbox delivery is at-least-once: consumers must deduplicate by event ID. Publishers do not promise exactly-once.',
        ru: 'Доставка outbox — at-least-once: потребители обязаны дедуплицировать по ID события. Издатели не обещают exactly-once.',
      },
    },
  ],
  diagrams: [
    {
      id: 'order-diagram-current',
      caption: {
        en: 'Current order flow: HTTP boundary into the service layer, no storage.',
        ru: 'Текущий поток заказов: HTTP-граница → слой сервиса, без хранилища.',
      },
      category: 'current',
      nodes: [
        {
          id: 'client',
          label: { en: 'HTTP client', ru: 'HTTP-клиент' },
          description: { en: 'curl / Bruno manual collection', ru: 'curl / ручная коллекция Bruno' },
          kind: 'browser',
        },
        {
          id: 'handler',
          label: { en: 'Handler (net/http)', ru: 'Хендлер (net/http)' },
          description: {
            en: 'POST /orders, GET /orders/{id}: trim, validate, delegate',
            ru: 'POST /orders, GET /orders/{id}: обрезка, валидация, делегирование',
          },
          kind: 'frontend',
        },
        {
          id: 'service',
          label: { en: 'Order service', ru: 'Order-сервис' },
          description: { en: 'Business result construction (in development)', ru: 'Построение бизнес-результата (в разработке)' },
          kind: 'service',
        },
        {
          id: 'domain',
          label: { en: 'Domain models', ru: 'Доменные модели' },
          description: {
            en: 'Status/payment transitions — present but not connected',
            ru: 'Переходы статусов/оплаты — есть, но не подключены',
          },
          kind: 'data',
          planned: true,
        },
      ],
      connections: [
        { from: 'client', to: 'handler', label: { en: 'POST /orders {product}', ru: 'POST /orders {product}' } },
        { from: 'handler', to: 'service', label: { en: 'validated call', ru: 'валидированный вызов' } },
        { from: 'service', to: 'domain', label: { en: 'not yet integrated', ru: 'пока не интегрировано' }, planned: true },
      ],
    },
    {
      id: 'order-diagram-target',
      caption: {
        en: 'Target order flow: state machines, persistence, outbox.',
        ru: 'Целевой поток заказов: машины состояний, персистентность, outbox.',
      },
      category: 'target',
      nodes: [
        {
          id: 'client',
          label: { en: 'HTTP client', ru: 'HTTP-клиент' },
          description: { en: 'JSON API consumers', ru: 'Потребители JSON API' },
          kind: 'browser',
        },
        {
          id: 'handler',
          label: { en: 'Handler', ru: 'Хендлер' },
          description: { en: 'DTO validation and error envelopes', ru: 'Валидация DTO и конверты ошибок' },
          kind: 'frontend',
        },
        {
          id: 'service',
          label: { en: 'Order service', ru: 'Order-сервис' },
          description: {
            en: 'Transition matrix, idempotency, version checks',
            ru: 'Матрица переходов, идемпотентность, проверки версий',
          },
          kind: 'service',
        },
        {
          id: 'db',
          label: { en: 'PostgreSQL', ru: 'PostgreSQL' },
          description: { en: 'Orders, history, outbox records', ru: 'Заказы, история, записи outbox' },
          kind: 'data',
          planned: true,
        },
        {
          id: 'outbox',
          label: { en: 'Outbox publisher', ru: 'Издатель outbox' },
          description: { en: 'At-least-once event delivery', ru: 'Доставка событий at-least-once' },
          kind: 'infrastructure',
          planned: true,
        },
      ],
      connections: [
        { from: 'client', to: 'handler', label: { en: 'JSON API', ru: 'JSON API' } },
        { from: 'handler', to: 'service', label: { en: 'application boundary', ru: 'граница приложения' } },
        { from: 'service', to: 'db', label: { en: 'transactional writes', ru: 'транзакционные записи' }, planned: true },
        { from: 'db', to: 'outbox', label: { en: 'atomic event records', ru: 'атомарные записи событий' }, planned: true },
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
      label: {
        en: 'HTTP handlers: POST /orders, GET /orders/{id} validation and service delegation',
        ru: 'HTTP-хендлеры: POST /orders, GET /orders/{id} — валидация и делегирование сервису',
      },
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-src-service',
      kind: 'source-code',
      repository: BACKEND_REPO_URL,
      revision: BACKEND_REVISION,
      path: 'services/order-service/internal/service/order_service.go',
      label: {
        en: 'Service layer producing the demonstration result',
        ru: 'Слой сервиса, формирующий демонстрационный результат',
      },
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-src-domain',
      kind: 'source-code',
      repository: BACKEND_REPO_URL,
      revision: BACKEND_REVISION,
      path: 'services/order-service/internal/order',
      label: {
        en: 'Domain models and transition methods (separate from the HTTP flow)',
        ru: 'Доменные модели и методы переходов (отдельно от HTTP-потока)',
      },
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-spec',
      kind: 'specification',
      repository: 'zolotoy-dev-frontend (this repository)',
      path: 'docs/backend-specs/01_order_service.md',
      label: {
        en: 'Order service specification (target contract)',
        ru: 'Спецификация Order-сервиса (целевой контракт)',
      },
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-backend-readme',
      kind: 'specification',
      repository: 'zolotoy-dev-backend',
      revision: BACKEND_REVISION,
      path: 'docs/roadmap.md',
      label: {
        en: 'Backend roadmap: Service Layer milestone in progress',
        ru: 'Бэкенд-роадмап: веха Service Layer в работе',
      },
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-roadmap-persistence',
      kind: 'specification',
      repository: 'zolotoy-dev-backend',
      revision: BACKEND_REVISION,
      path: 'docs/roadmap.md',
      label: {
        en: 'Persistence milestone: PostgreSQL repository and migrations (future)',
        ru: 'Веха персистентности: репозиторий PostgreSQL и миграции (будущее)',
      },
      reviewedOn: '2026-09-17',
    },
    {
      id: 'order-roadmap-events',
      kind: 'specification',
      repository: 'zolotoy-dev-backend',
      revision: BACKEND_REVISION,
      path: 'docs/roadmap.md',
      label: {
        en: 'Events milestone: outbox contract feeding Notification (future)',
        ru: 'Веха событий: контракт outbox для Notification (будущее)',
      },
      reviewedOn: '2026-09-17',
    },
  ],
  sourceUrl: BACKEND_REPO_URL,
  specUrl: 'https://github.com/Officialsayp/zolotoy-dev-frontend/blob/main/docs/backend-specs/01_order_service.md',
  demoUrl: 'https://zolotoy.dev/demo/orders/',
}

export const ORDER_SERVICE_CASE = orderServiceCase
