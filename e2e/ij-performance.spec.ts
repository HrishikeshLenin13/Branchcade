/** I/J stress fixtures enter through the same validated local-file UI as learner data.
 * Timings are diagnostic attachments, not hardware-dependent pass/fail targets. */
import { attemptCollection } from '../tests/ij-record-fixture'
import { test, expect, type Page } from '@playwright/test'
import {
  longTraceProgram,
  obstacleHeavyWorld,
  largeEditorProgram,
  timedTraceProgram,
} from '../tests/ij-fixtures'
const header = (page: Page) => page.locator('.world-panel > .panel-header')
async function importStressWorlds(page: Page) {
  const now = new Date().toISOString(),
    world = obstacleHeavyWorld()
  const fixture = {
    schemaVersion: 1,
    exportedAt: now,
    profile: null,
    attempts: [],
    teams: [],
    savedLabs: [
      {
        schemaVersion: 1,
        id: 'ij-timed-trace',
        name: 'I/J synthetic timed replay stress',
        world,
        program: timedTraceProgram(),
        updatedAt: now,
      },
      {
        schemaVersion: 1,
        id: 'ij-long-trace',
        name: 'I/J synthetic 100-solid trace stress',
        world,
        program: longTraceProgram(),
        updatedAt: now,
      },
      {
        schemaVersion: 1,
        id: 'ij-large-editor',
        name: 'I/J synthetic 180-statement editing stress',
        world,
        program: largeEditorProgram(),
        updatedAt: now,
      },
    ],
  }
  await page.goto('/settings')
  await page.getByLabel('Import local data', { exact: true }).setInputFiles({
    name: 'ij-synthetic-stress.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  })
  await page.getByRole('button', { name: 'Merge validated import', exact: true }).click()
  await expect(page.getByText('Merged validated local data.', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Lab', exact: true }).click()
  await page.getByText('Save or restore a world', { exact: true }).click()
}
test('I/J production 1500-event inspector stays bounded, filters, pages and replays exact snapshots', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await importStressWorlds(page)
  await page
    .getByRole('combobox', { name: 'Saved world collection', exact: true })
    .selectOption('ij-long-trace')
  const runStart = performance.now()
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Execution inspector' })).toContainText(
    '1503 events',
  )
  const runMs = performance.now() - runStart
  await expect(page.locator('.trace-event')).toHaveCount(60)
  const searchStart = performance.now()
  await page.getByRole('searchbox', { name: 'Search events', exact: true }).fill('Inspected 42')
  await expect(page.locator('.trace-event')).toHaveCount(60)
  await expect(page.locator('.trace-event').first()).toContainText('inspect · sample')
  const searchMs = performance.now() - searchStart
  await page.getByRole('button', { name: 'More events', exact: true }).click()
  await expect(page.locator('.trace-event').first()).toContainText('inspect · sample')
  await page.locator('.trace-event').first().click()
  await expect(page.locator('.trace-event.selected')).toHaveCount(1)
  await page.getByRole('searchbox', { name: 'Search events', exact: true }).fill('')
  await page.getByRole('button', { name: 'Reset simulation', exact: true }).click()
  await expect(header(page)).toContainText('Tick 0 · Paused')
  await page.getByRole('button', { name: 'Replay', exact: true }).click()
  await expect(header(page)).toContainText('Tick 0 · Paused')
  await expect(page.locator('.trace-event')).toHaveCount(60)
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Review attempt 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review attempt 2', exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
  await testInfo.attach('ij-long-trace-metrics', {
    body: JSON.stringify(
      {
        browser: testInfo.project.name,
        obstacles: 100,
        events: 1503,
        visibleRows: 60,
        runAndRevealMs: runMs,
        filterInteractionMs: searchMs,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  })
})
test('I/J 180-statement Blockly workspace survives apply, unmount and repeated route navigation', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await importStressWorlds(page)
  await page
    .getByRole('combobox', { name: 'Saved world collection', exact: true })
    .selectOption('ij-large-editor')
  const cdp = testInfo.project.name === 'chromium' ? await page.context().newCDPSession(page) : null
  await cdp?.send('Performance.enable')
  await cdp?.send('HeapProfiler.collectGarbage')
  const beforeMemory = cdp
    ? {
        metrics: await cdp.send('Performance.getMetrics'),
        dom: await cdp.send('Memory.getDOMCounters'),
      }
    : null
  const begin = performance.now()
  await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
  await expect(page.locator('.blocklySvg')).toBeVisible()
  await page.getByRole('button', { name: 'Apply blocks', exact: true }).click()
  await expect(
    page.getByText('Program applied. Record a new prediction to run it.', { exact: true }),
  ).toBeVisible()
  const editorMs = performance.now() - begin
  await page.getByRole('button', { name: 'Close block editor', exact: true }).click()
  await expect(page.locator('.blocklySvg')).toHaveCount(0)
  const navigationMs: number[] = []
  for (let index = 0; index < 4; index++) {
    const start = performance.now()
    await page.getByRole('link', { name: 'Missions', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Small programs. Big discoveries.', exact: true }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Lab', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'The sensor lab', exact: true })).toBeVisible()
    await expect(page.locator('.blocklySvg')).toHaveCount(0)
    navigationMs.push(performance.now() - start)
  }
  await cdp?.send('HeapProfiler.collectGarbage')
  const afterMemory = cdp
    ? {
        metrics: await cdp.send('Performance.getMetrics'),
        dom: await cdp.send('Memory.getDOMCounters'),
      }
    : null
  const repeatedDisposal: { cycle: number; dom: unknown; metrics: unknown }[] = []
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
    await expect(page.locator('.blocklySvg')).toBeVisible()
    await page.getByRole('button', { name: 'Close block editor', exact: true }).click()
    await expect(page.locator('.blocklySvg')).toHaveCount(0)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    await cdp?.send('HeapProfiler.collectGarbage')
    if (cdp)
      repeatedDisposal.push({
        cycle,
        dom: await cdp.send('Memory.getDOMCounters'),
        metrics: await cdp.send('Performance.getMetrics'),
      })
  }
  await cdp?.detach()
  expect(errors).toEqual([])
  await testInfo.attach('ij-editor-navigation-metrics', {
    body: JSON.stringify(
      {
        browser: testInfo.project.name,
        statements: 180,
        editorLoadAndApplyMs: editorMs,
        memoryBeforeEditor: beforeMemory,
        repeatedDisposal,
        memoryAfterUnmountAndNavigation: afterMemory,
        navigationRoundTripMs: navigationMs,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  })
})

test('I/J cold browser load and long timed replay remain responsive without changing logical clock', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    const metrics = { lcpMs: null as number | null, cls: 0 }
    Object.assign(window, { ijLoadMetrics: metrics })
    if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint'))
      new PerformanceObserver((list) => {
        metrics.lcpMs = list.getEntries().at(-1)?.startTime ?? null
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift'))
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          hadRecentInput: boolean
          value: number
        })[])
          if (!entry.hadRecentInput) metrics.cls += entry.value
      }).observe({ type: 'layout-shift', buffered: true })
  })
  const start = performance.now()
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const coldLoadMs = performance.now() - start
  const coldLoad = await page.evaluate(() => ({
    metrics: (window as unknown as { ijLoadMetrics: unknown }).ijLoadMetrics,
    navigation: performance.getEntriesByType('navigation')[0]?.toJSON(),
    resources: performance.getEntriesByType('resource').map((entry) => entry.toJSON()),
  }))
  await importStressWorlds(page)
  await page
    .getByRole('combobox', { name: 'Saved world collection', exact: true })
    .selectOption('ij-timed-trace')
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await expect(header(page)).toContainText('Tick 1500 · Paused')
  await page.getByRole('combobox', { name: 'Simulation speed', exact: true }).selectOption('4')
  await page.getByRole('button', { name: 'Replay', exact: true }).click()
  const frames = await page.evaluate(
    () =>
      new Promise<{ count: number; medianIntervalMs: number; maxIntervalMs: number }>((resolve) => {
        const intervals: number[] = []
        let first: number | undefined, previous: number | undefined
        const frame = (now: number) => {
          first ??= now
          if (previous !== undefined) intervals.push(now - previous)
          previous = now
          if (now - first < 2000) requestAnimationFrame(frame)
          else {
            const sorted = [...intervals].sort((a, b) => a - b)
            resolve({
              count: intervals.length,
              medianIntervalMs: sorted[Math.floor(sorted.length / 2)] ?? 0,
              maxIntervalMs: sorted.at(-1) ?? 0,
            })
          }
        }
        requestAnimationFrame(frame)
      }),
  )
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const paused = await header(page).innerText()
  const tick = Number(paused.match(/Tick (\d+)/)?.[1])
  expect(tick).toBeGreaterThan(0)
  expect(tick).toBeLessThan(1500)
  await page.waitForTimeout(110)
  await expect(header(page)).toContainText(`Tick ${tick} · Paused`)
  await expect(page.locator('.trace-event')).toHaveCount(60)
  expect(errors).toEqual([])
  await testInfo.attach('ij-cold-replay-metrics', {
    body: JSON.stringify(
      {
        browser: testInfo.project.name,
        coldLoadMs,
        coldLoad,
        replayAtSpeed: 4,
        observedPausedTick: tick,
        frames,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  })
})

test('I/J Blockly editing loads only bundled same-origin assets and never requests sound', async ({
  page,
}) => {
  const external: string[] = [],
    sounds: string[] = [],
    missing: string[] = []
  let origin: string | undefined
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      origin ??= url.origin
      if (url.origin !== origin) external.push(request.url())
      if (/\.(mp3|wav|ogg)(?:$|\?)/.test(url.pathname)) sounds.push(request.url())
    }
  })
  page.on('response', (response) => {
    if (response.url().includes('/assets/blockly/') && response.status() >= 400)
      missing.push(response.url())
  })
  await page.goto('/lab?example=24')
  await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
  await expect(page.locator('.blocklySvg')).toBeVisible()
  await page.getByRole('button', { name: 'Code preview', exact: true }).click()
  await expect(page.getByLabel('Block code preview', { exact: true })).toContainText('distanceCm')
  await page.getByRole('button', { name: 'Blocks', exact: true }).click()
  await page.getByRole('button', { name: 'Auto-layout', exact: true }).click()
  await page.getByRole('button', { name: 'Apply blocks', exact: true }).click()
  await expect(
    page.getByText('Program applied. Record a new prediction to run it.', { exact: true }),
  ).toBeVisible()
  expect(external).toEqual([])
  expect(sounds).toEqual([])
  expect(missing).toEqual([])
})

test('I/J fifty executed records import, render in Progress and survive reload', async ({
  page,
}, testInfo) => {
  const data = await attemptCollection(50),
    raw = JSON.stringify(data),
    bytes = Buffer.byteLength(raw)
  expect(bytes).toBeLessThan(500000)
  await page.goto('/settings')
  const begin = performance.now()
  await page.getByLabel('Import local data', { exact: true }).setInputFiles({
    name: 'ij-synthetic-50-records.json',
    mimeType: 'application/json',
    buffer: Buffer.from(raw),
  })
  await page.getByRole('button', { name: 'Merge validated import', exact: true }).click()
  await expect(page.getByText('Merged validated local data.', { exact: true })).toBeVisible()
  const importMs = performance.now() - begin
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Review attempt / })).toHaveCount(50)
  await expect(page.getByRole('button', { name: 'Review attempt 50', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /^Review attempt / })).toHaveCount(50)
  await testInfo.attach('ij-record-collection-metrics', {
    body: JSON.stringify(
      {
        browser: testInfo.project.name,
        records: 50,
        bytes,
        importThroughDurableConfirmationMs: importMs,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  })
})
