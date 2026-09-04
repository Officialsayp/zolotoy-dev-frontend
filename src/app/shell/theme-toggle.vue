<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'

import { useThemeStore, type ThemePreference } from '@/app/stores/theme-store'

const theme = useThemeStore()

const isDark = computed(() => theme.resolved === 'dark')

function toggle(): void {
  const next: ThemePreference = isDark.value ? 'light' : 'dark'
  theme.setPreference(next)
}
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
    :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
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
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text-muted);
  cursor: pointer;
}

.theme-toggle:hover {
  color: var(--c-accent);
  border-color: var(--c-accent);
}

.theme-toggle :deep(svg) {
  width: 16px;
  height: 16px;
}
</style>
