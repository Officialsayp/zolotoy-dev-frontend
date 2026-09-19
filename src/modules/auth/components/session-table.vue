<script setup lang="ts">
import { computed } from 'vue'

import AppButton from '@/shared/ui/app-button.vue'
import StatusBadge from '@/shared/ui/status-badge.vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import type { AuthSessionDto } from '../models/auth-dto'
import { formatDate } from '../utils/auth-format'
import { tr } from '@/portfolio/i18n'

const props = defineProps<{ sessions: AuthSessionDto[] }>()

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  table: tr({ en: 'Active sessions', ru: 'Активные сессии' }, locale.value),
  device: tr({ en: 'Device', ru: 'Устройство' }, locale.value),
  created: tr({ en: 'Created', ru: 'Создана' }, locale.value),
  lastUsed: tr({ en: 'Last used', ru: 'Использована' }, locale.value),
  expires: tr({ en: 'Expires', ru: 'Истекает' }, locale.value),
  status: tr({ en: 'Status', ru: 'Статус' }, locale.value),
  action: tr({ en: 'Action', ru: 'Действие' }, locale.value),
  current: tr({ en: 'Current', ru: 'Текущая' }, locale.value),
  active: tr({ en: 'Active', ru: 'Активна' }, locale.value),
  revoked: tr({ en: 'Revoked', ru: 'Отозвана' }, locale.value),
  revoke: tr({ en: 'Revoke', ru: 'Отозвать' }, locale.value),
  unknownDevice: tr({ en: 'Unknown device', ru: 'Неизвестное устройство' }, locale.value),
}))

const emit = defineEmits<{ (e: 'revoke', sessionId: string): void }>()

const rows = computed(() =>
  props.sessions.map((session) => ({
    ...session,
    deviceLabel: session.device_label || '',
    active: session.status === 'revoked' ? false : true,
    current: session.current === true,
  })),
)
</script>

<template>
  <div class="session-table" role="table" :aria-label="labels.table">
    <div class="session-table__head session-table__row" role="row">
      <span role="columnheader">{{ labels.device }}</span>
      <span role="columnheader">{{ labels.created }}</span>
      <span role="columnheader">{{ labels.lastUsed }}</span>
      <span role="columnheader">{{ labels.expires }}</span>
      <span role="columnheader">{{ labels.status }}</span>
      <span role="columnheader" class="session-table__actions-cell">{{ labels.action }}</span>
    </div>

    <div v-for="session in rows" :key="session.id" class="session-table__row" role="row">
      <span class="session-table__cell" :data-label="labels.device" role="cell">
        <span class="session-table__device">
          {{ session.deviceLabel || labels.unknownDevice }}
          <StatusBadge v-if="session.current" tone="accent" :label="labels.current" />
        </span>
      </span>
      <span class="session-table__cell" :data-label="labels.created" role="cell">{{ formatDate(session.created_at) }}</span>
      <span class="session-table__cell" :data-label="labels.lastUsed" role="cell">{{ formatDate(session.last_used_at) }}</span>
      <span class="session-table__cell" :data-label="labels.expires" role="cell">{{ formatDate(session.expires_at) }}</span>
      <span class="session-table__cell" :data-label="labels.status" role="cell">
        <StatusBadge :tone="session.active ? 'success' : 'neutral'" :label="session.active ? labels.active : labels.revoked" />
      </span>
      <span class="session-table__cell session-table__actions-cell" :data-label="labels.action" role="cell">
        <AppButton
          variant="ghost"
          size="sm"
          :disabled="!session.active"
          @click="emit('revoke', session.id)"
        >
          {{ labels.revoke }}
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
  min-width: 0;
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

.session-table__cell {
  min-width: 0;
  overflow-wrap: anywhere;
}

.session-table__device {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  min-width: 0;
  overflow-wrap: anywhere;
}

.session-table__actions-cell {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1199.98px) {
  .session-table__head {
    display: none;
  }

  .session-table__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3) var(--space-4);
    padding: var(--space-3);
  }

  .session-table__cell::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 2px;
    color: var(--c-text-subtle);
    font-size: var(--text-xs);
    font-weight: 600;
  }

  .session-table__actions-cell {
    grid-column: 1 / -1;
    justify-content: flex-start;
    padding-top: var(--space-1);
  }
}

@media (max-width: 599.98px) {
  .session-table__row {
    grid-template-columns: 1fr;
  }

  .session-table__actions-cell {
    grid-column: auto;
  }
}
</style>
