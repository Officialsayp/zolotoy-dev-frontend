<script setup lang="ts">
import { Github, ExternalLink } from 'lucide-vue-next'

import { getServiceRegistry } from '@/shared/config/service-registry'

const services = getServiceRegistry()
const githubUrl = services[0]?.githubUrl
</script>

<template>
  <footer class="app-footer">
    <span class="app-footer__meta">zolotoy.dev — technical developer/admin environment</span>
    <span v-if="githubUrl" class="app-footer__links">
      <a :href="githubUrl" target="_blank" rel="noopener noreferrer" class="app-footer__link">
        <Github aria-hidden="true" /> GitHub <ExternalLink aria-hidden="true" class="app-footer__ext" />
      </a>
    </span>
  </footer>
</template>

<style scoped>
.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-4) 0;
  border-top: 1px solid var(--c-border);
  margin-top: var(--space-6);
  font-size: var(--text-sm);
  color: var(--c-text-subtle);
}

.app-footer__links {
  display: inline-flex;
  align-items: center;
}

.app-footer__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--c-text-muted);
}

.app-footer__link :deep(svg) {
  width: 14px;
  height: 14px;
}

.app-footer__ext {
  opacity: 0.7;
}
</style>
