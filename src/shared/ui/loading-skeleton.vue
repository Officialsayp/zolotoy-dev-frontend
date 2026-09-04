<script setup lang="ts">
// Tabular/block skeleton for initial page loads. Mirrors the surrounding layout
// instead of replacing real data with a full-page spinner on background refetch.
withDefaults(
  defineProps<{
    rows?: number
    columns?: number
    rowsHeight?: number
  }>(),
  {
    rows: 4,
    columns: 4,
    rowsHeight: 20,
  },
)
</script>

<template>
  <div
    class="loading-skeleton"
    aria-busy="true"
    aria-label="Loading"
    :style="{ '--skeleton-rows-height': `${rowsHeight}px` }"
  >
    <div v-for="row in rows" :key="row" class="loading-skeleton__row">
      <span
        v-for="col in columns"
        :key="col"
        class="loading-skeleton__cell"
        :style="col === 1 ? { width: `${30 + (row % 3) * 4}%` } : undefined"
      />
    </div>
  </div>
</template>

<style scoped>
.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) 0;
}

.loading-skeleton__row {
  display: flex;
  gap: var(--space-3);
}

.loading-skeleton__cell {
  height: var(--skeleton-rows-height);
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--surface-skeleton) 25%,
    var(--c-border) 50%,
    var(--surface-skeleton) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s linear infinite;
  flex: 1;
}

@keyframes skeleton-shimmer {
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-skeleton__cell {
    animation: none;
  }
}
</style>
