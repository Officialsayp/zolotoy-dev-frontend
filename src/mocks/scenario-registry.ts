import { ref } from 'vue'

/**
 * Deterministic demo scenario registry (MASTER_FRONTEND_PLAN §10).
 *
 * A scenario selects the initial fixture/behavior baseline served by MSW.
 * Foundation ships a minimal set; service stages register their own named
 * scenarios. Reload/reset returns to the baseline.
 */

export type DemoScenarioId = 'default' | 'degraded'

export interface DemoScenario {
  id: DemoScenarioId
  label: string
  description: string
}

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'All services healthy — normal deterministic behavior.',
  },
  {
    id: 'degraded',
    label: 'Degraded',
    description: 'All service health/readiness endpoints report unavailable.',
  },
]

const DEFAULT_SCENARIO: DemoScenarioId = 'default'

const current = ref<DemoScenarioId>(DEFAULT_SCENARIO)

export function getScenario(): DemoScenarioId {
  return current.value
}

export function setScenario(id: DemoScenarioId): void {
  current.value = id
}

export function resetScenario(): void {
  current.value = DEFAULT_SCENARIO
}

export function isScenario(id: DemoScenarioId): boolean {
  return current.value === id
}
