import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const queryMocks = vi.hoisted(() => ({
  resetQueries: vi.fn(),
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({
    resetQueries: queryMocks.resetQueries,
  }),
}))

import { getScenario } from '@/mocks/scenario-registry'
import ScenarioSwitcher from './scenario-switcher.vue'

describe('ScenarioSwitcher', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    queryMocks.resetQueries.mockClear()
  })

  it('changes the deterministic scenario and resets scenario-scoped queries', async () => {
    const wrapper = mount(ScenarioSwitcher)

    expect(getScenario()).toBe('default')

    await wrapper.get('select').setValue('degraded')
    await flushPromises()

    expect(getScenario()).toBe('degraded')
    expect(queryMocks.resetQueries).toHaveBeenCalledTimes(1)
    const predicate = queryMocks.resetQueries.mock.calls[0]?.[0]?.predicate as (q: unknown) => boolean

    // ACTIVE list queries are NOT reset here: their pages reset the page-local
    // cursor synchronously on the switch, and the rekey refetches the first
    // page exactly once — resetting active lists would fetch the stale cursor
    // twice. Unobserved list cache entries have no page to reset them and are
    // rewound to pending so they can never serve the previous baseline.
    expect(predicate({ queryKey: ['orders', 'list', 'cursor-1'], observers: [{}] })).toBe(false)
    expect(predicate({ queryKey: ['shortener', 'list', {}], observers: [{}] })).toBe(false)
    expect(predicate({ queryKey: ['orders', 'list', 'cursor-1'], observers: [] })).toBe(true)

    // Other scenario-scoped queries of the service roots are reset (an active
    // detail refetches, a cached one rewinds to pending).
    expect(predicate({ queryKey: ['orders', 'detail', 'ord-1'], observers: [] })).toBe(true)
    expect(predicate({ queryKey: ['orders', 'detail', 'ord-1'], observers: [{}] })).toBe(true)
    expect(predicate({ queryKey: ['notifications', 'event', 'evt-1'], observers: [] })).toBe(true)
    expect(predicate({ queryKey: ['shortener', 'analytics', 'link-1'], observers: [] })).toBe(true)

    // Auth and system queries are not scenario-scoped and stay untouched.
    expect(predicate({ queryKey: ['auth', 'profile'], observers: [{}] })).toBe(false)
    expect(predicate({ queryKey: ['system', 'health', 'auth'], observers: [{}] })).toBe(false)
  })

  it('does not touch queries when the selected scenario did not change', async () => {
    const wrapper = mount(ScenarioSwitcher)

    await wrapper.get('select').setValue('default')
    await flushPromises()

    expect(queryMocks.resetQueries).not.toHaveBeenCalled()
  })
})
