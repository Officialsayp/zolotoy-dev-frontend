#!/usr/bin/env node
/**
 * Deliberate regeneration of the static OG image (public/og/portfolio.png).
 * Uses the existing Playwright Chromium — requires installed browsers
 * (npx playwright install chromium). The committed image is a source asset;
 * the normal npm run build never launches a browser.
 */
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outPath = join(root, 'public', 'og', 'portfolio.png')

const { chromium } = await import('playwright-core')

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; display: flex; align-items: center;
    justify-content: space-between; padding: 0 100px;
    background: #0f1216; color: #f6f7f9;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  .mark { width: 240px; height: 240px; color: #2f6fed; }
  .text { text-align: left; }
  h1 { font-size: 72px; font-weight: 700; color: #ffffff; }
  p { font-size: 32px; color: #8a93a1; margin-top: 16px; }
</style></head>
<body>
  <div class="text">
    <h1>zolotoy.dev</h1>
    <p>Go backend engineering portfolio</p>
    <p>Order · Auth · Notification · Shortener</p>
  </div>
  <svg class="mark" viewBox="0 0 1024 1024" aria-hidden="true">
    <path fill="currentColor" d="m 672.4,130.42 c 56.76329,-6.38169 114.93893,23.3205 143.66,72.55 24.7532,44.51243 43.11022,92.2969 61.33,139.79 40.47809,111.57482 74.44289,227.08462 83.39,345.84 3.99187,44.64405 -4.00131,91.90701 -30.17,129.25 -34.22823,51.15534 -96.88829,80.43706 -158.08,76.16 -65.28191,-0.20566 -122.44364,-36.95943 -172.66,-75.06 -29.80113,-21.1118 -55.76914,-47.83868 -88.02,-65.27 -37.1943,-17.42617 -81.28549,-5.84133 -112.39,18.66 -47.69117,31.39849 -92.05098,67.43326 -138.03,101.11 -42.44103,27.81416 -101.51738,26.57093 -141.77,-4.74 -46.576445,-33.45195 -68.670533,-101.8275 -40,-153.73 23.21529,-41.55088 62.88534,-72.59629 108.24,-86.75 113.13424,-43.47682 226.71305,-85.88549 339.51,-130.18 14.82036,-6.43752 8.66067,-30.49279 -7.52,-28.35 -129.83943,-0.30295 -259.73631,0.55616 -389.54,-0.43 -36.193632,-1.7293 -66.727809,-33.24856 -68.06,-69.29 -1.106386,-32.02682 21.500955,-57.48376 34.11,-85.22 21.96273,-39.71643 41.91012,-80.65977 66.1,-119.08 32.5121,-48.07805 94.7686,-72.14669 151.45,-60.86 47.15984,8.26016 85.2391,43.82881 104.98,86.33 11.06377,24.16746 25.30898,52.15623 54.26,57.34 32.44615,7.58399 61.05887,-17.52199 74.14,-45.03 16.12049,-32.13564 35.32251,-64.94553 67.48,-83.37 17.54732,-10.66503 37.14009,-17.50491 57.59,-19.67 z"/>
  </svg>
</body>
</html>`

mkdirSync(dirname(outPath), { recursive: true })

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.setContent(html)
  await page.screenshot({ path: outPath, type: 'png' })
  console.log(`generate-og: wrote ${outPath}`)
} finally {
  await browser.close()
}
