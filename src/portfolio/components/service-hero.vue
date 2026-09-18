<script setup lang="ts">
import type { ServiceCase } from '@/content/types'
import ServiceStatus from './service-status.vue'
import ResourceLinks from './resource-links.vue'

defineProps<{ service: ServiceCase }>()
</script>

<template>
  <section class="portfolio-hero service-hero">
    <p class="portfolio-hero__subtitle">Service case study</p>
    <h1>{{ service.name }}</h1>
    <p class="portfolio-hero__intro">{{ service.summary }}</p>
    <p>
      <ServiceStatus :service="service" />
      <span aria-hidden="true"> · </span>
      <span>Backend runtime: {{ service.runtimeLabel }}</span>
      <span aria-hidden="true"> · </span>
      <span>Demo data source: {{ service.demoMode === 'mock' ? 'Mock' : service.demoMode }}</span>
    </p>
    <dl class="fact-list">
      <dt>Scope</dt>
      <dd>{{ service.declaredScope }}</dd>
      <dt>Not in scope</dt>
      <dd>
        <ul class="service-hero__not-scope">
          <li v-for="item in service.notScope" :key="item">{{ item }}</li>
        </ul>
      </dd>
      <dt>Engineering focus</dt>
      <dd>{{ service.engineeringFocus }}</dd>
    </dl>
    <ResourceLinks :service="service" />
  </section>
</template>

<style scoped>
.service-hero__not-scope {
  margin: 0;
  padding-left: var(--space-4);
  color: var(--c-text-muted);
}
</style>
