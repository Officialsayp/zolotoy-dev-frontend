<script setup lang="ts">
import type { ServiceCase } from '@/content/types'
import { serviceDemoUrl } from '@/content/service-registry'

defineProps<{ service: ServiceCase }>()
</script>

<template>
  <ul class="resource-links">
    <li v-if="service.specUrl">
      <a :href="service.specUrl" rel="noopener noreferrer">Specification</a>
    </li>
    <li v-if="service.sourceUrl">
      <a :href="service.sourceUrl" rel="noopener noreferrer">Source (backend)</a>
    </li>
    <li>
      <a :href="serviceDemoUrl(service.id)">Interactive demo</a>
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
