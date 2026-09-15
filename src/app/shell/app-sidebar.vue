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
      <svg class="app-sidebar__logo" viewBox="0 0 1024 1024" aria-hidden="true" width="28" height="28">
        <path
          fill="currentColor"
          d="m 672.4,130.42 c 56.76329,-6.38169 114.93893,23.3205 143.66,72.55 24.7532,44.51243 43.11022,92.2969 61.33,139.79 40.47809,111.57482 74.44289,227.08462 83.39,345.84 3.99187,44.64405 -4.00131,91.90701 -30.17,129.25 -34.22823,51.15534 -96.88829,80.43706 -158.08,76.16 -65.28191,-0.20566 -122.44364,-36.95943 -172.66,-75.06 -29.80113,-21.1118 -55.76914,-47.83868 -88.02,-65.27 -37.1943,-17.42617 -81.28549,-5.84133 -112.39,18.66 -47.69117,31.39849 -92.05098,67.43326 -138.03,101.11 -42.44103,27.81416 -101.51738,26.57093 -141.77,-4.74 -46.576445,-33.45195 -68.670533,-101.8275 -40,-153.73 23.21529,-41.55088 62.88534,-72.59629 108.24,-86.75 113.13424,-43.47682 226.71305,-85.88549 339.51,-130.18 14.82036,-6.43752 8.66067,-30.49279 -7.52,-28.35 -129.83943,-0.30295 -259.73631,0.55616 -389.54,-0.43 -36.193632,-1.7293 -66.727809,-33.24856 -68.06,-69.29 -1.106386,-32.02682 21.500955,-57.48376 34.11,-85.22 21.96273,-39.71643 41.91012,-80.65977 66.1,-119.08 32.5121,-48.07805 94.7686,-72.14669 151.45,-60.86 47.15984,8.26016 85.2391,43.82881 104.98,86.33 11.06377,24.16746 25.30898,52.15623 54.26,57.34 32.44615,7.58399 61.05887,-17.52199 74.14,-45.03 16.12049,-32.13564 35.32251,-64.94553 67.48,-83.37 17.54732,-10.66503 37.14009,-17.50491 57.59,-19.67 z"
        />
      </svg>
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
