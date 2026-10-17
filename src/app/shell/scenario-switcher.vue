<script setup lang="ts">
import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'

import {
  DEMO_SCENARIOS,
  getScenario,
  setScenario,
  type DemoScenarioId,
} from '@/mocks/scenario-registry'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { uiString } from '@/shared/i18n/ui-strings'
import { labelFor } from '@/shared/i18n/label-strings'

const queryClient = useQueryClient()
const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())
const current = computed<DemoScenarioId>(() => getScenario())

/** Service roots whose cached data is scenario-scoped. */
const SERVICE_ROOTS = new Set(['orders', 'notifications', 'shortener'])

function onChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  const next = target.value as DemoScenarioId

  if (next === getScenario()) return

  setScenario(next)

  // Scenario changes represent a new deterministic mock baseline. List pages
  // reset their page-local cursors synchronously on the change (watch on
  // getScenario), which rekeys their queries to the first page and refetches
  // it exactly once — invalidating or resetting the list queries here would
  // fetch the previous scenario's stale cursor a second time. What is left to
  // fix up are the other queries of the service roots: reset them so no
  // cached data from the previous baseline survives (an active detail
  // refetches, a cached one rewinds to pending). Auth and system queries are
  // not scenario-scoped and stay untouched; resetQueries (not removeQueries —
  // force-removing queries subscribed by live observers breaks subsequent
  // fetches) only refetches the ones with live observers.
  queryClient.resetQueries({
    predicate: (query) =>
      SERVICE_ROOTS.has(String(query.queryKey[0])) &&
      (String(query.queryKey[1]) !== 'list' || query.observers.length === 0),
  })
}
</script>

<template>
  <label class="scenario-switcher">
    <span class="scenario-switcher__label">{{ uiString('scenarioLabel', locale) }}</span>
    <select :value="current" class="scenario-switcher__select" @change="onChange">
      <option v-for="scenario in DEMO_SCENARIOS" :key="scenario.id" :value="scenario.id">
        {{ labelFor(scenario.label, locale) }}
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
