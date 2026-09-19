<script setup lang="ts">
/** Static noindex 404 document (also served with HTTP 404 by the Worker). */
import { tr } from '@/portfolio/i18n'

defineProps<{ locale?: 'en' | 'ru' }>()
</script>

<template>
  <section class="portfolio-hero">
    <h1>404 — {{ tr({ en: 'Page not found', ru: 'Страница не найдена' }, locale ?? 'en') }}</h1>
    <p class="portfolio-hero__intro">
      {{ tr(
        {
          en: 'This address does not match a public document or demo route.',
          ru: 'Этот адрес не соответствует публичному документу или демо-маршруту.',
        },
        locale ?? 'en',
      ) }}
    </p>
    <div class="portfolio-hero__ctas">
      <a class="portfolio-btn portfolio-btn--primary" href="/">{{ tr({ en: 'Portfolio home', ru: 'Главная портфолио' }, locale ?? 'en') }}</a>
      <a class="portfolio-btn portfolio-btn--secondary" href="/demo/">{{ tr({ en: 'Open the demo', ru: 'Открыть демо' }, locale ?? 'en') }}</a>
    </div>
  </section>
</template>
