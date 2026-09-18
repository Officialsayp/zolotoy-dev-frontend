<script setup lang="ts">
import { ROADMAP_MILESTONES } from '@/content/roadmap'
</script>

<template>
  <ol class="roadmap-list">
    <li
      v-for="milestone in ROADMAP_MILESTONES"
      :key="milestone.id"
      :class="['roadmap-item', milestone.state === 'current' ? 'roadmap-item--current' : '']"
    >
      <span :class="['roadmap-item__state', `roadmap-item__state--${milestone.state}`]">
        {{ milestone.state === 'current' ? 'Current' : milestone.state === 'completed' ? 'Completed' : 'Future' }}
      </span>
      <h3>{{ milestone.title }}</h3>
      <p>{{ milestone.summary }}</p>
      <p class="roadmap-item__services">
        Services: {{ milestone.serviceIds.join(', ') }}
      </p>
    </li>
  </ol>
</template>

<style scoped>
.roadmap-item h3 {
  margin: var(--space-1) 0;
}

.roadmap-item__services {
  font-size: var(--text-sm);
  color: var(--c-text-subtle);
  margin: 0;
}
</style>
