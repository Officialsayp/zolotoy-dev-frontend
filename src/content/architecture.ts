/**
 * Architecture page content: current system state, current/target
 * architecture, boundaries, data ownership, integration contracts, runtime
 * modes and principles. All "current" claims trace to the verified backend
 * baseline (2026-09-17); planned infrastructure never renders as deployed.
 * Copy carries both locales.
 */

import type { ArchitectureContent } from './types'

export const ARCHITECTURE_CONTENT: ArchitectureContent = {
  sections: [
    {
      id: 'current-state',
      title: { en: 'Current System State', ru: 'Текущее состояние системы' },
      paragraphs: [
        {
          en: 'Today zolotoy.dev is one Vue 3 SPA (the interactive demo) served as static assets, plus a statically generated portfolio layer describing the work. The demo runs fully on MSW-mocked APIs in mock mode; VITE_API_MODE=real switches transport targets to configured hosts without loading the mock graph.',
          ru: 'Сегодня zolotoy.dev — это одно Vue 3 SPA (интерактивное демо), раздаваемое как статика, плюс статически сгенерированный слой портфолио, описывающий работу. Демо в mock-режиме полностью работает на MSW-моках; VITE_API_MODE=real переключает цели транспорта на настроенные хосты, не загружая граф моков.',
        },
        {
          en: 'The backend repository contains one implemented Go module: the order HTTP service at the Service Layer milestone. It validates requests, calls a service layer, and returns demonstration results. Domain state machines exist as separate packages and are not yet wired into the HTTP flow. PostgreSQL, Redis, Kafka, auth and live frontend integration are not connected.',
          ru: 'В бэкенд-репозитории один реализованный Go-модуль: HTTP-сервис заказов на вехе Service Layer. Он валидирует запросы, вызывает слой сервиса и возвращает демонстрационные результаты. Доменные машины состояний существуют отдельными пакетами и ещё не подключены к HTTP-потоку. PostgreSQL, Redis, Kafka, auth и живая интеграция с фронтендом не подключены.',
        },
      ],
    },
    {
      id: 'current-architecture',
      title: { en: 'Current Architecture', ru: 'Текущая архитектура' },
      paragraphs: [
        {
          en: 'Browser → frontend typed transport (native fetch through module API facades) → MSW interception for the mock demo. TanStack Query owns server state; Pinia stores are deliberately narrow (session, runtime, theme).',
          ru: 'Браузер → типизированный транспорт фронтенда (native fetch через API-фасады модулей) → перехват MSW для mock-демо. Серверное состояние принадлежит TanStack Query; Pinia-сторы намеренно узкие (сессия, рантайм, тема).',
        },
        {
          en: 'In parallel, the Go order service runs locally: POST /orders and GET /orders/{id} validate input and delegate to a service layer. There is no live connection between the public demo and the Go service — the demo is mocked by design until the auth and contract work lands.',
          ru: 'Параллельно локально работает Go-сервис заказов: POST /orders и GET /orders/{id} валидируют вход и делегируют слою сервиса. Живой связи между публичным демо и Go-сервисом нет — демо намеренно замокано, пока не готовы auth и контракты.',
        },
      ],
      claims: [
        {
          id: 'arch-current-msw',
          category: 'current',
          text: {
            en: 'Demo flows run on deterministic MSW scenarios; unhandled requests to configured service origins fail closed with 501 MOCK_UNHANDLED_REQUEST.',
            ru: 'Демо-потоки работают на детерминированных MSW-сценариях; необработанные запросы к настроенным origins сервисов fail closed с 501 MOCK_UNHANDLED_REQUEST.',
          },
          evidenceIds: [],
        },
        {
          id: 'arch-current-order-local',
          category: 'current',
          text: {
            en: 'The Go order service is a separate local implementation: HTTP validation → service call, no persistence, no tests yet.',
            ru: 'Go-сервис заказов — отдельная локальная реализация: HTTP-валидация → вызов сервиса, без персистентности и без тестов.',
          },
          evidenceIds: [],
        },
        {
          id: 'arch-current-domain-separate',
          category: 'current',
          text: {
            en: 'Order domain models and transition methods exist but are not integrated with the HTTP flow.',
            ru: 'Доменные модели заказов и методы переходов существуют, но не интегрированы с HTTP-потоком.',
          },
          evidenceIds: [],
        },
      ],
    },
    {
      id: 'target-architecture',
      title: { en: 'Target Architecture', ru: 'Целевая архитектура' },
      paragraphs: [
        {
          en: 'The target is four independently owned services behind /api/v1 with explicit data ownership and an event contract between Order and Notification. All infrastructure in the target diagram — PostgreSQL, Redis, Kafka — is planned, not deployed.',
          ru: 'Цель — четыре независимо владеемых сервиса за /api/v1 с явным владением данными и событийным контрактом между Order и Notification. Вся инфраструктура на целевой диаграмме — PostgreSQL, Redis, Kafka — планируемая, а не развёрнутая.',
        },
      ],
      claims: [
        {
          id: 'arch-target-auth',
          category: 'target',
          text: {
            en: 'Auth owns users, credentials and sessions. Other services never read credential tables.',
            ru: 'Auth владеет пользователями, учётными данными и сессиями. Остальные сервисы никогда не читают таблицы учётных данных.',
          },
          evidenceIds: [],
        },
        {
          id: 'arch-target-order',
          category: 'target',
          text: {
            en: 'Order owns orders, payment-related state, history and outbox records.',
            ru: 'Order владеет заказами, платёжным состоянием, историей и записями outbox.',
          },
          evidenceIds: [],
        },
        {
          id: 'arch-target-notification',
          category: 'target',
          text: {
            en: 'Notification owns inbox records, delivery jobs and delivery attempts.',
            ru: 'Notification владеет записями inbox, задачами доставки и попытками доставки.',
          },
          evidenceIds: [],
        },
        {
          id: 'arch-target-shortener',
          category: 'target',
          text: {
            en: 'Shortener owns links and bounded analytics.',
            ru: 'Shortener владеет ссылками и ограниченной аналитикой.',
          },
          evidenceIds: [],
        },
        {
          id: 'arch-target-no-cross-tables',
          category: 'target',
          text: {
            en: 'Services do not query each other’s private tables; shared deployment infrastructure does not imply shared business-data ownership.',
            ru: 'Сервисы не запрашивают приватные таблицы друг друга; общая инфраструктура развёртывания не означает общего владения бизнес-данными.',
          },
          evidenceIds: [],
        },
        {
          id: 'arch-target-events',
          category: 'target',
          text: {
            en: 'Order events feed Notification through a defined event contract via a transactional outbox.',
            ru: 'События заказов поступают в Notification через определённый событийный контракт посредством transactional outbox.',
          },
          evidenceIds: [],
        },
      ],
    },
    {
      id: 'service-boundaries',
      title: { en: 'Service Boundaries', ru: 'Границы сервисов' },
      paragraphs: [
        {
          en: 'Each service exposes its own /api/v1 namespace and owns its storage. The frontend treats them as independent modules behind one shared transport and error model. Cross-service claims (for example order-role vs auth-role mapping) are explicit integration contracts, not implicit database joins.',
          ru: 'Каждый сервис открывает свой namespace /api/v1 и владеет своим хранилищем. Фронтенд считает их независимыми модулями за одним общим транспортом и моделью ошибок. Межсервисные допущения (например, соответствие ролей Order и Auth) — явные интеграционные контракты, а не неявные JOIN между базами.',
        },
      ],
    },
    {
      id: 'data-ownership',
      title: { en: 'Data Ownership', ru: 'Владение данными' },
      paragraphs: [
        {
          en: 'Order: orders, lifecycle history, payment state transitions, outbox records. Auth: users, credentials, sessions and refresh families. Notification: inbox, delivery jobs, attempts. Shortener: links and bounded analytics. Nothing else reads these tables directly; integrations go through APIs or the event contract.',
          ru: 'Order: заказы, история жизненного цикла, переходы платёжного состояния, записи outbox. Auth: пользователи, учётные данные, сессии и семейства refresh. Notification: inbox, задачи доставки, попытки. Shortener: ссылки и ограниченная аналитика. Ничто другое не читает эти таблицы напрямую; интеграции — через API или событийный контракт.',
        },
      ],
    },
    {
      id: 'mock-vs-live',
      title: { en: 'Mock vs Live Runtime', ru: 'Mock против live-рантайма' },
      paragraphs: [
        {
          en: 'Mock mode is the default: MSW intercepts the same network path the real transport uses, with deterministic scenarios and reset. Real mode never loads the mock handler graph. The demoMode field in each case study (mock/mixed/live) is portfolio evidence about the visible demo flow — it does not claim backend deployment.',
          ru: 'Режим по умолчанию — mock: MSW перехватывает тот же сетевой путь, что и реальный транспорт, с детерминированными сценариями и сбросом. Real-режим никогда не загружает граф моков. Поле demoMode в каждом кейсе (mock/mixed/live) — свидетельство о видимом демо-потоке, а не утверждение о развёрнутом бэкенде.',
        },
      ],
    },
    {
      id: 'principles',
      title: { en: 'Architectural Principles', ru: 'Архитектурные принципы' },
      paragraphs: [
        {
          en: 'Boundaries over shortcuts: transport parsing never reaches business logic; services never reach into each other’s storage. Honesty over marketing: current ≠ target ≠ measured, and planned infrastructure is always labelled. Failure modes are designed, not discovered: idempotency, concurrency and at-least-once semantics are first-class content.',
          ru: 'Границы вместо быстрых решений: транспортный разбор не попадает в бизнес-логику; сервисы не лезут в хранилища друг друга. Честность вместо маркетинга: current ≠ target ≠ measured, планируемая инфраструктура всегда помечена. Сценарии отказа проектируются, а не обнаруживаются: идемпотентность, конкурентность и семантика at-least-once — полноценный контент.',
        },
      ],
    },
    {
      id: 'roadmap-relationship',
      title: { en: 'Roadmap Relationship', ru: 'Связь с роадмапом' },
      paragraphs: [
        {
          en: 'The architecture above is the destination of the milestone sequence: Order → persistence → lifecycle/concurrency → Auth → live frontend → events → Notification → Shortener → observability. Each case study’s Next Milestone section names the immediate step and its acceptance evidence.',
          ru: 'Приведённая архитектура — пункт назначения последовательности вех: Order → персистентность → жизненный цикл/конкурентность → Auth → живой фронтенд → события → Notification → Shortener → наблюдаемость. Секция Next Milestone каждого кейса называет ближайший шаг и его критерии приёмки.',
        },
      ],
    },
  ],
  diagrams: [
    {
      id: 'arch-diagram-current',
      caption: {
        en: 'Current topology: mocked demo SPA and a local Go order service, not connected.',
        ru: 'Текущая топология: замоканное демо-SPA и локальный Go-сервис заказов, не связанные.',
      },
      category: 'current',
      nodes: [
        {
          id: 'browser',
          label: { en: 'Browser', ru: 'Браузер' },
          description: { en: 'Portfolio + demo SPA', ru: 'Портфолио + демо-SPA' },
          kind: 'browser',
        },
        {
          id: 'spa',
          label: { en: 'Vue SPA (demo)', ru: 'Vue SPA (демо)' },
          description: {
            en: 'Typed transport → MSW mock APIs',
            ru: 'Типизированный транспорт → мок-API MSW',
          },
          kind: 'frontend',
        },
        {
          id: 'order-go',
          label: { en: 'Go order service (local)', ru: 'Go-сервис заказов (локально)' },
          description: {
            en: 'POST/GET /orders, validation → service layer',
            ru: 'POST/GET /orders, валидация → слой сервиса',
          },
          kind: 'service',
        },
      ],
      connections: [
        { from: 'browser', to: 'spa', label: { en: 'static assets', ru: 'статика' } },
        { from: 'spa', to: 'order-go', label: { en: 'no live connection', ru: 'живой связи нет' }, planned: true },
      ],
    },
    {
      id: 'arch-diagram-target',
      caption: {
        en: 'Target topology: four services, owned data, event contract. All infrastructure planned.',
        ru: 'Целевая топология: четыре сервиса, раздельное владение данными, событийный контракт. Вся инфраструктура планируемая.',
      },
      category: 'target',
      nodes: [
        {
          id: 'browser',
          label: { en: 'Browser', ru: 'Браузер' },
          description: { en: 'Portfolio + demo', ru: 'Портфолио + демо' },
          kind: 'browser',
        },
        {
          id: 'apiv1',
          label: { en: '/api/v1 gateways', ru: 'Шлюзы /api/v1' },
          description: { en: 'One namespace per service', ru: 'Один namespace на сервис' },
          kind: 'frontend',
          planned: true,
        },
        {
          id: 'auth',
          label: { en: 'Auth', ru: 'Auth' },
          description: {
            en: 'Users, credentials, sessions',
            ru: 'Пользователи, учётные данные, сессии',
          },
          kind: 'service',
          planned: true,
        },
        {
          id: 'order',
          label: { en: 'Order', ru: 'Order' },
          description: {
            en: 'Orders, payment state, outbox',
            ru: 'Заказы, платёжное состояние, outbox',
          },
          kind: 'service',
          planned: true,
        },
        {
          id: 'notification',
          label: { en: 'Notification', ru: 'Notification' },
          description: {
            en: 'Inbox, delivery jobs, attempts',
            ru: 'Inbox, задачи доставки, попытки',
          },
          kind: 'service',
          planned: true,
        },
        {
          id: 'shortener',
          label: { en: 'Shortener', ru: 'Shortener' },
          description: { en: 'Links, bounded analytics', ru: 'Ссылки, ограниченная аналитика' },
          kind: 'service',
          planned: true,
        },
        {
          id: 'pg',
          label: { en: 'PostgreSQL', ru: 'PostgreSQL' },
          description: { en: 'Per-service schemas', ru: 'Схемы per-service' },
          kind: 'data',
          planned: true,
        },
        {
          id: 'redis',
          label: { en: 'Redis', ru: 'Redis' },
          description: { en: 'Sessions/cache (planned)', ru: 'Сессии/кэш (план)' },
          kind: 'data',
          planned: true,
        },
        {
          id: 'kafka',
          label: { en: 'Kafka', ru: 'Kafka' },
          description: { en: 'Event transport (planned)', ru: 'Транспорт событий (план)' },
          kind: 'infrastructure',
          planned: true,
        },
      ],
      connections: [
        { from: 'browser', to: 'apiv1', label: { en: 'HTTPS JSON', ru: 'HTTPS JSON' } },
        { from: 'apiv1', to: 'auth', label: { en: 'auth API', ru: 'auth API' }, planned: true },
        { from: 'apiv1', to: 'order', label: { en: 'order API', ru: 'order API' }, planned: true },
        { from: 'apiv1', to: 'notification', label: { en: 'notification API', ru: 'notification API' }, planned: true },
        { from: 'apiv1', to: 'shortener', label: { en: 'shortener API', ru: 'shortener API' }, planned: true },
        { from: 'order', to: 'kafka', label: { en: 'order events (outbox)', ru: 'события заказов (outbox)' }, planned: true },
        { from: 'kafka', to: 'notification', label: { en: 'event consumption', ru: 'потребление событий' }, planned: true },
        { from: 'order', to: 'pg', label: { en: 'own schema', ru: 'своя схема' }, planned: true },
        { from: 'auth', to: 'pg', label: { en: 'own schema', ru: 'своя схема' }, planned: true },
        { from: 'auth', to: 'redis', label: {
          en: 'session/rate-limit state',
          ru: 'состояние сессий/rate limiting',
        }, planned: true },
      ],
      groups: [
        { id: 'g-order', label: { en: 'Order boundary', ru: 'Граница Order' }, nodeIds: ['order'] },
        { id: 'g-auth', label: { en: 'Auth boundary', ru: 'Граница Auth' }, nodeIds: ['auth'] },
        { id: 'g-notification', label: {
          en: 'Notification boundary',
          ru: 'Граница Notification',
        }, nodeIds: ['notification'] },
        { id: 'g-shortener', label: {
          en: 'Shortener boundary',
          ru: 'Граница Shortener',
        }, nodeIds: ['shortener'] },
      ],
    },
  ],
  unresolvedContracts: [
    {
      id: 'contract-cookies',
      title: { en: 'Cookie/CORS/CSRF behavior', ru: 'Поведение Cookie/CORS/CSRF' },
      description: {
        en: 'Refresh cookie attributes, CORS origins and CSRF protection are not yet agreed with the backend.',
        ru: 'Атрибуты refresh-cookie, CORS-origins и защита CSRF ещё не согласованы с бэкендом.',
      },
      openQuestions: [
        { en: 'SameSite/Domain policy for the refresh cookie', ru: 'Политика SameSite/Domain для refresh-cookie' },
        { en: 'CSRF token transport', ru: 'Способ передачи CSRF-токена' },
        { en: 'Allowed origins per environment', ru: 'Разрешённые origins по окружениям' },
      ],
    },
    {
      id: 'contract-error-health',
      title: { en: 'Error envelopes and health contracts', ru: 'Конверты ошибок и health-контракты' },
      description: {
        en: 'Shared error envelope and health endpoints are standardized per service but not yet contractually frozen.',
        ru: 'Общий конверт ошибок и health-эндпоинты стандартизированы на уровне сервисов, но контрактно не зафиксированы.',
      },
      openQuestions: [
        { en: 'Error code namespace', ru: 'Namespace кодов ошибок' },
        { en: 'health/live vs health/ready semantics', ru: 'Семантика health/live и health/ready' },
        { en: 'Rate-limit response shape', ru: 'Форма ответа rate limiting' },
      ],
    },
    {
      id: 'contract-roles',
      title: { en: 'Auth roles versus Order roles', ru: 'Роли Auth против ролей Order' },
      description: {
        en: 'How Auth RBAC roles map to order-actions roles (buyer/manager/admin) is undecided.',
        ru: 'Соответствие RBAC-ролей Auth ролям действий с заказами (buyer/manager/admin) не определено.',
      },
      openQuestions: [
        { en: 'Role claim format in access tokens', ru: 'Формат role-claim в access-токенах' },
        { en: 'Demo role switching vs real roles', ru: 'Смена ролей в демо против реальных ролей' },
      ],
    },
    {
      id: 'contract-order-dto',
      title: {
        en: 'Order DTO/list/history/fulfillment/cancel/refund contracts',
        ru: 'Контракты Order: DTO/список/история/отгрузка/отмена/возврат',
      },
      description: {
        en: 'List pagination, history representation and lifecycle endpoints beyond create/get are TBD.',
        ru: 'Пагинация списка, представление истории и эндпоинты жизненного цикла помимо create/get — TBD.',
      },
      openQuestions: [
        { en: 'DTO fields for list vs detail', ru: 'Поля DTO для списка и детали' },
        { en: 'Cancel/refund request/response shapes', ru: 'Формы запросов/ответов cancel/refund' },
        { en: 'Idempotency header name', ru: 'Имя заголовка идемпотентности' },
      ],
    },
    {
      id: 'contract-auth-dto',
      title: {
        en: 'Auth cookie/body/session DTO behavior',
        ru: 'Поведение Auth: cookie/тела/DTO сессий',
      },
      description: {
        en: 'Exact login/register/refresh request and response bodies, and session listing shape, are TBD.',
        ru: 'Точные тела запросов/ответов login/register/refresh и форма списка сессий — TBD.',
      },
      openQuestions: [
        { en: 'Refresh request body vs cookie-only', ru: 'Тело refresh-запроса против cookie-only' },
        { en: 'Session DTO fields', ru: 'Поля DTO сессии' },
        { en: 'Logout-all semantics', ru: 'Семантика logout-all' },
      ],
    },
    {
      id: 'contract-notification-dto',
      title: {
        en: 'Notification jobs/attempts/filter/manual retry contracts',
        ru: 'Контракты Notification: задачи/попытки/фильтры/ручной ретрай',
      },
      description: {
        en: 'Job listing filters, attempt representation and manual retry semantics are TBD.',
        ru: 'Фильтры списка задач, представление попыток и семантика ручного ретрая — TBD.',
      },
      openQuestions: [
        { en: 'Filter parameter names', ru: 'Имена параметров фильтров' },
        { en: 'Manual retry authorization', ru: 'Авторизация ручного ретрая' },
        { en: 'Dead-job requeue policy', ru: 'Политика повторной постановки dead-задач' },
      ],
    },
    {
      id: 'contract-shortener-dto',
      title: {
        en: 'Shortener ownership/status/analytics/404-versus-410 behavior',
        ru: 'Shortener: владение/статусы/аналитика/404 против 410',
      },
      description: {
        en: 'Link ownership rules, status codes for expired vs disabled, and analytics shapes are TBD.',
        ru: 'Правила владения ссылками, коды статусов для истёкших и отключённых, форма аналитики — TBD.',
      },
      openQuestions: [
        { en: 'Ownership model', ru: 'Модель владения' },
        { en: '404 vs 410 mapping', ru: 'Соответствие 404 и 410' },
        { en: 'Analytics granularity', ru: 'Гранулярность аналитики' },
      ],
    },
  ],
}
