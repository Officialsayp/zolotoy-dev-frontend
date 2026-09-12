<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

import { buildNavItems } from './nav-items'

const items = buildNavItems()
const route = useRoute()

function isActive(activeName: string): boolean {
  return route.name === activeName
}
</script>

<template>
  <aside class="app-sidebar" aria-label="Service navigation">
    <RouterLink to="/" class="app-sidebar__brand" aria-label="zolotoy.dev — Overview">
      <img class="app-sidebar__logo" src="/favicon.svg" alt="" width="28" height="28" />
      <span class="app-sidebar__wordmark">zolotoy.dev</span>
    </RouterLink>

    <nav class="app-sidebar__nav">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="app-sidebar__link"
        :class="{ 'app-sidebar__link--active': isActive(item.activeName) }"
        :aria-current="isActive(item.activeName) ? 'page' : undefined"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex: none;
}

.app-sidebar__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--c-text);
  font-weight: 700;
  text-decoration: none;
  font-size: var(--text-lg);
}

.app-sidebar__brand:hover {
  text-decoration: none;
}

.app-sidebar__logo {
  display: block;
  flex: none;
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.app-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.app-sidebar__link {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--c-text-muted);
  font-size: var(--text-base);
  font-weight: 550;
  text-decoration: none;
  white-space: nowrap;
}

.app-sidebar__link:hover {
  background: var(--c-surface-muted);
  color: var(--c-text);
  text-decoration: none;
}

.app-sidebar__link--active {
  background: var(--c-accent-soft);
  color: var(--c-accent);
}

/* Desktop: fixed-width vertical rail. */
@media (min-width: 960px) {
  .app-sidebar {
    width: var(--sidebar-width);
    border-right: 1px solid var(--c-border);
    height: 100dvh;
    padding: var(--space-4) var(--space-3);
    position: sticky;
    top: 0;
  }
}

/* Narrow: compact top navigation. */
@media (max-width: 959.98px) {
  .app-sidebar {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--c-border);
  }

  .app-sidebar__nav {
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .app-sidebar__wordmark {
    display: none;
  }
}
</style>
