<script setup lang="ts">
import { computed } from 'vue'

import CardPanel from '@/shared/ui/card-panel.vue'
import EmptyState from '@/shared/ui/empty-state.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'

import { analyticsViewModel } from '../models/shortener-domain'
import type { ShortLinkAnalyticsDto } from '../models/shortener-dto'
import { useLocaleStore } from '@/shared/i18n/use-locale'
import { labelFor } from '@/shared/i18n/label-strings'
import { tr } from '@/portfolio/i18n'

/**
 * Link analytics (MASTER_FRONTEND_PLAN §17.6). Both the lightweight SVG/CSS
 * visualization AND the accessible tables read the SAME `analyticsViewModel`
 * derived from the DTO — so they can never show different numbers. No new
 * charting dependency: by-day is an SVG polyline, referrer/device are bar lists.
 */

const localeStore = useLocaleStore()
const locale = computed(() => localeStore.get())

const labels = computed(() => ({
  title: tr({ en: 'Analytics', ru: 'Аналитика' }, locale.value),
  unavailable: tr({ en: 'Analytics unavailable', ru: 'Аналитика недоступна' }, locale.value),
  unavailableMsg: tr({ en: 'Click analytics could not be loaded for this link.', ru: 'Аналитику кликов для этой ссылки загрузить не удалось.' }, locale.value),
  noClicks: tr({ en: 'No clicks yet', ru: 'Кликов пока нет' }, locale.value),
  noClicksMsg: tr({ en: 'This link has not recorded any redirects.', ru: 'Эта ссылка ещё не зафиксировала переходов.' }, locale.value),
  totalClicks: tr({ en: 'total clicks', ru: 'всего переходов' }, locale.value),
  byDay: tr({ en: 'Clicks by day', ru: 'Переходы по дням' }, locale.value),
  byReferrer: tr({ en: 'Top referrers', ru: 'Источники переходов' }, locale.value),
  byDevice: tr({ en: 'Devices', ru: 'Устройства' }, locale.value),
}))

const props = defineProps<{
  analytics?: ShortLinkAnalyticsDto | null
  loading?: boolean
  hasError?: boolean
}>()

const vm = computed(() => (props.analytics ? analyticsViewModel(props.analytics) : null))

const emptyAnalytics = computed(() => Boolean(vm.value && vm.value.totalClicks === 0))

interface ChartDefs {
  w: number
  h: number
  padX: number
  x: (i: number) => number
  y: (click: number) => number
  points: string
}

function chartDefs(vmValue: ReturnType<typeof analyticsViewModel>): ChartDefs {
  const { byDay, maxByDayClicks } = vmValue
  const w = 560
  const h = 140
  const padY = 8
  const padX = 6
  const usableH = h - padY * 2
  const n = byDay.length
  const x = (i: number) => (n === 1 ? 0 : (i * w) / (n - 1))
  const y = (click: number) => padY + usableH - (maxByDayClicks > 0 ? (click / maxByDayClicks) * usableH : 0)
  const points = byDay.map((p, i) => `${x(i).toFixed(1)},${y(p.clicks).toFixed(1)}`).join(' ')
  // Spread dots generously so the polyline doesn't clip the first/last point.
  return { w, h, padX, x, y, points }
}

// Memoized so the SVG attributes share one derivation instead of re-deriving
// the geometry for every bound attribute on each render.
const chart = computed<ChartDefs | null>(() => (vm.value ? chartDefs(vm.value) : null))
</script>

<template>
  <CardPanel class="shortener-analytics" data-testid="shortener-analytics">
    <h3 class="shortener-analytics__title">{{ labels.title }}</h3>

    <LoadingSkeleton v-if="loading" :rows="4" :columns="3" />

    <ErrorState
      v-else-if="hasError"
      :title="labels.unavailable"
      :message="labels.unavailableMsg"
    />

    <EmptyState
      v-else-if="emptyAnalytics"
      :title="labels.noClicks"
      :description="labels.noClicksMsg"
    />

    <template v-else-if="vm">
      <p class="shortener-analytics__total">
        <span class="shortener-analytics__total-value">{{ vm.totalClicks.toLocaleString() }}</span>
        {{ labels.totalClicks }}
      </p>

      <!-- Clicks by day: SVG polyline + accessible table share `vm.byDay`. -->
      <section class="shortener-analytics__section" aria-labelledby="byday-title">
        <h4 id="byday-title" class="shortener-analytics__subtitle">{{ labels.byDay }}</h4>
        <div v-if="chart && vm.byDay.length" class="shortener-analytics__chart">
          <svg
            class="shortener-analytics__line"
            :viewBox="`0 0 ${chart.w} ${chart.h}`"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              :points="chart.points"
              fill="none"
              stroke="var(--c-accent)"
              stroke-width="2"
            />
            <polygon
              v-if="vm.byDay.length > 1"
              :points="`${chart.w - chart.padX},${chart.h - 2} ${chart.x(0)},${chart.y(vm.byDay[0].clicks)} ${
                chart.points
              } ${chart.w - chart.padX},${chart.y(vm.byDay[vm.byDay.length - 1].clicks)}`"
              fill="color-mix(in srgb, var(--c-accent) 18%, transparent)"
            />
          </svg>
        </div>
        <table class="shortener-analytics__table">
          <caption class="shortener-analytics__sr-only">{{ labels.byDay }}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Clicks</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in vm.byDay" :key="p.date">
              <td>{{ p.date }}</td>
              <td>{{ p.clicks }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Referrers: bar list + table share `vm.referrers`. -->
      <section class="shortener-analytics__section" aria-labelledby="ref-title">
        <h4 id="ref-title" class="shortener-analytics__subtitle">{{ labels.byReferrer }}</h4>
        <ol v-if="vm.referrers.length" class="shortener-analytics__bars">
          <li v-for="r in vm.referrers" :key="r.domain" class="shortener-analytics__bar-row">
            <span class="shortener-analytics__bar-label">{{ r.domain }}</span>
            <span class="shortener-analytics__bar-track" aria-hidden="true">
              <span
                class="shortener-analytics__bar-fill"
                :style="{ width: `${Math.min(100, r.share)}%` }"
              />
            </span>
            <span class="shortener-analytics__bar-value">{{ r.clicks }} ({{ r.share }}%)</span>
          </li>
        </ol>
        <table class="shortener-analytics__table">
          <caption class="shortener-analytics__sr-only">{{ labels.byReferrer }}</caption>
          <thead>
            <tr>
              <th scope="col">Referrer</th>
              <th scope="col">Clicks</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in vm.referrers" :key="r.domain">
              <td>{{ r.domain }}</td>
              <td>{{ r.clicks }}</td>
              <td>{{ r.share }}%</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Devices: bar list + table share `vm.devices`. -->
      <section class="shortener-analytics__section" aria-labelledby="dev-title">
        <h4 id="dev-title" class="shortener-analytics__subtitle">{{ labels.byDevice }}</h4>
        <ul v-if="vm.devices.length" class="shortener-analytics__bars">
          <li v-for="d in vm.devices" :key="d.category" class="shortener-analytics__bar-row">
            <span class="shortener-analytics__bar-label">{{ labelFor(d.category, locale) }}</span>
            <span class="shortener-analytics__bar-track" aria-hidden="true">
              <span
                class="shortener-analytics__bar-fill"
                :style="{ width: `${Math.min(100, d.share)}%` }"
              />
            </span>
            <span class="shortener-analytics__bar-value">{{ d.clicks }} ({{ d.share }}%)</span>
          </li>
        </ul>
        <table class="shortener-analytics__table">
          <caption class="shortener-analytics__sr-only">{{ labels.byDevice }}</caption>
          <thead>
            <tr>
              <th scope="col">Device</th>
              <th scope="col">Clicks</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in vm.devices" :key="d.category">
              <td>{{ labelFor(d.category, locale) }}</td>
              <td>{{ d.clicks }}</td>
              <td>{{ d.share }}%</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </CardPanel>
</template>

<style scoped>
.shortener-analytics {
  min-width: 0;
}

.shortener-analytics__title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-md);
}

.shortener-analytics__total {
  margin: 0 0 var(--space-3);
  color: var(--c-text-muted);
  font-size: var(--text-sm);
}

.shortener-analytics__total-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--c-text);
  margin-right: var(--space-1);
}

.shortener-analytics__section {
  margin-top: var(--space-4);
  min-width: 0;
}

.shortener-analytics__subtitle {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  font-weight: 650;
  color: var(--c-text);
}

.shortener-analytics__chart {
  margin-bottom: var(--space-2);
  min-width: 0;
}

.shortener-analytics__line {
  display: block;
  width: 100%;
  height: 140px;
}

.shortener-analytics__bars {
  margin: 0 0 var(--space-2);
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.shortener-analytics__bar-row {
  display: grid;
  grid-template-columns: minmax(90px, 1fr) 1.6fr minmax(90px, auto);
  gap: var(--space-2);
  align-items: center;
  min-width: 0;
  font-size: var(--text-sm);
}

.shortener-analytics__bar-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortener-analytics__bar-track {
  min-width: 0;
  height: 10px;
  border-radius: var(--radius-sm);
  background: var(--c-surface-muted);
  overflow: hidden;
}

.shortener-analytics__bar-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--c-accent), var(--c-info));
}

.shortener-analytics__bar-value {
  color: var(--c-text-muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.shortener-analytics__table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.shortener-analytics__table th,
.shortener-analytics__table td {
  min-width: 0;
  text-align: left;
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px solid var(--c-border);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.shortener-analytics__table th {
  color: var(--c-text-subtle);
  font-size: var(--text-xs);
  text-transform: uppercase;
}

.shortener-analytics__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 519.98px) {
  .shortener-analytics__bar-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .shortener-analytics__bar-label {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    overflow-wrap: anywhere;
  }

  .shortener-analytics__bar-track {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .shortener-analytics__bar-value {
    white-space: nowrap;
  }

  .shortener-analytics__table th,
  .shortener-analytics__table td {
    padding-inline: var(--space-1);
  }
}
</style>
