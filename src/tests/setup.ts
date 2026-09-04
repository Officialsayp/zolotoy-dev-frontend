import { config } from '@vue/test-utils'
import { afterEach, vi } from 'vitest'

import { setHttpClientsForTest } from '@/app/providers/http-clients-instance'
import { resetScenario } from '@/mocks/scenario-registry'

// Reset global test side effects between runs.
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  resetScenario()
  setHttpClientsForTest(undefined)
})

// Keep VTU happy with Vue Router stubs used in shell tests.
config.global.stubs = {
  RouterLink: true,
  RouterView: true,
}
