<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceCase } from '@/content/types'
import { serviceDemoUrl } from '@/content/service-registry'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ service: ServiceCase; locale?: 'en' | 'ru' }>()

const locale = computed(() => props.locale ?? 'en')
const copy = computed(() => ({
  heading: tr({ en: 'Interactive demo', ru: 'Интерактивное демо' }, locale.value),
  body: tr(
    {
      en: 'The demo runs on deterministic mock data (MSW) and shows the module’s visible flows.',
      ru: 'Демо работает на детерминированных моках (MSW) и показывает видимые потоки модуля.',
    },
    locale.value,
  ),
  dataSource: tr({ en: 'Data source', ru: 'Источник данных' }, locale.value),
  backendRuntime: tr({ en: 'Backend runtime', ru: 'Рантайм бэкенда' }, locale.value),
  open: tr(
    {
      en: `Open the ${tr(props.service.shortLabel, locale.value)} demo`,
      ru: `Открыть демо «${tr(props.service.shortLabel, locale.value)}»`,
    },
    locale.value,
  ),
  overview: tr({ en: 'Demo overview', ru: 'Обзор демо' }, locale.value),
}))
</script>

<template>
  <aside class="demo-callout portfolio-card">
    <h3>{{ copy.heading }}</h3>
    <p>{{ copy.body }} {{ tr(service.declaredScope, locale) }}</p>
    <p>
      <strong>{{ copy.dataSource }}:</strong> {{ service.demoMode === 'mock' ? 'Mock' : service.demoMode }} ·
      <strong>{{ copy.backendRuntime }}:</strong> {{ tr(service.runtimeLabel, locale) }}
    </p>
    <div class="portfolio-card__actions">
      <a class="is-primary" :href="serviceDemoUrl(service.id)">{{ copy.open }}</a>
      <a href="/demo/">{{ copy.overview }}</a>
    </div>
  </aside>
</template>

<style scoped>
.demo-callout {
  background: var(--c-surface-muted);
}
</style>
