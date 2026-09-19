<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'

import { useThemeStore, type ThemePreference } from '@/app/stores/theme-store'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ locale?: 'en' | 'ru' }>()

const theme = useThemeStore()
const locale = computed(() => props.locale ?? 'en')

const isDark = computed(() => theme.resolved === 'dark')

const labels = computed(() => ({
  toLight: tr({ en: 'Switch to light theme', ru: 'Включить светлую тему' }, locale.value),
  toDark: tr({ en: 'Switch to dark theme', ru: 'Включить тёмную тему' }, locale.value),
}))

function toggle(): void {
  const next: ThemePreference = isDark.value ? 'light' : 'dark'
  theme.setPreference(next)
}
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="isDark ? labels.toLight : labels.toDark"
    :title="isDark ? labels.toLight : labels.toDark"
    @click="toggle"
  >
    <Sun v-if="isDark" aria-hidden="true" />
    <Moon v-else aria-hidden="true" />
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-text-muted);
  cursor: pointer;
}

.theme-toggle:hover {
  color: var(--c-accent);
  border-color: var(--c-accent);
}
</style>
