import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { ApiMode } from '@/shared/config/app-config'

/**
 * Tiny app-wide runtime metadata (API mode / deploy environment) exposed to the
 * shell for the `MOCK`/`LIVE` badge. Not a server-data cache.
 */
export const useAppStore = defineStore('app', () => {
  const apiMode = ref<ApiMode>('mock')
  const deployEnv = ref('local')

  const isMock = computed(() => apiMode.value === 'mock')

  function initialize(mode: ApiMode, env: string): void {
    apiMode.value = mode
    deployEnv.value = env
  }

  return { apiMode, deployEnv, isMock, initialize }
})
