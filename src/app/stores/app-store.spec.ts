import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAppStore } from './app-store'

describe('app store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults to mock', () => {
    const store = useAppStore()
    expect(store.apiMode).toBe('mock')
    expect(store.isMock).toBe(true)
  })

  it('initializes from runtime config', () => {
    const store = useAppStore()
    store.initialize('real', 'demo')
    expect(store.apiMode).toBe('real')
    expect(store.deployEnv).toBe('demo')
    expect(store.isMock).toBe(false)
  })
})
