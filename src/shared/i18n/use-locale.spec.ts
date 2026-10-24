import { beforeEach, describe, expect, it } from 'vitest'
import { computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

import { useLocaleStore } from './use-locale'

describe('locale store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('updates computeds in place — an in-place switch re-renders localized UI', () => {
    const store = useLocaleStore()
    store.initialize('en')

    // Components derive labels like this; the store must be a reactive source.
    const label = computed(() => (store.get() === 'ru' ? 'Заказы' : 'Orders'))
    expect(label.value).toBe('Orders')

    store.set('ru')
    expect(label.value).toBe('Заказы')
    expect(document.documentElement.lang).toBe('ru')
    expect(localStorage.getItem('zolotoy.locale')).toBe('ru')
  })

  it('set ignores invalid locale values', () => {
    const store = useLocaleStore()
    store.initialize('en')
    store.set('de' as never)
    expect(store.get()).toBe('en')
  })

  it('initializes a detected locale without treating it as a manual choice', () => {
    const store = useLocaleStore()
    store.initialize('ru')
    expect(store.get()).toBe('ru')
    expect(localStorage.getItem('zolotoy.locale')).toBeNull()
    expect(document.documentElement.lang).toBe('ru')
  })
})
