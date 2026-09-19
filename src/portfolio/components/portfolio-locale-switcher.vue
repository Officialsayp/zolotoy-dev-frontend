<script setup lang="ts">
/**
 * Public language switcher: navigates to the equivalent document in the other
 * locale (never resets to home). Works without JavaScript — the shell passes
 * the current canonical path; both targets are plain anchors.
 */
import { computed } from 'vue'
import { counterpartPath } from '@/shared/routing/site-routes'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ locale: 'en' | 'ru'; currentPath: string }>()

const enHref = computed(
  () => (props.locale === 'en' ? props.currentPath : counterpartPath(props.currentPath, 'en') ?? '/'),
)
const ruHref = computed(
  () => (props.locale === 'ru' ? props.currentPath : counterpartPath(props.currentPath, 'ru') ?? '/ru/'),
)

const aria = computed(() =>
  tr(
    { en: 'Switch language to Russian', ru: 'Переключить язык на английский' },
    props.locale,
  ),
)
const title = computed(() => tr({ en: 'Language', ru: 'Язык' }, props.locale))
</script>

<template>
  <nav class="locale-switcher" :aria-label="title" :title="aria">
    <a
      :href="enHref"
      :class="['locale-switcher__item', { 'locale-switcher__item--active': locale === 'en' }]"
      :aria-current="locale === 'en' ? 'true' : undefined"
      hreflang="en"
    >EN</a>
    <span class="locale-switcher__sep" aria-hidden="true">|</span>
    <a
      :href="ruHref"
      :class="['locale-switcher__item', { 'locale-switcher__item--active': locale === 'ru' }]"
      :aria-current="locale === 'ru' ? 'true' : undefined"
      hreflang="ru"
    >RU</a>
  </nav>
</template>

<style scoped>
.locale-switcher {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  font-weight: 650;
}

.locale-switcher__item {
  color: var(--c-text-muted);
  text-decoration: none;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
}

.locale-switcher__item--active {
  color: var(--c-accent);
  background: var(--c-accent-soft);
}

.locale-switcher__item:not(.locale-switcher__item--active):hover {
  color: var(--c-accent);
}

.locale-switcher__sep {
  color: var(--c-border-strong);
}
</style>
