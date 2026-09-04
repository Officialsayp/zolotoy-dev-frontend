<script setup lang="ts">
import { computed } from 'vue'

import StatusBadge from '@/shared/ui/status-badge.vue'
import { PAYMENT_STATUS_META, type PaymentStatus } from '../models/order-types'

const props = defineProps<{ status: PaymentStatus }>()

const meta = computed(() => PAYMENT_STATUS_META[props.status])
</script>

<template>
  <StatusBadge :tone="meta.tone" :label="meta.label" :dot="false" />
</template>
