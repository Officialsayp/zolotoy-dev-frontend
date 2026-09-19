<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { tr } from '@/portfolio/i18n'
import { getService } from '@/shared/config/service-registry'
import CardPanel from '@/shared/ui/card-panel.vue'

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  title: tr({ en: 'Delivery semantics', ru: 'Семантика доставки' }, locale.value),
  dlq: tr({ en: 'Kafka DLQ', ru: 'Kafka DLQ' }, locale.value),
  dlqText: tr(
    {
      en: 'an input event that could not be parsed/validated (a poison message). There is no HTTP listing endpoint for it here.',
      ru: 'входное событие, которое не удалось разобрать/валидировать (poison-сообщение). HTTP-эндпоинта списка для него здесь нет.',
    },
    locale.value,
  ),
  deadJob: tr({ en: 'Dead delivery job', ru: 'Dead-задача доставки' }, locale.value),
  deadJobText: tr(
    {
      en: 'a valid event whose specific notification exhausted its retry budget (status=dead). These are retriable from the job detail.',
      ru: 'валидное событие, у которого конкретное уведомление исчерпало бюджет ретраев (status=dead). Их можно перезапустить из карточки задачи.',
    },
    locale.value,
  ),
  notExactlyOnce: tr({ en: 'Not exactly-once.', ru: 'Не exactly-once.' }, locale.value),
  notExactlyOnceText: tr(
    {
      en: 'Kafka events are processed at-least-once; duplicates are normal and durably deduplicated. External providers can rarely see a duplicate side effect in a crash window, so we never claim exactly-once delivery.',
      ru: 'События Kafka обрабатываются at-least-once; дубликаты нормальны и надёжно дедуплицируются. Внешний провайдер в редком окне падения может увидеть дубликат эффекта, поэтому мы никогда не заявляем exactly-once доставку.',
    },
    locale.value,
  ),
  noStats: tr({ en: 'No paginated-page statistics.', ru: 'Без статистики по одной странице.' }, locale.value),
  noStatsText: tr(
    {
      en: 'In-app global success rates would be misleading when derived from one page; real operational metrics belong in an observability system, which we link to when configured.',
      ru: 'Глобальные метрики успеха в приложении, выведенные из одной страницы, вводили бы в заблуждение; операционные метрики живут в системе наблюдаемости, которую мы показываем при настройке.',
    },
    locale.value,
  ),
  grafanaNotConfigured: tr({ en: 'Grafana is not configured for this deployment.', ru: 'Grafana не настроена для этого развёртывания.' }, locale.value),
}))

const grafanaUrl = getService('notification').grafanaUrl
const swaggerPath = getService('notification').swaggerPath
</script>

<template>
  <CardPanel class="notification-help" data-testid="notification-help">
    <h3 class="notification-help__title">{{ labels.title }}</h3>
    <ul class="notification-help__list">
      <li>
        <strong>{{ labels.dlq }}</strong> — {{ labels.dlqText }}
      </li>
      <li>
        <strong>{{ labels.deadJob }}</strong> — {{ labels.deadJobText }}
      </li>
      <li>
        <strong>{{ labels.notExactlyOnce }}</strong> {{ labels.notExactlyOnceText }}
      </li>
      <li>
        <strong>{{ labels.noStats }}</strong> {{ labels.noStatsText }}
      </li>
    </ul>

    <div v-if="grafanaUrl" class="notification-help__links">
      <a :href="grafanaUrl" target="_blank" rel="noopener noreferrer" class="notification-help__link">
        Open Grafana
      </a>
    </div>
    <div v-else class="notification-help__links">
      <span class="notification-help__muted">{{ labels.grafanaNotConfigured }}</span>
      <span class="notification-help__muted">
        Operational endpoints: <code>{{ swaggerPath }}</code>, <code>/metrics</code>, <code>/health/*</code>.
      </span>
    </div>
  </CardPanel>
</template>

<style scoped>
.notification-help__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-md);
}

.notification-help__list {
  margin: 0;
  padding-left: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--c-text-muted);
  font-size: var(--text-sm);
}

.notification-help__list strong {
  color: var(--c-text);
}

.notification-help__list code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.notification-help__links {
  margin-top: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--text-sm);
}

.notification-help__link {
  color: var(--c-accent);
  font-weight: 600;
}

.notification-help__muted {
  color: var(--c-text-subtle);
}
</style>
