<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { labelFor } from '@/shared/i18n/label-strings'
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

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())
</script>

<template>
  <StatusBadge
    :tone="linkDisplay(status, expiresAt).tone"
    :label="labelFor(linkDisplay(status, expiresAt).label, locale)"
    :dot="linkDisplay(status, expiresAt).dot"
  />
</template>
