<script setup lang="ts">
import { computed } from 'vue'

import { useOrderRole } from '../queries/use-order-role'
import type { OrderRole } from '../models/order-types'

const { role, canSelectDemoRole, setDemoRole } = useOrderRole()

const hidden = computed(() => !canSelectDemoRole.value)

function onRole(event: Event): void {
  setDemoRole((event.target as HTMLSelectElement).value as OrderRole)
}
</script>

<template>
  <label v-if="!hidden" class="role-switcher">
    <span class="role-switcher__label">Acting role</span>
    <select :value="role" class="role-switcher__select" @change="onRole" data-testid="order-role">
      <option value="buyer">Buyer (user)</option>
      <option value="service">Service (admin)</option>
    </select>
  </label>
</template>

<style scoped>
.role-switcher {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.role-switcher__label {
  font-size: var(--text-sm);
  color: var(--c-text-subtle);
}

.role-switcher__select {
  height: 30px;
  padding: 0 var(--space-2);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-sm);
  cursor: pointer;
}
</style>
