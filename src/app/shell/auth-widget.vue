<script setup lang="ts">
import { computed } from 'vue'
import { UserRound } from 'lucide-vue-next'

import { useSessionStore } from '@/modules/auth/store/session-store'

const session = useSessionStore()

const label = computed(() => {
  if (session.status === 'authenticated') return 'Signed in'
  if (session.status === 'anonymous') return 'Guest'
  return 'Checking session…'
})

const tone = computed(() => {
  if (session.status === 'authenticated') return 'status--ok'
  if (session.status === 'anonymous') return 'status--idle'
  return 'status--pending'
})
</script>

<template>
  <span class="auth-widget" :class="tone" :title="`Session: ${session.status}`">
    <UserRound aria-hidden="true" />
    <span>{{ label }}</span>
  </span>
</template>

<style scoped>
.auth-widget {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.auth-widget :deep(svg) {
  width: 16px;
  height: 16px;
}

.auth-widget.status--ok {
  color: var(--c-success);
}

.auth-widget.status--pending {
  color: var(--c-text-subtle);
}
</style>
