<script setup lang="ts">
import type { ApiMode } from '@/shared/config/app-config'

defineProps<{
  apiMode: ApiMode
  deployEnv?: string
}>()
</script>

<template>
  <span
    :class="['service-badge', apiMode === 'mock' ? 'service-badge--mock' : 'service-badge--live']"
    :title="
      apiMode === 'mock'
        ? 'Simulated data served by MSW — no backend required'
        : 'Connected to live backend hosts'
    "
  >
    <span class="service-badge__label">{{ apiMode === 'mock' ? 'MOCK' : 'LIVE' }}</span>
    <span v-if="deployEnv" class="service-badge__env">{{ deployEnv }}</span>
  </span>
</template>

<style scoped>
.service-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.5;
  border: 1px solid transparent;
  white-space: nowrap;
}

.service-badge--mock {
  background: color-mix(in srgb, var(--c-warning) 16%, transparent);
  color: var(--c-warning);
  border-color: color-mix(in srgb, var(--c-warning) 40%, transparent);
}

.service-badge--live {
  background: color-mix(in srgb, var(--c-success) 14%, transparent);
  color: var(--c-success);
  border-color: color-mix(in srgb, var(--c-success) 40%, transparent);
}

.service-badge__env {
  opacity: 0.85;
  font-weight: 550;
}
</style>
