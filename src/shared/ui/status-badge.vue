<script setup lang="ts">
type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'

withDefaults(
  defineProps<{
    tone?: BadgeTone
    label: string
    dot?: boolean
  }>(),
  {
    tone: 'neutral',
    dot: false,
  },
)
</script>

<template>
  <span :class="['status-badge', `status-badge--${tone}`]">
    <span v-if="dot" class="status-badge__dot" aria-hidden="true" />
    <span class="status-badge__label">{{ label }}</span>
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  background: var(--c-surface-muted);
  color: var(--c-text);
  border: 1px solid var(--c-border);
}

.status-badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}

.status-badge--info {
  background: var(--c-accent-soft);
  color: var(--c-info);
  border-color: transparent;
}

.status-badge--success {
  background: color-mix(in srgb, var(--c-success) 12%, transparent);
  color: var(--c-success);
  border-color: transparent;
}

.status-badge--warning {
  background: color-mix(in srgb, var(--c-warning) 14%, transparent);
  color: var(--c-warning);
  border-color: transparent;
}

.status-badge--danger {
  background: color-mix(in srgb, var(--c-danger) 12%, transparent);
  color: var(--c-danger);
  border-color: transparent;
}

.status-badge--accent {
  background: var(--c-accent);
  color: var(--c-accent-contrast);
  border-color: transparent;
}
</style>
