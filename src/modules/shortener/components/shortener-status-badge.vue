<script setup lang="ts">
import StatusBadge from '@/shared/ui/status-badge.vue'

import { linkDisplay } from '../models/shortener-domain'

withDefaults(
  defineProps<{
    status?: string
    expiresAt?: string | null
  }>(),
  {
    status: undefined,
    expiresAt: null,
  },
)
</script>

<template>
  <StatusBadge
    :tone="linkDisplay(status, expiresAt).tone"
    :label="linkDisplay(status, expiresAt).label"
    :dot="linkDisplay(status, expiresAt).dot"
  />
</template>
