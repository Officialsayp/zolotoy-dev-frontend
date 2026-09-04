<script setup lang="ts">
import { computed } from 'vue'

import EmptyState from '@/shared/ui/empty-state.vue'
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  type OrderStatus,
  type PaymentStatus,
} from '../models/order-types'
import type { HistoryEntryView } from '../models/order-view-model'

const props = defineProps<{ entries: HistoryEntryView[]; loading?: boolean }>()

function orderLabel(value: string | null): string {
  if (!value) return '—'
  return ORDER_STATUS_META[value as OrderStatus]?.label ?? value
}

function paymentLabel(value: string | null): string {
  if (!value) return '—'
  return PAYMENT_STATUS_META[value as PaymentStatus]?.label ?? value
}

function statusChange(entry: HistoryEntryView): boolean {
  return entry.orderStatusBefore !== entry.orderStatusAfter
}

function paymentChange(entry: HistoryEntryView): boolean {
  return entry.paymentStatusBefore !== entry.paymentStatusAfter
}

const ordered = computed(() => [...props.entries].reverse())
</script>

<template>
  <ol class="history-timeline">
    <li v-for="entry in ordered" :key="entry.id" class="history-timeline__item">
      <div class="history-timeline__marker" aria-hidden="true" />
      <div class="history-timeline__body">
        <div class="history-timeline__head">
          <code class="history-timeline__op">{{ entry.operation }}</code>
          <time class="history-timeline__time">{{ entry.occurredAt }}</time>
        </div>
        <div class="history-timeline__transitions">
          <span v-if="statusChange(entry)">
            order: {{ orderLabel(entry.orderStatusBefore) }}
            <span aria-hidden="true">→</span>
            {{ orderLabel(entry.orderStatusAfter) }}
          </span>
          <span v-if="paymentChange(entry)">
            payment: {{ paymentLabel(entry.paymentStatusBefore) }}
            <span aria-hidden="true">→</span>
            {{ paymentLabel(entry.paymentStatusAfter) }}
          </span>
        </div>
        <div v-if="entry.actor" class="history-timeline__actor">actor: {{ entry.actor }}</div>
      </div>
    </li>
  </ol>

  <EmptyState
    v-if="!loading && ordered.length === 0"
    title="No history yet"
    description="This order has not recorded any lifecycle transitions."
  />
</template>

<style scoped>
.history-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.history-timeline__item {
  display: flex;
  gap: var(--space-3);
  position: relative;
}

.history-timeline__marker {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c-accent);
  flex: none;
  margin-top: 5px;
}

.history-timeline__item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 16px;
  bottom: -8px;
  width: 2px;
  background: var(--c-border);
}

.history-timeline__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.history-timeline__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
}

.history-timeline__op {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
}

.history-timeline__time {
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.history-timeline__transitions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.history-timeline__actor {
  font-size: var(--text-xs);
  color: var(--c-text-subtle);
}
</style>
