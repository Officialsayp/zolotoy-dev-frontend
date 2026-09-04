<script setup lang="ts">
import { computed } from 'vue'

import { PAYMENT_METHOD_META, type PaymentMethod } from '../models/order-types'

const props = defineProps<{ method: PaymentMethod; showDescription?: boolean }>()

const meta = computed(() => PAYMENT_METHOD_META[props.method])
</script>

<template>
  <span class="payment-method">
    <span class="payment-method__label">{{ meta.label }}</span>
    <span v-if="showDescription" class="payment-method__desc">{{ meta.description }}</span>
  </span>
</template>

<style scoped>
.payment-method {
  display: inline-flex;
  flex-direction: column;
  gap: var(--space-1);
}

.payment-method__label {
  font-weight: 600;
}

.payment-method__desc {
  font-size: var(--text-sm);
  color: var(--c-text-muted);
  max-width: 56ch;
}
</style>
