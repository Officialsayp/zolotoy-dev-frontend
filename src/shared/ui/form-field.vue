<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    /** The `id` of the associated control (feeds the label `for` and error aria). */
    controlFor?: string
    required?: boolean
    helper?: string
    error?: string | null
  }>(),
  {
    label: '',
    controlFor: undefined,
    required: false,
    helper: '',
    error: null,
  },
)
</script>

<template>
  <div class="form-field" :class="{ 'form-field--invalid': Boolean(error) }">
    <label v-if="label" class="form-field__label" :for="controlFor">
      {{ label }}
      <span v-if="required" class="form-field__required" aria-hidden="true">*</span>
    </label>

    <slot />

    <p
      v-if="error"
      class="form-field__error"
      :id="controlFor ? `${controlFor}-error` : undefined"
      role="alert"
    >
      {{ error }}
    </p>
    <p v-else-if="helper" class="form-field__helper">{{ helper }}</p>
  </div>
</template>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-field__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--c-text);
}

.form-field__required {
  color: var(--c-danger);
  margin-left: 2px;
}

.form-field__error {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-danger);
}

.form-field__helper {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-text-subtle);
}

.form-field--invalid :deep(input),
.form-field--invalid :deep(select),
.form-field--invalid :deep(textarea) {
  border-color: var(--c-danger);
}
</style>
