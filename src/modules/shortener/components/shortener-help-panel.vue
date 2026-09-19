<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'
import { getService } from '@/shared/config/service-registry'
import CardPanel from '@/shared/ui/card-panel.vue'

const service = getService('shortener')

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  title: tr({ en: 'Cache & performance boundary', ru: 'Границы кэша и производительности' }, locale.value),
  text: tr(
    {
      en: 'This console shows the observable management surface of the shortener. Redis cache-aside, singleflight stampede protection, negative caching and the bounded analytics pipeline are backend internals — there is intentionally no Redis-key inspector or cache state UI here. Their evidence lives in observability and the performance report.',
      ru: 'Консоль показывает наблюдаемую поверхность управления сокращателем. Redis cache-aside, singleflight-защита от шторма, negative caching и ограниченный конвейер аналитики — внутренние детали бэкенда; намеренно нет UI для инспектора ключей Redis или состояния кэша. Их доказательства — в наблюдаемости и отчёте о производительности.',
    },
    locale.value,
  ),
  grafana: tr({ en: 'Open Grafana', ru: 'Открыть Grafana' }, locale.value),
  grafanaMissing: tr({ en: 'Grafana is not configured for this deployment.', ru: 'Grafana не настроена для этого развёртывания.' }, locale.value),
  perfReport: tr({ en: 'Performance report / load tests', ru: 'Отчёт о производительности / нагрузочные тесты' }, locale.value),
  endpoints: tr({ en: 'Operational endpoints', ru: 'Эксплуатационные эндпоинты' }, locale.value),
}))
</script>

<template>
  <CardPanel class="shortener-help" data-testid="shortener-help">
    <h3 class="shortener-help__title">{{ labels.title }}</h3>
    <p class="shortener-help__text">
      {{ labels.text }}
    </p>

    <div class="shortener-help__links">
      <a
        v-if="service.grafanaUrl"
        :href="service.grafanaUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="shortener-help__link"
      >
        {{ labels.grafana }}
      </a>
      <span v-else class="shortener-help__muted">{{ labels.grafanaMissing }}</span>

      <a
        v-if="service.githubUrl"
        :href="service.githubUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="shortener-help__link"
      >
        {{ labels.perfReport }}
      </a>

      <span class="shortener-help__muted">
        {{ labels.endpoints }}: <code>{{ service.swaggerPath }}</code>, <code>/metrics</code>,
        <code>/health/*</code>.
      </span>
    </div>
  </CardPanel>
</template>

<style scoped>
.shortener-help__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-md);
}

.shortener-help__text {
  margin: 0 0 var(--space-2);
  color: var(--c-text-muted);
  font-size: var(--text-sm);
  max-width: 70ch;
}

.shortener-help__links {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--text-sm);
}

.shortener-help__link {
  color: var(--c-accent);
  font-weight: 600;
}

.shortener-help__muted {
  color: var(--c-text-subtle);
}

.shortener-help__links code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
</style>
