<script setup lang="ts">
import StatusBadge from '@/shared/ui/status-badge.vue'

import { NOTIFICATION_STATUS_META } from '../models/notification-domain'
import type { NotificationJobStatus } from '../models/notification-types'

defineProps<{ status: NotificationJobStatus }>()
</script>

<template>
  <StatusBadge
    :tone="NOTIFICATION_STATUS_META[status].tone"
    :label="NOTIFICATION_STATUS_META[status].label"
    :dot="NOTIFICATION_STATUS_META[status].dot"
  />
</template>
