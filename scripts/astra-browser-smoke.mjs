import { chromium, firefox, webkit, expect } from '@playwright/test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const out = 'docs/audit/astra/evidence/browser-restart'
await mkdir(out, { recursive: true })
const reports = []
for (const [name, engine] of [
  ['chromium', chromium],
  ['firefox', firefox],
  ['webkit', webkit],
]) {
  const directory = await mkdtemp(join(tmpdir(), 'branchcade-astra-'))
  const errors = [],
    origins = new Set()
  let context
  try {
    context = await engine.launchPersistentContext(directory, {
      viewport: { width: 1366, height: 768 },
    })
    const page = await context.newPage()
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('request', (r) => origins.add(new URL(r.url()).origin))
    await page.goto('http://127.0.0.1:4173/missions/m01?new=1')
    await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
    await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
    await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
    await page.getByRole('button', { name: 'Why did that happen?', exact: true }).click()
    await expect(page.locator('.trace-event.selected')).toContainText('compare')
    await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText(
      'Saved locally.',
    )
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(
      page.getByText('World, code and learning stage saved on this device.', { exact: true }),
    ).toBeVisible()
    await page.screenshot({ path: `${out}/${name}-trace.jpg`, type: 'jpeg', quality: 80 })
    const version = context.browser()?.version() ?? 'persistent-context'
    await context.close()
    context = await engine.launchPersistentContext(directory, {
      viewport: { width: 1366, height: 768 },
    })
    const returning = await context.newPage()
    await returning.goto('http://127.0.0.1:4173/progress')
    await expect(
      returning.getByRole('button', { name: 'Review attempt 1', exact: true }),
    ).toBeVisible()
    await returning.screenshot({
      path: `${out}/${name}-restart-progress.jpg`,
      type: 'jpeg',
      quality: 80,
    })
    reports.push({
      name,
      version,
      result: 'PASS',
      physicalBrowserProcessRestart: true,
      errors,
      origins: [...origins],
    })
  } catch (e) {
    reports.push({ name, result: 'FAIL', error: e.message, errors })
  } finally {
    await context?.close()
    await rm(directory, { recursive: true, force: true })
  }
}
await writeFile(`${out}/report.json`, JSON.stringify(reports, null, 2) + '\n')
console.log(JSON.stringify(reports, null, 2))
if (reports.some((r) => r.result !== 'PASS')) process.exitCode = 1
