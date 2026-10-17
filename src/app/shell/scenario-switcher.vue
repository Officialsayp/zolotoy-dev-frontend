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

/**
 * Is this query's data scoped to the current mock baseline? The switcher only
 * renders in mock mode, where system HEALTH is scenario-scoped too (degraded
 * answers 503) — other system queries are not. Auth queries are: the auth mock
 * rebuilds its store on every switch and wipes issued sessions, so cached
 * me/sessions data of the previous baseline must not be served after it.
 */
function isScenarioScoped(queryKey: readonly unknown[]): boolean {
  const root = String(queryKey[0])
  if (root === 'system') return String(queryKey[1]) === 'health'
  return SERVICE_ROOTS.has(root) || root === 'auth'
}

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
  // fix up are the other scenario-scoped queries: reset them so no cached
  // data from the previous baseline survives (an active query refetches, a
  // cached one rewinds to pending). Mock system health is included — the
  // degraded scenario answers 503 and the badges must not wait up to the 30s
  // polling tick. Auth queries are included as well — the auth mock wipes
  // issued sessions on every switch, and the refetched 401 resolves the stale
  // session through the normal refresh/verdict contract (the session store
  // itself is NOT cleared here: no special logout rule). resetQueries (not
  // removeQueries — force-removing queries subscribed by live observers breaks
  // subsequent fetches) only refetches the ones with live observers.
  queryClient.resetQueries({
    predicate: (query) =>
      isScenarioScoped(query.queryKey) &&
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
