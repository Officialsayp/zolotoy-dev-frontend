# Order Service — портфолио-проект для Go Backend / Ozon Tech

> **Назначение файла:** это самостоятельный source of truth для отдельного диалога по разработке Order Service. Новый диалог должен опираться на этот документ как на требования к проекту, не расширяя scope без явной причины.

## 1. Зачем нужен этот проект

Order Service — главный проект портфолио. Его задача — показать не количество CRUD-ручек, а умение проектировать и реализовывать бизнес-критичный backend: доменная модель, инварианты, конечный автомат состояний, транзакции, конкурентный доступ, идемпотентность, PostgreSQL, события, тесты, наблюдаемость и эксплуатация.

Проект должен выглядеть как небольшой, но реальный сервис заказов e-commerce, который можно уверенно защищать на техническом интервью.

### Что проект должен доказать интервьюеру

Кандидат умеет:

- писать production-like сервис на Go;
- отделять domain/application/infrastructure слои без бессмысленной абстракции;
- моделировать агрегаты и инварианты через DDD;
- проектировать REST API и версионировать контракт;
- работать с PostgreSQL не только как с «хранилищем CRUD»;
- понимать MVCC, блокировки, уровни изоляции, индексы и планы запросов;
- защищаться от повторных запросов и гонок;
- не держать DB-транзакцию открытой во время сетевого вызова;
- публиковать доменные события через Transactional Outbox;
- писать unit/integration/e2e тесты;
- измерять RPS, latency, error rate и DB/external-call latency;
- объяснять компромиссы архитектуры.

---

## 2. Позиционирование проекта

**Название репозитория:** `order-service`

**Каноническое имя сервиса:** `order-service`

**Короткое описание для GitHub:**

> Production-oriented order management service written in Go: DDD aggregate, PostgreSQL, idempotent commands, payment state machine, transactional outbox, OpenAPI, observability and tests.

**Размер:** один сервис, одна основная PostgreSQL-база. Kafka появляется только как транспорт доменных событий на interview-ready этапе.

**Не нужно превращать проект в маркетплейс.** Каталог, склад, полноценный платежный процессинг, логистика, промокоды и рекомендации — соседние bounded contexts и реализуются только как минимальные заглушки/адаптеры, если они нужны для демонстрации взаимодействия.

---

## 3. Технологический baseline

### Backend

- Go **1.27.x** или более новая стабильная версия на момент разработки.
- `net/http` + легкий router (`chi`) **или** gRPC-first + grpc-gateway. Для первого законченного варианта предпочтительнее `net/http`/`chi`, чтобы не прятать HTTP-логику за генерацией.
- PostgreSQL 17/18.
- `pgx/v5` для работы с PostgreSQL.
- миграции: `goose`.
- OpenAPI 3.x (`oapi-codegen` допустим, но контракт должен оставаться читаемым человеком).

> В предоставленной внутренней Go-конвенции Ozon упоминается платформенный RPC-фреймворк `scratch`. В публичном pet-project его не нужно имитировать или заменять самописным аналогом: используем стандартные/OSS-инструменты, а переносимые инженерные идеи (контракты, gRPC/REST, context, observability, тестируемость) сохраняем.
- структурированные логи: `log/slog`.
- OpenTelemetry для traces/metrics integration.
- Prometheus + Grafana для локального наблюдения.
- Kafka — только для исходящих доменных событий на втором этапе.

### Frontend — без упора

Минимальный web UI на Vue 3 + TypeScript + Vite/Nuxt:

- список заказов;
- карточка заказа;
- создание заказа;
- кнопки допустимых действий по текущему состоянию;
- отображение payment/order status и истории статусов.

Frontend нужен как удобный клиент API и визуальная демонстрация сценариев, а не как отдельный портфолио-проект.

### Инфраструктура — без упора

Локально через Docker Compose:

- `order-service`;
- PostgreSQL;
- Kafka + UI — после подключения outbox publisher;
- Prometheus;
- Grafana;
- OTel Collector — при необходимости.

В репозитории должны быть `Dockerfile`, `compose.yaml`, healthchecks и пример конфигурации `.env.example`. Kubernetes/Helm — stretch goal.

---

## 4. Бизнес-контекст

Сервис управляет жизненным циклом заказа покупателя. Заказ содержит товары и их цену на момент покупки, способ оплаты, адрес доставки, комментарий покупателя и состояние выполнения.

Ключевая бизнес-особенность: поддерживаются две модели оплаты, но обе **только онлайн**.

1. `prepaid` — заказ оплачивается до дальнейшего исполнения.
2. `pay_on_receipt_online` — заказ может быть собран и доставлен без оплаты, но завершить его можно только после успешной онлайн-оплаты при получении. Наличной оплаты нет.

Это специально делает проект интереснее простого CRUD: order state и payment state связаны, но не должны быть одной переменной.

---

## 5. DDD-модель

### Bounded Context

В проекте моделируется только **Order Management**. Каталог, пользователь, платежный провайдер и доставка считаются внешними контекстами.

### Aggregate Root: `Order`

Order контролирует изменения своих элементов и бизнес-состояний.

Пример полей:

```text
Order
- ID
- BuyerID
- Status
- PaymentStatus
- PaymentMethod
- Items[]
- DeliveryAddress
- BuyerComment
- Total
- Version
- CreatedAt
- UpdatedAt
```

### Entity: `OrderItem`

```text
OrderItem
- ID
- ProductID
- ProductNameSnapshot
- Quantity
- UnitPrice
- TotalPrice
```

Важно: `ProductNameSnapshot` и `UnitPrice` сохраняются в заказе как snapshot. Изменение каталога после оформления не должно менять уже созданный заказ.

### Value Objects

#### `Money`

- `Amount` хранится целым числом в минимальных денежных единицах;
- `Currency` — явное поле, даже если MVP поддерживает только RUB;
- операции сложения разрешены только для одинаковой валюты;
- никаких `float64` для денег.

#### `DeliveryAddress`

На первом этапе можно оставить строкой или компактной структурой. Не нужно проектировать отдельный Address Service.

#### `OrderStatus`

Рекомендуемый набор:

```text
created
confirmed
processing
shipped
in_delivery
delivered
completed
cancellation_requested
cancelled
```

Необязательно иметь все статусы с первого коммита. Важнее, чтобы переходы были явными.

#### `PaymentStatus`

```text
awaiting
processing
paid
failed
refunded
```

Order status и Payment status существуют независимо.

---

## 6. Инварианты

Инварианты должны находиться в domain layer и проверяться при каждой операции, а не только в HTTP handler.

Минимальный набор:

1. Заказ не может быть создан без `BuyerID`.
2. Заказ содержит хотя бы одну позицию.
3. Quantity каждой позиции > 0.
4. UnitPrice > 0.
5. Total вычисляется сервером, а не доверяется клиенту.
6. После подтверждения заказа состав позиций менять нельзя.
7. `cancelled` и `completed` — терминальные состояния.
8. Нельзя начать новую оплату, если payment уже `processing` или `paid`.
9. Повторная оплата разрешается после `failed`, если сам заказ ещё допускает оплату.
10. Нельзя оплачивать отмененный заказ.
11. Для `prepaid` заказ не должен переходить к исполнению до `paid`.
12. Для `pay_on_receipt_online` доставка разрешена до оплаты, но переход `delivered -> completed` разрешается только при `paid`.
13. Отмена оплаченного заказа должна инициировать возврат, а не просто менять статус payment на `refunded` без подтвержденной операции.
14. Все изменения состояния увеличивают `Version` агрегата.

### State machine должна быть явной

Не разбрасывать проверки вида `if status != ...` по всему проекту. Лучше методы агрегата:

```go
func (o *Order) Confirm() error
func (o *Order) StartProcessing() error
func (o *Order) Ship() error
func (o *Order) StartDelivery() error
func (o *Order) MarkDelivered() error
func (o *Order) Complete() error
func (o *Order) RequestCancellation() error
func (o *Order) Cancel() error
func (o *Order) StartPayment() error
func (o *Order) PaymentSucceeded(...) error
func (o *Order) PaymentFailed(...) error
```

Каждый метод либо переводит агрегат в корректное новое состояние, либо возвращает типизированную domain error.

---

## 7. Сценарии оплаты

### 7.1 `prepaid`

```text
Create Order
  -> payment=awaiting
Pay
  -> payment=processing
  -> payment provider
     -> success: payment=paid
     -> failure: payment=failed
Confirm / Processing / Delivery
  -> Complete
```

### 7.2 `pay_on_receipt_online`

```text
Create Order
  -> payment=awaiting
Confirm
  -> Processing
  -> Shipped
  -> InDelivery
  -> Delivered
Pay
  -> payment=processing
  -> success: paid
Complete
```

Допустимо вызвать `Pay` чуть раньше доставки, если бизнес-правило это разрешает. Ключевой инвариант: `Complete()` невозможен без `paid`.

### Важный архитектурный принцип

HTTP-вызов платежного провайдера нельзя выполнять внутри открытой PostgreSQL-транзакции.

Практический вариант:

1. короткая транзакция: проверить order/payment state и перевести payment в `processing`;
2. commit;
3. вызвать payment gateway с собственным idempotency key;
4. новая короткая транзакция: зафиксировать `paid` или `failed`;
5. добавить domain event в outbox той же транзакцией.

Следствие: нужно уметь объяснить, что произойдет при падении процесса между шагами и как reconciliation/retry восстанавливает состояние.

---

## 8. API

Все публичные методы начинаются с `/api/v1`.

### Обязательные endpoints

```text
POST   /api/v1/orders
GET    /api/v1/orders/{order_id}
GET    /api/v1/orders
POST   /api/v1/orders/{order_id}/pay
POST   /api/v1/orders/{order_id}/confirm
POST   /api/v1/orders/{order_id}/request-cancellation
POST   /api/v1/orders/{order_id}/cancel
POST   /api/v1/orders/{order_id}/complete
GET    /api/v1/orders/{order_id}/history
GET    /health/live
GET    /health/ready
GET    /metrics
GET    /swagger.json
```

`ship`, `in-delivery`, `delivered` можно оформить отдельными command endpoints или одним служебным endpoint изменения fulfillment status. Для учебного проекта отдельные команды лучше демонстрируют state machine.

### Create Order

Request:

```json
{
  "buyer_id": "...",
  "payment_method": "pay_on_receipt_online",
  "items": [
    {
      "product_id": "...",
      "name": "Keyboard",
      "quantity": 2,
      "unit_price": 499000,
      "currency": "RUB"
    }
  ],
  "delivery_address": "...",
  "buyer_comment": "..."
}
```

`total` в request отсутствует.

### Ошибки API

Единый формат:

```json
{
  "error": {
    "code": "ORDER_INVALID_STATE",
    "message": "order cannot be paid in current state",
    "details": {}
  }
}
```

Минимальная карта:

- `400` — validation/domain rule violation;
- `401` — не аутентифицирован;
- `403` — недостаточно прав;
- `404` — order not found;
- `409` можно использовать для version/idempotency conflict, если выбран более стандартный public API; если проект сознательно повторяет внутреннюю Ozon-конвенцию с ограниченным набором кодов — конфликт маппится в `400`. Решение нужно документировать;
- `429` — rate limit;
- `500` — внутренняя ошибка.

Не отдавать текст PostgreSQL-ошибки клиенту.

---

## 9. Идемпотентность

Это обязательная часть проекта.

Идемпотентными должны быть минимум:

- `POST /orders`;
- `POST /orders/{id}/pay`;
- `POST /orders/{id}/cancel`.

Клиент передает `Idempotency-Key`.

В БД хранится:

```text
idempotency_keys
- key
- operation
- request_hash
- status
- response_code
- response_body
- resource_id
- created_at
- expires_at
```

Правила:

1. Один и тот же key + тот же payload возвращает прежний результат.
2. Один и тот же key + другой payload возвращает conflict/domain error.
3. Одновременные одинаковые запросы не должны создавать два заказа или две оплаты.
4. Unique index обеспечивает последнюю линию защиты.

Нужно уметь объяснить разницу между HTTP-idempotency и идемпотентностью бизнес-операции.

---

## 10. Конкурентный доступ

Типовой кейс: одновременно приходят `Pay` и `Cancel` или два `Pay`.

Рекомендуемый основной подход — **optimistic locking** через `version`:

```sql
UPDATE orders
SET status = $1,
    payment_status = $2,
    version = version + 1,
    updated_at = now()
WHERE id = $3
  AND version = $4;
```

`RowsAffected == 0` означает concurrent modification; application layer перечитывает состояние и возвращает понятную ошибку/делает ограниченный retry.

Для отдельных критичных операций допустимо сравнить это с `SELECT ... FOR UPDATE` и объяснить trade-off.

### Что проверить тестами

- два конкурентных `Pay` не запускают две независимые успешные оплаты;
- `Cancel` и `Complete` не могут оба победить;
- race detector не находит data races в in-memory коде.

---

## 11. PostgreSQL schema

### `orders`

```text
id UUID PK
buyer_id UUID NOT NULL
status TEXT NOT NULL
payment_status TEXT NOT NULL
payment_method TEXT NOT NULL
delivery_address TEXT NOT NULL
buyer_comment TEXT
currency CHAR(3) NOT NULL
total_amount BIGINT NOT NULL
version BIGINT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### `order_items`

```text
id UUID PK
order_id UUID NOT NULL
product_id UUID NOT NULL
product_name TEXT NOT NULL
quantity INT NOT NULL
unit_price BIGINT NOT NULL
currency CHAR(3) NOT NULL
```

### `payments`

```text
id UUID PK
order_id UUID NOT NULL
provider_payment_id TEXT
status TEXT NOT NULL
amount BIGINT NOT NULL
currency CHAR(3) NOT NULL
idempotency_key TEXT NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### `order_status_history`

```text
id BIGSERIAL PK
order_id UUID NOT NULL
old_status TEXT
new_status TEXT NOT NULL
reason TEXT
created_at TIMESTAMPTZ NOT NULL
```

### `outbox`

```text
id UUID PK
aggregate_id UUID NOT NULL
event_type TEXT NOT NULL
payload JSONB NOT NULL
created_at TIMESTAMPTZ NOT NULL
published_at TIMESTAMPTZ NULL
attempts INT NOT NULL DEFAULT 0
```

### Индексы

Минимум:

- PK по `orders.id`;
- `(buyer_id, created_at DESC, id DESC)` для списка заказов пользователя;
- `(status, created_at)` только если реально есть соответствующий query pattern;
- unique по `payments.idempotency_key` или `(order_id, idempotency_key)`;
- partial index на unpublished outbox, например `WHERE published_at IS NULL`.

**Не добавлять индексы «на всякий случай».** Для каждого индекса в README должна быть объяснимая выборка и `EXPLAIN ANALYZE` до/после хотя бы для 1–2 ключевых запросов.

### Foreign keys

Для максимальной близости к предоставленным микросервисным конвенциям Ozon можно сознательно **не использовать FK**, а поддерживать целостность в сервисе. Это нетипичный выбор для обычного pet-project, поэтому обязательно описать trade-off в ADR. Альтернативный вариант — использовать FK в локальном проекте и явно отметить отличие от внутренней конвенции. Главное — решение должно быть осознанным.

---

## 12. Пагинация

Список заказов — cursor/keyset pagination, а не глубокий `OFFSET`.

Сортировка:

```text
ORDER BY created_at DESC, id DESC
```

Cursor содержит `(created_at, id)`.

Нужно уметь объяснить:

- почему `OFFSET 500000` дорогой;
- зачем детерминированный tie-breaker `id`;
- как keyset pagination ведет себя при вставках новых заказов.

---

## 13. Domain events и Transactional Outbox

События:

```text
order.created.v1
order.payment_started.v1
order.paid.v1
order.payment_failed.v1
order.cancellation_requested.v1
order.cancelled.v1
order.completed.v1
```

При изменении агрегата запись в `orders/...` и вставка события в `outbox` выполняются **одной PostgreSQL-транзакцией**.

Отдельный publisher:

1. берет пачку `outbox` записей;
2. публикует в Kafka;
3. помечает как published;
4. использует retry/backoff;
5. допускает повторную публикацию — consumer обязан быть идемпотентным.

Для нескольких publisher workers полезно использовать `FOR UPDATE SKIP LOCKED`.

Не заявлять «exactly once end-to-end». Правильная формулировка: durable local state + at-least-once publication + idempotent consumers.

---

## 14. Архитектура кода

Рекомендуемая структура:

```text
cmd/order-service/main.go
internal/
  domain/
    order/
      order.go
      item.go
      money.go
      status.go
      errors.go
      events.go
  application/
    commands/
    queries/
    ports/
  infrastructure/
    postgres/
    kafka/
    payment/
    observability/
  transport/
    http/
  config/
migrations/
api/openapi.yaml
deploy/
tests/
```

### Правило зависимостей

`domain` ничего не знает о PostgreSQL, HTTP, Kafka и конкретных библиотеках.

`application` оркестрирует use cases через интерфейсы/ports.

`infrastructure` реализует ports.

`transport` преобразует HTTP request/response в application commands и обратно.

### Не переусложнять

Не нужно создавать интерфейс для каждой структуры. Интерфейс появляется там, где действительно есть boundary: repository, payment gateway, event publisher, clock/ID generator при необходимости тестирования.

---

## 15. Ошибки в Go

Внутри приложения использовать sentinel/typed errors там, где ошибка является частью бизнес-контракта:

```text
ErrOrderNotFound
ErrInvalidOrderState
ErrPaymentAlreadyProcessing
ErrOrderAlreadyPaid
ErrVersionConflict
ErrIdempotencyConflict
```

Infrastructure errors оборачиваются через `%w` с контекстом и проверяются `errors.Is/errors.As`.

Нельзя:

- сравнивать `err.Error()`;
- терять исходную ошибку;
- возвращать пользователю SQL/internal stack;
- логировать одну и ту же ошибку на каждом слое.

---

## 16. Тестирование

### Domain unit tests — обязательны

Table-driven tests для всех переходов состояния.

Пример матрицы `Complete()`:

```text
delivered + paid -> completed
in_delivery + paid -> error
delivered + awaiting -> error
cancelled + paid -> error
completed + paid -> error
```

### Application unit tests

Mock/fake repositories и payment gateway:

- успешная оплата;
- provider timeout;
- повтор после failed;
- version conflict;
- idempotent replay.

### Repository integration tests

С реальным PostgreSQL:

- миграции применяются с нуля;
- save/load aggregate;
- optimistic lock;
- outbox atomicity;
- keyset pagination;
- unique constraints/idempotency.

Интеграционные тесты изолируются build tag/env, чтобы обычный `go test ./...` не требовал поднятого Postgres.

### HTTP integration/e2e

Минимум один happy path и несколько бизнес-ошибок.

### Дополнительно

- `go test -race ./...`;
- fuzz test на parsing/validation — опционально;
- benchmark для hot domain/path — только если есть смысл.

---

## 17. Observability

### Structured logs

Обязательные поля:

```text
service
request_id
trace_id
order_id (если есть)
buyer_id (если допустимо)
operation
duration_ms
error_code
```

Не логировать чувствительные платежные данные.

### Metrics

RED:

- request rate;
- error rate;
- request duration histogram.

Дополнительно:

- DB query duration;
- DB pool acquired/idle/total;
- payment provider latency/error rate;
- optimistic lock conflicts;
- idempotency replays/conflicts;
- outbox pending count;
- outbox publish failures;
- Kafka publish latency.

Для latency использовать histogram/квантили, не среднее как основную оценку.

### Tracing

Span chain:

```text
HTTP request
  -> application command
  -> PostgreSQL
  -> payment provider / Kafka publisher
```

### SLO для учебного проекта

Не нужно изображать enterprise SLA. Достаточно документировать, например:

- availability для demo deployment;
- p90/p95 latency для ключевых read/write endpoints;
- error-rate target;
- outbox age/lag target.

Цель — показать, что SLI/SLO связаны с конкретными измеряемыми сигналами.

---

## 18. Security

Минимум:

- `Authorization` интегрируется через Auth Service либо локальный dev middleware;
- Buyer может читать только свои заказы;
- служебные transitions доступны роли operator/admin;
- input limits для строк и количества items;
- rate limit на write endpoints;
- request body size limit;
- timeouts на HTTP server/client;
- секреты только через env/secret store, не в git.

Auth не нужно полностью реализовывать внутри Order Service.

---

## 19. Resilience

HTTP server:

- read header timeout;
- read/write/idle timeouts;
- graceful shutdown;
- context cancellation от request до repository/client.

Payment client:

- отдельный timeout;
- ограниченный retry только для retryable failures;
- exponential backoff + jitter;
- idempotency key;
- не retry `4xx`/business failure вслепую.

PostgreSQL:

- ограниченный pool;
- query context timeout;
- короткие транзакции;
- никакого внешнего network I/O внутри транзакции.

---

## 20. CI/CD

GitHub Actions pipeline:

```text
1. gofmt/goimports check
2. go vet
3. golangci-lint
4. go test ./...
5. go test -race ./...
6. integration tests with PostgreSQL service container
7. build
8. docker build
9. vulnerability/dependency scan
```

Опционально:

- OpenAPI lint;
- migration smoke test;
- k6 smoke performance test;
- image publish.

---

## 21. Документация в репозитории

README должен содержать:

1. problem statement;
2. architecture diagram;
3. domain/state diagram;
4. payment flows;
5. local launch;
6. API link;
7. DB schema;
8. consistency/idempotency decisions;
9. observability screenshot;
10. tests;
11. performance notes;
12. trade-offs / known limitations.

### ADR — минимум 4

```text
ADR-001: DDD aggregate boundaries
ADR-002: optimistic locking vs SELECT FOR UPDATE
ADR-003: idempotency-key storage
ADR-004: transactional outbox
ADR-005: FK policy (опционально)
```

---

## 22. Этапы разработки

### Phase 0 — Skeleton

- go module;
- config;
- HTTP server;
- health endpoints;
- PostgreSQL connection;
- migrations;
- CI baseline.

### Phase 1 — Domain MVP

- Order/OrderItem/Money;
- state machine;
- create/get;
- domain unit tests.

После этой фазы уже нельзя ломать модель без тестов.

### Phase 2 — Order lifecycle

- list + keyset pagination;
- fulfillment transitions;
- cancellation;
- history;
- optimistic locking.

### Phase 3 — Payment

- обе payment methods;
- fake payment provider;
- idempotency;
- retry/error model.

### Phase 4 — Production quality

- structured logs;
- metrics;
- traces;
- graceful shutdown/timeouts;
- integration tests;
- OpenAPI;
- frontend demo.

### Phase 5 — Events

- outbox;
- Kafka publisher;
- `order.*` events;
- lag/pending metrics.

На этом этапе проект считается **interview-ready**.

### Phase 6 — Stretch

Только после interview-ready:

- Kubernetes/Helm;
- stress test + report;
- DB query tuning report;
- separate payment mock service over gRPC;
- reconciliation worker;
- saga discussion/PoC.

---

## 23. Definition of Done

Проект готов к портфолио, если одновременно выполнено:

- сервис стартует одной командой/compose;
- миграции поднимают чистую БД;
- happy path полностью работает;
- обе payment methods имеют корректные ограничения;
- повторные commands не создают дубли;
- concurrency conflict обработан;
- есть unit + integration тесты;
- `go test -race` проходит;
- OpenAPI доступен;
- есть health/readiness;
- Prometheus видит сервис;
- Grafana показывает минимум rate/errors/latency;
- outbox умеет пережить временную недоступность Kafka;
- README объясняет архитектуру и trade-offs;
- в коде нет секретов;
- есть reproducible demo scenario.

---

## 24. Что специально НЕ делать

До interview-ready версии не добавлять:

- 20 сущностей каталога;
- полноценный склад;
- реальный acquiring;
- сложный promo engine;
- event sourcing;
- CQRS с отдельной read DB;
- Kubernetes operator;
- service mesh;
- 10 брокеров/хранилищ;
- «универсальный generic repository»;
- самописный DI container.

Все это размывает главный сигнал проекта.

---

## 25. Что нужно уметь защитить на интервью

После завершения проекта автор должен без README объяснить:

1. Почему Order — aggregate root?
2. Чем entity отличается от value object?
3. Почему price хранится snapshot-ом?
4. Почему money — integer, а не float?
5. Почему order status нельзя объединять с payment status?
6. Какие инварианты гарантирует aggregate?
7. Что произойдет при двух одновременных `Pay`?
8. Optimistic vs pessimistic lock.
9. Что такое MVCC?
10. Что даст уровень `READ COMMITTED`, а когда нужен иной?
11. Что такое deadlock и как его получить здесь?
12. Почему нельзя дергать payment provider внутри DB transaction?
13. Что произойдет, если provider успешно списал деньги, а сервис упал до записи `paid`?
14. Зачем idempotency key?
15. Чем идемпотентный API отличается от deduplication?
16. Зачем Transactional Outbox?
17. Почему outbox не дает magically exactly-once end-to-end?
18. At-most-once / at-least-once / exactly-once processing.
19. Почему cursor pagination лучше большого OFFSET?
20. Как подобрать индекс под список заказов?
21. Что смотреть в `EXPLAIN ANALYZE`?
22. Почему средний latency почти бесполезен для SLO?
23. Какие метрики сервиса обязательны?
24. Как диагностировать «сервис стал тормозить»?
25. Где и зачем используется `context.Context`?
26. Как корректно wrapping errors через `%w` влияет на `errors.Is/As`?
27. Как сервис корректно завершает работу?
28. Где возможна data race внутри Go-кода?
29. Как изменится дизайн при 100x нагрузке?
30. Что первым станет bottleneck и как это доказать измерениями?

---

## 26. Демонстрационный сценарий

Для собеседования/README подготовить reproducible demo:

1. создать `pay_on_receipt_online` order;
2. показать, что order идет до `delivered` без оплаты;
3. попытаться `complete` — получить domain error;
4. выполнить payment;
5. повторить тот же `Pay` с тем же idempotency key — получить тот же результат без второго списания;
6. `complete` успешно;
7. открыть status history;
8. показать запись в outbox/Kafka;
9. открыть Grafana и trace.

Отдельный demo — два конкурентных `Pay`, где только один меняет состояние.

---

## 27. Источники и инженерные основания

### Предоставленные материалы Ozon

При проектировании учтены идеи из предоставленных пользователем материалов:

- `Конвенции _ Golang` — KISS/YAGNI, актуальные версии Go, `go test`, линтинг, `t.Parallel`, capacity hints;
- `Конвенции _ микросервисы` — REST наружу, gRPC межсервисно, UTC/RFC3339, документация, Swagger, error model, запрет внешнего service call внутри открытой DB-транзакции, обязательность тестов/observability;
- `Как мы работаем с базами данных` — MVCC, vacuum, planner/executor, EXPLAIN ANALYZE, ответственность разработчика за запросы/схему;
- `Стабильность микросервисов` — Availability, Error Rate, Response Time quantiles, Kafka consumer lag, SLI/SLO;
- `GO_interviewer.md` — errors, concurrency, singleflight, production diagnostics, service metrics, deadlocks;
- `System_Design_interviewer.md` — DDD, caching, delivery guarantees, idempotency, Transactional Outbox, Saga, service communication;
- `databases_non_de_interviewer.md` — PostgreSQL indexes, query plans, vacuum, connections, isolation and performance diagnostics.

Эти материалы используются как ориентир для навыков и инженерного мышления, а не как утверждение, что все внутренние требования неизменны в 2026 году.

### Публичные источники

- Go release history: https://go.dev/doc/devel/release
- PostgreSQL documentation: https://www.postgresql.org/docs/current/
- OpenTelemetry Go: https://opentelemetry.io/docs/languages/go/
- Prometheus histograms: https://prometheus.io/docs/practices/histograms/
- Apache Kafka docs/design: https://kafka.apache.org/documentation/
- Ozon Tech public stack/profile: https://habr.com/ru/companies/ozontech/profile/

На 1 сентября 2026 года актуальный stable Go — Go 1.27.0 (релиз 19 августа 2026), поэтому новый pet-project разумно начинать на 1.27.x.

---

## 28. Инструкция для нового диалога

Если этот файл загружен в новый чат, работа должна идти итеративно:

1. сначала определить текущую фазу проекта;
2. просматривать существующий код перед предложением изменений;
3. объяснять причину каждой архитектурной проверки;
4. не переписывать код целиком, если пользователь хочет разобраться сам;
5. проверять domain invariants и согласованность state transitions после каждого изменения;
6. не добавлять технологии, которых нет в текущей/следующей фазе;
7. при ревью отдельно проверять correctness, concurrency, errors, DB access, testability и соответствие этому документу;
8. при выборе нескольких решений показывать trade-offs и рекомендовать одно.
