import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const queryMocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  resetQueries: vi.fn(),
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: queryMocks.invalidateQueries,
    resetQueries: queryMocks.resetQueries,
  }),
}))

import { getScenario } from '@/mocks/scenario-registry'
import ScenarioSwitcher from './scenario-switcher.vue'

describe('ScenarioSwitcher', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    queryMocks.invalidateQueries.mockClear()
    queryMocks.resetQueries.mockClear()
  })

  it('changes deterministic scenario and refreshes active query data immediately', async () => {
    const wrapper = mount(ScenarioSwitcher)

    expect(getScenario()).toBe('default')

    await wrapper.get('select').setValue('degraded')
    await flushPromises()

    expect(getScenario()).toBe('degraded')
    expect(queryMocks.invalidateQueries).toHaveBeenCalledTimes(1)
    // Paginated cursors are scenario-specific and must not survive the switch.
    expect(queryMocks.resetQueries).toHaveBeenCalledTimes(1)
    const predicate = queryMocks.resetQueries.mock.calls[0]?.[0]?.predicate
    expect(predicate({ queryKey: ['orders', 'list', 'cursor-1'] })).toBe(true)
    expect(predicate({ queryKey: ['system', 'health', 'auth'] })).toBe(false)
  })

  it('does not invalidate queries when the selected scenario did not change', async () => {
    const wrapper = mount(ScenarioSwitcher)

    await wrapper.get('select').setValue('default')
    await flushPromises()

    expect(queryMocks.invalidateQueries).not.toHaveBeenCalled()
  })
})
