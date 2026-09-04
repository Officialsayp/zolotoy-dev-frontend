import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export interface ToastInput {
  tone?: ToastTone
  message: string
  /** Auto-dismiss delay in ms; 0 disables auto-dismiss. */
  duration?: number
}

export interface ToastItem {
  id: number
  tone: ToastTone
  message: string
  duration: number
}

const DEFAULT_DURATION = 4000
const MAX_TOASTS = 4

let nextId = 1

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([])

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function push(input: ToastInput): number {
    const id = nextId++
    const toast: ToastItem = {
      id,
      tone: input.tone ?? 'info',
      message: input.message,
      duration: input.duration ?? DEFAULT_DURATION,
    }
    toasts.value = [...toasts.value, toast].slice(-MAX_TOASTS)
    if (toast.duration > 0) {
      setTimeout(() => dismiss(id), toast.duration)
    }
    return id
  }

  function clear(): void {
    toasts.value = []
  }

  return { toasts, push, dismiss, clear }
})
