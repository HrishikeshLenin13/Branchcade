/* global document, innerWidth */
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { mkdir, writeFile } from 'node:fs/promises'
const out = process.argv[2] ?? 'docs/audit/astra/evidence/baseline-browser'
await mkdir(out, { recursive: true })
const browser = await chromium.launch()
const report = { browser: browser.version(), synthetic: true, states: [] }
for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  const context = await browser.newContext({ viewport: { width, height } })
  const page = await context.newPage()
  const errors = [],
    origins = new Set()
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('request', (r) => origins.add(new URL(r.url()).origin))
  for (const route of [
    '/',
    '/start',
    '/missions',
    '/missions/m01',
    '/lab',
    '/team',
    '/progress',
    '/instructor',
    '/settings',
    '/how-it-works',
    '/does-not-exist',
  ]) {
    const start = performance.now()
    await page.goto('http://127.0.0.1:4173' + route)
    await page.locator('h1').waitFor()
    await page.evaluate(() => document.fonts.ready)
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      heading: document.querySelector('h1')?.textContent,
    }))
    const state = {
      viewport: `${width}x${height}`,
      route,
      headingReadyMs: Math.round(performance.now() - start),
      ...metrics,
    }
    if (route === '/missions/m01' || (width === 1366 && route !== '/does-not-exist')) {
      const name = `${width}-${route.replaceAll('/', '_') || 'home'}.jpg`
      await page.screenshot({ path: `${out}/${name}`, type: 'jpeg', quality: 75 })
      state.screenshot = name
    }
    if (width === 1366 || width === 390)
      state.axe = (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
      }))
    report.states.push(state)
  }
  report.states.push({ viewport: `${width}x${height}`, errors, origins: [...origins] })
  await context.close()
}
await browser.close()
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n')
console.log(
  JSON.stringify(
    {
      browser: report.browser,
      routes: 66,
      overflow: report.states.filter((s) => s.overflow),
      errors: report.states.flatMap((s) => s.errors ?? []),
      axe: report.states.filter((s) => s.axe?.length),
    },
    null,
    2,
  ),
)
