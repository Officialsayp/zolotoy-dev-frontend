import { ref } from 'vue'

/**
 * Deterministic demo scenario registry (MASTER_FRONTEND_PLAN §10).
 *
 * A scenario selects the initial fixture/behavior baseline served by MSW.
 * Foundation ships a minimal set; service stages register their own named
 * scenarios. Reload/reset returns to the baseline.
 */

export type DemoScenarioId =
  | 'default'
  | 'degraded'
  | 'orders-happy-pay-on-receipt'
  | 'orders-prepaid'
  | 'orders-payment-failed-retry'
  | 'orders-version-conflict'
  | 'orders-idempotency-replay'
  | 'orders-idempotency-conflict'
  | 'orders-empty'
  | 'orders-forbidden'
  | 'orders-rate-limited'

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
  {
    id: 'orders-happy-pay-on-receipt',
    label: 'Orders · pay on receipt',
    description: 'Pay-on-receipt order at delivered/awaiting for the O1 lifecycle demo.',
  },
  {
    id: 'orders-prepaid',
    label: 'Orders · prepaid',
    description: 'Unpaid prepaid order blocked from fulfillment until paid (O5).',
  },
  {
    id: 'orders-payment-failed-retry',
    label: 'Orders · payment failed → retry',
    description: 'Payable delivered order with payment failed; retry succeeds (O6).',
  },
  {
    id: 'orders-version-conflict',
    label: 'Orders · version conflict',
    description: 'ORDER_CONFLICT rejects a stale mutation and bumps its server version (O4).',
  },
  {
    id: 'orders-idempotency-replay',
    label: 'Orders · idempotency replay',
    description: 'Pay replay with the same Idempotency-Key returns the stored result (O2).',
  },
  {
    id: 'orders-idempotency-conflict',
    label: 'Orders · idempotency conflict',
    description: 'Same Idempotency-Key with a different payload returns a conflict (O3).',
  },
  {
    id: 'orders-empty',
    label: 'Orders · empty',
    description: 'Order list returns no orders.',
  },
  {
    id: 'orders-forbidden',
    label: 'Orders · forbidden',
    description: 'Orders belong to another buyer — list/detail return 403.',
  },
  {
    id: 'orders-rate-limited',
    label: 'Orders · rate limited',
    description: 'Order write commands return 429 with Retry-After.',
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
