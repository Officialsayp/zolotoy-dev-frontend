<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceCase } from '@/content/types'
import { serviceCaseStudyUrl, serviceDemoUrl } from '@/content/service-registry'
import { tr } from '@/portfolio/i18n'
import ServiceStatus from './service-status.vue'

const props = defineProps<{ service: ServiceCase; locale?: 'en' | 'ru' }>()

const locale = computed(() => props.locale ?? 'en')

const caseUrl = computed(() => serviceCaseStudyUrl(props.service.id))
const demoUrl = computed(() => serviceDemoUrl(props.service.id))
const hasDemo = computed(() => props.service.demoUrl !== undefined)

const copy = computed(() => ({
  focus: tr({ en: 'Focus', ru: 'Фокус' }, locale.value),
  currentMilestone: tr({ en: 'Current milestone', ru: 'Текущая веха' }, locale.value),
  readCase: tr({ en: 'Read case study', ru: 'Читать кейс' }, locale.value),
  openDemo: tr({ en: 'Open demo', ru: 'Открыть демо' }, locale.value),
}))
</script>

<template>
  <article class="portfolio-card">
    <h3>{{ tr(service.nameLocalized, locale) }}</h3>
    <ServiceStatus :service="service" :locale="locale" />
    <p>{{ tr(service.summary, locale) }}</p>
    <p class="service-card__focus"><strong>{{ copy.focus }}:</strong> {{ tr(service.engineeringFocus, locale) }}</p>
    <p v-if="service.id === 'order' && service.currentMilestone" class="service-card__marker">
      {{ copy.currentMilestone }}: {{ service.currentMilestone }}
    </p>
    <div class="portfolio-card__actions">
      <a :href="caseUrl" class="is-primary">{{ copy.readCase }}</a>
      <a v-if="hasDemo" :href="demoUrl">{{ copy.openDemo }}</a>
    </div>
  </article>
</template>

<style scoped>
.service-card__focus {
  font-size: var(--text-sm);
}

.service-card__marker {
  font-size: var(--text-sm);
  color: var(--c-accent);
  font-weight: 600;
}
</style>
