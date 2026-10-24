<script setup lang="ts">
import { computed } from 'vue'
import { Monitor, Moon, Sun } from 'lucide-vue-next'

import { useThemeStore } from '@/app/stores/theme-store'
import { nextThemePreference } from '@/shared/theme/theme-preference'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ locale?: 'en' | 'ru' }>()

const theme = useThemeStore()
const locale = computed(() => props.locale ?? 'en')
const preference = computed(() => theme.preference)

const label = computed(() => {
  if (preference.value === 'system') {
    const resolved = theme.resolved === 'dark' ? 'dark' : 'light'
    return tr(
      {
        en: `Theme: System (${resolved === 'dark' ? 'Dark' : 'Light'})`,
        ru: `Тема: системная (${resolved === 'dark' ? 'тёмная' : 'светлая'})`,
      },
      locale.value,
    )
  }

  return tr(
    {
      en: preference.value === 'light' ? 'Theme: Light' : 'Theme: Dark',
      ru: preference.value === 'light' ? 'Тема: светлая' : 'Тема: тёмная',
    },
    locale.value,
  )
})

const buttonLabel = computed(() =>
  `${label.value}. ${tr(
    { en: 'Activate to switch', ru: 'Нажмите для переключения' },
    locale.value,
  )}`,
)

function cycle(): void {
  // Identical order to the public theme control; a visitor can always
  // return to OS-controlled colors after choosing a manual override.
  theme.setPreference(nextThemePreference(preference.value))
}
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="buttonLabel"
    :title="label"
    @click="cycle"
  >
    <Monitor v-if="preference === 'system'" aria-hidden="true" />
    <Sun v-else-if="preference === 'light'" aria-hidden="true" />
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
