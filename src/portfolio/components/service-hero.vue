<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceCase } from '@/content/types'
import { tr } from '@/portfolio/i18n'
import ServiceStatus from './service-status.vue'
import ResourceLinks from './resource-links.vue'

const props = defineProps<{ service: ServiceCase; locale?: 'en' | 'ru' }>()

const locale = computed(() => props.locale ?? 'en')

const labels = computed(() => ({
  subtitle: tr({ en: 'Service case study', ru: 'Кейс сервиса' }, locale.value),
  backendRuntime: tr({ en: 'Backend runtime', ru: 'Рантайм бэкенда' }, locale.value),
  demoDataSource: tr({ en: 'Demo data source', ru: 'Источник данных демо' }, locale.value),
  scope: tr({ en: 'Scope', ru: 'Область применения' }, locale.value),
  notScope: tr({ en: 'Not in scope', ru: 'Не входит в область' }, locale.value),
  focus: tr({ en: 'Engineering focus', ru: 'Инженерный фокус' }, locale.value),
}))
</script>

<template>
  <section class="portfolio-hero service-hero">
    <p class="portfolio-hero__subtitle">{{ labels.subtitle }}</p>
    <h1>{{ tr(service.nameLocalized, locale) }}</h1>
    <p class="portfolio-hero__intro">{{ tr(service.summary, locale) }}</p>
    <p>
      <ServiceStatus :service="service" :locale="locale" />
      <span aria-hidden="true"> · </span>
      <span>{{ labels.backendRuntime }}: {{ tr(service.runtimeLabel, locale) }}</span>
      <span aria-hidden="true"> · </span>
      <span>{{ labels.demoDataSource }}: {{ service.demoMode === 'mock' ? (locale === 'ru' ? 'Mock' : 'Mock') : service.demoMode }}</span>
    </p>
    <dl class="fact-list">
      <dt>{{ labels.scope }}</dt>
      <dd>{{ tr(service.declaredScope, locale) }}</dd>
      <dt>{{ labels.notScope }}</dt>
      <dd>
        <ul class="service-hero__not-scope">
          <li v-for="item in service.notScope" :key="item.en">{{ tr(item, locale) }}</li>
        </ul>
      </dd>
      <dt>{{ labels.focus }}</dt>
      <dd>{{ tr(service.engineeringFocus, locale) }}</dd>
    </dl>
    <ResourceLinks :service="service" :locale="locale" />
  </section>
</template>

<style scoped>
.service-hero__not-scope {
  margin: 0;
  padding-left: var(--space-4);
  color: var(--c-text-muted);
}
</style>
