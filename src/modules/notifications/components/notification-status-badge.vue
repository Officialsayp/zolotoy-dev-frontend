<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from '@/shared/ui/status-badge.vue'

import { NOTIFICATION_STATUS_META } from '../models/notification-domain'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { labelFor } from '@/shared/i18n/label-strings'
import type { NotificationJobStatus } from '../models/notification-types'

defineProps<{ status: NotificationJobStatus }>()

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())
</script>

<template>
  <StatusBadge
    :tone="NOTIFICATION_STATUS_META[status].tone"
    :label="labelFor(NOTIFICATION_STATUS_META[status].label, locale)"
    :dot="NOTIFICATION_STATUS_META[status].dot"
  />
</template>
