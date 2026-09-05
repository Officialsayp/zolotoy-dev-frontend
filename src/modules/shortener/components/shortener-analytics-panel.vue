<script setup lang="ts">
import { computed } from 'vue'

import CardPanel from '@/shared/ui/card-panel.vue'
import EmptyState from '@/shared/ui/empty-state.vue'
import ErrorState from '@/shared/ui/error-state.vue'
import LoadingSkeleton from '@/shared/ui/loading-skeleton.vue'

import { analyticsViewModel } from '../models/shortener-domain'
import type { ShortLinkAnalyticsDto } from '../models/shortener-dto'

/**
 * Link analytics (MASTER_FRONTEND_PLAN §17.6). Both the lightweight SVG/CSS
 * visualization AND the accessible tables read the SAME `analyticsViewModel`
 * derived from the DTO — so they can never show different numbers. No new
 * charting dependency: by-day is an SVG polyline, referrer/device are bar lists.
 */

const props = defineProps<{
  analytics?: ShortLinkAnalyticsDto | null
  loading?: boolean
  hasError?: boolean
}>()

const vm = computed(() => (props.analytics ? analyticsViewModel(props.analytics) : null))

const emptyAnalytics = computed(() => Boolean(vm.value && vm.value.totalClicks === 0))

function chartDefs(vmValue: ReturnType<typeof analyticsViewModel>) {
  const { byDay, maxByDayClicks } = vmValue
  const w = 560
  const h = 140
  const padY = 8
  const usableH = h - padY * 2
  const n = byDay.length
  const step = n > 1 ? w / (n - 1) : w
  const x = (i: number) => (n === 1 ? 0 : (i * w) / (n - 1))
  const y = (click: number) => padY + usableH - (maxByDayClicks > 0 ? (click / maxByDayClicks) * usableH : 0)
  const points = byDay.map((p, i) => `${x(i).toFixed(1)},${y(p.clicks).toFixed(1)}`).join(' ')
  // Spread dots generously so the polyline doesn't clip the first/last point.
  return { w, h, x, y, step, points, pad: 6 }
}
</script>

<template>
  <CardPanel class="shortener-analytics" data-testid="shortener-analytics">
    <h3 class="shortener-analytics__title">Analytics</h3>

    <LoadingSkeleton v-if="loading" :rows="4" :columns="3" />

    <ErrorState
      v-else-if="hasError"
      title="Analytics unavailable"
      message="Click analytics could not be loaded for this link."
    />

    <EmptyState
      v-else-if="emptyAnalytics"
      title="No clicks yet"
      description="This link has not recorded any redirects."
    />

    <template v-else-if="vm">
      <p class="shortener-analytics__total">
        <span class="shortener-analytics__total-value">{{ vm.totalClicks.toLocaleString() }}</span>
        total clicks
      </p>

      <!-- Clicks by day: SVG polyline + accessible table share `vm.byDay`. -->
      <section class="shortener-analytics__section" aria-labelledby="byday-title">
        <h4 id="byday-title" class="shortener-analytics__subtitle">Clicks by day</h4>
        <div v-if="vm.byDay.length" class="shortener-analytics__chart">
          <svg
            class="shortener-analytics__line"
            :viewBox="`0 0 ${chartDefs(vm).w} ${chartDefs(vm).h}`"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              :points="chartDefs(vm).points"
              fill="none"
              stroke="var(--c-accent)"
              stroke-width="2"
            />
            <polygon
              v-if="vm.byDay.length > 1"
              :points="`${chartDefs(vm).w - 6},${chartDefs(vm).h - 2} ${chartDefs(vm).x(0)},${
                chartDefs(vm).y(vm.byDay[0].clicks)
              } ${chartDefs(vm).points} ${chartDefs(vm).w - 6},${chartDefs(vm).y(
                vm.byDay[vm.byDay.length - 1].clicks,
              )}`"
              fill="color-mix(in srgb, var(--c-accent) 18%, transparent)"
            />
          </svg>
        </div>
        <table class="shortener-analytics__table">
          <caption class="shortener-analytics__sr-only">Clicks by day</caption>
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
        <h4 id="ref-title" class="shortener-analytics__subtitle">Top referrer domains</h4>
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
          <caption class="shortener-analytics__sr-only">Clicks by referrer domain</caption>
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
        <h4 id="dev-title" class="shortener-analytics__subtitle">Device category</h4>
        <ul v-if="vm.devices.length" class="shortener-analytics__bars">
          <li v-for="d in vm.devices" :key="d.category" class="shortener-analytics__bar-row">
            <span class="shortener-analytics__bar-label">{{ d.category }}</span>
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
          <caption class="shortener-analytics__sr-only">Clicks by device category</caption>
          <thead>
            <tr>
              <th scope="col">Device</th>
              <th scope="col">Clicks</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in vm.devices" :key="d.category">
              <td>{{ d.category }}</td>
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
}

.shortener-analytics__subtitle {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  font-weight: 650;
  color: var(--c-text);
}

.shortener-analytics__chart {
  margin-bottom: var(--space-2);
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
  font-size: var(--text-sm);
}

.shortener-analytics__bar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortener-analytics__bar-track {
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
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.shortener-analytics__table th,
.shortener-analytics__table td {
  text-align: left;
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px solid var(--c-border);
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
</style>
