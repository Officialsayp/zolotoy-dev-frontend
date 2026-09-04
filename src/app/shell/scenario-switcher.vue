<script setup lang="ts">
import { computed } from 'vue'

import {
  DEMO_SCENARIOS,
  getScenario,
  setScenario,
  type DemoScenarioId,
} from '@/mocks/scenario-registry'

const current = computed<DemoScenarioId>(() => getScenario())

function onChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  setScenario(target.value as DemoScenarioId)
}
</script>

<template>
  <label class="scenario-switcher">
    <span class="scenario-switcher__label">Demo scenario</span>
    <select :value="current" class="scenario-switcher__select" @change="onChange">
      <option v-for="scenario in DEMO_SCENARIOS" :key="scenario.id" :value="scenario.id">
        {{ scenario.label }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.scenario-switcher {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.scenario-switcher__label {
  font-size: var(--text-sm);
  color: var(--c-text-subtle);
}

.scenario-switcher__select {
  height: 30px;
  padding: 0 var(--space-2);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-sm);
  cursor: pointer;
}
</style>
