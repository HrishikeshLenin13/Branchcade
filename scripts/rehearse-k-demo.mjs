/* global window */
/** Actual production UI rehearsal; all answers are explicitly synthetic demo choices.
 * No application state injection, mocked engine, student records or video recording. */
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
const output = process.env.BRANCHCADE_REHEARSAL_OUTPUT ?? 'docs/evidence/k'
await mkdir(output, { recursive: true })
const loader = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: 'error',
})
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
if (process.env.BRANCHCADE_REHEARSAL_TRACE)
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true })
const page = await context.newPage()
const errors = [],
  consoleErrors = [],
  consoleWarnings = [],
  failedRequests = [],
  failedResponses = [],
  requests = [],
  layouts = [],
  observations = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
  if (message.type() === 'warning') consoleWarnings.push(message.text())
})
page.on('request', (request) => requests.push(new URL(request.url()).origin))
page.on('requestfailed', (request) => failedRequests.push(request.url()))
page.on('response', (response) => {
  if (response.status() >= 400)
    failedResponses.push({ url: response.url(), status: response.status() })
})
const capture = async (filename) => {
  await page.screenshot({ path: `${output}/${filename}`, type: 'jpeg', quality: 85, scale: 'css' })
  const layout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: window.document.documentElement.scrollWidth,
  }))
  layouts.push({ filename, ...layout })
  expect(layout.document).toBeLessThanOrEqual(layout.viewport)
}
try {
  const { buildProbe } = await loader.ssrLoadModule('/src/learning/probe-templates.ts')
  await page.goto('http://127.0.0.1:4173/missions/m01?new=1')
  await expect(page.locator('main h1')).toHaveText('The Wall Problem')
  await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
  await expect(page.locator('.blocklySvg')).toBeVisible()
  await page.getByText('View pseudocode', { exact: true }).click()
  await page.evaluate(() => window.scrollTo(0, 400))
  await capture('readme-workbench.jpg')
  await page.setViewportSize({ width: 1366, height: 768 })
  await page
    .getByRole('button', { name: 'Lock prediction & run', exact: true })
    .scrollIntoViewIfNeeded()
  await capture('chromebook-workbench.jpg')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
  observations.push({ stage: 'run', facts: await page.getByTestId('branch-facts').innerText() })
  await page.getByRole('button', { name: 'Show decision in timeline', exact: true }).click()
  await page.getByRole('button', { name: 'Why did that happen?', exact: true }).click()
  await capture('m01-trace.jpg')
  await page.getByRole('button', { name: 'Why are you asking?', exact: true }).click()
  observations.push({
    stage: 'probe-rationale',
    text: await page.getByTestId('probe-why').innerText(),
  })
  for (let i = 0; i < 4; i++) {
    const question = page.getByTestId('probe-question')
    const ids = await question.evaluateAll((elements) =>
      elements.map((e) => e.getAttribute('data-probe-id')),
    )
    if (!ids.length) break
    const id = ids[0]
    const probe = buildProbe(id)
    const answer = probe.predictions.COMPARATOR_DIRECTION
    const label = probe.choices.find(
      (choice) => choice.id === answer.replace(/[^\w.-]/g, '_'),
    ).label
    observations.push({
      stage: 'synthetic-probe-answer',
      id,
      situation: probe.situation,
      label,
      truth: probe.truth,
    })
    await question.getByRole('button', { name: label, exact: true }).click()
    await expect(page.getByTestId('probe-feedback')).toBeVisible()
    await expect
      .poll(async () => question.getAttribute('data-probe-id', { timeout: 500 }).catch(() => null))
      .not.toBe(id)
  }
  await page.getByRole('button', { name: 'Generate a targeted experiment', exact: true }).click()
  await expect(page.getByTestId('experiment-rationale')).toBeVisible()
  observations.push({
    stage: 'generated',
    rationale: await page.getByTestId('experiment-rationale').innerText(),
  })
  const slider = page.getByRole('slider', { name: 'Experiment wall distance', exact: true })
  for (const [distance, label, fact] of [
    ['30', 'It moves forward', '30 < 20 is false'],
    ['12', 'It stops / stays still', '12 < 20 is true'],
  ]) {
    await slider.fill(distance)
    await page.getByRole('radio', { name: label, exact: true }).check()
    await page.getByRole('button', { name: 'Lock experiment prediction', exact: true }).click()
    await page.getByRole('button', { name: 'Run experiment', exact: true }).click()
    await expect(page.getByTestId('experiment-facts')).toContainText(fact)
    observations.push({
      stage: 'experiment',
      distance,
      facts: await page.getByTestId('experiment-facts').innerText(),
    })
  }
  await page.getByRole('button', { name: 'Explain comparison', exact: true }).click()
  await page.getByTestId('experiment-facts').scrollIntoViewIfNeeded()
  await capture('counterexample.jpg')
  await page.getByRole('button', { name: 'Test my understanding with new numbers' }).click()
  observations.push({ stage: 'transfer-before', text: await page.locator('main').innerText() })
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).last().check()
  await page.getByRole('button', { name: 'Lock transfer prediction & reveal' }).click()
  await expect(page.getByTestId('transfer-advice')).toBeVisible()
  observations.push({
    stage: 'transfer-after',
    advice: await page.getByTestId('transfer-advice').innerText(),
  })
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.reload()
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByTestId('concept-comparisons')).toBeVisible()
  observations.push({
    stage: 'progress-after-reload',
    text: await page.locator('main').innerText(),
  })
  expect(errors).toEqual([])
  expect(consoleErrors).toEqual([])
  expect(failedRequests).toEqual([])
  expect(failedResponses).toEqual([])
  expect([...new Set(requests)]).toEqual(['http://127.0.0.1:4173'])
  await writeFile(
    `${output}/rehearsal.json`,
    JSON.stringify(
      {
        checkedDate: '2026-10-24',
        sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        viewport: page.viewportSize(),
        syntheticDemoOnly: true,
        videoRecorded: false,
        errors,
        consoleErrors,
        consoleWarnings,
        failedRequests,
        failedResponses,
        layouts,
        origins: [...new Set(requests)],
        observations,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(
    'PASS: actual M01 → probes → generated wall experiment 30/12 → distinct transfer → durable Progress; 0 page errors; local origin only.',
  )
} finally {
  if (process.env.BRANCHCADE_REHEARSAL_TRACE)
    await context.tracing.stop({ path: process.env.BRANCHCADE_REHEARSAL_TRACE })
  await browser.close()
  await loader.close()
}
