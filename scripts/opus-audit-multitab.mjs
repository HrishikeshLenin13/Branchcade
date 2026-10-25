/* global indexedDB */
// Opus audit OPUS multi-tab reproduction: two tabs of one browser profile, synthetic data only.
import { chromium } from 'playwright'
const base = 'http://127.0.0.1:4173'
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
const read = (page) =>
  page.evaluate(
    () =>
      new Promise((res, rej) => {
        const r = indexedDB.open('branchcade-local')
        r.onerror = rej
        r.onsuccess = () => {
          const g = r.result.transaction('app').objectStore('app').get('state')
          g.onsuccess = () => {
            const d = g.result
            res(
              d
                ? {
                    attempts: d.attempts.length,
                    drafts: d.drafts.length,
                    labs: d.savedLabs.length,
                    profile: d.profile?.nickname,
                    exportedAt: d.exportedAt,
                  }
                : null,
            )
            r.result.close()
          }
        }
      }),
  )
const a = await ctx.newPage()
await a.goto(base + '/missions/m01?new=1', { waitUntil: 'networkidle' })
await a.getByRole('radio', { name: 'Move forward', exact: true }).check()
// Tab B opens now, while A has not yet recorded an attempt.
const b = await ctx.newPage()
await b.goto(base + '/missions/m03?new=1', { waitUntil: 'networkidle' })
await b.waitForTimeout(800)
console.log('before A run:', JSON.stringify(await read(a)))
await a.bringToFront()
await a.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
await a.getByText('Your prediction is locked', { exact: true }).waitFor()
await a.waitForTimeout(800)
console.log('after A records attempt:', JSON.stringify(await read(a)))
// Tab B (stale in-memory envelope) saves its draft.
await b.bringToFront()
await b.getByRole('button', { name: 'Save', exact: true }).click()
await b.waitForTimeout(1000)
console.log('after B saves draft:', JSON.stringify(await read(b)))
const c = await ctx.newPage()
await c.goto(base + '/progress', { waitUntil: 'networkidle' })
await c.waitForTimeout(800)
await c.screenshot({ path: process.argv[2] + '/multitab-progress-after.png' })
console.log('fresh tab sees:', JSON.stringify(await read(c)))
// Idle loop check: with three tabs open and nobody acting, the stored envelope must stop changing.
await a.waitForTimeout(1500)
const idle1 = (await read(a)).exportedAt
await a.waitForTimeout(4000)
const idle2 = (await read(a)).exportedAt
console.log('idle writes over 4 s:', idle1 === idle2 ? 'none' : `changed ${idle1} -> ${idle2}`)
await browser.close()
