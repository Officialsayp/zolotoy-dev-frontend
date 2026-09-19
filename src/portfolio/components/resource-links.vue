<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceCase } from '@/content/types'
import { serviceDemoUrl } from '@/content/service-registry'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ service: ServiceCase; locale?: 'en' | 'ru' }>()

const locale = computed(() => props.locale ?? 'en')

const labels = computed(() => ({
  spec: tr({ en: 'Specification', ru: 'Спецификация' }, locale.value),
  source: tr({ en: 'Source (backend)', ru: 'Исходники (бэкенд)' }, locale.value),
  demo: tr({ en: 'Interactive demo', ru: 'Интерактивное демо' }, locale.value),
  demoUrl: locale.value === 'ru' ? serviceDemoUrl(props.service.id) + '?lang=ru' : serviceDemoUrl(props.service.id),
}))
</script>

<template>
  <ul class="resource-links">
    <li v-if="service.specUrl">
      <a :href="service.specUrl" rel="noopener noreferrer">{{ labels.spec }}</a>
    </li>
    <li v-if="service.sourceUrl">
      <a :href="service.sourceUrl" rel="noopener noreferrer">{{ labels.source }}</a>
    </li>
    <li>
      <a :href="labels.demoUrl">{{ labels.demo }}</a>
    </li>
  </ul>
</template>

<style scoped>
.resource-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.resource-links a {
  color: var(--c-accent);
  font-weight: 600;
}
</style>
