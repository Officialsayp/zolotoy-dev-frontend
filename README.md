# zolotoy.dev

**Bilingual Go backend engineering portfolio · Interactive service demos**

[English](#english) · [Русский](#русский)  
**Live:** [English](https://zolotoy.dev/) · [Русский](https://zolotoy.dev/ru/)

---

## English

### Overview

**zolotoy.dev** is a technical portfolio and interactive developer console for four Go backend service domains: **Order**, **Auth**, **Notification**, and **URL Shortener**. The public portfolio explains their architecture, contracts, and implementation status; the interactive demo lets visitors explore service scenarios without running the backends.

The frontend is one repository and one deployable build with two distinct layers:

- **Public portfolio:** six route families, statically prerendered in English and Russian (12 documents), with canonical URLs, `hreflang`, and a bilingual sitemap.
- **Interactive demo:** a Vue 3 SPA under `/demo/` with four lazy-loaded modules: [Orders](https://zolotoy.dev/demo/orders/), [Auth](https://zolotoy.dev/demo/auth/), [Notifications](https://zolotoy.dev/demo/notifications/), and [URL Shortener](https://zolotoy.dev/demo/shortener/).

### Highlights

- **Mock-first by design:** deterministic MSW scenarios cover order lifecycle and payments, sessions/RBAC, notification retries, and short-link management.
- **Honest implementation status:** simulated frontend flows are not presented as deployed backend APIs. The Go Order service is under development; the other backends remain planned.
- **Clear module boundaries:** a shared router, typed HTTP client, TanStack Query, Pinia stores, error model, and design system.
- **Bilingual and accessible:** independent prerendered EN/RU documents, keyboard-friendly controls, persistent language and theme preferences, and responsive layouts.
- **Technical SEO:** indexable public pages, canonical/`hreflang` metadata, Open Graph, JSON-LD, and a sitemap; demo routes remain `noindex`.
- **Fail-closed demo networking:** an unhandled request to a configured service origin in mock mode returns `501 MOCK_UNHANDLED_REQUEST` instead of reaching a real backend.

### Technology and architecture

Vue 3, TypeScript (strict), Vite, Vue Router, TanStack Vue Query, Pinia, native `fetch`, and MSW power the frontend. Vite SSR prerenders public pages **at build time**; there is no production runtime SSR. Vitest, Vue Test Utils, Playwright, ESLint, and Prettier provide verification.

```text
src/portfolio/       Public pages and presentation
src/content/         Typed service facts, evidence, and roadmap
src/app/             Interactive demo shell and router
src/modules/         Orders, auth, notifications, shortener
src/shared/          Shared HTTP, state, UI, themes, and routing
src/mocks/           Deterministic MSW scenarios
src/edge/            Cloudflare Worker reference/preview routing
deploy/nginx/        Nginx routing profile for Selectel
docs/                Architecture, API specs, and runbooks
.github/workflows/   CI and deployment
```

The canonical source for frontend service facts and claims is `src/content/**`. Backend behavior and API contracts are not inferred from mock screens.

### Local development

**Requirements:** Node.js ≥ 20.19 and npm (locked dependencies in `package-lock.json`).

```bash
git clone https://github.com/Officialsayp/zolotoy-dev-frontend.git
cd zolotoy-dev-frontend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The default `VITE_API_MODE=mock` does not require running a Go backend. Copy `env.example` to `.env.local` to configure local options; never put secrets in browser-visible `VITE_*` variables.

The alternative `real` mode sends requests to configured backend origins. It is an integration capability, **not** a claim that all four services are deployed.

### Build and checks

```bash
npm run lint             # ESLint
npm test                 # Vitest
npm run build            # Type-check, build, prerender, site checks
npm run preview          # Local Worker + built assets
npm run test:e2e         # Playwright; requires browser dependencies
npm run check:selectel   # Historical Worker/Caddy routing comparison
```

Nginx profile validation is separate: `bash scripts/check-nginx.sh` on Linux with the required Nginx/njs/headers-more packages. Existing Caddy checks remain reference tests and do **not** by themselves prove Nginx compatibility.

### Deployment

The production frontend is served by **Nginx on a Selectel VPS**. GitHub Actions verifies builds and, when explicitly enabled, publishes an immutable release from `main` with an atomic `current` symlink switch and HTTPS smoke tests. The public production root is `/var/www/zolotoy-dev-production/current`; staging uses `origin.zolotoy.dev` and a separate manual workflow.

Cloudflare Worker tooling is retained for preview and reference routing; running `npm run deploy` is a separate Cloudflare publication action, **not** the Selectel production deploy. TLS renewal and server-level recovery are administered separately from frontend releases.

See [Nginx profile](docs/deployment/NGINX.md), [production deployment](docs/deployment/SELECTEL_PRODUCTION.md), and [staging deployment](docs/deployment/SELECTEL_STAGING.md). The older [Caddy/lego TLS recovery guide](docs/deployment/SELECTEL_TLS_RECOVERY.md) is **historical** and must not be used as a live Nginx/Certbot procedure.

### Documentation and related repositories

- [Portfolio/demo architecture](docs/frontend/PORTFOLIO_ARCHITECTURE.md)
- [Backend requirements and service contracts](docs/backend-specs/)
- [Frontend engineering plan](docs/frontend/MASTER_FRONTEND_PLAN.md)
- [Go backend implementation](https://github.com/Officialsayp/zolotoy-dev-backend) — work in progress
- [System architecture and project status](https://github.com/Officialsayp/zolotoy-dev)
- [Cross-service infrastructure and recovery](https://github.com/Officialsayp/zolotoy-dev-infra)

---

## Русский

### О проекте

**zolotoy.dev** — техническое портфолио и интерактивная консоль разработчика, посвящённые четырём направлениям Go backend: **Order**, **Auth**, **Notification** и **URL Shortener**. Публичная часть объясняет архитектуру, контракты и реальную степень готовности сервисов. Демонстрационная часть позволяет изучать сценарии работы без запущенного backend.

Frontend находится в одном репозитории и собирается как единый релиз с двумя независимыми частями:

- **Публичное портфолио:** шесть групп маршрутов со статически подготовленными страницами на русском и английском (12 документов), canonical, `hreflang` и двуязычной картой сайта.
- **Интерактивная демонстрация:** SPA на Vue 3 по пути `/demo/` с четырьмя модулями, загружаемыми по требованию: [Заказы](https://zolotoy.dev/demo/orders/), [Авторизация](https://zolotoy.dev/demo/auth/), [Уведомления](https://zolotoy.dev/demo/notifications/) и [Сокращение ссылок](https://zolotoy.dev/demo/shortener/).

### Возможности

- **Демонстрация на моках:** воспроизводимые сценарии MSW для заказов и оплаты, сессий и RBAC, повторных попыток уведомлений и управления короткими ссылками.
- **Достоверный статус реализации:** интерфейсные демонстрации не выдаются за работающие backend API. Go-сервис заказов находится в разработке, остальные backend-сервисы запланированы.
- **Единая архитектура:** общие маршрутизатор, типизированный HTTP-клиент, TanStack Query, Pinia, модель ошибок и дизайн-система.
- **Два языка и доступность:** независимо сформированные страницы EN/RU, управление с клавиатуры, сохранение языка и темы, адаптивная вёрстка.
- **Техническое SEO:** индексируемые страницы, canonical, `hreflang`, Open Graph, JSON-LD и sitemap; страницы демо имеют `noindex`.
- **Изоляция моков:** необработанный запрос к настроенному backend-origin в режиме mock завершается ответом `501 MOCK_UNHANDLED_REQUEST` и не попадает в реальный сервис.

### Технологии и архитектура

Frontend построен на Vue 3, TypeScript (strict), Vite, Vue Router, TanStack Vue Query, Pinia, нативном `fetch` и MSW. Публичные страницы формируются посредством Vite SSR **во время сборки**; серверный SSR при обработке запросов не используется. Для проверки применяются Vitest, Vue Test Utils, Playwright, ESLint и Prettier.

```text
src/portfolio/       Публичные страницы
src/content/         Данные сервисов, подтверждения и дорожная карта
src/app/             Оболочка и маршрутизатор демо
src/modules/         Заказы, авторизация, уведомления, короткие ссылки
src/shared/          HTTP, состояние, UI, темы и маршрутизация
src/mocks/           Воспроизводимые сценарии MSW
src/edge/            Cloudflare Worker для проверки и предпросмотра
deploy/nginx/        Конфигурация маршрутизации Nginx для Selectel
docs/                Архитектура, спецификации и инструкции
.github/workflows/   CI и развёртывание
```

Единый источник сведений о реализации frontend и подтверждённых характеристиках сервисов — `src/content/**`. Контракты реальных API нельзя выводить из поведения моков.

### Локальный запуск

**Требования:** Node.js ≥ 20.19 и npm; версии зависимостей зафиксированы в `package-lock.json`.

```bash
git clone https://github.com/Officialsayp/zolotoy-dev-frontend.git
cd zolotoy-dev-frontend
npm ci
npm run dev
```

Открой [http://localhost:5173](http://localhost:5173). По умолчанию используется `VITE_API_MODE=mock`, поэтому Go backend не нужен. Для локальных параметров скопируй `env.example` в `.env.local`. Секреты нельзя помещать в доступные браузеру переменные `VITE_*`.

Режим `real` отправляет запросы к настроенным адресам backend. Наличие такого режима **не означает**, что все четыре сервиса развёрнуты.

### Сборка и проверки

```bash
npm run lint             # ESLint
npm test                 # Vitest
npm run build            # Типизация, сборка, prerender, проверки
npm run preview          # Локальный Worker и собранные файлы
npm run test:e2e         # Playwright; нужны браузерные зависимости
npm run check:selectel   # Историческое сравнение Worker/Caddy
```

Проверка профиля Nginx запускается отдельно: `bash scripts/check-nginx.sh` в Linux с установленными Nginx/njs/headers-more. Тесты Caddy сохранены как эталон поведения, но **не подтверждают** корректность Nginx сами по себе.

### Публикация

Production-frontend обслуживает **Nginx на VPS Selectel**. GitHub Actions проверяет сборки и, при включённом деплое, публикует неизменяемый релиз из `main` с атомарным переключением симлинка `current` и проверками HTTPS. Корневой каталог production — `/var/www/zolotoy-dev-production/current`; для staging `origin.zolotoy.dev` предусмотрен отдельный ручной workflow.

Cloudflare Worker сохраняется для предпросмотра и эталонной маршрутизации. Команда `npm run deploy` публикует отдельно в Cloudflare и **не** обновляет Selectel production. Продление TLS-сертификатов и аварийное восстановление сервера управляются отдельно от frontend-релизов.

Подробности: [профиль Nginx](docs/deployment/NGINX.md), [production deployment](docs/deployment/SELECTEL_PRODUCTION.md), [staging deployment](docs/deployment/SELECTEL_STAGING.md). Старый [runbook Caddy/lego](docs/deployment/SELECTEL_TLS_RECOVERY.md) — **исторический документ**, а не действующая инструкция для Nginx/Certbot.

### Документация и связанные репозитории

- [Архитектура портфолио и демо](docs/frontend/PORTFOLIO_ARCHITECTURE.md)
- [Требования и контракты backend-сервисов](docs/backend-specs/)
- [План разработки frontend](docs/frontend/MASTER_FRONTEND_PLAN.md)
- [Реализация Go backend](https://github.com/Officialsayp/zolotoy-dev-backend) — в разработке
- [Общая архитектура и статус проекта](https://github.com/Officialsayp/zolotoy-dev)
- [Инфраструктура и восстановление](https://github.com/Officialsayp/zolotoy-dev-infra)
