<script setup lang="ts">
/**
 * Public theme control using the shared (Pinia-free) theme mechanics. The
 * initial preference is passed from the pre-paint initializer when present;
 * the server-rendered markup is deterministic and the browser state is
 * synchronized on mount. Labels are localized with the fixed EN semantics
 * (Theme: Dark / Light / System (Dark|Light)); resolved shown only for system.
 */
import { computed, onMounted, ref } from 'vue'
import {
  applyThemePreference,
  persistThemePreference,
  readStoredThemePreference,
  resolveTheme,
  type ThemePreference,
} from '@/shared/theme/theme-preference'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{
  /** Deterministic initial preference for SSR markup (default 'system'). */
  initialPreference?: ThemePreference
  locale?: 'en' | 'ru'
}>()

const locale = computed(() => props.locale ?? 'en')

const preference = ref<ThemePreference>(props.initialPreference ?? 'system')
const resolved = ref<'light' | 'dark'>(resolveTheme(preference.value))

const themeLabels = computed(() => ({
  system: tr({ en: 'System', ru: 'системная' }, locale.value),
  light: tr({ en: 'Light', ru: 'светлая' }, locale.value),
  dark: tr({ en: 'Dark', ru: 'тёмная' }, locale.value),
  theme: tr({ en: 'Theme', ru: 'Тема' }, locale.value),
  switchTo: tr({ en: 'Activate to switch', ru: 'Нажмите для переключения' }, locale.value),
}))

const label = computed(() => {
  const selected =
    preference.value === 'system'
      ? tr(
          {
            en: `Theme: System (${themeLabels.value[resolved.value]})`,
            ru: `Тема: системная (${resolved.value === 'dark' ? 'тёмная' : 'светлая'})`,
          },
          locale.value,
        )
      : tr(
          {
            en: `Theme: ${themeLabels.value[preference.value as 'light' | 'dark']}`,
            ru: `Тема: ${themeLabels.value[preference.value as 'light' | 'dark']}`,
          },
          locale.value,
        )
  return selected
})

function cycle(): void {
  const order: ThemePreference[] = ['system', 'light', 'dark']
  const next = order[(order.indexOf(preference.value) + 1) % order.length]!
  preference.value = next
  persistThemePreference(next)
  applyThemePreference(next)
  resolved.value = resolveTheme(next)
}

onMounted(() => {
  preference.value = readStoredThemePreference()
  resolved.value = resolveTheme(preference.value)
})
</script>

<template>
  <button
    type="button"
    class="portfolio-theme-toggle portfolio-btn portfolio-btn--secondary"
    :aria-label="`${label}. ${themeLabels.switchTo}`"
    :title="label"
    @click="cycle"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.portfolio-theme-toggle {
  font-size: var(--text-sm);
  padding: var(--space-1) var(--space-2);
}
</style>
