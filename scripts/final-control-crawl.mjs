/* global document, window, getComputedStyle, location */
// Final acceptance: inventory every visible interactive control in each route state, then
// activate each one from a freshly reloaded state and record what observably changed
// (URL, dialogs, page text, downloads, focus, storage, console/page errors). Controls with
// no observable effect are flagged for manual investigation. Synthetic data only.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const base = 'http://127.0.0.1:4173'
const out = process.argv[2]
const only = process.argv[3]
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)

/** Seed one completed M01 attempt so data-driven screens have real records. */
async function seed(page) {
  await page.goto(`${base}/missions/m01?new=1`, { waitUntil: 'networkidle' })
  await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await page.getByTestId('goal-outcome').waitFor()
  await page.getByRole('button', { name: 'Try a different challenge', exact: true }).click()
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).last().check()
  await page.getByRole('button', { name: 'Lock transfer prediction & reveal', exact: true }).click()
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await page
    .getByRole('status', { name: 'Local save status' })
    .filter({ hasText: 'Saved locally.' })
    .waitFor()
}
async function ranM01(page) {
  await page.goto(`${base}/missions/m01?new=1`, { waitUntil: 'networkidle' })
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await page.getByTestId('goal-outcome').waitFor()
}
const states = [
  { id: 'home', url: '/' },
  { id: 'onboarding', url: '/start' },
  { id: 'missions', url: '/missions' },
  { id: 'mission-predict', url: '/missions/m02?new=1' },
  { id: 'mission-after-run', setup: ranM01, url: null },
  { id: 'lab', url: '/lab' },
  { id: 'team', url: '/team' },
  { id: 'progress', url: '/progress', seed: true },
  { id: 'instructor', url: '/instructor', seed: true },
  { id: 'settings', url: '/settings', seed: true },
  { id: 'how-it-works', url: '/how-it-works' },
  { id: 'not-found', url: '/zz-unknown' },
].filter((s) => !only || s.id === only)

const CONTROL =
  'button, a[href], input, select, textarea, summary, [role="button"], [role="tab"], [role="switch"]'
const describe = () =>
  [...document.querySelectorAll(window.__controlSelector)]
    .filter((e) => {
      const r = e.getBoundingClientRect(),
        s = getComputedStyle(e)
      return (
        r.width > 0 &&
        r.height > 0 &&
        s.visibility !== 'hidden' &&
        !e.closest('.blocklyWidgetDiv, .blocklyDropDownDiv') &&
        (typeof e.checkVisibility !== 'function' || e.checkVisibility()) &&
        !e.classList.contains('skip-link') &&
        e.getAttribute('href') !== '#main-content' &&
        !(e.tagName === 'INPUT' && e.type === 'hidden')
      )
    })
    .map((e, index) => ({
      index: (e.setAttribute('data-qa-index', String(index)), index),
      tag: e.tagName.toLowerCase(),
      type: e.getAttribute('type') ?? '',
      role: e.getAttribute('role') ?? '',
      label: (
        e.getAttribute('aria-label') ||
        (e.labels && e.labels[0]?.innerText) ||
        e.innerText ||
        e.getAttribute('title') ||
        e.getAttribute('placeholder') ||
        e.getAttribute('name') ||
        ''
      )
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 80),
      href: e.getAttribute('href') ?? '',
      disabled: e.disabled === true || e.getAttribute('aria-disabled') === 'true',
      title: e.getAttribute('title') ?? '',
      inDialog: Boolean(e.closest('[role="dialog"], [role="alertdialog"]')),
    }))

async function prepare(context, state) {
  const page = await context.newPage()
  if (state.setup) await state.setup(page)
  else await page.goto(base + state.url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(state.id.startsWith('mission') || state.id === 'lab' ? 900 : 300)
  await page.evaluate((sel) => {
    window.__controlSelector = sel
    // Reveal collapsed sections the way a learner would before using their controls.
    document.querySelectorAll('details').forEach((d) => (d.open = true))
  }, CONTROL)
  await page.waitForTimeout(150)
  return page
}
const snapshot = (page) =>
  page.evaluate(() => ({
    url: location.pathname + location.search + location.hash,
    dialogs: document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length,
    text:
      document.body.innerText.length +
      ':' +
      document.body.innerText
        .slice(0, 4000)
        .split('')
        .reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
    focus: document.activeElement?.outerHTML.slice(0, 80) ?? '',
    scroll: Math.round(window.scrollY),
    pressed: [
      ...document.querySelectorAll(
        '[aria-pressed],[aria-expanded],[aria-checked],[aria-selected],input,select,details',
      ),
    ]
      .map(
        (e) =>
          `${e.getAttribute('aria-pressed')}${e.getAttribute('aria-expanded')}${e.getAttribute('aria-checked')}${e.getAttribute('aria-selected')}${e.checked ?? ''}${e.value ?? ''}${e.open ?? ''}`,
      )
      .join('|'),
  }))

const report = { browser: browser.version(), states: [] }
for (const state of states) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    acceptDownloads: true,
  })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base })
  if (state.seed) {
    const p = await context.newPage()
    await seed(p)
    await p.close()
  }
  const probe = await prepare(context, state)
  const controls = await probe.evaluate(describe)
  await probe.close()
  const results = []
  for (const control of controls) {
    // Each control starts from its own fresh (re-seeded) browser so destructive controls
    // cannot change what later controls see.
    const own = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      acceptDownloads: true,
    })
    await own.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base })
    if (state.seed) {
      const p = await own.newPage()
      await seed(p)
      await p.close()
    }
    const page = await prepare(own, state)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    let dialogText = ''
    page.on('dialog', (d) => {
      dialogText = `${d.type()}: ${d.message().slice(0, 80)}`
      void d.accept()
    })
    let printed = false
    await page.exposeFunction('__printCalled', () => (printed = true)).catch(() => {})
    await page.evaluate(() => (window.print = () => window.__printCalled()))
    const current = await page.evaluate(describe)
    const match =
      current.find((c) => c.index === control.index && c.label === control.label) ??
      current.find((c) => c.label === control.label && c.tag === control.tag)
    const row = { ...control, action: '', effect: [], errors }
    if (!match) {
      row.action = 'not present after reload'
      results.push(row)
      await own.close()
      continue
    }
    if (control.disabled) {
      row.action = 'disabled'
      row.effect.push(control.title ? `reason: ${control.title}` : 'no reason given')
      results.push(row)
      await own.close()
      continue
    }
    const handle = page.locator(`[data-qa-index="${match.index}"]`)
    const before = await snapshot(page)
    let download = null
    page.once('download', (d) => (download = d.suggestedFilename()))
    const popup = own.waitForEvent('page', { timeout: 1200 }).catch(() => null)
    try {
      if (control.tag === 'select') {
        const options = await handle.locator('option').evaluateAll((o) => o.map((x) => x.value))
        const now = await handle.inputValue()
        const next = options.find((v) => v !== now)
        row.action = `select ${next}`
        if (next !== undefined) await handle.selectOption(next)
      } else if (control.tag === 'input' && ['range', 'number'].includes(control.type)) {
        const min = Number((await handle.getAttribute('min')) ?? 0),
          max = Number((await handle.getAttribute('max')) ?? 100),
          now = Number(await handle.inputValue())
        const next = now < max ? Math.min(max, Math.round((now + max) / 2) || now + 1) : min
        row.action = `fill ${next}`
        await handle.fill(String(next))
      } else if (
        (control.tag === 'input' && ['text', 'search', ''].includes(control.type)) ||
        control.tag === 'textarea'
      ) {
        row.action = 'type "Synthetic QA"'
        await handle.fill('Synthetic QA')
        await handle.press('Tab')
      } else if (control.tag === 'input' && control.type === 'file') {
        row.action = 'file input (exercised in import journey)'
      } else {
        row.action = 'click'
        await handle.click({ timeout: 3000 })
      }
    } catch (e) {
      row.action += ' FAILED: ' + String(e.message).split('\n')[0].slice(0, 120)
    }
    await page.waitForTimeout(500)
    const opened = await popup
    const after = await snapshot(page)
    if (before.url !== after.url) row.effect.push(`navigated ${before.url} → ${after.url}`)
    if (after.dialogs > before.dialogs) row.effect.push(`opened dialog`)
    if (after.dialogs < before.dialogs) row.effect.push(`closed dialog`)
    if (before.text !== after.text) row.effect.push('page content changed')
    if (before.pressed !== after.pressed) row.effect.push('control state changed')
    if (before.scroll !== after.scroll) row.effect.push('scrolled')
    if (before.focus !== after.focus) row.effect.push('focus moved')
    if (download) row.effect.push(`download ${download}`)
    if (printed) row.effect.push('print dialog requested')
    if (dialogText) row.effect.unshift(`native ${dialogText} (accepted)`)
    if (opened) row.effect.push(`opened new tab ${opened.url()}`)
    results.push(row)
    await own.close()
  }
  // The skip link is only reachable by keyboard: Tab from the top, then Enter.
  {
    const page = await prepare(context, state)
    await page.keyboard.press('Tab')
    const first = await page.evaluate(() => document.activeElement?.textContent?.trim())
    await page.keyboard.press('Enter')
    const target = await page.evaluate(() => location.hash)
    results.push({
      index: -1,
      tag: 'a',
      label: 'Skip to content (keyboard)',
      action: 'Tab, Enter',
      effect:
        first === 'Skip to content' && target === '#main-content'
          ? ['first Tab stop; moved to #main-content']
          : [],
      errors: [],
      disabled: false,
    })
    await page.close()
  }
  report.states.push({ state: state.id, controls: results })
  const silent = results.filter(
    (r) => r.action !== 'disabled' && !r.effect.length && !r.action.startsWith('file'),
  )
  console.log(
    `${state.id}: ${results.length} controls, ${results.filter((r) => r.action === 'disabled').length} disabled, ${silent.length} no visible effect, ${results.filter((r) => r.errors.length).length} with errors, ${results.filter((r) => r.action.includes('FAILED')).length} failed to activate`,
  )
  await context.close()
}
writeFileSync(`${out}/control-crawl${only ? '-' + only : ''}.json`, JSON.stringify(report, null, 2))
await browser.close()
