<script setup lang="ts">
import { computed } from 'vue'

import StatusBadge from '@/shared/ui/status-badge.vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { labelFor } from '@/shared/i18n/label-strings'
import { PAYMENT_STATUS_META, type PaymentStatus } from '../models/order-types'

const props = defineProps<{ status: PaymentStatus }>()

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const meta = computed(() => PAYMENT_STATUS_META[props.status])
</script>

<template>
  <StatusBadge :tone="meta.tone" :label="labelFor(meta.label, locale)" :dot="false" />
</template>
