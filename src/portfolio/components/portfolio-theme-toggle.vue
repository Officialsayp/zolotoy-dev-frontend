<script setup lang="ts">
/**
 * Public theme control using the shared (Pinia-free) theme mechanics. The
 * initial preference is passed from the pre-paint initializer when present;
 * the server-rendered markup is deterministic and the browser state is
 * synchronized on mount.
 */
import { onMounted, ref } from 'vue'
import {
  applyThemePreference,
  persistThemePreference,
  readStoredThemePreference,
  resolveTheme,
  type ThemePreference,
} from '@/shared/theme/theme-preference'

const props = defineProps<{
  /** Deterministic initial preference for SSR markup (default 'system'). */
  initialPreference?: ThemePreference
}>()

const preference = ref<ThemePreference>(props.initialPreference ?? 'system')
const resolved = ref<'light' | 'dark'>(resolveTheme(preference.value))

function cycle(): void {
  const order: ThemePreference[] = ['system', 'light', 'dark']
  const next = order[(order.indexOf(preference.value) + 1) % order.length]!
  preference.value = next
  persistThemePreference(next)
  applyThemePreference(next)
  resolved.value = resolveTheme(next)
}

onMounted(() => {
  // Adopt the stored preference set by the pre-paint initializer; keeps the
  // server markup deterministic while matching browser state after mount.
  preference.value = readStoredThemePreference()
  resolved.value = resolveTheme(preference.value)
})
</script>

<template>
  <button
    type="button"
    class="portfolio-theme-toggle portfolio-btn portfolio-btn--secondary"
    :aria-label="`Theme: ${preference} (active: ${resolved}). Activate to switch.`"
    :title="`Theme: ${preference}`"
    @click="cycle"
  >
    {{ preference === 'system' ? 'Theme: system' : `Theme: ${preference} (${resolved})` }}
  </button>
</template>

<style scoped>
.portfolio-theme-toggle {
  font-size: var(--text-sm);
  padding: var(--space-1) var(--space-2);
}
</style>
