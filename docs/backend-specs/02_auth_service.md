# Auth Service — портфолио-проект для Go Backend / Ozon Tech

> **Назначение файла:** самостоятельное техническое задание и source of truth для отдельного диалога по Auth Service. Цель — показать security engineering, работу с сессиями, JWT, Redis, PostgreSQL, rate limiting и аккуратный API, а не написать собственный аналог Keycloak.

## 1. Зачем нужен этот проект

Auth Service должен закрыть тот пласт backend-навыков, который Order Service показывает слабее: authentication/authorization, криптографически безопасные токены, password hashing, session lifecycle, revocation, replay detection, rate limiting и security-oriented testing.

Главная ценность проекта — не «я умею выпустить JWT», а понимание того, почему stateless access token все равно требует stateful решений вокруг refresh token, logout и компрометации сессии.

### Что проект должен доказать

- безопасное хранение паролей;
- грамотная модель access/refresh tokens;
- refresh token rotation и reuse detection;
- logout/revocation;
- RBAC;
- Redis rate limiter;
- PostgreSQL schema и транзакции;
- audit trail;
- threat modeling;
- security headers/cookies;
- тестирование негативных сценариев;
- observability без утечки секретов.

---

## 2. Позиционирование

**Repository:** `auth-service`

**Canonical service name:** `auth-service`

**GitHub description:**

> Authentication service in Go with Argon2id password hashing, short-lived JWT access tokens, rotating refresh-token sessions, replay detection, RBAC, Redis rate limiting, PostgreSQL and security-focused tests.

### Scope

Реализуется first-party authentication для собственных приложений.

Не реализуются:

- полноценный OAuth 2.0 Authorization Server;
- social login;
- SAML;
- passkeys/WebAuthn на MVP;
- сложная IAM-панель предприятия;
- recovery через десятки каналов.

OAuth/OIDC standards используются как источник security practices, но проект остается компактным.

---

## 3. Stack

### Backend

- Go 1.27.x+;
- `net/http` + `chi`;
- PostgreSQL;
- `pgx/v5`;
- Redis;
- Argon2id (`golang.org/x/crypto/argon2`);
- JWT library с явной проверкой algorithm/issuer/audience;
- Ed25519 или RSA signing keys; предпочтительно Ed25519 для компактности ключей и простоты;
- OpenAPI;

> В предоставленной внутренней Go-конвенции Ozon упоминается платформенный RPC-фреймворк `scratch`. Он не является целью портфолио-проекта: здесь намеренно используются публичные `net/http`/`chi`, чтобы репозиторий был воспроизводим вне корпоративной инфраструктуры.
- `log/slog`;
- Prometheus/OpenTelemetry.

### Frontend — минимально

Vue 3 + TypeScript:

- register/login;
- profile;
- список активных сессий/устройств;
- revoke one session;
- logout all;
- пример страницы, доступной только `admin`.

### Infrastructure — минимально

Docker Compose:

- auth-service;
- PostgreSQL;
- Redis;
- Prometheus/Grafana — interview-ready.

---

## 4. Threat model

Перед кодом создать `docs/threat-model.md`.

Минимальные угрозы:

1. утечка базы пользователей;
2. credential stuffing/brute force;
3. украденный access token;
4. украденный refresh token;
5. replay старого refresh token;
6. token fixation/session hijacking;
7. XSS и кража токена в браузере;
8. CSRF, если refresh token хранится в cookie;
9. privilege escalation через подделку role claim;
10. enumeration пользователей по login endpoint;
11. утечка токенов в logs/traces;
12. слабая/небезопасная генерация случайных значений;
13. stale signing key / key rotation;
14. rate-limit bypass при горизонтальном масштабировании.

Для каждой угрозы описать mitigation и остаточный риск.

---

## 5. Модель пользователя

### `User`

```text
ID
Email
Status
Roles[]
CreatedAt
UpdatedAt
```

Status:

```text
active
blocked
```

Email case normalization должна быть определена единообразно. Не разбрасывать `strings.ToLower` по handlers — сделать одно место normalization policy.

### Credentials

Пароль — отдельное понятие от User profile.

```text
UserID
PasswordHash
PasswordChangedAt
```

Пароль никогда не логируется, не шифруется для последующего восстановления и не хранится в plaintext.

---

## 6. Password hashing

Основной алгоритм — **Argon2id**.

Хэш хранится в self-describing PHC-like string с параметрами:

```text
$argon2id$v=19$m=...,t=...,p=...$salt$hash
```

### Минимальный baseline

Следовать актуальной OWASP Password Storage Cheat Sheet. На момент исследования OWASP рекомендует Argon2id минимум примерно с 19 MiB memory, 2 iterations, parallelism 1 как один из допустимых базовых профилей.

Но параметры нельзя просто копировать навсегда. При старте приложения/benchmark нужно подобрать work factor так, чтобы login был достаточно дорогим для атакующего и приемлемым для сервера.

### Обязательные свойства

- cryptographically secure random salt;
- constant-time compare результата;
- максимальная длина input для защиты от DoS, но без бессмысленно маленького лимита;
- возможность rehash после изменения параметров;
- пароль не должен «нормализоваться» так, чтобы уменьшать энтропию.

### Что нельзя

- SHA-256/MD5 как password hash;
- свой «salt algorithm»;
- reversible encryption пароля;
- логировать hash/salt;
- silent truncation.

---

## 7. Token model

### Access token

JWT, short-lived.

Рекомендуемый TTL для проекта: **10–15 минут**.

Минимальные claims:

```text
iss  issuer
aud  intended API/resource
sub  user ID
exp  expiration
iat  issued at
jti  token ID
roles/scopes — только действительно нужные права
```

Нужно явно проверять:

- подпись;
- разрешенный algorithm;
- issuer;
- audience;
- expiration;
- not-before, если используется;
- user/session status там, где политика этого требует.

JWT payload не является секретным. Не класть туда password hash, email без необходимости, персональные данные и внутренние security flags.

### Refresh token

**Opaque random token**, а не JWT.

Пример: 32–64 bytes из `crypto/rand`, переданные клиенту в base64url.

В БД хранить только **hash refresh token**, чтобы утечка DB не превращалась автоматически в набор готовых bearer credentials.

### Почему access JWT + opaque refresh

- access token можно проверять локально без похода в DB на каждый API request;
- refresh token остается stateful и управляемым;
- logout/revocation/rotation делаются на session state;
- компрометацию refresh token можно обнаруживать.

---

## 8. Session model и refresh token rotation

Каждый login создает session/grant.

```text
Session
- ID
- UserID
- FamilyID
- CurrentRefreshTokenHash
- UserAgentHash / DeviceLabel
- IPPrefix / LastIP (опционально, аккуратно с privacy)
- CreatedAt
- LastUsedAt
- ExpiresAt
- RevokedAt
- RevokeReason
```

### Refresh flow

```text
client sends refresh token T1
-> find session/token hash
-> validate active + expiry
-> rotate
   T1 becomes used/invalid
   issue T2
-> return new access token + T2
```

### Reuse detection

Если уже использованный T1 появляется снова:

- считать это возможным replay/compromise;
- revoke всю token family/session family;
- потребовать новый login;
- записать security audit event.

Это важнейший элемент проекта. RFC 9700 прямо описывает refresh token rotation как механизм обнаружения replay для public clients.

### Logout

- `logout current` — revoke текущую session;
- `logout all` — revoke все sessions пользователя;
- access token может оставаться валидным до короткого `exp`, если не вводить blacklist.

### Blacklist access token — не MVP

Не нужно делать Redis lookup на каждый access request только ради мгновенного logout. Короткий access TTL + stateful refresh session — нормальный trade-off.

Можно реализовать blacklist только как stretch и сравнить стоимость.

---

## 9. API

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
GET    /api/v1/me
GET    /api/v1/me/sessions
DELETE /api/v1/me/sessions/{session_id}
GET    /api/v1/admin/example
GET    /.well-known/jwks.json      # если выбран RSA/EdDSA public key distribution
GET    /health/live
GET    /health/ready
GET    /metrics
GET    /swagger.json
```

### Register

```json
{
  "email": "user@example.com",
  "password": "..."
}
```

Ответ не должен возвращать password-related data.

### Login

Не различать слишком подробно для внешнего клиента:

```text
"user not found"
"password wrong"
```

Лучше единый ответ `invalid credentials`, чтобы не облегчать enumeration.

### Token response

Для non-browser client допустим JSON:

```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "..."
}
```

Для browser demo предпочтительнее refresh token в `HttpOnly; Secure; SameSite` cookie, а access token — в памяти приложения. Конкретный вариант должен быть описан в ADR вместе с CSRF/XSS trade-offs.

---

## 10. RBAC

Роли:

```text
user
admin
```

На MVP этого достаточно.

Authorization middleware:

1. проверяет access token;
2. кладет `Principal` в context;
3. handler/application policy проверяет необходимую роль/permission.

Не разбрасывать `if role == "admin"` по business code. Сделать небольшую policy abstraction.

### Важный вопрос

Если role изменили в БД, старый access JWT может хранить старый role до `exp`.

Это сознательный trade-off stateless token. Варианты:

- короткий TTL;
- token version/security stamp;
- introspection/state lookup для чувствительных операций.

Для MVP выбрать короткий TTL и явно документировать.

---

## 11. PostgreSQL schema

### `users`

```text
id UUID PK
email TEXT NOT NULL
normalized_email TEXT NOT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

Unique index на `normalized_email`.

### `credentials`

```text
user_id UUID PK
password_hash TEXT NOT NULL
password_changed_at TIMESTAMPTZ NOT NULL
```

### `user_roles`

```text
user_id UUID NOT NULL
role TEXT NOT NULL
PRIMARY KEY(user_id, role)
```

### `sessions`

```text
id UUID PK
family_id UUID NOT NULL
user_id UUID NOT NULL
refresh_token_hash BYTEA NOT NULL
status TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
last_used_at TIMESTAMPTZ NOT NULL
expires_at TIMESTAMPTZ NOT NULL
revoked_at TIMESTAMPTZ NULL
revoke_reason TEXT NULL
```

Indexes:

- unique/current lookup by refresh token hash;
- `(user_id, status, created_at DESC)` for session list;
- partial index for active sessions if query plan benefits.

### `used_refresh_tokens` — два варианта

**A.** отдельная таблица hashes used tokens с TTL cleanup;

**B.** token lineage fields in sessions/tokens table.

Для проекта рекомендуется отдельная `refresh_tokens` table, если хочется максимально наглядно показать rotation/reuse detection:

```text
id
session_id
token_hash
status: active/used/revoked
parent_token_id
created_at
used_at
expires_at
```

### `audit_events`

```text
id
user_id nullable
session_id nullable
event_type
metadata JSONB
created_at
```

Не хранить plaintext токены в audit metadata.

---

## 12. Redis

Redis здесь должен быть функционально оправдан.

### 12.1 Rate limiting

Ограничения отдельно для:

- login by IP;
- login by account/email hash;
- register by IP;
- refresh by session/IP;
- password reset, если появится stretch.

Начать с fixed window/token bucket. Для distributed instance Redis дает единый счетчик.

Важно: операции счетчика и TTL должны быть атомарными. Использовать подход, не оставляющий вечные counters при сбое между `INCR` и `EXPIRE`.

### 12.2 Short-lived cache — опционально

Можно кешировать публичные signing metadata или user status для отдельных read paths, но не добавлять кеш без измеримой причины.

### 12.3 Что делать при недоступности Redis

Нужно принять explicit policy:

- fail closed для high-risk login? Это может сделать outage Redis outage всего auth;
- local fallback limiter? Тогда rate limit слабее;
- fail open с повышенной security metric/alert? Доступность выше, защита ниже.

Для pet-project разумно: login продолжает работать с local conservative limiter, а сервис пишет metric/alert `distributed_rate_limiter_unavailable`. Решение документировать как trade-off.

---

## 13. Transaction boundaries

Register:

```text
BEGIN
  insert user
  insert credentials
  insert default role
COMMIT
```

Login:

- hash verification дорогая CPU operation выполняется **до** короткой write transaction;
- после успешной проверки создается session + first refresh token atomically.

Refresh:

Rotation должна быть атомарной:

```text
BEGIN
  lock/current token or conditional update
  ensure active
  mark old used
  insert new active token
  update session last_used_at
COMMIT
```

Два параллельных refresh с T1: один побеждает, второй видит уже used token и при строгой политике запускает reuse policy. Это безопасно, но способно разлогинить пользователя при легитимном двойном refresh (например, два browser tabs). В ADR нужно явно выбрать стратегию: **strict replay detection** для учебного core либо короткое grace/reuse window как более UX-friendly stretch.

Обязательный concurrency test должен проверять выбранную семантику, а не случайный результат гонки.

---

## 14. Signing keys

### MVP

- private key загружается из environment/file secret;
- public key публикуется в JWKS или конфигурируется resource services;
- key ID (`kid`) присутствует в header.

### Rotation

Stretch, но дизайн должен позволять:

- current signing key;
- previous public keys остаются доступными, пока не истекли tokens, подписанные ими;
- JWKS содержит несколько keys;
- новый `kid` используется для новых tokens.

Не хранить private key в repository.

---

## 15. Architecture code layout

```text
cmd/auth-service/main.go
internal/
  domain/
    user/
    session/
  application/
    auth/
    sessions/
    authorization/
    ports/
  infrastructure/
    postgres/
    redis/
    tokens/
    password/
    observability/
  transport/http/
  config/
api/openapi.yaml
migrations/
docs/
```

### Boundaries

- `PasswordHasher` — interface, чтобы unit tests не тратили Argon2 cost;
- `TokenIssuer/Verifier` — interface;
- `SessionRepository`;
- `RateLimiter`;
- `Clock` можно инъектировать для deterministic expiry tests.

Не создавать интерфейсы для простых pure functions.

---

## 16. Error model

Domain/application errors:

```text
ErrInvalidCredentials
ErrUserBlocked
ErrSessionExpired
ErrSessionRevoked
ErrRefreshTokenReused
ErrForbidden
ErrRateLimited
ErrEmailAlreadyExists
```

Внешний API не обязан раскрывать внутреннюю точную причину.

Например `ErrUserNotFound` и `ErrPasswordMismatch` могут оба маппиться в `AUTH_INVALID_CREDENTIALS`.

### Timing considerations

Для неизвестного пользователя желательно выполнить dummy password hash/verify, чтобы сильно не отличать timing от known-user wrong-password path. Не нужно обещать идеальную side-channel protection, но надо понимать проблему.

---

## 17. Security headers/cookies

Для browser demo:

- HTTPS в production;
- `Secure`;
- `HttpOnly` для refresh cookie;
- `SameSite=Lax` или `Strict` в зависимости от flow;
- ограниченный `Path` для refresh endpoint, если удобно;
- CORS allowlist, не `*` с credentials;
- CSRF mitigation, если cookie автоматически отправляется браузером;
- `Cache-Control: no-store` для token responses.

Не писать JWT в URL/query params.

---

## 18. Tests

### Password tests

- correct password;
- wrong password;
- malformed stored hash;
- rehash-needed detection;
- unicode password;
- max input length.

### Token tests

- valid;
- expired;
- wrong issuer;
- wrong audience;
- wrong algorithm;
- unknown `kid`;
- tampered signature;
- role claims.

### Session tests

- login creates session;
- refresh rotates T1 -> T2;
- T1 cannot be used again;
- T1 reuse revokes family;
- parallel refresh race;
- logout current;
- logout all;
- expired session.

### Rate limiter

- limit reached;
- expiration/window rollover;
- concurrent calls;
- Redis unavailable policy.

### Integration

- Postgres migrations;
- unique email;
- session transaction concurrency;
- Redis integration;
- HTTP auth middleware.

### Security regression tests

- token is not logged;
- user enumeration response contract;
- RBAC bypass attempt;
- oversized body/password.

Run:

```text
go test ./...
go test -race ./...
```

---

## 19. Observability

### Metrics

HTTP:

- request rate;
- error rate;
- latency histogram.

Auth-specific:

- login success/failure count;
- refresh success/failure;
- refresh reuse detected;
- sessions created/revoked;
- rate-limit rejected requests;
- Argon2 verify latency;
- Redis latency/errors;
- PostgreSQL latency/pool;
- token verification failures by safe reason category.

### Logs

Можно логировать:

```text
request_id
trace_id
user_id (если уже известен)
session_id
operation
result
safe_error_code
```

Никогда:

- password;
- access token;
- refresh token;
- Authorization header;
- raw cookie;
- private key.

### Alerts/demo SLO

- abnormal login failure rate;
- high rate-limit rejects;
- refresh reuse > 0;
- Redis/DB errors;
- p95 auth latency above target.

---

## 20. CI/CD

```text
format/imports
-> vet
-> golangci-lint
-> unit tests
-> race tests
-> integration tests (Postgres + Redis)
-> build
-> docker build
-> dependency/vulnerability scan
```

Дополнительно:

- secret scan;
- OpenAPI lint;
- gosec/staticcheck при аккуратной настройке.

---

## 21. Documentation / ADR

Минимум:

```text
docs/threat-model.md
docs/token-lifecycle.md
docs/session-state-machine.md
ADR-001 access-JWT + opaque-refresh
ADR-002 refresh-token rotation/reuse detection
ADR-003 refresh storage as hash
ADR-004 browser token storage strategy
ADR-005 Redis failure policy for rate limiter
ADR-006 signing key rotation model
```

README должен показывать sequence diagram login/refresh/replay.

---

## 22. Development phases

### Phase 0 — skeleton

- server/config;
- Postgres/Redis;
- migration framework;
- health/readiness;
- CI.

### Phase 1 — user/password

- register;
- Argon2id;
- login verification;
- user repository;
- tests.

### Phase 2 — access JWT

- issuer/verifier;
- middleware;
- `/me`;
- RBAC example.

### Phase 3 — refresh sessions

- opaque refresh token;
- session table;
- rotation;
- reuse detection;
- logout current/all;
- concurrency tests.

После Phase 3 проект уже функционально сильный.

### Phase 4 — rate limiting/security hardening

- Redis limiter;
- cookie strategy;
- CORS/CSRF;
- body/time limits;
- audit events.

### Phase 5 — production quality

- metrics/tracing;
- OpenAPI;
- frontend;
- threat model;
- security regression suite.

**Interview-ready**.

### Stretch

- key rotation/JWKS;
- password reset with one-time tokens;
- email verification;
- TOTP MFA;
- WebAuthn/passkeys;
- authorization scopes/permissions;
- token introspection endpoint.

Не брать stretch, пока core session security не закончена.

---

## 23. Definition of Done

- registration/login работают;
- password хранится только Argon2id hash;
- access JWT короткоживущий и валидируется по issuer/audience/alg/exp;
- refresh token opaque + random + hashed at rest;
- каждый refresh вращает token;
- replay старого refresh token обнаруживается;
- concurrent refresh покрыт тестом;
- logout one/all работает;
- RBAC работает;
- distributed rate limiter работает через Redis;
- сервис не логирует credentials/tokens;
- `go test -race` проходит;
- OpenAPI и README актуальны;
- Grafana показывает auth metrics;
- проект можно поднять одной командой.

---

## 24. Что не делать

- не писать криптографический алгоритм самостоятельно;
- не хранить refresh token plaintext;
- не делать access token на 30 дней;
- не класть refresh token в `localStorage` как основной browser design;
- не доверять role из request body;
- не использовать Redis как «единственную базу пользователей»;
- не добавлять Kafka без реального use case;
- не строить OAuth provider до завершения core;
- не обещать «полностью stateless auth» при наличии logout/refresh/security requirements.

---

## 25. Что нужно уметь защитить на интервью

1. Authentication vs authorization.
2. Session vs token.
3. JWT состоит из чего и что именно подписывается?
4. Подпись ≠ шифрование.
5. Почему нельзя доверять JWT payload без signature verification?
6. Зачем проверять `iss` и `aud`?
7. Почему нужен algorithm allowlist?
8. Access vs refresh token.
9. Почему access token short-lived?
10. Почему refresh token stateful?
11. Почему opaque refresh удобен?
12. Почему хранить hash refresh token лучше plaintext?
13. Что такое refresh rotation?
14. Как reuse detection обнаруживает replay?
15. Что произойдет при двух одновременных refresh?
16. Как работает logout, если access JWT stateless?
17. Нужен ли blacklist?
18. Как ротировать signing keys?
19. Что такое `kid`/JWKS?
20. Argon2id vs bcrypt vs SHA-256.
21. Salt vs pepper.
22. Почему slow password hashing — это плюс?
23. Как выбрать work factor?
24. Как защищаться от brute force/credential stuffing?
25. Fixed window vs sliding window/token bucket limiter.
26. Почему rate limit должен быть distributed?
27. Что делать, если Redis умер?
28. XSS vs CSRF при хранении tokens.
29. HttpOnly/Secure/SameSite.
30. Как role changes взаимодействуют со старым JWT?
31. Как не допустить user enumeration?
32. Какие данные нельзя логировать?
33. Какой threat model проекта?
34. Какие операции требуют DB transaction?
35. Почему password hashing не нужно делать внутри долгой транзакции?

---

## 26. Демонстрационный сценарий

1. register user;
2. login;
3. вызвать `/me` access token;
4. refresh T1 -> получить T2;
5. снова отправить T1;
6. показать `AUTH_REFRESH_REUSE_DETECTED` и revoke session family;
7. T2 после family revoke больше не может refresh;
8. login снова;
9. показать session list;
10. revoke конкретную session;
11. попытаться вызвать admin endpoint как user -> 403;
12. показать Redis rate limit на login brute-force;
13. открыть audit log + Grafana, не раскрывая token values.

Это гораздо сильнее демонстрации «получил JWT и сходил в защищенную ручку».

---

## 27. Источники и основания

### Предоставленные материалы Ozon

Используются как ориентир по Go/microservice engineering, тестам, ошибкам, observability и production thinking:

- `Конвенции _ Golang`;
- `Конвенции _ микросервисы`;
- `Стабильность микросервисов`;
- `GO_interviewer.md`;
- `System_Design_interviewer.md`;
- `databases_non_de_interviewer.md`.

### Публичные security references

- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP JWT Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html
- OWASP OAuth2 Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html
- RFC 9700, OAuth 2.0 Security Best Current Practice: https://www.rfc-editor.org/rfc/rfc9700
- Go release history: https://go.dev/doc/devel/release
- Redis rate limiting: https://redis.io/docs/latest/develop/use-cases/rate-limiter/
- OpenTelemetry Go: https://opentelemetry.io/docs/languages/go/

Важно: этот проект **не заявляет соответствие OAuth 2.0/OIDC server specification**. RFC/OWASP используются для конкретных security decisions.

---

## 28. Инструкция для нового диалога

При работе над этим проектом:

1. security correctness важнее количества функций;
2. перед советом по token storage обязательно учитывать тип клиента: browser vs API/mobile;
3. не советовать самописную криптографию;
4. каждое изменение refresh/session logic проверять на replay и concurrency;
5. любые sensitive values автоматически считать запрещенными для logs;
6. сначала завершать текущую phase, потом добавлять MFA/OAuth/WebAuthn;
7. при code review отдельно проверять cryptographic randomness, expiration, transaction atomicity, authorization bypass и failure modes Redis/Postgres;
8. объяснять пользователю каждое security решение, а не давать «магический» код.
