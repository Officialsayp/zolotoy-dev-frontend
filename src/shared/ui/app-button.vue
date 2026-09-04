<script setup lang="ts">
import { ref } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
    fullWidth?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    fullWidth: false,
  },
)

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()

const buttonEl = ref<HTMLButtonElement | null>(null)

function focus(options?: FocusOptions): void {
  buttonEl.value?.focus(options)
}

defineExpose({ focus })
</script>

<template>
  <button
    ref="buttonEl"
    :class="['app-button', `app-button--${variant}`, `app-button--${size}`, { 'app-button--block': fullWidth }]"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    @click="(event: MouseEvent) => emit('click', event)"
  >
    <LoaderCircle v-if="loading" class="app-button__spinner" aria-hidden="true" />
    <span class="app-button__label"><slot /></span>
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  font-weight: 550;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
}

.app-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.app-button--md {
  height: 36px;
  padding: 0 var(--space-4);
  font-size: var(--text-base);
}

.app-button--sm {
  height: 30px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}

.app-button--block {
  width: 100%;
}

.app-button--primary {
  background: var(--c-accent);
  color: var(--c-accent-contrast);
}

.app-button--primary:hover:not(:disabled) {
  background: var(--c-accent-strong);
}

.app-button--secondary {
  background: var(--c-surface);
  border-color: var(--c-border-strong);
  color: var(--c-text);
}

.app-button--secondary:hover:not(:disabled) {
  border-color: var(--c-accent);
}

.app-button--ghost {
  background: transparent;
  color: var(--c-accent);
}

.app-button--ghost:hover:not(:disabled) {
  background: var(--c-accent-soft);
}

.app-button--danger {
  background: var(--c-danger);
  color: #fff;
}

.app-button--danger:hover:not(:disabled) {
  filter: brightness(0.94);
}

.app-button__spinner {
  width: 16px;
  height: 16px;
  animation: app-button-spin 0.9s linear infinite;
}

@keyframes app-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
