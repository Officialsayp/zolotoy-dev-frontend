import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const queryMocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: queryMocks.invalidateQueries,
  }),
}))

import { getScenario } from '@/mocks/scenario-registry'
import ScenarioSwitcher from './scenario-switcher.vue'

describe('ScenarioSwitcher', () => {
  beforeEach(() => {
    queryMocks.invalidateQueries.mockClear()
  })

  it('changes deterministic scenario and refreshes active query data immediately', async () => {
    const wrapper = mount(ScenarioSwitcher)

    expect(getScenario()).toBe('default')

    await wrapper.get('select').setValue('degraded')
    await flushPromises()

    expect(getScenario()).toBe('degraded')
    expect(queryMocks.invalidateQueries).toHaveBeenCalledTimes(1)
  })

  it('does not invalidate queries when the selected scenario did not change', async () => {
    const wrapper = mount(ScenarioSwitcher)

    await wrapper.get('select').setValue('default')
    await flushPromises()

    expect(queryMocks.invalidateQueries).not.toHaveBeenCalled()
  })
})
