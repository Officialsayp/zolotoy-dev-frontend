<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/app/stores/app-store'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { uiString } from '@/shared/i18n/ui-strings'
import ServiceBadge from '@/shared/ui/service-badge.vue'
import AuthWidget from './auth-widget.vue'
import LocaleSwitcher from './locale-switcher.vue'
import ScenarioSwitcher from './scenario-switcher.vue'
import ThemeToggle from './theme-toggle.vue'

const route = useRoute()
const app = useAppStore()
const localeStore = useLocaleStore()
const { apiMode, deployEnv, isMock } = storeToRefs(app)

const locale = computed(() => localeStore.get())

const title = computed(() => {
  if (typeof route.meta.titleKey === 'string') {
    return uiString(route.meta.titleKey as never, locale.value)
  }
  return typeof route.meta.title === 'string' ? route.meta.title : 'zolotoy.dev'
})
</script>

<template>
  <header class="app-header">
    <h1 class="app-header__title">{{ title }}</h1>
    <div class="app-header__controls">
      <LocaleSwitcher />
      <ScenarioSwitcher v-if="isMock" />
      <ServiceBadge :api-mode="apiMode" :deploy-env="deployEnv" :locale="locale" />
      <AuthWidget :locale="locale" />
      <ThemeToggle :locale="locale" />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--c-border);
}

.app-header__title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 700;
}

.app-header__controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
</style>
