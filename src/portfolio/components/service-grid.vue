<script setup lang="ts">
import { SERVICE_CASES } from '@/content/service-registry'
import ServiceCard from './service-card.vue'
</script>

<template>
  <div class="portfolio-grid">
    <ServiceCard v-for="service in SERVICE_CASES" :key="service.id" :service="service" />
  </div>
</template>
