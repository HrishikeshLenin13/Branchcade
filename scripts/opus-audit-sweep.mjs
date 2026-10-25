/* global document, getComputedStyle */
// Opus audit route sweep: every primary route x 6 viewports on a clean profile.
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
const out = process.argv[2]
const base = 'http://127.0.0.1:4173'
const routes = [
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
]
const viewports = [
  [1920, 1080],
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [768, 1024],
  [390, 844],
]
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)
const report = { browser: browser.version(), results: [] }
for (const [w, h] of viewports) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  const console_ = [],
    requests = new Set(),
    failed = [],
    pageErrors = []
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) console_.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => pageErrors.push(e.message))
  page.on('request', (r) => requests.add(new URL(r.url()).origin))
  page.on('requestfailed', (r) => failed.push(r.url()))
  for (const route of routes) {
    const t0 = Date.now()
    await page.goto(base + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(route.startsWith('/missions/') || route === '/lab' ? 1500 : 300)
    const metrics = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      h1: [...document.querySelectorAll('h1')].map((e) => e.textContent.trim()),
      smallTargets: [...document.querySelectorAll('button, a[href], input, select, [role=button]')]
        .filter((e) => {
          const r = e.getBoundingClientRect()
          return (
            r.width > 0 &&
            r.height > 0 &&
            (r.width < 24 || r.height < 24) &&
            getComputedStyle(e).visibility !== 'hidden'
          )
        })
        .map((e) =>
          (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 40),
        )
        .slice(0, 12),
      unnamed: [...document.querySelectorAll('button, a[href]')].filter(
        (e) => !(e.getAttribute('aria-label') || e.textContent.trim() || e.getAttribute('title')),
      ).length,
    }))
    let axe = null
    if (w === 1366 || w === 390) {
      const r = await new AxeBuilder({ page }).analyze()
      axe = r.violations.map((v) => `${v.id}(${v.impact}) x${v.nodes.length}`)
    }
    const name = `${w}x${h}${route.replace(/\//g, '_') || '_home'}.png`
    if ([1920, 1366, 1024, 390].includes(w) || route === '/missions/m01')
      await page.screenshot({ path: `${out}/${name}`, fullPage: false })
    report.results.push({
      viewport: `${w}x${h}`,
      route,
      ms: Date.now() - t0,
      overflowX: metrics.scrollW > metrics.clientW,
      ...metrics,
      axe,
      screenshot: name,
    })
  }
  report.results.push({
    viewport: `${w}x${h}`,
    console: console_,
    pageErrors,
    origins: [...requests],
    failed,
  })
  await ctx.close()
}
await browser.close()
fs.writeFileSync(`${out}/route-sweep.json`, JSON.stringify(report, null, 2))
console.log('done', report.results.length)
