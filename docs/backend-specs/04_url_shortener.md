# URL Shortener + Analytics — портфолио-проект для Go Backend / Ozon Tech

> **Назначение файла:** самостоятельный source of truth для отдельного диалога по URL Shortener. Это маленький сервис, в котором основная ценность — hot read path, Redis cache, cache stampede, singleflight, rate limiting, key generation, performance measurement и eventual analytics.

## 1. Зачем нужен этот проект

URL Shortener специально должен быть меньше Order/Auth/Notification, но технически «острым».

Он показывает:

- высокочастотный read path;
- кеширование Redis;
- cache-aside и invalidation;
- negative caching;
- cache stampede и `singleflight`;
- генерацию коротких уникальных ключей;
- PostgreSQL indexes;
- rate limiting;
- конкурентность Go;
- batching асинхронной аналитики;
- профилирование/benchmarks/load tests;
- trade-off между durability и latency.

Проект не должен становиться Bitly-клоном со ста функционциями.

---

## 2. Позиционирование

**Repository:** `url-shortener`

**Canonical service name:** `url-shortener`

**GitHub description:**

> High-performance URL shortener in Go with PostgreSQL, Redis cache-aside, singleflight stampede protection, rate limiting, asynchronous batched analytics, OpenTelemetry and reproducible load tests.

### Главная техническая тема

**Read performance + caching + concurrency**, а не CRUD ссылок.

---

## 3. Stack

### Backend

- Go 1.27.x+;
- `net/http` + `chi`;
- PostgreSQL;
- `pgx/v5`;
- Redis;
- `golang.org/x/sync/singleflight`;
- `log/slog`;
- OpenTelemetry;
- Prometheus/Grafana;
- OpenAPI for management API.

> Внутренние платформенные библиотеки Ozon из предоставленных материалов не являются зависимостями pet-project. Сервис должен запускаться у любого интервьюера на публичном OSS-стеке; из внутренних конвенций переносим инженерные принципы, а не корпоративную инфраструктуру.

### Frontend — минимально

Vue 3 + TypeScript:

- создать short link;
- скопировать short URL;
- список своих links;
- enable/disable/delete;
- dashboard clicks by day/referrer/device category.

### Infrastructure

Docker Compose:

- url-shortener;
- PostgreSQL;
- Redis;
- Prometheus/Grafana.

Kafka и ClickHouse в core **не нужны**. ClickHouse — только optional analytics stretch после законченного проекта.

---

## 4. Functional scope

### Link management

- создать короткую ссылку;
- optional custom alias;
- optional expiration;
- получить metadata;
- список ссылок пользователя;
- disable/enable;
- delete logically;
- получить analytics summary.

### Redirect

```text
GET /{code}
-> 302/307 redirect to original URL
```

Рекомендуется выбрать `302 Found` для обычной изменяемой short URL semantics и объяснить отличие от 301/307/308.

### Analytics

Считать минимум:

- clicks total;
- clicks by day;
- referrer domain;
- coarse user-agent/device category;
- optionally country только если не требует внешнего GeoIP complexity.

Не хранить лишние персональные данные/IP без необходимости.

---

## 5. API

Management API:

```text
POST   /api/v1/links
GET    /api/v1/links/{id}
GET    /api/v1/links
PUT    /api/v1/links/{id}
DELETE /api/v1/links/{id}
GET    /api/v1/links/{id}/analytics
GET    /health/live
GET    /health/ready
GET    /metrics
GET    /swagger.json
```

Hot redirect path:

```text
GET /{code}
```

Важно держать redirect endpoint коротким и не смешивать его handler с тяжелой management/auth logic.

### Create request

```json
{
  "url": "https://example.com/some/long/path",
  "custom_alias": "docs",
  "expires_at": "2026-12-31T00:00:00Z"
}
```

`custom_alias` optional.

### Response

```json
{
  "id": "uuid",
  "code": "Ab3xP9qK",
  "short_url": "https://s.example/Ab3xP9qK",
  "url": "https://example.com/some/long/path",
  "expires_at": "...",
  "created_at": "..."
}
```

---

## 6. URL validation

Разрешить минимум:

```text
http
https
```

Запретить/отфильтровать:

- `javascript:`;
- `data:`;
- malformed URLs;
- слишком длинный URL;
- control characters.

### SSRF nuance

Сам redirect service **не делает server-side request к target URL**, поэтому классический SSRF через target отсутствует.

Если позже появится preview/title fetching — это уже SSRF-sensitive feature и требует отдельной защиты. Не добавлять preview в MVP.

---

## 7. Short code generation

### Рекомендуемый подход

Случайный fixed-length base62 code из `crypto/rand`.

Alphabet:

```text
0-9 A-Z a-z
```

Длина MVP: 8 символов.

Пространство:

```text
62^8 ≈ 218 триллионов комбинаций
```

### Algorithm

1. сгенерировать криптографически случайный code;
2. попытаться `INSERT`;
3. unique constraint на `code`;
4. при collision — сгенерировать снова, ограниченное число попыток;
5. не делать предварительный `SELECT exists` как единственную защиту — это race.

### Почему не auto-increment -> base62 как основной вариант

Плюсы sequence-based:

- нет collision;
- короткие codes;
- простая генерация.

Минусы:

- легко перечислять/угадывать соседние IDs;
- centralized ID allocation;
- может раскрывать growth/volume.

Для портфолио random code дает интересный разговор про birthday paradox/collision probability и DB uniqueness.

### Custom aliases

Custom alias использует тот же unique namespace и проходит validation:

- 4–32 chars;
- alphanumeric + `-`/`_`;
- reserved words blacklist: `api`, `health`, `metrics`, `swagger.json`, etc.

---

## 8. PostgreSQL schema

### `links`

```text
id UUID PK
owner_id UUID NULL
code VARCHAR(32) NOT NULL
original_url TEXT NOT NULL
status TEXT NOT NULL
expires_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
version BIGINT NOT NULL
```

Unique index:

```text
UNIQUE(code)
```

Owner listing index:

```text
(owner_id, created_at DESC, id DESC)
```

### `click_stats_daily`

```text
link_id UUID NOT NULL
date DATE NOT NULL
referrer_domain TEXT NOT NULL
device_type TEXT NOT NULL
clicks BIGINT NOT NULL
PRIMARY KEY(link_id, date, referrer_domain, device_type)
```

### Raw `click_events` — optional

Если хочется показать batching и retention, можно хранить raw events ограниченное время:

```text
id BIGSERIAL
link_id UUID
occurred_at TIMESTAMPTZ
referrer_domain TEXT
device_type TEXT
```

Но для первого варианта достаточно batch upsert aggregate stats.

---

## 9. Redirect hot path

Целевой алгоритм:

```text
GET /{code}
  -> validate code shape
  -> Redis GET link:{code}
      HIT:
        validate active/expiry from cached object
        enqueue analytics event non-blocking/bounded
        redirect
      MISS:
        singleflight(code)
          -> PostgreSQL SELECT
          -> cache positive/negative result
        enqueue analytics
        redirect / 404/410
```

### Цель

На cache hit redirect не должен ходить в PostgreSQL.

---

## 10. Cache-aside

Redis key:

```text
link:{code}
```

Cached value:

```json
{
  "url": "https://...",
  "status": "active",
  "expires_at": "...",
  "version": 7
}
```

### TTL

```text
cache TTL = min(configuredTTL, time_until_link_expiration)
```

Если link бессрочная — обычный configured TTL, например 10–30 минут.

### Update/delete

Основная схема:

```text
1. update PostgreSQL
2. commit
3. invalidate Redis key
```

Если invalidation не удалась, TTL ограничивает stale window. Для более строгой схемы stretch — outbox/cache invalidation event/versioning.

### Почему DB first

База — source of truth. Нельзя успешно обновить только cache, а потом потерять change.

---

## 11. Cache stampede и singleflight

Сценарий:

- популярный link отсутствует в cache;
- одновременно приходит 5 000 requests;
- все идут в PostgreSQL;
- DB получает spike.

В рамках одного process использовать `singleflight.Group` по `code`:

```text
5000 goroutines
-> one DB lookup
-> shared result
```

### Ограничение

`singleflight` работает только внутри одного instance.

При 10 replicas каждый instance потенциально сделает один запрос. Это обычно уже достаточно хорошее улучшение.

Не добавлять distributed lock без измеримой необходимости.

### Что еще обсудить

- request cancellation: один caller отменился, а shared call нужен другим;
- negative results;
- hot key;
- stale cache.

---

## 12. Negative caching

Несуществующий code тоже может быть hot (боты/scanners).

После DB miss кешировать marker:

```text
NOT_FOUND TTL 30–60s
```

Не ставить долгий TTL: custom alias с таким code может быть создан вскоре после miss.

При успешном create alias negative cache key нужно удалить.

### Cache penetration

Negative caching снижает повторные DB queries на invalid/random codes.

---

## 13. Redis failure policy

Redirect service не должен полностью умереть из-за Redis outage.

Policy:

```text
Redis error -> fallback PostgreSQL
```

Но при большой нагрузке это создает cache-failure stampede на DB.

Mitigations:

- singleflight;
- DB pool cap;
- timeout;
- circuit/bulkhead thinking;
- alert;
- load-shedding/rate limit при saturation — stretch.

Нужно понимать: cache — optimization, source of truth — PostgreSQL. Но architecture обязана учитывать, выдержит ли DB fallback traffic.

---

## 14. Rate limiting

Redis используется вторым оправданным способом.

Limit минимум:

- create link per user/IP;
- management mutations;
- optionally abusive invalid-code redirect patterns.

Не rate-limit нормальные redirects слишком агрессивно, иначе сервис теряет смысл.

### Algorithm

Для MVP:

- fixed window с atomic counter + TTL;

или

- token bucket/sliding window для более гладкого поведения.

Нужно уметь объяснить:

- fixed window burst на границе окна;
- sliding window точнее, но дороже;
- Redis shared state нужен при horizontal scaling.

---

## 15. Analytics: осознанный trade-off

Redirect latency не должен ждать записи аналитики в PostgreSQL.

### Core design

Handler отправляет небольшой event в **bounded in-process channel**.

```text
redirect request
 -> analytics channel
 -> batching worker
 -> batch upsert PostgreSQL
```

Worker flush:

- по batch size, например 500;
- или timer, например 1s;
- whichever comes first.

### Важная семантика

Это **at-most-once / best-effort analytics** при crash процесса: events в памяти могут потеряться.

Для click analytics это допустимо в MVP и даже полезно на интервью: кандидат сознательно выбрал latency/простоту вместо durability.

### Backpressure/drop policy

Bounded channel нельзя превращать в latency dependency.

Если channel full:

- либо drop analytics event и increment `analytics_dropped_total`;
- либо short non-blocking timeout.

Redirect не должен ждать секунды из-за analytics.

### Stretch durability

Если потребуются точные stats:

```text
redirect -> Kafka
Kafka -> analytics consumer -> ClickHouse/Postgres
```

Но это отдельная complexity tier, а Notification Service уже демонстрирует Kafka.

---

## 16. Batching в Go

Worker должен показать аккуратную concurrency implementation:

```text
select {
case ev := <-ch:
    append batch
    if len(batch) >= maxBatch { flush() }
case <-ticker.C:
    if len(batch) > 0 { flush() }
case <-ctx.Done():
    final flush with deadline
}
```

Preallocate batch capacity.

Не делать shared append из нескольких goroutines без synchronization. Один batching goroutine владеет batch slice — простой ownership model.

Это напрямую демонстрирует KISS и отсутствие data races.

---

## 17. Analytics aggregation SQL

Batch aggregate в памяти по key:

```text
(link_id, date, referrer_domain, device_type) -> count
```

Потом multi-row upsert:

```sql
INSERT ...
ON CONFLICT (...)
DO UPDATE SET clicks = click_stats_daily.clicks + EXCLUDED.clicks;
```

Для большого volume сравнить:

- individual INSERT;
- multi-row batch;
- `COPY` + merge — stretch.

Сделать benchmark/report, а не выбирать «самое быстрое» без измерений.

---

## 18. Analytics parsing

### Referrer

Сохранять только normalized domain, не full URL query, чтобы не собирать лишние sensitive params.

### User-Agent

Разбить грубо:

```text
mobile
desktop
bot
unknown
```

Не строить идеальный device detection engine.

### IP

Core analytics не требует хранения raw IP.

Если rate limiter использует IP, ключ в Redis краткоживущий. Для telemetry избегать high-cardinality IP labels.

---

## 19. Cache invalidation race

Классический race:

```text
reader cache miss
reader DB gets old v1
writer DB writes v2 + invalidate
reader populates cache with v1
```

Нужно хотя бы **понимать** эту проблему.

### Варианты решения

- version в cached object и compare/set logic;
- delayed double delete;
- write-through/event-driven cache update;
- short TTL + accept eventual inconsistency;
- serialize population/update per key;
- Redis Lua/CAS-like version check.

Для этого проекта core решение может быть: version field + short TTL + documented eventual consistency. Stretch — version-aware cache population.

Важно не притворяться, что `update DB -> DEL cache` исключает все races.

---

## 20. Expiration and disabled links

Redirect behavior:

```text
active + not expired -> redirect
expired -> 410 Gone or 404, выбрать policy
 disabled/deleted -> 404/410 according to API policy
```

С точки зрения privacy часто лучше не раскрывать лишние различия публичному caller. Можно возвращать один `404` для unavailable link, а management API показывает точный status.

В cache хранить status/expiry, чтобы не ходить в DB только для проверки.

---

## 21. Pagination

Management list — keyset pagination:

```text
ORDER BY created_at DESC, id DESC
```

Cursor `(created_at, id)`.

Не использовать deep OFFSET как основной дизайн.

---

## 22. Architecture layout

```text
cmd/url-shortener/main.go
internal/
  domain/link/
  application/
    links/
    redirect/
    analytics/
    ports/
  infrastructure/
    postgres/
    redis/
    observability/
  transport/http/
  worker/analytics/
  config/
migrations/
api/openapi.yaml
docs/
benchmarks/
```

### Interfaces

Оправданы:

```text
LinkRepository
LinkCache
CodeGenerator
AnalyticsSink/Recorder
RateLimiter
Clock
```

Не нужен generic repository.

---

## 23. HTTP correctness

### Redirect code

Выбрать и документировать:

- `302` — browser может менять method semantics; привычен для shorteners;
- `307` — сохраняет method;
- `301/308` — permanent cache behavior может затруднить update destination.

Для MVP: `302` для GET-only public redirect — практично.

### Headers

- `Location`;
- разумный `Cache-Control`, не допускать permanent client caching, если destination может меняться;
- management JSON `Content-Type: application/json`.

### Timeouts

HTTP server имеет explicit read/write/idle/header timeouts.

---

## 24. Observability

### Redirect metrics

- redirect requests/sec;
- success/not_found/expired/disabled;
- latency histogram;
- cache hit/miss/error;
- cache hit ratio;
- DB fallback count;
- singleflight shared calls;
- code generation collisions;
- rate-limit rejects.

### Analytics

- channel depth;
- events queued;
- events dropped;
- batch size histogram;
- flush latency;
- flush errors.

### DB/Redis

- latency;
- pool usage;
- errors.

### Go runtime

- goroutines;
- GC pause/heap;
- allocations where relevant.

### Tracing

Redirect trace:

```text
HTTP
 -> Redis
 -> (miss) singleflight
      -> PostgreSQL
 -> enqueue analytics
```

Sample traces rather than trace 100% high-RPS production traffic. Для demo можно 100%.

---

## 25. Performance work

Этот проект обязан иметь `docs/performance.md`.

### Benchmark stages

1. redirect from PostgreSQL without Redis;
2. Redis cache hit;
3. concurrent cache miss without singleflight;
4. concurrent miss with singleflight;
5. analytics sync write vs async batch;
6. service with Redis outage fallback.

### Load test

Использовать k6/vegeta/hey.

Report должен указывать:

- machine;
- Docker/native;
- concurrency;
- duration;
- dataset/cache warmness;
- RPS;
- p50/p90/p95/p99;
- error rate;
- CPU/memory;
- DB/Redis load.

Не писать в README «выдерживает 100k RPS», если это не воспроизводимо.

### Profiling

Под нагрузкой использовать `pprof`:

- CPU profile;
- heap;
- goroutines;
- allocations.

Минимум один реальный optimization before/after с доказательством.

---

## 26. Hot keys

Очень популярная short URL становится hot key.

Redis обычно хорошо справляется, но на большой распределенной системе возникают вопросы:

- network/Redis node saturation;
- replica reads;
- local in-process L1 cache;
- consistent hashing/sharding;
- CDN/edge caching.

Для pet-project это **discussion/stretch**, не обязательная реализация.

Можно добавить tiny L1 cache только после измерения; иначе Redis достаточно.

---

## 27. Consistent hashing — conceptual stretch

Нужно уметь объяснить, но не обязательно реализовывать production cluster:

- обычный `hash(key) % N` массово remap-ит keys при изменении N;
- consistent hashing уменьшает долю remapped keys;
- применяется при client-side sharding/cache nodes.

Можно сделать маленький отдельный benchmark/demo package, но не загрязнять основную архитектуру.

---

## 28. Reliability

### PostgreSQL unavailable

- cached known link может продолжить redirect, если cache hit и cache policy это допускает;
- cache miss -> fail fast 5xx/503-like public policy;
- не зависать на длинном DB timeout.

### Redis unavailable

- fallback DB;
- singleflight;
- metric/alert;
- DB pool bounded.

### Analytics DB error

- redirect продолжает работать;
- batch может ограниченно retry;
- при полном buffer pressure analytics events могут drop согласно documented policy.

Это демонстрирует приоритет critical path над secondary analytics.

---

## 29. Testing

### Unit

- code generator alphabet/length;
- URL validation;
- expiration;
- reserved aliases;
- cache result interpretation;
- analytics batching aggregation.

### Property/fuzz

Хороший кандидат для fuzz:

- arbitrary URL parser inputs;
- short code validation;
- cursor decode.

### Integration

PostgreSQL:

- unique collision;
- indexes/query behavior;
- keyset pagination;
- analytics upsert.

Redis:

- cache hit/miss;
- TTL;
- negative cache;
- invalidation;
- rate limit.

### Concurrency

- 100 goroutines same cold code -> DB lookup count ~1 per instance with singleflight;
- analytics batching no race;
- channel saturation/drop policy;
- graceful shutdown flush.

### Race

```text
go test -race ./...
```

---

## 30. CI/CD

```text
format/imports
-> vet
-> golangci-lint
-> unit tests
-> race tests
-> Postgres/Redis integration
-> build
-> docker build
-> small benchmark regression/smoke (не flaky hard threshold)
```

Load test лучше отдельным workflow/manual job.

---

## 31. Documentation / ADR

README:

- architecture diagram;
- redirect critical path;
- cache strategy;
- singleflight diagram;
- code-generation math;
- analytics loss semantics;
- load test summary;
- dashboards;
- known limitations.

ADR:

```text
ADR-001 random base62 codes
ADR-002 PostgreSQL as source of truth + Redis cache-aside
ADR-003 singleflight stampede protection
ADR-004 best-effort in-process analytics
ADR-005 cache invalidation consistency model
ADR-006 Redis outage fallback policy
```

---

## 32. Development phases

### Phase 0 — skeleton

- Go HTTP service;
- Postgres;
- migrations;
- create/get/redirect baseline;
- tests/CI.

### Phase 1 — correct link model

- random code;
- unique collision handling;
- custom alias;
- expiry/disable;
- management list/keyset.

### Phase 2 — Redis

- cache-aside;
- invalidation;
- TTL;
- negative cache;
- Redis failure fallback.

### Phase 3 — concurrency/performance

- singleflight;
- metrics;
- rate limiter;
- concurrent tests;
- pprof/load baseline.

### Phase 4 — analytics

- bounded channel;
- batching worker;
- daily aggregate;
- dropped-event metric;
- graceful final flush.

### Phase 5 — production quality

- OpenTelemetry;
- Grafana;
- OpenAPI;
- frontend;
- performance report;
- ADR/README.

**Interview-ready.**

### Stretch

- durable analytics Kafka pipeline;
- ClickHouse analytics;
- L1 cache;
- consistent-hash cache shard demo;
- Kubernetes/Helm;
- QR generation frontend-only;
- abuse/phishing reputation service discussion.

---

## 33. Definition of Done

- create + redirect + management работают;
- code generation использует `crypto/rand` и DB unique constraint;
- Redis cache-aside работает;
- negative caching есть;
- update/delete invalidates cache;
- Redis outage fallback протестирован;
- singleflight уменьшает duplicate DB reads на cold hot-key;
- rate limiter distributed через Redis;
- analytics не увеличивает critical redirect latency синхронной DB записью;
- analytics batching bounded и observable;
- `go test -race` проходит;
- load test reproducible;
- p95/p99 присутствуют в report;
- Grafana показывает cache hit ratio/redirect latency/errors;
- README честно описывает eventual/stale/loss trade-offs.

---

## 34. Что не делать

- не добавлять Kafka в core только ради резюме;
- не писать свой Redis;
- не делать distributed lock для каждого redirect;
- не писать SELECT-before-INSERT как гарантию uniqueness;
- не хранить analytics sync в critical path;
- не запускать goroutine на каждый click без bound;
- не хранить raw IP/referrer query без причины;
- не добавлять Elasticsearch;
- не шардировать PostgreSQL до benchmark;
- не делать microservices из redirect/api/analytics на старте;
- не оптимизировать без профиля/измерения.

---

## 35. Что нужно уметь защитить на интервью

1. Почему random Base62?
2. Сколько комбинаций у 8 chars?
3. Birthday paradox и collision probability.
4. Почему DB unique constraint — финальная гарантия?
5. Почему `SELECT exists` перед INSERT не защищает от race?
6. UUID vs sequence vs random short code.
7. Cache-aside.
8. Write-through/write-back/read-through отличия.
9. Cache invalidation.
10. Eventual consistency cache.
11. Классический stale-population race.
12. TTL trade-off.
13. Negative caching/cache penetration.
14. Cache stampede.
15. Как работает singleflight?
16. Почему singleflight не distributed?
17. Нужно ли distributed lock?
18. Что произойдет при Redis outage?
19. Может ли DB выдержать cache miss storm?
20. Hot key.
21. Consistent hashing.
22. Rate limiting algorithms.
23. Atomic INCR+expiry issue.
24. Почему analytics можно потерять?
25. At-most-once vs at-least-once для analytics.
26. Bounded channel/backpressure.
27. Почему shared slice append из goroutines опасен?
28. Как batching снижает DB overhead?
29. Почему average latency хуже p95/p99?
30. Histogram vs summary в Prometheus.
31. Как читать cache hit ratio?
32. Как искать bottleneck через pprof?
33. Как понять, что bottleneck в DB, Redis, CPU или network?
34. Какие индексы нужны links table?
35. Почему large OFFSET плох?
36. Что покажет EXPLAIN ANALYZE?
37. Как изменится архитектура при 1M RPS?
38. Когда нужен CDN/L1 cache/sharding?
39. Как не потерять critical redirect availability из-за analytics?
40. Что именно доказывает load test и чего он не доказывает?

---

## 36. Демонстрационный сценарий

1. создать short link;
2. первый redirect -> Redis miss + PostgreSQL;
3. второй redirect -> cache hit;
4. Grafana показывает hit/miss;
5. удалить Redis key;
6. одновременно запустить сотни requests на один code;
7. показать singleflight и небольшое число DB queries;
8. выключить Redis -> redirects продолжают работать через PostgreSQL;
9. включить analytics provider slowdown/DB slowdown -> redirect latency остается почти неизменной, а dropped/queued metrics растут согласно policy;
10. открыть analytics dashboard;
11. показать performance report cache-off vs cache-on.

---

## 37. Источники и основания

### Предоставленные материалы Ozon

- `GO_interviewer.md` — singleflight, concurrency/data races, service metrics, production diagnostics, batching-related thinking;
- `System_Design_interviewer.md` — cache strategies, invalidation races, consistent hashing, idempotency/system design;
- `databases_non_de_interviewer.md` — PostgreSQL indexes/query plans/vacuum/connections;
- `Конвенции _ Golang` — KISS/YAGNI, test/race/linters, capacity;
- `Конвенции _ микросервисы` — REST, errors, tests, observability;
- `Стабильность микросервисов` — error rate/response-time quantiles/SLI-SLO.

### Публичные источники

- Redis rate limiter: https://redis.io/docs/latest/develop/use-cases/rate-limiter/
- Redis `INCR`: https://redis.io/docs/latest/commands/incr/
- Redis Sorted Sets: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- PostgreSQL docs: https://www.postgresql.org/docs/current/
- PostgreSQL partial indexes: https://www.postgresql.org/docs/current/indexes-partial.html
- Prometheus histograms: https://prometheus.io/docs/practices/histograms/
- OpenTelemetry Go: https://opentelemetry.io/docs/languages/go/
- Go release history: https://go.dev/doc/devel/release
- Ozon Tech public stack: https://habr.com/ru/companies/ozontech/profile/

---

## 38. Инструкция для нового диалога

1. Сначала установить текущую phase и посмотреть фактический код.
2. Не оптимизировать до корректной baseline реализации и измерения.
3. Для каждого cache change проверять miss/hit/invalidation/expiry/failure path.
4. Для каждого concurrency change проверять race detector, ownership и shutdown.
5. Для каждого performance утверждения требовать benchmark/load-test evidence.
6. Не добавлять Kafka/ClickHouse/sharding до interview-ready core.
7. При code review отдельно проверять critical redirect path, Redis fallback, DB query count, stale-cache races, bounded analytics и cardinality metrics.
8. Пользователь должен сам понимать причины оптимизаций; давать код итерациями и объяснять, что именно измеряется.
