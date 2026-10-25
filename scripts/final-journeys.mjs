/* global indexedDB */
// Final acceptance journeys on a fresh production build, each in a new synthetic browser
// context: local teams of 2–6, Free Lab geometry vs an independent oracle with export/import,
// returning-learner resume, and error recovery. Writes evidence JSON and screenshots.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
const base = 'http://127.0.0.1:4173'
const out = process.argv[2]
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)
const steps = []
const check = (name, ok, detail = '') => {
  steps.push({ name, ok: Boolean(ok), detail: String(detail).slice(0, 300) })
  console.log(ok ? 'PASS' : 'FAIL', name, detail ? `— ${String(detail).slice(0, 150)}` : '')
}
const ROLE_NAMES = [
  'Programmer',
  'Evidence Recorder',
  'Sensor Analyst',
  'Debugger',
  'Tester',
  'Navigator',
]
async function fresh() {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    acceptDownloads: true,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('dialog', (d) => d.accept())
  return { context, page, errors }
}
const stored = (page) =>
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
const download = async (page, name) => {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name, exact: true }).click()
  const d = await pending
  return { name: d.suggestedFilename(), text: readFileSync(await d.path(), 'utf8') }
}

// A. Local teams of every supported size.
for (const size of [2, 3, 4, 5, 6]) {
  const { context, page, errors } = await fresh()
  await page.goto(`${base}/team`, { waitUntil: 'networkidle' })
  await page
    .getByRole('combobox', { name: 'Number of teammates', exact: true })
    .selectOption(String(size))
  await page.getByRole('button', { name: 'Create local team', exact: true }).click()
  await page.getByRole('button', { name: 'I’m Robot 1 — ready', exact: true }).waitFor()
  const team0 = (await stored(page)).teams[0]
  const roles0 = team0.members.map((m) => m.role)
  check(
    `team ${size}: ${size} members, ${size} distinct roles`,
    team0.members.length === size && new Set(roles0).size === Math.min(size, 6),
    roles0.join(','),
  )
  const secrets = []
  for (let i = 1; i <= size; i++) {
    await page.getByRole('button', { name: `I’m Robot ${i} — ready`, exact: true }).click()
    const card = await page.locator('main').innerText()
    check(
      `team ${size}: Robot ${i} sees a role task`,
      ROLE_NAMES.some((r) => card.includes(r)),
    )
    check(
      `team ${size}: Robot ${i} cannot see earlier private notes`,
      secrets.every((s) => !card.includes(s)),
    )
    const note = `Private QA note ${size}-${i}`
    secrets.push(note)
    await page.getByRole('textbox', { name: 'Role contribution', exact: true }).fill(note)
    await page
      .getByRole('combobox', { name: 'Individual prediction', exact: true })
      .selectOption(i % 2 ? 'move' : 'stop')
    await page
      .getByRole('button', { name: 'Hand off — lock prediction & contribution', exact: true })
      .click()
  }
  await page.getByRole('button', { name: 'Team huddle — reveal evidence', exact: true }).click()
  const board = await page.locator('main').innerText()
  check(
    `team ${size}: huddle reveals every contribution only now`,
    secrets.every((s) => board.includes(s)),
  )
  await page
    .getByRole('textbox', { name: 'Team hypothesis', exact: true })
    .fill('QA hypothesis: compare the sensor value with the threshold.')
  await page.getByRole('button', { name: 'Discuss & choose', exact: true }).click()
  await page.getByRole('button', { name: 'Run the shared program', exact: true }).click()
  const outcome = await page.getByTestId('team-goal-outcome').innerText()
  check(
    `team ${size}: real shared run judged`,
    /mission goals|another test/.test(outcome),
    outcome.slice(0, 120),
  )
  const before = await stored(page)
  check(
    `team ${size}: team run creates no individual attempts`,
    before.attempts.length === 0,
    `${before.attempts.length} attempts`,
  )
  await page.getByRole('button', { name: 'Rotate roles & start next round', exact: true }).click()
  await page
    .getByRole('status', { name: 'Local save status' })
    .filter({ hasText: 'Saved locally.' })
    .waitFor()
  const after = (await stored(page)).teams[0]
  const roles1 = after.members.map((m) => m.role)
  check(
    `team ${size}: rotation reassigns roles`,
    roles1.some((r, i) => r !== roles0[i]),
    `${roles0.join(',')} → ${roles1.join(',')}`,
  )
  check(
    `team ${size}: round-1 result kept after rotation`,
    after.results.length === 1 &&
      JSON.stringify(after.results[0]) === JSON.stringify(before.teams[0].results[0]),
  )
  await page.reload({ waitUntil: 'networkidle' })
  check(
    `team ${size}: resumes at round 2 after reload`,
    await page.getByText(`Round 2 · active · ${size} teammates`, { exact: true }).isVisible(),
  )
  await page.goto(`${base}/progress`, { waitUntil: 'networkidle' })
  check(
    `team ${size}: no individual completion credited from team play`,
    (await page.getByRole('button', { name: /^Review completion evidence for / }).count()) === 0,
  )
  if (size === 4)
    await page
      .goto(`${base}/team`)
      .then(() => page.screenshot({ path: `${out}/journey-team-4.png` }))
  check(`team ${size}: no page or console errors`, errors.length === 0, errors.join(' | '))
  await context.close()
}

// B. Free Lab: geometry edits change real sensing (independent oracle), export → import round trip.
{
  const { context, page, errors } = await fresh()
  await page.goto(`${base}/lab?example=24`, { waitUntil: 'networkidle' })
  const label = () => page.getByRole('img', { name: /Robot world:/ }).getAttribute('aria-label')
  check(
    'lab: example world reads 24.0 cm',
    (await label()).includes('24.0 centimeters'),
    await label(),
  )
  await page.getByText('Edit obstacles, zones & robot', { exact: true }).click()
  const world0 = await page.evaluate(() => null)
  void world0
  // Oracle: the default example robot sits at x=40 with a 6 cm sensor offset facing +x, so a
  // wall face at x=X reads X − 46 cm. Move the obstacle to x=83.5 → 37.5 cm.
  await page.getByRole('spinbutton', { name: 'Obstacle x position (cm)', exact: true }).fill('83.5')
  await page.getByRole('spinbutton', { name: 'Obstacle x position (cm)', exact: true }).press('Tab')
  await page.waitForTimeout(300)
  check(
    'lab: moving the obstacle to x=83.5 reads 37.5 cm (oracle 83.5 − 46)',
    (await label()).includes('37.5 centimeters'),
    await label(),
  )
  await page.getByRole('button', { name: 'Undo world edit', exact: true }).click()
  check('lab: undo restores 24.0 cm', (await label()).includes('24.0 centimeters'), await label())
  await page.getByRole('button', { name: 'Redo world edit', exact: true }).click()
  check('lab: redo returns to 37.5 cm', (await label()).includes('37.5 centimeters'), await label())
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await page.waitForTimeout(800)
  const facts = await page.locator('main').innerText()
  check(
    'lab: run evaluates the edited reading (37.5 < 20 is false)',
    facts.includes('37.5 < 20 is false'),
    facts.match(/[\d.]+ < 20 is \w+/)?.[0],
  )
  const exported = await download(page, 'Export world')
  writeFileSync(`${out}/lab-export.json`, exported.text)
  const world = JSON.parse(exported.text)
  const obstacle = (world.world ?? world).obstacles?.[0]
  check(
    'lab: exported world contains the edited obstacle x=83.5',
    obstacle?.position?.xCm === 83.5,
    JSON.stringify(obstacle?.position),
  )
  const resetWorld = page.locator('button', { hasText: /^Reset world$/ })
  check('lab: world editing is locked after a run (SPEC F3)', await resetWorld.isDisabled())
  const stopEdit = page.locator('button', { hasText: /^Stop & Edit$/ })
  for (let i = 0; i < 20 && !(await stopEdit.isEnabled()); i++) await page.waitForTimeout(150)
  await stopEdit.click()
  for (let i = 0; i < 20 && !(await resetWorld.isEnabled()); i++) await page.waitForTimeout(150)
  check('lab: Stop & Edit unlocks world editing', await resetWorld.isEnabled())
  // Reset world lives in the collapsed "Save or restore a world" section.
  await page.getByText('Save or restore a world', { exact: true }).click()
  await resetWorld.click()
  await page.waitForTimeout(300)
  check(
    'lab: reset world returns to 24.0 cm',
    (await label()).includes('24.0 centimeters'),
    await label(),
  )
  await page
    .getByLabel(/Import world/)
    .first()
    .setInputFiles({
      name: 'qa-world.json',
      mimeType: 'application/json',
      buffer: Buffer.from(exported.text),
    })
  await page.getByRole('button', { name: 'Import this world', exact: true }).click()
  await page.waitForTimeout(400)
  check(
    'lab: importing the exported world restores 37.5 cm',
    (await label()).includes('37.5 centimeters'),
    await label(),
  )
  await page
    .getByLabel(/Import world/)
    .first()
    .setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"obstacles": "nope"}'),
    })
  await page.waitForTimeout(400)
  const alerts = await page.getByRole('alert').allInnerTexts()
  check(
    'lab: corrupt world import is rejected with a message',
    alerts.join(' ').length > 0,
    alerts.join(' | '),
  )
  check(
    'lab: corrupt import leaves the world unchanged',
    (await label()).includes('37.5 centimeters'),
  )
  await page.screenshot({ path: `${out}/journey-lab.png` })
  check('lab: no page or console errors', errors.length === 0, errors.join(' | '))
  await context.close()
}

// C. Returning learner: an unsaved-run draft is restored after closing the tab.
{
  const { context, page, errors } = await fresh()
  await page.goto(`${base}/missions/m04?new=1`, { waitUntil: 'networkidle' })
  await page.getByRole('radio', { name: 'Turn', exact: true }).check()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page
    .getByRole('status', { name: 'Local save status' })
    .filter({ hasText: 'Saved locally.' })
    .waitFor()
  await page.close()
  const again = await context.newPage()
  again.on('pageerror', (e) => errors.push(e.message))
  again.on('dialog', (d) => d.accept())
  await again.goto(`${base}/`, { waitUntil: 'networkidle' })
  const resume = again.getByRole('link', { name: /Resume|Continue learning/ }).first()
  check('returning: home offers a resume link', await resume.isVisible())
  await resume.click()
  await again.waitForLoadState('networkidle')
  check(
    'returning: resume opens the saved mission',
    again.url().includes('/missions/m04'),
    again.url(),
  )
  await again.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await again.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await again.getByTestId('goal-outcome').waitFor()
  await again.reload({ waitUntil: 'networkidle' })
  const data = await stored(again)
  check(
    'returning: the run is saved after reload',
    data.attempts.length === 1 && data.attempts[0].missionId === 'm04',
  )
  check('returning: no page errors', errors.length === 0, errors.join(' | '))
  await context.close()
}

// D. Error recovery.
{
  const { context, page, errors } = await fresh()
  await page.goto(`${base}/settings`, { waitUntil: 'networkidle' })
  await page.getByLabel('Import local data', { exact: true }).setInputFiles({
    name: 'corrupt.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":1,"attempts":"x"}'),
  })
  await page.waitForTimeout(500)
  const msg = await page.getByRole('alert').allInnerTexts()
  check(
    'recovery: corrupt data import is rejected with a specific message',
    msg.join(' ').length > 10,
    msg.join(' | '),
  )
  await page.goto(`${base}/missions/m99`, { waitUntil: 'networkidle' })
  check(
    'recovery: unknown mission offers a way back',
    await page.getByRole('link', { name: 'Back to missions', exact: true }).isVisible(),
  )
  await page.goto(`${base}/nowhere/deep/route`, { waitUntil: 'networkidle' })
  check(
    'recovery: unknown deep route offers recovery links',
    await page.getByRole('link', { name: 'Browse missions', exact: true }).isVisible(),
  )
  check(
    'recovery: no page errors',
    errors.filter((e) => !/Failed to load resource/.test(e)).length === 0,
    errors.join(' | '),
  )
  await context.close()
}
writeFileSync(
  `${out}/journeys.json`,
  JSON.stringify({ browser: browser.version(), steps }, null, 2),
)
await browser.close()
process.exit(steps.every((s) => s.ok) ? 0 : 1)
