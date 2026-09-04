<script setup lang="ts">
import { onMounted, ref, useId, watch } from 'vue'

import AppButton from './app-button.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'primary' | 'danger'
    busy?: boolean
  }>(),
  {
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'primary',
    busy: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

interface FocusableButton {
  focus(options?: FocusOptions): void
}

const titleId = useId()
const dialogEl = ref<HTMLDialogElement | null>(null)
const cancelEl = ref<FocusableButton | null>(null)

function syncDialogState(isOpen: boolean): void {
  const dialog = dialogEl.value
  if (!dialog) return

  if (isOpen && !dialog.open) {
    dialog.showModal()
    cancelEl.value?.focus()
    return
  }

  if (!isOpen && dialog.open) {
    dialog.close()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    syncDialogState(isOpen)
  },
)

onMounted(() => {
  syncDialogState(props.open)
})

function onDialogClose(): void {
  emit('update:open', false)
}

function onCancel(): void {
  emit('cancel')
  emit('update:open', false)
}

function onConfirm(): void {
  emit('confirm')
  emit('update:open', false)
}
</script>

<template>
  <dialog
    ref="dialogEl"
    class="confirm-dialog"
    :aria-labelledby="titleId"
    @close="onDialogClose"
    @cancel.prevent="onCancel"
  >
    <div class="confirm-dialog__body">
      <h2 :id="titleId" class="confirm-dialog__title">{{ title }}</h2>
      <div v-if="message" class="confirm-dialog__message">{{ message }}</div>
    </div>
    <div class="confirm-dialog__actions">
      <AppButton ref="cancelEl" variant="ghost" :disabled="busy" @click="onCancel">
        {{ cancelLabel }}
      </AppButton>
      <AppButton
        :variant="variant === 'danger' ? 'danger' : 'primary'"
        :loading="busy"
        @click="onConfirm"
      >
        {{ confirmLabel }}
      </AppButton>
    </div>
  </dialog>
</template>

<style scoped>
.confirm-dialog {
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  color: var(--c-text);
  box-shadow: var(--shadow-md);
  padding: 0;
  width: min(440px, calc(100vw - var(--space-6)));
}

.confirm-dialog::backdrop {
  background: var(--c-overlay);
}

.confirm-dialog__body {
  padding: var(--space-5);
}

.confirm-dialog__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-lg);
}

.confirm-dialog__message {
  color: var(--c-text-muted);
  overflow-wrap: anywhere;
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--c-border);
}
</style>
