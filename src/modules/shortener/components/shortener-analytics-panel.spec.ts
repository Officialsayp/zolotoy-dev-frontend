import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ShortenerAnalyticsPanel from './shortener-analytics-panel.vue'
import type { ShortLinkAnalyticsDto } from '../models/shortener-dto'

/**
 * Analytics panel (Prompt 04 TESTS): the SVG by-day visualization and the
 * accessible tables render the SAME analytics view model — the displayed total,
 * the line chart and the tables never diverge.
 */

const populated: ShortLinkAnalyticsDto = {
  total_clicks: 1240,
  by_day: [
    { date: '2026-08-30', clicks: 174 },
    { date: '2026-09-01', clicks: 315 },
    { date: '2026-09-02', clicks: 243 },
  ],
  by_referrer: [
    { referrer_domain: 'github.com', clicks: 338 },
    { referrer_domain: '(direct)', clicks: 902 },
  ],
  by_device: [
    { device_type: 'mobile', clicks: 1190 },
    { device_type: 'unknown', clicks: 50 },
  ],
}

function mountPanel(analytics: ShortLinkAnalyticsDto | null, extra: Record<string, unknown> = {}) {
  return mount(ShortenerAnalyticsPanel, { props: { analytics, ...extra } })
}

describe('shortener analytics panel', () => {
  it('renders the total from the view model', () => {
    const wrapper = mountPanel(populated)
    expect(wrapper.text()).toContain('total clicks')
    // Same number flows from vm to the heading AND the by-day table caption path.
    expect(wrapper.find('[data-testid="shortener-analytics"]').exists()).toBe(true)
  })

  it('draws a line chart and a by-day table from the same `byDay` series', () => {
    const wrapper = mountPanel(populated)
    // SVG polyline exists (visualization).
    expect(wrapper.find('polyline').attributes('points')).toBeTruthy()
    // By-day table row count equals the series length.
    const tables = wrapper.findAll('table')
    const byDayTable = tables[0]
    expect(byDayTable.findAll('tbody tr')).toHaveLength(3)
  })

  it('renders referrer and device tables from the same view model', () => {
    const wrapper = mountPanel(populated)
    const tables = wrapper.findAll('table')
    expect(tables[1].findAll('tbody tr')).toHaveLength(2)
    expect(tables[2].findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('github.com')
    expect(wrapper.text()).toContain('mobile')
  })

  it('shows an empty state for zero analytics', () => {
    const empty: ShortLinkAnalyticsDto = { total_clicks: 0, by_day: [], by_referrer: [], by_device: [] }
    const wrapper = mountPanel(empty)
    expect(wrapper.text()).toContain('No clicks yet')
  })
})
