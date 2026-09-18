<script setup lang="ts">
import type { ServiceCase } from '@/content/types'
import { serviceDemoUrl } from '@/content/service-registry'

defineProps<{ service: ServiceCase }>()
</script>

<template>
  <aside class="demo-callout portfolio-card">
    <h3>Interactive demo</h3>
    <p>
      The demo runs on deterministic mock data (MSW) and shows the module’s
      visible flows: {{ service.declaredScope.toLowerCase() }}
    </p>
    <p>
      <strong>Data source:</strong> {{ service.demoMode === 'mock' ? 'Mock' : service.demoMode }} ·
      <strong>Backend runtime:</strong> {{ service.runtimeLabel }}
    </p>
    <div class="portfolio-card__actions">
      <a class="is-primary" :href="serviceDemoUrl(service.id)">Open the {{ service.shortLabel }} demo</a>
      <a href="/demo/">Demo overview</a>
    </div>
  </aside>
</template>

<style scoped>
.demo-callout {
  background: var(--c-surface-muted);
}
</style>
