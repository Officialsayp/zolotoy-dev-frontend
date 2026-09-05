import { resetScenario } from './scenario-registry'
import { resetOrderMockState } from '@/modules/orders/mocks/order-store'
import { resetAuthMockState } from '@/modules/auth/mocks/auth-store'
import { resetNotificationMockState } from '@/modules/notifications/mocks/notification-store'
import { resetShortenerMockState } from '@/modules/shortener/mocks/shortener-store'

/**
 * Returns mock infrastructure to its deterministic baseline (MASTER_FRONTEND_PLAN §10).
 * Reapplies the default scenario and rebuilds service mock stores so a
 * reload/reset produces stable demo state.
 */
export function resetMockScenario(): void {
  resetScenario()
  resetOrderMockState()
  resetAuthMockState()
  resetNotificationMockState()
  resetShortenerMockState()
}
