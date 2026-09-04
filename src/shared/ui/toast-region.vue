<script setup lang="ts">
import { CheckCircle2, Info, AlertTriangle, X, XCircle } from 'lucide-vue-next'

import { useToastStore } from './toast-store'

const store = useToastStore()

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const
</script>

<template>
  <div class="toast-region" role="region" aria-live="polite" aria-label="Notifications">
    <TransitionGroup name="toast" tag="div" class="toast-region__list">
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.tone}`"
        role="status"
      >
        <component :is="ICONS[toast.tone]" class="toast__icon" aria-hidden="true" />
        <span class="toast__message">{{ toast.message }}</span>
        <button
          type="button"
          class="toast__close"
          :aria-label="`Dismiss notification: ${toast.message}`"
          @click="store.dismiss(toast.id)"
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-region {
  position: fixed;
  top: var(--space-4);
  right: var(--space-4);
  z-index: 80;
  max-width: 380px;
  width: calc(100% - var(--space-6));
}

.toast-region__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--surface-card);
  border: 1px solid var(--c-border);
  border-left: 3px solid var(--c-border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  font-size: var(--text-sm);
  color: var(--c-text);
}

.toast--info {
  border-left-color: var(--c-info);
}

.toast--success {
  border-left-color: var(--c-success);
}

.toast--warning {
  border-left-color: var(--c-warning);
}

.toast--danger {
  border-left-color: var(--c-danger);
}

.toast__icon {
  width: 18px;
  height: 18px;
  flex: none;
  margin-top: 1px;
}

.toast--info .toast__icon {
  color: var(--c-info);
}

.toast--success .toast__icon {
  color: var(--c-success);
}

.toast--warning .toast__icon {
  color: var(--c-warning);
}

.toast--danger .toast__icon {
  color: var(--c-danger);
}

.toast__message {
  flex: 1;
  overflow-wrap: anywhere;
}

.toast__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-subtle);
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 2px;
}

.toast__close:hover {
  color: var(--c-text);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-standard),
    transform var(--duration-base) var(--ease-standard);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
