<script setup lang="ts">
import { ref } from 'vue'

import AppButton from '@/shared/ui/app-button.vue'
import CardPanel from '@/shared/ui/card-panel.vue'
import ConfirmDialog from '@/shared/ui/confirm-dialog.vue'

import type { ShortLinkDto } from '../models/shortener-dto'

/**
 * Management actions (MASTER_FRONTEND_PLAN §17.4).
 *
 * Logical delete IS source-backed (`DELETE /api/v1/links/{id}`) and therefore
 * active, behind a destructive confirmation. Enable/disable would need an agreed
 * PUT contract — the exact PUT request/response fields are still **TBD** — so
 * those actions stay capability-gated (disabled, with the contract reason shown)
 * rather than inventing a generic edit form or a guessed PUT DTO.
 */

const props = defineProps<{
  link: ShortLinkDto
  deleteBusy?: boolean
}>()

const emit = defineEmits<{ (e: 'delete'): void }>()

const confirmOpen = ref(false)
</script>

<template>
  <CardPanel class="shortener-actions">
    <h3 class="shortener-actions__title">Management actions</h3>

    <div class="shortener-actions__row">
      <AppButton variant="danger" data-testid="delete-link" :disabled="deleteBusy" @click="confirmOpen = true">
        Delete link
      </AppButton>
      <span class="shortener-actions__note">Logical delete; requires confirmation.</span>
    </div>

    <div class="shortener-actions__row">
      <AppButton variant="secondary" disabled title="Enable requires an agreed PUT contract" data-testid="enable-link">
        Enable
      </AppButton>
      <AppButton variant="secondary" disabled title="Disable requires an agreed PUT contract" data-testid="disable-link">
        Disable
      </AppButton>
      <span class="shortener-actions__note">
        Enable/disable is capability-gated: the exact PUT request/response contract is still
        TBD, so the frontend does not guess a mutation.
      </span>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      title="Delete this link?"
      :message="`Deleting ${props.link.code} permanently stops its redirects and invalidates its cache entry on the backend.`"
      confirm-label="Delete"
      variant="danger"
      :busy="deleteBusy"
      @confirm="confirmOpen = false; emit('delete')"
      @update:open="confirmOpen = false"
    />
  </CardPanel>
</template>

<style scoped>
.shortener-actions__title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-md);
}

.shortener-actions__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-3);
}

.shortener-actions__note {
  font-size: var(--text-xs);
  color: var(--c-text-subtle);
  max-width: 46ch;
}
</style>
