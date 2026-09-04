<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/app/stores/app-store'
import ServiceBadge from '@/shared/ui/service-badge.vue'
import AuthWidget from './auth-widget.vue'
import ScenarioSwitcher from './scenario-switcher.vue'
import ThemeToggle from './theme-toggle.vue'

const route = useRoute()
const app = useAppStore()
const { apiMode, deployEnv, isMock } = storeToRefs(app)

const title = computed(() =>
  typeof route.meta.title === 'string' ? route.meta.title : 'zolotoy.dev',
)
</script>

<template>
  <header class="app-header">
    <h1 class="app-header__title">{{ title }}</h1>
    <div class="app-header__controls">
      <ScenarioSwitcher v-if="isMock" />
      <ServiceBadge :api-mode="apiMode" :deploy-env="deployEnv" />
      <AuthWidget />
      <ThemeToggle />
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
