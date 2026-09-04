import { resetScenario } from './scenario-registry'

/**
 * Returns mock infrastructure to its deterministic baseline (MASTER_FRONTEND_PLAN §10).
 * Reapplies the default scenario so a reload/reset produces stable demo state.
 */
export function resetMockScenario(): void {
  resetScenario()
}
