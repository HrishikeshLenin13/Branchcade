/* global document */
// Opus audit: targeted probes (axe node detail, hit-target sizes).
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
for (const route of ['/missions/m01', '/lab']) {
  await page.goto('http://127.0.0.1:4173' + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const r = await new AxeBuilder({ page }).analyze()
  for (const v of r.violations)
    for (const n of v.nodes) console.log(route, v.id, n.target.join(' '), n.html.slice(0, 200))
}
await page.setViewportSize({ width: 1366, height: 768 })
await page.goto('http://127.0.0.1:4173/missions/m01', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
console.log(
  JSON.stringify(
    await page.evaluate(() =>
      [
        'How it works',
        'Back to missions',
        'Zoom out',
        'Zoom in',
        'Pan up',
        'Pan down',
        'Prediction confidence',
      ].map((n) => {
        const e = [...document.querySelectorAll('a,button,input,[role=slider]')].find(
          (x) => (x.getAttribute('aria-label') || x.textContent).trim() === n,
        )
        if (!e) return [n, null]
        const r = e.getBoundingClientRect()
        return [n, Math.round(r.width), Math.round(r.height)]
      }),
    ),
  ),
)
await browser.close()
