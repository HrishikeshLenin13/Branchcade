/* global window */
// Final acceptance performance measurements on the production preview, via the Chrome
// DevTools Protocol (Playwright CDP session): navigation timing and long tasks for cold
// loads, Blockly editor open time, run latency, and JS heap across repeated mission runs.
// Measurements are observations from this container, not hardware-independent budgets.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const base = 'http://127.0.0.1:4173'
const out = process.argv[2]
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)
const results = { browser: browser.version(), runs: {} }
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
async function fresh() {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await context.newPage()
  await page.addInitScript(() => {
    window.__longTasks = []
    new window.PerformanceObserver((l) =>
      l.getEntries().forEach((e) => window.__longTasks.push(e.duration)),
    ).observe({ type: 'longtask', buffered: true })
  })
  const cdp = await context.newCDPSession(page)
  await cdp.send('Performance.enable')
  return { context, page, cdp }
}
const heapMb = async (cdp) => {
  await cdp.send('HeapProfiler.collectGarbage')
  const m = (await cdp.send('Performance.getMetrics')).metrics
  return +(m.find((x) => x.name === 'JSHeapUsedSize').value / 1048576).toFixed(1)
}

for (const route of ['/', '/missions', '/missions/m01', '/lab', '/instructor']) {
  const samples = []
  for (let i = 0; i < 5; i++) {
    const { context, page } = await fresh()
    await page.goto(base + route, { waitUntil: 'networkidle' })
    const t = await page.evaluate(() => {
      const n = window.performance.getEntriesByType('navigation')[0]
      return {
        domContentLoaded: Math.round(n.domContentLoadedEventEnd),
        load: Math.round(n.loadEventEnd),
        transferKb: Math.round(
          window.performance
            .getEntriesByType('resource')
            .reduce((s, r) => s + (r.transferSize || 0), n.transferSize || 0) / 1024,
        ),
        longTasks: window.__longTasks.length,
        longestTask: Math.round(Math.max(0, ...window.__longTasks)),
      }
    })
    samples.push(t)
    await context.close()
  }
  results.runs[`cold ${route}`] = {
    medianDomContentLoadedMs: median(samples.map((s) => s.domContentLoaded)),
    medianLoadMs: median(samples.map((s) => s.load)),
    transferKb: samples[0].transferKb,
    medianLongTasks: median(samples.map((s) => s.longTasks)),
    medianLongestTaskMs: median(samples.map((s) => s.longestTask)),
  }
  console.log(route, JSON.stringify(results.runs[`cold ${route}`]))
}

// Blockly editor open (lazy chunk) — five fresh contexts.
{
  const samples = []
  for (let i = 0; i < 5; i++) {
    const { context, page } = await fresh()
    await page.goto(`${base}/missions/m01`, { waitUntil: 'networkidle' })
    const t0 = Date.now()
    // Blocks start open on wide screens.
    if (await page.getByRole('button', { name: 'Open block editor', exact: true }).count())
      await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
    await page.locator('.blocklyBlockCanvas [data-id]').first().waitFor()
    samples.push(Date.now() - t0)
    await context.close()
  }
  results.runs['open Blockly editor (click → first block)'] = {
    samplesMs: samples,
    medianMs: median(samples),
  }
  console.log('blockly', samples)
}

// Repeated mission runs: run latency and heap growth over 10 fresh attempts in one tab.
{
  const { context, page, cdp } = await fresh()
  await page.goto(`${base}/missions/m01?new=1`, { waitUntil: 'networkidle' })
  const heap = [await heapMb(cdp)]
  const runMs = []
  for (let i = 0; i < 10; i++) {
    await page.goto(`${base}/missions/m01?new=1`, { waitUntil: 'networkidle' })
    await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
    const t0 = Date.now()
    await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
    await page.getByTestId('goal-outcome').waitFor()
    runMs.push(Date.now() - t0)
    await page
      .getByRole('status', { name: 'Local save status' })
      .filter({ hasText: 'Saved locally.' })
      .waitFor()
    heap.push(await heapMb(cdp))
  }
  const longTasks = await page.evaluate(() => window.__longTasks.map(Math.round))
  results.runs['10 consecutive M01 runs'] = {
    lockAndRunToVerdictMs: runMs,
    medianMs: median(runMs),
    heapMbAfterGcByRun: heap,
    longTasksMsInLastPage: longTasks,
  }
  console.log('runs', JSON.stringify(results.runs['10 consecutive M01 runs']))
  // A Chrome performance trace of one run, saved as evidence.
  await page.goto(`${base}/missions/m01?new=1`, { waitUntil: 'networkidle' })
  await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await browser.startTracing(page, {
    path: `${out}/trace-m01-run.json`,
    categories: ['devtools.timeline', 'v8.execute', 'blink.user_timing'],
  })
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await page.getByTestId('goal-outcome').waitFor()
  await page.waitForTimeout(500)
  await browser.stopTracing()
  await context.close()
}
writeFileSync(`${out}/performance.json`, JSON.stringify(results, null, 2))
await browser.close()
