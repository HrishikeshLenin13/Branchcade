/* global document, indexedDB, getComputedStyle */
// Opus audit: exploratory journeys on a clean synthetic profile (Chromium).
import { chromium } from 'playwright'
const base = 'http://127.0.0.1:4173'
const out = process.argv[2]
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)
const log = (...a) => console.log(...a)
const fresh = async (vp = { width: 1366, height: 768 }) => {
  const ctx = await browser.newContext({ viewport: vp })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  return { ctx, page, errs }
}
// 1. Corrupt stored envelope.
{
  const { ctx, page, errs } = await fresh()
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('branchcade-local', 1)
        r.onupgradeneeded = () => r.result.createObjectStore('app')
        r.onsuccess = () => {
          const tx = r.result.transaction('app', 'readwrite')
          tx.objectStore('app').put({ schemaVersion: 1, attempts: 'garbage' }, 'state')
          tx.oncomplete = () => {
            r.result.close()
            res()
          }
        }
      }),
  )
  await page.goto(base + '/progress', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  log(
    'corrupt: body text has notice?',
    (await page.locator('body').innerText())
      .match(/can’t be saved|unreadable|Retry|Export/g)
      ?.slice(0, 4),
    'errors',
    errs,
  )
  await page.screenshot({ path: `${out}/journey-corrupt-storage.png` })
  // Does anything overwrite the corrupt envelope after an ordinary action?
  await page.goto(base + '/missions/m01?new=1', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const stored = await page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('branchcade-local')
        r.onsuccess = () => {
          const g = r.result.transaction('app').objectStore('app').get('state')
          g.onsuccess = () => {
            res(JSON.stringify(g.result).slice(0, 80))
            r.result.close()
          }
        }
      }),
  )
  log('corrupt: stored envelope after navigation', stored)
  await ctx.close()
}
// 2. Unknown route, nested reload, back/forward.
{
  const { ctx, page, errs } = await fresh()
  await page.goto(base + '/missions/zz-nope', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  log('unknown mission h1/h2:', await page.locator('h1, h2').allInnerTexts())
  await page.screenshot({ path: `${out}/journey-unknown-mission.png` })
  await page.goto(base + '/missions', { waitUntil: 'networkidle' })
  await page.goto(base + '/missions/m02', { waitUntil: 'networkidle' })
  await page.reload({ waitUntil: 'networkidle' })
  log('reload m02 h1:', await page.locator('h1').innerText())
  await page.goBack({ waitUntil: 'networkidle' })
  log('back ->', new URL(page.url()).pathname, await page.locator('h1').innerText())
  await page.goForward({ waitUntil: 'networkidle' })
  log(
    'forward ->',
    new URL(page.url()).pathname,
    await page.locator('h1').innerText(),
    'errors',
    errs,
  )
  await ctx.close()
}
// 3. Keyboard: dialog focus restore and skip link.
{
  const { ctx, page } = await fresh()
  await page.goto(base + '/missions/m01', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.keyboard.press('Tab')
  log(
    'first Tab focus:',
    await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40)),
  )
  const briefing = page.getByRole('button', { name: 'Mission briefing', exact: true })
  await briefing.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('dialog').waitFor()
  const trapped = []
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    trapped.push(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')))
  }
  log('focus stays in dialog over 12 tabs:', trapped.every(Boolean))
  await page.keyboard.press('Escape')
  log('focus restored to:', await page.evaluate(() => document.activeElement?.textContent?.trim()))
  // Visible focus indicator on a toolbar button.
  await page.getByRole('button', { name: 'Save', exact: true }).focus()
  log(
    'Save focus outline:',
    await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement)
      return `${s.outlineStyle} ${s.outlineWidth} ${s.boxShadow.slice(0, 40)}`
    }),
  )
  await ctx.close()
}
// 4. Onboarding alias validation with markup and over-length input.
{
  const { ctx, page } = await fresh()
  await page.goto(base + '/start', { waitUntil: 'networkidle' })
  const body = await page.locator('main').innerText()
  log('onboarding first panel:', body.slice(0, 200).replace(/\n+/g, ' | '))
  const boxes = await page.getByRole('textbox').count()
  log('textboxes on first panel:', boxes)
  await page.screenshot({ path: `${out}/journey-onboarding.png` })
  await ctx.close()
}
await browser.close()
