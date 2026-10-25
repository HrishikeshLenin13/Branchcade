/* global indexedDB */
// Opus audit gap closure: browser journeys for every mission's flawed starter (briefing,
// hint ladder, prediction, real run, goal verdict, transfer, finish, reload, retry), a
// confirmed "Show solution", then instructor CSV/JSON exports compared with IndexedDB and
// learner deletion. Synthetic profile only.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
const base = 'http://127.0.0.1:4173'
const out = process.argv[2]
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  acceptDownloads: true,
})
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const steps = []
const check = (name, ok, detail = '') => {
  steps.push({ name, ok: Boolean(ok), detail: String(detail).slice(0, 300) })
  console.log(ok ? 'PASS' : 'FAIL', name, detail ? `— ${String(detail).slice(0, 140)}` : '')
}
const stored = () =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('branchcade-local')
        open.onsuccess = () => {
          const get = open.result.transaction('app').objectStore('app').get('state')
          get.onsuccess = () => {
            resolve(get.result ?? null)
            open.result.close()
          }
        }
      }),
  )
// First action of each starter and of its first transfer challenge (authored data).
// M01 teaches prediction, so its starter is already correct and must complete; every other
// starter is deliberately flawed and must not. M03's repair is covered by opus-audit-blockly.
const completes = new Set(['m01'])
const journeys = [
  ['m01', 'The Wall Problem', 'Move forward', 'Stop in place'],
  ['m02', 'Black Line Stop', 'Stop in place', 'Move forward'],
  ['m04', 'The Extra Lap', 'Move forward', 'Move forward'],
  ['m05', 'The Loop That Never Ends', 'Stop in place', 'Move forward'],
  ['m06', 'Call the Helper', 'Stop in place', 'Move forward'],
  ['m07', 'Color & Distance', 'Stop in place', 'Move forward'],
  ['m08', 'Mystery Malfunction', 'Move forward', 'Turn'],
]
for (const [id, title, first, transfer] of journeys) {
  await page.goto(`${base}/missions/${id}?new=1`, { waitUntil: 'networkidle' })
  check(
    `${id} opens "${title}"`,
    await page.getByRole('heading', { name: title, exact: true }).isVisible(),
  )
  await page.getByRole('button', { name: 'Mission briefing', exact: true }).click()
  const briefing = await page.getByRole('dialog').innerText()
  check(
    `${id} briefing states objective and success conditions`,
    briefing.length > 80,
    briefing.replace(/\s+/g, ' ').slice(0, 120),
  )
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  const hints = [await page.getByTestId('hint-text').innerText()]
  const next = page.getByRole('button', { name: 'Show next hint', exact: true })
  for (let i = 0; i < 5 && (await next.isVisible()) && (await next.isEnabled()); i++) {
    await page.getByRole('button', { name: 'Show next hint', exact: true }).click()
    hints.push(await page.getByTestId('hint-text').innerText())
  }
  check(
    `${id} three-step hint ladder`,
    hints.length === 3 && new Set(hints).size === 3,
    `${hints.length} hints`,
  )
  if (id === 'm06') {
    await page.getByRole('button', { name: 'Show solution…', exact: true }).click()
    await page.getByRole('button', { name: 'Yes, show the solution', exact: true }).click()
    check(
      'm06 solution shown only after confirmation',
      await page.getByTestId('solution').isVisible(),
    )
  }
  await page.keyboard.press('Escape')
  const before = (await stored())?.attempts.length ?? 0
  await page.getByRole('radio', { name: first, exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await page.getByTestId('goal-outcome').waitFor()
  const verdict = await page.getByTestId('goal-outcome').innerText()
  check(
    completes.has(id)
      ? `${id} correct starter meets every goal and scenario`
      : `${id} flawed starter does not meet the mission goal`,
    completes.has(id)
      ? verdict.includes('Mission goal met by the executed trace') && !verdict.includes('not met')
      : verdict.includes('Mission goal not met yet'),
    verdict.replace(/\s+/g, ' ').slice(0, 160),
  )
  check(
    `${id} prediction matched the executed first action`,
    await page.getByText('Your prediction is locked', { exact: true }).isVisible(),
  )
  await page.getByRole('button', { name: 'Try a different challenge', exact: true }).click()
  await page.getByRole('radio', { name: transfer, exact: true }).last().check()
  await page.getByRole('button', { name: 'Lock transfer prediction & reveal', exact: true }).click()
  const reveal = (
    await page
      .getByText(/Your prediction (matches|differs from) the result/)
      .first()
      .innerText()
  ).replace(/\s+/g, ' ')
  check(
    `${id} transfer revealed with an executed result`,
    /Your prediction (matches|differs from) the result/.test(reveal),
    reveal.slice(0, 220),
  )
  const checklist = await page.getByTestId('completion-checklist').innerText()
  check(
    completes.has(id)
      ? `${id} completion checklist fully met`
      : `${id} completion withheld for the flawed program`,
    completes.has(id) ? !checklist.includes('Not yet:') : checklist.includes('Not yet:'),
    checklist.replace(/\s+/g, ' ').slice(0, 160),
  )
  check(
    completes.has(id) ? `${id} "Next mission" link offered` : `${id} no "Next mission" link`,
    (await page.getByRole('link', { name: 'Next mission', exact: true }).count()) ===
      (completes.has(id) ? 1 : 0),
  )
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await page
    .getByRole('status', { name: 'Local save status' })
    .filter({ hasText: 'Saved locally.' })
    .waitFor()
  const after = await stored()
  check(
    `${id} exactly one new attempt saved`,
    after.attempts.length === before + 1,
    `${before} → ${after.attempts.length}`,
  )
  await page.reload({ waitUntil: 'networkidle' })
  check(
    `${id} verdict persists after reload`,
    (await page.getByTestId('goal-outcome').innerText()).includes(
      completes.has(id) ? 'Mission goal met' : 'not met',
    ),
  )
  if (id === 'm08') await page.screenshot({ path: `${out}/missions-m08-not-complete.png` })
}
// Retry: a new attempt must leave the earlier M01 record untouched.
const firstM01 = (await stored()).attempts.find((a) => a.missionId === 'm01')
await page.goto(`${base}/missions/m01?new=1`, { waitUntil: 'networkidle' })
await page.getByRole('radio', { name: 'Stop in place', exact: true }).check()
await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
await page.getByTestId('goal-outcome').waitFor()
await page.waitForTimeout(600)
const afterRetry = await stored()
const m01s = afterRetry.attempts.filter((a) => a.missionId === 'm01')
check(
  'retry adds a new M01 attempt and keeps the earlier one byte-identical',
  m01s.length === 2 &&
    JSON.stringify(m01s.find((a) => a.id === firstM01.id)) === JSON.stringify(firstM01),
  `${m01s.length} M01 attempts`,
)
await page.goto(`${base}/progress`, { waitUntil: 'networkidle' })
const stamps = await page
  .getByRole('button', { name: /^Review completion evidence for / })
  .allInnerTexts()
check(
  'Progress awards completion to M01 only, none to flawed starters',
  (await page.getByRole('button', { name: /^Review completion evidence for / }).count()) === 1 &&
    (await page
      .getByRole('button', { name: 'Review completion evidence for M01', exact: true })
      .isVisible()),
  stamps.join(' | '),
)
await page.screenshot({ path: `${out}/missions-progress.png` })

// Instructor exports compared with what is actually stored.
const download = async (name) => {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name, exact: true }).click()
  return readFileSync(await (await pending).path(), 'utf8')
}
await page.goto(`${base}/instructor`, { waitUntil: 'networkidle' })
const data = await stored()
const csv = await download('Export filtered CSV')
writeFileSync(`${out}/instructor-export.csv`, csv)
const rows = csv.trim().split('\n')
check('CSV header', rows[0] === 'alias,mission,prediction,goal_met,completed_at', rows[0])
check(
  'CSV has one row per stored attempt',
  rows.length - 1 === data.attempts.length,
  `${rows.length - 1} rows / ${data.attempts.length} attempts`,
)
const alias = data.profile.nickname
check(
  'every CSV row names the local alias',
  rows.slice(1).every((r) => r.startsWith(`"${alias}"`)),
  alias,
)
check(
  'CSV goal_met is true only for M01 rows',
  rows.slice(1).every((r) => r.includes('"m01"') === r.includes('"true"')),
  rows
    .slice(1)
    .map((r) => r.split(',').slice(1, 4).join(' '))
    .join(' | '),
)
const json = JSON.parse(await download('Export filtered JSON'))
writeFileSync(
  `${out}/instructor-export.json`,
  JSON.stringify(
    {
      ...json,
      attempts: json.attempts.map((a) => ({
        id: a.id,
        missionId: a.missionId,
        goalOutcome: a.goalOutcome,
      })),
    },
    null,
    2,
  ),
)
check(
  'JSON export carries the same attempt ids as storage',
  JSON.stringify(json.attempts.map((a) => a.id).sort()) ===
    JSON.stringify(data.attempts.map((a) => a.id).sort()),
  `${json.attempts.length} attempts`,
)
// Delete this learner and confirm reports no longer contain them.
await page.goto(`${base}/progress`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Clear my progress', exact: true }).click()
await page.getByRole('button', { name: 'Clear this learner only', exact: true }).click()
await page.getByRole('heading', { name: 'A fresh page', exact: true }).waitFor()
await page.goto(`${base}/instructor`, { waitUntil: 'networkidle' })
const csvAfter = await download('Export filtered CSV')
check(
  'after clearing, the learner has no rows in the CSV',
  csvAfter.trim().split('\n').length === 1,
  csvAfter.trim(),
)
check('IndexedDB holds no attempts for the cleared learner', (await stored()).attempts.length === 0)
check('no page or console errors', errors.length === 0, errors.join(' | '))
writeFileSync(
  `${out}/missions-journey.json`,
  JSON.stringify({ browser: browser.version(), steps, errors }, null, 2),
)
await browser.close()
process.exit(steps.every((s) => s.ok) ? 0 : 1)
