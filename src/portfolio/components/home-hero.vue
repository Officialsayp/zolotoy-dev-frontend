<script setup lang="ts">
import { computed } from 'vue'
import { SITE_CONTENT } from '@/content/site'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ locale?: 'en' | 'ru' }>()
const locale = computed(() => props.locale ?? 'en')

const ctas = computed(() => ({
  primary: tr({ en: 'Explore Order Service', ru: 'Изучить Order-сервис' }, locale.value),
  source: tr({ en: 'View backend source', ru: 'Открыть исходники бэкенда' }, locale.value),
  demo: tr({ en: 'Open interactive demo', ru: 'Открыть интерактивное демо' }, locale.value),
}))
</script>

<template>
  <section class="portfolio-hero">
    <p class="portfolio-hero__subtitle">{{ tr(SITE_CONTENT.hero.subtitle, locale) }}</p>
    <h1>{{ tr(SITE_CONTENT.hero.title, locale) }}</h1>
    <p class="portfolio-hero__intro">{{ tr(SITE_CONTENT.hero.intro, locale) }}</p>
    <div class="portfolio-hero__ctas">
      <a class="portfolio-btn portfolio-btn--primary" href="/services/order/">{{ ctas.primary }}</a>
      <a
        class="portfolio-btn portfolio-btn--secondary"
        href="https://github.com/Officialsayp/zolotoy-dev-backend"
        rel="noopener noreferrer"
      >{{ ctas.source }}</a>
      <a class="portfolio-btn portfolio-btn--secondary" :href="locale === 'ru' ? '/demo/?lang=ru' : '/demo/'">{{ ctas.demo }}</a>
    </div>
  </section>
</template>
