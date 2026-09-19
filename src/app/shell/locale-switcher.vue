<script setup lang="ts">
/**
 * Demo language switcher: preserves the current route, other query params and
 * the hash, changing only the locale (query lang=ru|en + persisted preference).
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useLocaleStore } from '@/shared/i18n/use-locale'
import type { Locale } from '@/shared/i18n/locale'

const route = useRoute()
const router = useRouter()
const localeStore = useLocaleStore()

const current = computed(() => localeStore.get())

/** Build the target URL for a locale: same path + hash, other params kept, lang swapped. */
function hrefFor(target: Locale): string {
  return router.resolve({ path: route.path, query: { ...route.query, lang: target }, hash: route.hash }).href
}

async function switchTo(target: Locale): Promise<void> {
  if (target === current.value) return
  // Push updates the ?lang= param; the router binding applies the locale
  // without leaving the current route. Other params and the hash survive.
  await router.push({ query: { ...route.query, lang: target }, hash: route.hash })
}
</script>

<template>
  <nav class="locale-switcher" :aria-label="'Language'">
    <a
      :href="hrefFor('en')"
      :class="['locale-switcher__item', { 'locale-switcher__item--active': current === 'en' }]"
      :aria-current="current === 'en' ? 'true' : undefined"
      hreflang="en"
      @click.prevent="switchTo('en')"
    >EN</a>
    <span class="locale-switcher__sep" aria-hidden="true">|</span>
    <a
      :href="hrefFor('ru')"
      :class="['locale-switcher__item', { 'locale-switcher__item--active': current === 'ru' }]"
      :aria-current="current === 'ru' ? 'true' : undefined"
      hreflang="ru"
      @click.prevent="switchTo('ru')"
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
