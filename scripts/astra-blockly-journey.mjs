/* global document */
// Astra rerun adapted from the preserved Opus journey: M03 repaired only through real Blockly pointer/keyboard gestures
// (toolbox drag, snap-connect, detach, field typing, dropdown, Undo/Redo), then predicted,
// run, transferred, finished, reloaded and checked in Progress. Synthetic profile only.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const base = 'http://127.0.0.1:4173'
const out = process.argv[2]
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const steps = []
const check = (name, ok, detail = '') => {
  steps.push({ name, ok: Boolean(ok), detail: String(detail).slice(0, 300) })
  console.log(ok ? 'PASS' : 'FAIL', name, detail ? `— ${String(detail).slice(0, 160)}` : '')
}
const blockCount = () =>
  page
    .locator('svg.blocklySvg > g.blocklyWorkspace > g.blocklyBlockCanvas .blocklyDraggable')
    .count()
const pathBox = (id) =>
  page.locator(`.blocklyBlockCanvas [data-id="${id}"] > .blocklyPath`).first().boundingBox()
const drag = async (from, to) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++)
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12)
  await page.mouse.up()
  await page.waitForTimeout(300)
}
const pseudocode = async () =>
  (await page.locator('pre').filter({ hasText: 'distanceCm' }).first().innerText()).trim()
const apply = async () => {
  await page.getByRole('button', { name: 'Apply blocks', exact: true }).click()
  await page.waitForTimeout(300)
}

await page.goto(base + '/missions/m03?new=1', { waitUntil: 'networkidle' })
await page.getByRole('slider', { name: 'Editor panel width', exact: true }).fill('38')
// Blocks start open on wide screens.
if (await page.getByRole('button', { name: 'Open block editor', exact: true }).count())
  await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
await page.locator('.blocklySvg').waitFor()
await page.waitForTimeout(600)
const initial = await blockCount()
check('starter program visible as blocks', initial === 7, `${initial} blocks`)
check(
  'starter pseudocode has the reversed comparator',
  (await pseudocode()).includes('distanceCm > 20'),
)

await page.locator('.blocklySvg').scrollIntoViewIfNeeded()
// 1. Drag a "move" block from the Movement flyout and snap it under the else-branch move.
await page.locator('.blocklyToolboxCategory', { hasText: 'Movement' }).first().click()
await page.waitForTimeout(400)
const flyoutBlock = page.locator('.blocklyFlyout .blocklyDraggable').first()
const fb = await flyoutBlock.boundingBox()
const target = await pathBox('move-clear')
await drag({ x: fb.x + 12, y: fb.y + 10 }, { x: target.x + 12, y: target.y + target.height + 10 })
check(
  'toolbox drag adds one block',
  (await blockCount()) === initial + 1,
  `${await blockCount()} blocks`,
)
await apply()
const withExtra = await pseudocode()
check(
  'snap-connected block is executed in the else branch (applied AST)',
  (withExtra.match(/move\(/g) ?? []).length === 2,
  withExtra.replace(/\s+/g, ' '),
)
await page.screenshot({ path: `${out}/blockly-1-dragged-and-connected.png` })
// An applied change is undone with the program-level "Undo code" (block Undo covers
// unapplied edits only, so its history starts fresh after Apply).
await page.getByRole('button', { name: 'Undo code', exact: true }).click()
await page.waitForTimeout(400)
check(
  'Undo code restores the previous applied program',
  ((await pseudocode()).match(/move\(/g) ?? []).length === 1,
  (await pseudocode()).replace(/\s+/g, ' '),
)
check(
  'editor blocks follow the restored program',
  (await blockCount()) === initial,
  `${await blockCount()} blocks`,
)

// 2. Detach the then-branch stop into empty canvas: a disconnected block must not run silently.
await page.locator('.blocklySvg').scrollIntoViewIfNeeded()
const stopBox = await pathBox('stop-close')
// Drop in empty canvas to the right of the stack (the bottom-right corner is the trash can).
const decisionBox = await page.locator('svg.blocklySvg [data-id="decision"]').first().boundingBox()
await drag(
  { x: stopBox.x + stopBox.width / 2, y: stopBox.y + stopBox.height / 2 },
  { x: decisionBox.x + decisionBox.width + 60, y: decisionBox.y + 20 },
)
const topIds = await page.evaluate(() =>
  [
    ...document.querySelectorAll(
      'svg.blocklySvg > g.blocklyWorkspace > g.blocklyBlockCanvas > .blocklyDraggable',
    ),
  ].map((e) => e.getAttribute('data-id')),
)
check(
  'drag detached the stop into its own top-level stack',
  topIds.includes('stop-close'),
  topIds.join(','),
)
await apply()
const alert = await page.getByRole('alert').allInnerTexts()
check(
  'detached block is rejected with a validation message',
  alert.join(' ').length > 0,
  alert.join(' | '),
)
for (let i = 0; i < 4; i++) {
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await apply()
  if (!(await page.getByRole('alert').count())) break
}
check('Undo reattaches it and the program applies', (await page.getByRole('alert').count()) === 0)

// 3. Type into the numeric field, then Undo/Redo the edit.
await page.locator('.blocklySvg').scrollIntoViewIfNeeded()
const field = page
  .locator(
    '.blocklyBlockCanvas [data-id="threshold"] .blocklyEditableField, .blocklyBlockCanvas [data-id="threshold"] .blocklyEditableText',
  )
  .first()
await field.dblclick()
await page.locator('.blocklyHtmlInput').fill('25')
await page.keyboard.press('Enter')
await page.waitForTimeout(400)
const fieldText = async () =>
  ((await page.locator('svg.blocklySvg [data-id="threshold"]').first().textContent()) ?? '').trim()
check('typed threshold 25', (await fieldText()).includes('25'), await fieldText())
await page.getByRole('button', { name: 'Undo', exact: true }).click()
await page.waitForTimeout(400)
check('Undo restores 20', (await fieldText()).includes('20'), await fieldText())
await page.getByRole('button', { name: 'Redo', exact: true }).click()
await page.waitForTimeout(400)
check('Redo reapplies 25', (await fieldText()).includes('25'), await fieldText())
await page.getByRole('button', { name: 'Undo', exact: true }).click()

// 4. Change the comparator through the real dropdown.
await page.locator('.blocklySvg').scrollIntoViewIfNeeded()
await page.locator('.blocklyBlockCanvas [data-id="condition"] .blocklyDropdownText').first().click()
await page.waitForTimeout(300)
const options = page.locator(
  '.blocklyDropDownDiv [role="option"], .blocklyDropDownDiv .blocklyMenuItem',
)
const texts = (await options.allInnerTexts()).map((t) => t.replace(/[‎‏]/g, '').trim())
const lt = texts.findIndex((t) => t === '<')
check('comparator dropdown lists operators', lt >= 0, texts.join(' '))
await options.nth(lt).click()
await apply()
const fixed = await pseudocode()
check(
  'applied AST now matches the visible blocks: distanceCm < 20',
  fixed.includes('distanceCm < 20'),
  fixed.replace(/\s+/g, ' '),
)
check(
  'applied confirmation shown',
  await page
    .getByText('Program applied. Record a new prediction to run it.', { exact: true })
    .isVisible(),
)
await page.screenshot({ path: `${out}/blockly-2-comparator-fixed.png` })

// 5. Predict, run, compare with the executed trace.
await page.getByRole('radio', { name: 'Stop in place', exact: true }).check()
await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
await page.getByTestId('goal-outcome').waitFor()
const branch = await page.getByTestId('branch-facts').innerText()
check(
  'executed comparison uses the edited operator: 12 < 20 is true',
  branch.includes('12 < 20 is true'),
  branch,
)
const goal = await page.getByTestId('goal-outcome').innerText()
check(
  'M03 v3 goals and both far-wall scenarios met',
  goal.includes('Mission goal met') && !goal.includes('not met'),
  goal.replace(/\s+/g, ' '),
)
await page.screenshot({ path: `${out}/blockly-3-m03-goal-met.png` })

// 6. Transfer (authored variant: threshold d+1 at d=10 → stop), finish, reload, Progress.
await page.getByRole('button', { name: 'Try a different challenge', exact: true }).click()
await page.getByRole('radio', { name: 'Stop in place', exact: true }).last().check()
await page.getByRole('button', { name: 'Lock transfer prediction & reveal', exact: true }).click()
const checklist = await page.getByTestId('completion-checklist').innerText()
check(
  'completion checklist fully met',
  !checklist.includes('Not yet:'),
  checklist.replace(/\s+/g, ' '),
)
await page.getByRole('button', { name: 'Finish', exact: true }).click()
await page
  .getByRole('status', { name: 'Local save status' })
  .filter({ hasText: 'Saved locally.' })
  .waitFor()
await page.reload({ waitUntil: 'networkidle' })
check(
  'result persists after reload',
  (await page.getByTestId('goal-outcome').innerText()).includes('Mission goal met'),
)
await page.goto(base + '/progress', { waitUntil: 'networkidle' })
check(
  'Progress shows M03 completion evidence',
  await page
    .getByRole('button', { name: 'Review completion evidence for M03', exact: true })
    .isVisible(),
)
await page.screenshot({ path: `${out}/blockly-4-progress.png` })
check('no page or console errors', errors.length === 0, errors.join(' | '))
writeFileSync(
  `${out}/blockly-journey.json`,
  JSON.stringify({ browser: browser.version(), steps, errors }, null, 2),
)
await browser.close()
process.exit(steps.every((s) => s.ok) ? 0 : 1)
