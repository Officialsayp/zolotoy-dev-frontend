<script setup lang="ts">
import { Construction } from 'lucide-vue-next'

import CardPanel from './card-panel.vue'
import StatusBadge from './status-badge.vue'

withDefaults(
  defineProps<{
    serviceName: string
    note?: string
  }>(),
  {
    note: '',
  },
)
</script>

<template>
  <CardPanel class="module-placeholder">
    <Construction class="module-placeholder__icon" aria-hidden="true" />
    <h2 class="module-placeholder__title">{{ serviceName }}</h2>
    <p v-if="note" class="module-placeholder__note">{{ note }}</p>
    <StatusBadge tone="info" label="Implemented in its stage" />
    <p class="module-placeholder__scope">
      This is a Foundation route placeholder — no business functionality yet.
    </p>
  </CardPanel>
</template>

<style scoped>
.module-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-7) var(--space-4);
  text-align: center;
}

.module-placeholder__icon {
  width: 36px;
  height: 36px;
  color: var(--c-text-subtle);
  margin-bottom: var(--space-2);
}

.module-placeholder__title {
  margin: 0;
}

.module-placeholder__note {
  margin: 0;
  max-width: 52ch;
  color: var(--c-text-muted);
}

.module-placeholder__scope {
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
  color: var(--c-text-subtle);
}
</style>
