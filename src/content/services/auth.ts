import type { ServiceCase } from '../types'

/**
 * Auth service case study. Backend implementation is absent; the useful
 * content is the proposed boundary, flows, decisions, failure cases and the
 * real specification link. No source/OpenAPI/observability URLs exist yet.
 * Copy carries both locales.
 */
export const authServiceCase: ServiceCase = {
  id: 'auth',
  slug: 'auth',
  name: 'Auth Service',
  nameLocalized: { en: 'Auth Service', ru: 'Auth-сервис' },
  shortLabel: { en: 'Auth', ru: 'Аутентификация' },
  summary: {
    en: 'A credentials-and-sessions service for the demo environment: Argon2id credential storage, short-lived access tokens, opaque rotating refresh credentials and reuse detection.',
    ru: 'Сервис учётных данных и сессий для демо-окружения: хранение секретов Argon2id, короткоживущие access-токены, непрозрачные ротируемые refresh-токены и обнаружение повторного использования.',
  },
  declaredScope: {
    en: 'A backend engineering case study of credential storage, session lifecycle, RBAC and rate limiting for the zolotoy.dev demo environment.',
    ru: 'Бэкенд-кейс о хранении учётных данных, жизненном цикле сессий, RBAC и rate limiting для демо-окружения zolotoy.dev.',
  },
  notScope: [
    { en: 'Not enterprise IAM.', ru: 'Не корпоративный IAM.' },
    { en: 'Not social login or federated identity.', ru: 'Не социальный вход и не федеративная идентификация.' },
    { en: 'Not a general OAuth authorization server.', ru: 'Не универсальный OAuth-сервер авторизации.' },
  ],
  implementationStatus: 'planned',
  currentMilestone: null,
  nextMilestone: 'auth-live-frontend',
  demoMode: 'mock',
  runtime: 'not-deployed',
  runtimeLabel: { en: 'No deployed runtime — specification stage', ru: 'Нет развёрнутого рантайма — стадия спецификации' },
  engineeringFocus: {
    en: 'Session lifecycle, rotation and replay detection, RBAC, rate limiting.',
    ru: 'Жизненный цикл сессий, ротация и обнаружение повторного использования, RBAC, rate limiting.',
  },
  currentImplementation: [
    {
      id: 'auth-current-absent',
      category: 'current',
      text: {
        en: 'No backend implementation exists yet: the service is at the specification stage and is represented in the demo by deterministic MSW scenarios only.',
        ru: 'Бэкенд-реализации пока нет: сервис на стадии спецификации и в демо представлен только детерминированными MSW-сценариями.',
      },
      evidenceIds: ['auth-spec'],
    },
  ],
  targetArchitecture: [
    {
      id: 'auth-target-credentials',
      category: 'target',
      text: {
        en: 'Argon2id credential storage with per-user salts and tuned cost parameters; login responses are time-constant with respect to credential enumeration.',
        ru: 'Хранение секретов Argon2id с солью на пользователя и подобранными параметрами стоимости; ответы логина устойчивы по времени к перебору учётных данных.',
      },
      evidenceIds: ['auth-spec'],
    },
    {
      id: 'auth-target-tokens',
      category: 'target',
      text: {
        en: 'Short-lived access tokens in memory on the client; opaque rotating refresh credentials delivered as HttpOnly, Secure, SameSite cookies — never persisted browser storage.',
        ru: 'Короткоживущие access-токены в памяти клиента; непрозрачные ротируемые refresh-токены в HttpOnly, Secure, SameSite cookie — никогда не в постоянном хранилище браузера.',
      },
      evidenceIds: ['auth-spec'],
    },
    {
      id: 'auth-target-rotation',
      category: 'target',
      text: {
        en: 'Refresh rotation with session-family revocation and reuse detection: presenting an already-rotated refresh credential revokes the whole family.',
        ru: 'Ротация refresh с отзывом семейства сессий и обнаружением повторного использования: предъявление уже ротированного refresh-токена отзывает всё семейство.',
      },
      evidenceIds: ['auth-spec'],
    },
    {
      id: 'auth-target-rbac',
      category: 'target',
      text: {
        en: 'user/admin roles enforced server-side, plus rate limiting on credential endpoints and bounded login/register responses.',
        ru: 'Роли user/admin, проверяемые на сервере, плюс rate limiting на эндпоинтах аутентификации и ограниченные ответы login/register.',
      },
      evidenceIds: ['auth-spec'],
    },
  ],
  decisions: [
    {
      id: 'auth-dec-opaque-refresh',
      title: {
        en: 'Opaque refresh credentials over JWT refresh tokens',
        ru: 'Непрозрачные refresh-токены вместо JWT refresh',
      },
      text: {
        en: 'Target design: refresh credentials are opaque server-side records, so revocation is a database write rather than a waiting game with token expiry. Access tokens stay short-lived to bound the revocation gap.',
        ru: 'Целевой дизайн: refresh-токены — непрозрачные серверные записи, поэтому отзыв — это запись в БД, а не ожидание истечения. Access-токены короткоживущие, чтобы ограничить окно отзыва.',
      },
      claimIds: ['auth-target-tokens'],
    },
    {
      id: 'auth-dec-reuse-family',
      title: {
        en: 'Reuse detection revokes the session family',
        ru: 'Обнаружение повторного использования отзывает семейство сессий',
      },
      text: {
        en: 'Target design: a replayed refresh credential is treated as theft evidence. The whole session family is revoked, forcing re-authentication on every device in that family.',
        ru: 'Целевой дизайн: повторно предъявленный refresh-токен трактуется как признак кражи. Отзывается всё семейство сессий, принуждая к повторному входу на каждом устройстве семейства.',
      },
      claimIds: ['auth-target-rotation'],
    },
    {
      id: 'auth-dec-enumeration',
      title: {
        en: 'Credential enumeration resistance is a response-shape contract',
        ru: 'Устойчивость к перебору учётных данных — контракт на форму ответа',
      },
      text: {
        en: 'Target design: identical error text, comparable timing and identical status codes for unknown user and wrong password on login and password reset flows.',
        ru: 'Целевой дизайн: одинаковый текст ответа, сопоставимое время и одинаковые коды статуса для «нет такого пользователя» и «неверный пароль» в login и сбросе пароля.',
      },
      claimIds: ['auth-target-credentials'],
    },
  ],
  failureModes: [
    {
      id: 'auth-fm-concurrent-refresh',
      topic: { en: 'Concurrent refresh requests', ru: 'Конкурентные refresh-запросы' },
      text: {
        en: 'Multiple in-flight refreshes with one credential: exactly one rotation wins; the rest must reuse the coordinator result instead of rotating again and tripping reuse detection.',
        ru: 'Несколько параллельных refresh с одним токеном: ротацию выигрывает ровно один; остальные должны переиспользовать результат координатора, а не ротировать снова и срабатывать на reuse detection.',
      },
    },
    {
      id: 'auth-fm-reuse-detection',
      topic: { en: 'Reused refresh token', ru: 'Повторно использованный refresh-токен' },
      text: {
        en: 'Rotate-on-use means a replayed credential signals theft: revoke the session family, refuse the refresh, and return a distinguishable error so the client can force re-login.',
        ru: 'Ротация при каждом использовании означает, что повтор токена — сигнал кражи: отозвать семейство сессий, отказать в refresh и вернуть отличимую ошибку, чтобы клиент форсировал повторный вход.',
      },
    },
    {
      id: 'auth-fm-enumeration',
      topic: { en: 'Credential enumeration', ru: 'Перебор учётных данных' },
      text: {
        en: 'Login/register/reset responses must not reveal whether an account exists — same message, same status, similar time profile including hash cost for unknown users.',
        ru: 'Ответы login/register/reset не должны раскрывать существование аккаунта — одинаковый текст, статус и близкий профиль времени, включая стоимость хэша для несуществующих пользователей.',
      },
    },
    {
      id: 'auth-fm-redis-outage',
      topic: { en: 'Redis outage policy', ru: 'Политика при недоступности Redis' },
      text: {
        en: 'Planned: session lookup must degrade safely (deny or read-through from primary storage) rather than fail open; rate limiting must not silently disappear when Redis is down.',
        ru: 'План: поиск сессии должен безопасно деградировать (отказ или чтение из основного хранилища), а не работать в открытом режиме; rate limiting не должен тихо исчезать при недоступности Redis.',
      },
    },
    {
      id: 'auth-fm-jwt-revocation',
      topic: {
        en: 'Limits of already-issued JWT revocation',
        ru: 'Ограничения отзыва уже выпущенных JWT',
      },
      text: {
        en: 'Access tokens cannot be recalled before expiry; revocation only affects refresh. Short access TTL plus server-side session checks for sensitive operations bound the exposure.',
        ru: 'Access-токены нельзя отозвать до истечения; отзыв действует только на refresh. Короткий TTL access и серверные проверки сессии для чувствительных операций ограничивают экспозицию.',
      },
    },
  ],
  diagrams: [
    {
      id: 'auth-diagram-target',
      caption: {
        en: 'Target auth flow: cookie rotation with reuse detection.',
        ru: 'Целевой поток аутентификации: ротация cookie с обнаружением повторного использования.',
      },
      category: 'target',
      nodes: [
        {
          id: 'browser',
          label: { en: 'Browser demo', ru: 'Демо в браузере' },
          description: { en: 'Memory-only access token', ru: 'Access-токен только в памяти' },
          kind: 'browser',
        },
        {
          id: 'auth',
          label: { en: 'Auth service', ru: 'Auth-сервис' },
          description: {
            en: 'Login, refresh rotation, sessions, RBAC',
            ru: 'Вход, ротация refresh, сессии, RBAC',
          },
          kind: 'service',
          planned: true,
        },
        {
          id: 'store',
          label: { en: 'Session store', ru: 'Хранилище сессий' },
          description: { en: 'Opaque refresh records, families', ru: 'Непрозрачные refresh-записи, семейства' },
          kind: 'data',
          planned: true,
        },
        {
          id: 'order',
          label: { en: 'Order service', ru: 'Order-сервис' },
          description: {
            en: 'Validates access tokens; owns no credentials',
            ru: 'Проверяет access-токены; не хранит учётные данные',
          },
          kind: 'service',
          planned: true,
        },
      ],
      connections: [
        {
          from: 'browser',
          to: 'auth',
          label: { en: 'refresh cookie (HttpOnly, Secure)', ru: 'refresh-cookie (HttpOnly, Secure)' },
          planned: true,
        },
        {
          from: 'auth',
          to: 'store',
          label: { en: 'rotate + family revocation', ru: 'ротация + отзыв семейства' },
          planned: true,
        },
        {
          from: 'browser',
          to: 'order',
          label: { en: 'Bearer access token', ru: 'Bearer access-токен' },
          planned: true,
        },
        {
          from: 'order',
          to: 'auth',
          label: {
            en: 'token introspection / shared JWKS — contract TBD',
            ru: 'introspection токена / общий JWKS — контракт TBD',
          },
          planned: true,
        },
      ],
    },
  ],
  evidence: [
    {
      id: 'auth-spec',
      kind: 'specification',
      repository: 'zolotoy-dev-frontend (this repository)',
      path: 'docs/backend-specs/02_auth_service.md',
      label: {
        en: 'Auth service specification (target contract)',
        ru: 'Спецификация Auth-сервиса (целевой контракт)',
      },
      reviewedOn: '2026-09-17',
    },
  ],
  specUrl: 'https://github.com/Officialsayp/zolotoy-dev-frontend/blob/main/docs/backend-specs/02_auth_service.md',
  demoUrl: 'https://zolotoy.dev/demo/auth/',
}
