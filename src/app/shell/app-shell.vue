<script setup lang="ts">
import ToastRegion from '@/shared/ui/toast-region.vue'
import AppFooter from './app-footer.vue'
import AppHeader from './app-header.vue'
import AppSidebar from './app-sidebar.vue'
</script>

<template>
  <div class="app-shell">
    <AppSidebar />

    <div class="app-shell__main">
      <div class="app-shell__inner">
        <AppHeader />
        <main class="app-shell__content">
          <RouterView />
        </main>
        <AppFooter />
      </div>
    </div>

    <ToastRegion />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
}

/* Desktop: vertical sidebar rail + content column. */
@media (min-width: 960px) {
  .app-shell {
    display: flex;
  }

  .app-shell__main {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
  }

  .app-shell__inner {
    width: 100%;
    max-width: var(--content-max-width);
    padding: var(--space-4) var(--space-6);
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
  }
}

/* Narrow: sidebar is a top nav, content is full width. */
@media (max-width: 959.98px) {
  .app-shell {
    display: flex;
    flex-direction: column;
  }

  .app-shell__main {
    flex: 1;
    min-width: 0;
  }

  .app-shell__inner {
    padding: var(--space-4) var(--space-4) var(--space-6);
    display: flex;
    flex-direction: column;
    min-height: calc(100dvh - 52px);
  }
}

.app-shell__content {
  flex: 1;
  width: 100%;
  padding-top: var(--space-4);
}
</style>
