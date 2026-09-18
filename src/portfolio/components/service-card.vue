<script setup lang="ts">
import { computed } from 'vue'
import type { ServiceCase } from '@/content/types'
import { serviceCaseStudyUrl, serviceDemoUrl } from '@/content/service-registry'
import ServiceStatus from './service-status.vue'

const props = defineProps<{ service: ServiceCase }>()

const caseUrl = computed(() => serviceCaseStudyUrl(props.service.id))
const demoUrl = computed(() => serviceDemoUrl(props.service.id))
const hasDemo = computed(() => props.service.demoUrl !== undefined)
</script>

<template>
  <article class="portfolio-card">
    <h3>{{ service.name }}</h3>
    <ServiceStatus :service="service" />
    <p>{{ service.summary }}</p>
    <p class="service-card__focus"><strong>Focus:</strong> {{ service.engineeringFocus }}</p>
    <p v-if="service.id === 'order'" class="service-card__marker">
      Current milestone: {{ service.currentMilestone }}
    </p>
    <div class="portfolio-card__actions">
      <a :href="caseUrl" class="is-primary">Read case study</a>
      <a v-if="hasDemo" :href="demoUrl">Open demo</a>
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
