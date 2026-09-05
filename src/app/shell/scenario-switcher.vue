<script setup lang="ts">
import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'

import {
  DEMO_SCENARIOS,
  getScenario,
  setScenario,
  type DemoScenarioId,
} from '@/mocks/scenario-registry'

const queryClient = useQueryClient()
const current = computed<DemoScenarioId>(() => getScenario())

async function onChange(event: Event): Promise<void> {
  const target = event.target as HTMLSelectElement
  const next = target.value as DemoScenarioId

  if (next === getScenario()) return

  setScenario(next)

  // Scenario changes represent a new deterministic mock baseline. Mark active
  // server-state queries stale and refetch them immediately so the UI does not
  // keep showing data from the previous scenario until stale/refetch timers fire.
  await queryClient.invalidateQueries()
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
  min-width: 0;
  max-width: 100%;
}

.scenario-switcher__label {
  flex: 0 0 auto;
  font-size: var(--text-sm);
  color: var(--c-text-subtle);
}

.scenario-switcher__select {
  min-width: 0;
  max-width: 100%;
  height: 30px;
  padding: 0 var(--space-2);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-sm);
  cursor: pointer;
}

@media (max-width: 519.98px) {
  .scenario-switcher {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
    gap: var(--space-1);
  }

  .scenario-switcher__select {
    width: 100%;
  }
}
</style>
