<script setup lang="ts">
import { RouterLink } from 'vue-router'

import CardPanel from '@/shared/ui/card-panel.vue'
import AppButton from '@/shared/ui/app-button.vue'
</script>

<template>
  <CardPanel class="not-found">
    <p class="not-found__code">404</p>
    <p class="not-found__message">This route does not exist.</p>
    <RouterLink to="/">
      <AppButton variant="secondary">Back to overview</AppButton>
    </RouterLink>
  </CardPanel>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-7) var(--space-4);
  text-align: center;
}

.not-found__code {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--c-text-subtle);
}

.not-found__message {
  margin: 0;
  color: var(--c-text-muted);
}
</style>
