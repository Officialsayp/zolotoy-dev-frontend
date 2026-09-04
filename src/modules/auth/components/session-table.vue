<script setup lang="ts">
import { computed } from 'vue'

import AppButton from '@/shared/ui/app-button.vue'
import StatusBadge from '@/shared/ui/status-badge.vue'
import type { AuthSessionDto } from '../models/auth-dto'
import { formatDate } from '../utils/auth-format'

const props = defineProps<{ sessions: AuthSessionDto[] }>()

const emit = defineEmits<{ (e: 'revoke', sessionId: string): void }>()

const rows = computed(() =>
  props.sessions.map((session) => ({
    ...session,
    deviceLabel: session.device_label || 'Unknown device',
    active: session.status === 'revoked' ? false : true,
    current: session.current === true,
  })),
)
</script>

<template>
  <div class="session-table" role="table" aria-label="Active sessions">
    <div class="session-table__head session-table__row">
      <span>Device</span>
      <span>Created</span>
      <span>Last used</span>
      <span>Expires</span>
      <span>Status</span>
      <span class="session-table__actions-cell">Action</span>
    </div>

    <div v-for="session in rows" :key="session.id" class="session-table__row" role="row">
      <span class="session-table__device">
        {{ session.deviceLabel }}
        <StatusBadge v-if="session.current" tone="accent" label="Current" />
      </span>
      <span>{{ formatDate(session.created_at) }}</span>
      <span>{{ formatDate(session.last_used_at) }}</span>
      <span>{{ formatDate(session.expires_at) }}</span>
      <span>
        <StatusBadge :tone="session.active ? 'success' : 'neutral'" :label="session.active ? 'Active' : 'Revoked'" />
      </span>
      <span class="session-table__actions-cell">
        <AppButton
          variant="ghost"
          size="sm"
          :disabled="!session.active"
          @click="emit('revoke', session.id)"
        >
          Revoke
        </AppButton>
      </span>
    </div>
  </div>
</template>

<style scoped>
.session-table {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.session-table__row {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1fr 0.7fr 0.7fr;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-2) var(--space-3);
}

.session-table__head {
  background: var(--c-surface-muted);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--c-text-subtle);
}

.session-table__row + .session-table__row {
  border-top: 1px solid var(--c-border);
}

.session-table__device {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  overflow-wrap: anywhere;
}

.session-table__actions-cell {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 760px) {
  .session-table__head {
    display: none;
  }

  .session-table__row {
    grid-template-columns: 1fr;
    gap: var(--space-1);
    padding: var(--space-3);
  }

  .session-table__row + .session-table__row {
    border-top: 1px solid var(--c-border);
  }

  .session-table__actions-cell {
    justify-content: flex-start;
    padding-top: var(--space-1);
  }
}
</style>
