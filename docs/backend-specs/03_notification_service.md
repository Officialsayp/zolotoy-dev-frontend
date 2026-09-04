# Notification Service — портфолио-проект для Go Backend / Ozon Tech

> **Назначение файла:** самостоятельный source of truth для отдельного диалога по Notification Service. Проект должен демонстрировать асинхронную обработку, Kafka, гарантии доставки, идемпотентных consumers, retries, DLQ, worker concurrency и operational visibility.

## 1. Зачем нужен этот проект

Notification Service — проект про **event-driven backend**. Он должен отвечать на вопросы, которые не раскрываются обычным HTTP CRUD:

- как consumer обрабатывает сообщения at-least-once;
- что произойдет при duplicate event;
- когда commit Kafka offset безопасен;
- как отделить прием события от отправки во внешний provider;
- как делать retry/backoff;
- как не заблокировать partition медленной отправкой email;
- как пережить падение provider;
- где появляется DLQ;
- что означает «exactly once» на практике;
- как масштабировать workers;
- какие метрики важны для очереди и фоновых задач.

Проект должен быть компактным: не строить маркетинговую платформу рассылок. Он получает бизнес-события и надежно отправляет несколько видов уведомлений.

---

## 2. Позиционирование

**Repository:** `notification-service`

**Canonical service name:** `notification-service`

**GitHub description:**

> Event-driven notification service in Go using Kafka and PostgreSQL: idempotent consumption, durable delivery jobs, retry/backoff, DLQ, concurrent workers, provider adapters, metrics and tracing.

### Главная техническая тема

**At-least-once delivery + idempotent processing**, а не «отправка письма».

---

## 3. Stack

### Backend

- Go 1.27.x+;
- Kafka;
- PostgreSQL;
- `pgx/v5`;
- Kafka client: актуальная поддерживаемая библиотека, например `franz-go`;
- `net/http` + `chi` для admin/read API;
- `log/slog`;
- OpenTelemetry;
- Prometheus/Grafana;
- Mailpit для локальной email-демонстрации;

> Внутренние платформенные библиотеки Ozon из предоставленных конвенций не копируются. Проект должен быть полностью воспроизводим на публичных OSS-компонентах, сохраняя переносимые принципы: корректные контракты, context/timeouts, наблюдаемость, тесты и короткие транзакции.
- Telegram adapter — опционально с mock/fake transport.

### Frontend — минимально

Vue 3 + TypeScript admin UI:

- список notification jobs;
- фильтр по status/channel/event type;
- карточка attempts;
- кнопка retry для dead-letter/failed job;
- простая статистика delivery success/failures.

### Infrastructure

Docker Compose:

- notification-service;
- PostgreSQL;
- Kafka;
- Kafka UI;
- Mailpit;
- Prometheus;
- Grafana.

Это самый инфраструктурно насыщенный из четырех проектов, потому что здесь инфраструктура напрямую связана с предметом изучения.

---

## 4. Бизнес-сценарий

Сервис подписан на события Order Service:

```text
order.created.v1
order.paid.v1
order.cancelled.v1
order.completed.v1
```

Примеры уведомлений:

```text
order.created -> email: "Заказ создан"
order.paid -> email + telegram: "Оплата получена"
order.cancelled -> email: "Заказ отменен"
order.completed -> email: "Заказ завершен"
```

Notification Service не владеет состоянием заказа. Он доверяет событию как входному факту и сохраняет только данные, необходимые для уведомления.

---

## 5. Event contract

Минимальный envelope:

```json
{
  "event_id": "uuid",
  "event_type": "order.paid.v1",
  "occurred_at": "2026-09-01T16:00:00Z",
  "producer": "order-service",
  "aggregate_id": "order-uuid",
  "correlation_id": "uuid",
  "payload": {
    "buyer_id": "uuid",
    "email": "user@example.com",
    "order_id": "uuid",
    "total_amount": 998000,
    "currency": "RUB"
  }
}
```

### Требования

- `event_id` глобально уникален;
- `event_type` включает major version;
- время — UTC/RFC3339;
- payload содержит snapshot данных, необходимых consumer;
- consumer не должен синхронно идти обратно в Order Service только чтобы дорендерить письмо, если это можно избежать;
- schema evolution должна быть обратно совместимой внутри версии.

### Почему snapshot

Событие `order.paid` должно быть самодостаточным настолько, насколько это разумно. Иначе notification processing начинает зависеть от доступности и текущего состояния источника.

---

## 6. Kafka topology

Минимум:

```text
orders.events.v1
notifications.dlq.v1
```

Consumer group:

```text
notification-service-v1
```

### Partition key

Использовать `order_id` или `buyer_id` в зависимости от требуемого порядка.

Для проекта выбрать `order_id`: события одного заказа сохраняют порядок внутри одной partition.

Нужно уметь объяснить: Kafka гарантирует order только **внутри partition**, а не всего topic.

### Число partitions

Для локального проекта 3 достаточно. В README объяснить, что partitions определяют верхнюю границу полезного consumer-group parallelism для одного topic.

---

## 7. Delivery guarantees

### Producer -> Kafka

Order Service рассматривается как at-least-once publisher через Transactional Outbox.

Значит Notification Service обязан считать duplicates нормальным состоянием.

### Kafka -> Notification Service

Основная гарантия — **at least once processing**.

Нельзя писать в README «exactly once notifications». Внешний email/Telegram provider почти всегда разрушает такую простую гарантию.

Правильная формулировка:

> Kafka events обрабатываются at least once. Создание локального notification job идемпотентно по event identity. Фактическая доставка во внешний provider стремится к effectively-once при наличии provider idempotency key; без него возможны редкие дубли при crash-window после успешного side effect.

Это один из главных interview talking points.

---

## 8. Consumer pipeline

Рекомендуемая архитектура — Kafka consumer не отправляет email напрямую.

```text
Kafka
  -> Consumer
      -> short PostgreSQL transaction
          1. deduplicate event
          2. create notification jobs
      -> commit transaction
      -> commit Kafka offset

PostgreSQL jobs
  -> Worker pool
      -> provider
      -> mark sent/retry/dead
```

Преимущества:

- consumer быстро освобождает Kafka partition;
- provider outage не блокирует ingest;
- retry state durable;
- jobs можно наблюдать и переигрывать;
- backpressure становится управляемым.

---

## 9. Idempotent consumer / Inbox

Таблица:

```text
consumed_events
- event_id UUID PK
- event_type TEXT NOT NULL
- received_at TIMESTAMPTZ NOT NULL
- payload_hash BYTEA
```

В одной транзакции:

```text
BEGIN
  INSERT consumed_events ... ON CONFLICT DO NOTHING
  if inserted:
      INSERT notification_jobs ...
COMMIT
```

Если event уже был:

- job второй раз не создается;
- сообщение считается успешно обработанным;
- offset можно commit.

### Почему недостаточно «держать последние event IDs в памяти»

После restart dedupe исчезнет. При горизонтальном масштабировании разные instances не делят память. Нужен durable shared state.

---

## 10. Notification jobs

### `notification_jobs`

```text
id UUID PK
event_id UUID NOT NULL
recipient_id UUID NULL
channel TEXT NOT NULL
recipient TEXT NOT NULL
template_key TEXT NOT NULL
payload JSONB NOT NULL
status TEXT NOT NULL
attempt_count INT NOT NULL
next_attempt_at TIMESTAMPTZ NOT NULL
provider_message_id TEXT NULL
last_error_code TEXT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
sent_at TIMESTAMPTZ NULL
```

Status:

```text
pending
processing
retry_wait
sent
dead
cancelled
```

Unique constraint:

```text
(event_id, channel, recipient, template_key)
```

Это дополнительная защита от дублей.

### `delivery_attempts`

```text
id BIGSERIAL PK
job_id UUID NOT NULL
attempt_no INT NOT NULL
started_at TIMESTAMPTZ NOT NULL
finished_at TIMESTAMPTZ
result TEXT
provider_status TEXT
error_code TEXT
latency_ms INT
```

Не хранить provider secret/raw sensitive payload.

---

## 11. Worker queue на PostgreSQL

Workers получают jobs запросом типа:

```sql
SELECT id
FROM notification_jobs
WHERE status IN ('pending', 'retry_wait')
  AND next_attempt_at <= now()
ORDER BY next_attempt_at, created_at
FOR UPDATE SKIP LOCKED
LIMIT $1;
```

После claim job переводится в `processing` короткой транзакцией.

### Почему `SKIP LOCKED`

Несколько worker goroutines/processes могут брать разные jobs без ожидания lock друг друга. PostgreSQL прямо указывает queue-like tables как один из подходящих случаев для `SKIP LOCKED`.

### Важное ограничение

Нельзя держать row lock открытым, пока идет сетевой вызов provider.

Claim:

```text
BEGIN -> lock/mark processing -> COMMIT
```

Потом network I/O.

После ответа отдельная transaction фиксирует success/failure.

---

## 12. Crash windows и effectively-once

Критичный сценарий:

```text
worker -> provider SEND success
process crashes
before UPDATE job SET status='sent'
```

После timeout job будет отправлен снова.

### Варианты

1. **Provider idempotency key** — лучший вариант. Передавать `job_id` как provider idempotency key.
2. Provider API позволяет query status по external request ID.
3. Без поддержки provider — принять at-least-once side effect и документировать редкий duplicate.

Не строить ложную exactly-once модель через локальную БД: локальная транзакция не может атомарно зафиксировать commit вместе с внешним email provider.

---

## 13. Retry policy

Retry только для retryable errors:

- timeout;
- connection reset;
- provider 429;
- provider 5xx.

Не retry автоматически:

- invalid recipient;
- malformed template data;
- permanent provider 4xx;
- revoked destination.

### Backoff

Пример:

```text
attempt 1: immediately
attempt 2: +5s
attempt 3: +30s
attempt 4: +2m
attempt 5: +10m
attempt 6: +30m
```

Добавлять jitter, чтобы множество jobs не проснулось одновременно.

После `max_attempts` -> `dead`.

### Retry-After

Если provider возвращает `Retry-After`, учитывать его в policy, если значение разумно.

---

## 14. DLQ

Есть два разных понятия, и их нельзя смешивать.

### Kafka DLQ

`notifications.dlq.v1` — event нельзя корректно распарсить/валидировать/обработать из-за poison message.

Сообщение DLQ содержит:

```text
original event metadata
safe error code
failed_at
consumer version
```

### Delivery dead jobs

`notification_jobs.status=dead` — входное event было корректно, но конкретное уведомление не доставилось после retry budget.

Admin API может делать manual retry.

---

## 15. Templates

Не строить CMS.

На MVP templates лежат в коде или embedded files:

```text
order_created_email_v1
order_paid_email_v1
order_cancelled_email_v1
```

Template renderer:

- строго типизированный/валидируемый input;
- HTML escaping;
- subject/body;
- locale опционально.

### Template versioning

Job хранит `template_key`/version, чтобы retry через день не начал внезапно рендериться совершенно другим несовместимым template.

Можно хранить rendered content snapshot, если хочется полностью детерминированных retries. Для MVP это хороший вариант.

---

## 16. Provider adapters

Interface:

```go
type Sender interface {
    Send(ctx context.Context, msg Message) (ProviderResult, error)
}
```

Implementations:

- `EmailSender` -> SMTP/Mailpit;
- `TelegramSender` -> HTTP API/fake;
- `FakeSender` -> deterministic tests.

### Timeouts

У каждого provider client отдельный timeout.

### Concurrency limits

Email и Telegram могут иметь разные лимиты.

Worker pool должен поддерживать per-provider semaphore/rate limit, а не запускать бесконечные goroutines.

---

## 17. Go concurrency

Этот проект обязан реально использовать goroutines осмысленно.

### Worker pool

```text
scheduler/claimer
 -> jobs channel (bounded)
 -> N workers
 -> provider-specific semaphore
```

### Требования

- bounded queue;
- context cancellation;
- no goroutine leaks;
- graceful shutdown;
- `WaitGroup`/`errgroup`;
- отсутствие конкурентного `append/map write` без синхронизации;
- `go test -race`.

### Backpressure

Если worker pool заполнен:

- не создавать бесконечные goroutines;
- перестать забирать новые jobs быстрее, чем система способна обработать;
- Kafka ingest при этом может продолжать создавать durable jobs до разумного DB/storage threshold.

Нужно уметь объяснить отличие buffering от backpressure.

---

## 18. Ordering

Kafka сохраняет порядок внутри partition, но после помещения events в параллельные jobs фактическая отправка может поменять порядок.

Для большинства notification use cases это допустимо.

Если требуется строгий per-order ordering:

- partition key `order_id`;
- sequencing/version in event;
- worker serialization per aggregate;
- либо проверка predecessor state.

**Не реализовывать строгий ordering без бизнес-требования.** Просто документировать trade-off.

---

## 19. Preferences — ограниченный scope

Можно добавить простой preference layer:

```text
notification_preferences
- user_id
- event_type
- email_enabled
- telegram_enabled
```

Но источник recipient data лучше не превращать в User Service.

На MVP event может содержать email/telegram recipient snapshot.

Preferences — stretch/interview-ready add-on, если core reliability уже готова.

---

## 20. Admin/read API

```text
GET  /api/v1/notifications
GET  /api/v1/notifications/{id}
POST /api/v1/notifications/{id}/retry
GET  /api/v1/events/{event_id}
GET  /health/live
GET  /health/ready
GET  /metrics
GET  /swagger.json
```

Pagination — keyset по `(created_at, id)`.

Admin endpoints защищаются role middleware через Auth Service/dev auth.

---

## 21. Error classification

Infrastructure errors нужно классифицировать в application понятия:

```text
RetryableProviderError
PermanentProviderError
RateLimitedProviderError
InvalidTemplateError
InvalidEventError
StorageError
```

Не делать retry по `err != nil` без классификации.

`errors.Is/As` должны сохраняться через `%w`.

---

## 22. Observability

### Kafka metrics

- consumer lag records;
- records consumed/sec;
- event processing latency;
- deserialization/validation errors;
- duplicate events count;
- rebalance count/duration — если library предоставляет.

### Jobs

- pending jobs;
- oldest pending job age;
- retry_wait count;
- processing count;
- sent rate;
- dead count;
- attempts distribution.

### Provider

- request count by provider/result;
- latency histogram;
- 429 rate;
- timeout rate;
- success rate.

### HTTP/admin

- RPS;
- error rate;
- latency.

### DB

- query duration;
- pool usage;
- lock/contention symptoms.

### Traces

Связать `event_id`, `correlation_id`, `job_id`.

Trace:

```text
Kafka consume
  -> inbox transaction
  -> job create

worker claim
  -> provider send
  -> status update
```

Не нужно пытаться делать один бесконечно длинный trace через часы retry; links/correlation IDs лучше.

---

## 23. SLI/SLO

Для проекта полезны:

- consumer lag < выбранного порога;
- age of oldest pending notification < threshold;
- provider-independent job creation success rate;
- p95 event->job latency;
- p95 job->sent latency по channel;
- dead-job ratio.

Нужно различать:

- «наш сервис принял и поставил уведомление в очередь»;
- «внешний provider реально доставил сообщение конечному пользователю».

Второе часто невозможно строго гарантировать по API provider.

---

## 24. PostgreSQL indexes

Query-driven indexes:

- partial `(next_attempt_at, created_at)` where status in pending/retry_wait;
- `(event_id)` / unique inbox PK;
- `(created_at DESC, id DESC)` для admin listing;
- `(job_id, attempt_no)` attempts;
- partial `status='dead'` только если нужен frequent admin query.

Для job claim сделать `EXPLAIN ANALYZE` на synthetic dataset.

---

## 25. Graceful shutdown

При SIGTERM:

1. HTTP server перестает принимать новые requests;
2. Kafka consumer прекращает fetch новых records;
3. закончить/commit уже сохраненные в DB events;
4. job claimer перестает брать новые jobs;
5. workers получают deadline на завершение текущей отправки;
6. незавершенный `processing` job должен быть recoverable после timeout/reaper;
7. закрыть DB/Kafka connections.

### Stuck processing recovery

Job имеет `processing_started_at`/lease deadline.

Reaper переводит старый `processing` обратно в `retry_wait`, если worker умер.

Не считать `processing` вечным состоянием.

---

## 26. Testing

### Consumer integration

- unique event -> jobs created;
- duplicate event -> no duplicate jobs;
- crash/reprocess semantics;
- invalid payload -> DLQ/error path;
- multiple events one order.

### Worker unit/integration

- success;
- timeout -> retry;
- 429 -> retry at correct time;
- 400 permanent -> dead/no retry;
- max attempts -> dead;
- provider idempotency key stable across retries.

### Concurrency

- multiple workers do not claim same job;
- `SKIP LOCKED` distributes batch;
- no race in worker pool;
- graceful cancellation;
- stuck-processing reaper.

### Kafka tests

В CI можно поднять Kafka service/container только для integration stage. Обычный `go test ./...` не должен требовать Kafka.

### Load test

Отдельно измерить:

- event ingest throughput;
- jobs/sec worker throughput with fake provider;
- behavior при provider latency 2s;
- queue growth/backpressure.

Не гоняться за красивым RPS без описания hardware/test profile.

---

## 27. Architecture layout

```text
cmd/notification-service/main.go
internal/
  domain/
    notification/
  application/
    ingest/
    delivery/
    retry/
    admin/
    ports/
  infrastructure/
    postgres/
    kafka/
    provider/email/
    provider/telegram/
    observability/
  transport/http/
  worker/
  config/
migrations/
api/openapi.yaml
templates/
docs/
```

Consumer lifecycle и delivery workers должны быть отдельными компонентами одного binary на MVP. Разбивать их в отдельные deployable services пока не нужно.

---

## 28. CI/CD

```text
format/imports
-> vet
-> golangci-lint
-> unit tests
-> race tests
-> PostgreSQL integration tests
-> Kafka integration tests
-> build
-> docker build
```

Дополнительно:

- migrations smoke;
- template validation;
- OpenAPI lint;
- small load/smoke test.

---

## 29. Documentation / ADR

README:

1. event flow diagram;
2. guarantees table/description;
3. deduplication algorithm;
4. worker/retry flow;
5. crash windows;
6. DLQ semantics;
7. Kafka partition strategy;
8. local demo;
9. metrics/dashboard;
10. known limitations.

ADR:

```text
ADR-001 Kafka at-least-once model
ADR-002 durable jobs instead of send-in-consumer
ADR-003 inbox deduplication
ADR-004 PostgreSQL SKIP LOCKED worker queue
ADR-005 provider idempotency/crash window
ADR-006 retry + DLQ policy
```

---

## 30. Development phases

### Phase 0 — skeleton

- Go service;
- Postgres;
- Kafka;
- config/health;
- CI.

### Phase 1 — consume and persist

- event schema;
- Kafka consumer;
- `consumed_events`;
- notification jobs;
- duplicate-event tests.

### Phase 2 — email worker

- claim jobs;
- Mailpit adapter;
- success/failure state;
- attempts.

### Phase 3 — retry/DLQ

- error classification;
- backoff+jitter;
- dead jobs;
- Kafka poison-message path;
- manual retry.

### Phase 4 — concurrency/recovery

- bounded worker pool;
- `SKIP LOCKED`;
- per-provider limit;
- leases/reaper;
- graceful shutdown;
- race tests.

### Phase 5 — production quality

- metrics/traces;
- admin API;
- frontend;
- OpenAPI;
- load test report.

**Interview-ready.**

### Stretch

- Telegram real adapter;
- user preferences;
- scheduled notifications;
- template localization;
- ClickHouse delivery analytics;
- Kubernetes/Helm;
- multiple consumer topics/schemas.

---

## 31. Definition of Done

- Kafka event создает durable job;
- duplicate event не создает duplicate job;
- offset commit происходит после durable local commit;
- provider outage не блокирует Kafka ingest напрямую;
- retries имеют backoff+jitter;
- permanent errors не retry бесконечно;
- dead jobs видны и retriable вручную;
- workers конкурентны и не берут один job дважды;
- stuck processing восстанавливается;
- graceful shutdown работает;
- `go test -race` проходит;
- consumer lag/job age/provider latency наблюдаемы;
- Mailpit demo воспроизводим;
- README честно описывает delivery guarantees.

---

## 32. Что не делать

- не отправлять email прямо в Kafka consumer как финальную архитектуру;
- не включать auto-commit до durable processing;
- не считать duplicates «ошибкой Kafka»;
- не пытаться решить dedupe in-memory map;
- не делать retry без лимита;
- не создавать goroutine на каждое сообщение без bounded concurrency;
- не держать DB transaction во время network send;
- не заявлять exactly-once email delivery;
- не подключать RabbitMQ + Kafka одновременно;
- не добавлять Redis, если Postgres job queue решает задачу;
- не строить визуальный email constructor.

---

## 33. Что нужно уметь защитить на интервью

1. Topic, partition, offset, broker.
2. Consumer group.
3. Как выбирается partition?
4. Где Kafka гарантирует ordering?
5. Что такое consumer lag?
6. At-most-once / at-least-once / exactly-once.
7. Delivery vs processing semantics.
8. Почему duplicates нормальны при at-least-once?
9. Когда commit offset?
10. Auto commit trade-offs.
11. Почему event нужен unique ID?
12. Как работает inbox deduplication?
13. Почему unique DB constraint важнее in-memory check?
14. Что произойдет: DB commit success, offset commit failed?
15. Что произойдет: offset commit success до DB commit?
16. Что такое Transactional Outbox у producer?
17. Почему producer outbox + consumer inbox не гарантирует exactly-once внешний side effect?
18. Crash window после успешного provider send.
19. Зачем provider idempotency key?
20. Retryable vs permanent errors.
21. Exponential backoff и jitter.
22. DLQ и poison message.
23. Почему consumer не должен блокироваться на SMTP 10 секунд?
24. Worker pool и backpressure.
25. Почему bounded channel лучше unlimited goroutines?
26. Как избежать data race?
27. Что делает `FOR UPDATE SKIP LOCKED`?
28. Почему не держим lock во время network call?
29. Как восстановить stuck processing job?
30. Как graceful shutdown взаимодействует с Kafka offsets/jobs?
31. Как горизонтально масштабировать consumer?
32. Почему partitions ограничивают parallelism?
33. Как масштабировать delivery workers независимо от ingest?
34. Какие метрики покажут provider degradation?
35. Какие SLO адекватны для async service?

---

## 34. Демонстрационный сценарий

1. поднять Kafka/Postgres/Mailpit/service;
2. отправить `order.paid.v1`;
3. показать event в `consumed_events`;
4. job появляется и письмо видно в Mailpit;
5. отправить тот же `event_id` повторно — второго письма/job нет;
6. включить fake provider mode `500`;
7. показать retry schedule и attempts;
8. дождаться dead state или ускорить demo policy;
9. manual retry после восстановления provider;
10. запустить несколько workers и показать `SKIP LOCKED`;
11. открыть Grafana: consumer lag, pending age, delivery latency, errors;
12. показать trace/correlation by event_id.

---

## 35. Источники и основания

### Предоставленные материалы Ozon

Особенно важны:

- `Конвенции _ микросервисы` — interfaces, error handling, tests, запрет network call внутри открытой DB transaction;
- `Стабильность микросервисов` — consumer lag как SLI, error rate/latency;
- `System_Design_interviewer.md` — гарантии доставки сообщений, идемпотентность, Transactional Outbox, выбор async communication;
- `GO_interviewer.md` — concurrency/races, metrics, production diagnostics;
- `databases_non_de_interviewer.md` — PostgreSQL locks, indexes, plans;
- `Конвенции _ Golang` — testing/linters/current Go discipline.

### Публичные источники

- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Kafka design / transactions: https://kafka.apache.org/41/design/design/
- PostgreSQL `SELECT ... SKIP LOCKED`: https://www.postgresql.org/docs/current/sql-select.html
- OpenTelemetry Go: https://opentelemetry.io/docs/languages/go/
- Prometheus instrumentation: https://prometheus.io/docs/practices/instrumentation/
- Prometheus histograms: https://prometheus.io/docs/practices/histograms/
- Ozon Tech public stack: https://habr.com/ru/companies/ozontech/profile/

---

## 36. Инструкция для нового диалога

1. Всегда сначала уточнять, на какой фазе находится код, по фактическому repository state.
2. Не упрощать delivery semantics до «Kafka доставит один раз».
3. Любое изменение consumer flow проверять вопросом: **когда именно commit offset и что уже стало durable?**
4. Любое изменение worker flow проверять на crash window, duplicate send и stuck job.
5. Concurrency code обязательно проверять race detector и shutdown path.
6. Не добавлять Redis/ClickHouse/RabbitMQ без реальной причины.
7. При code review отдельно проверять idempotency, retry classification, backpressure, transaction duration и observability.
8. Пользователь должен понимать механизм, поэтому код давать порциями с объяснением trade-offs.
