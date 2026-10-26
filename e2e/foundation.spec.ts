import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
async function start(page: import('@playwright/test').Page) {
  await page.goto('/start')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: 'Create my local alias & start' }).click()
  await expect(page.getByRole('heading', { name: 'The Wall Problem', exact: true })).toBeVisible()
  // New learners get the button tour; this journey skips it like a returning student would.
  await page.getByRole('button', { name: 'Skip tutorial', exact: true }).click()
  await expect(page.getByTestId('button-tour')).toHaveCount(0)
}
async function run(page: import('@playwright/test').Page, wrong = false) {
  if (wrong) await page.getByRole('radio', { name: 'Stop in place', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
}
test('new alias, actual branch, locked prediction, transfer, saved reload and instructor export/delete', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await start(page)
  await run(page)
  await expect(page.getByText('Your prediction is locked', { exact: true })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Move forward', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Step back', exact: true }).click()
  await page.getByRole('button', { name: 'Step forward', exact: true }).click()
  await page.getByRole('button', { name: 'Try a different challenge' }).click()
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).last().check()
  await page.getByRole('button', { name: 'Lock transfer prediction & reveal' }).click()
  await expect(page.getByText(/actual program stops/)).toBeVisible()
  await page.reload()
  await expect(page.getByText(/actual program stops/)).toBeVisible()
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByText('1 mission started', { exact: false })).toBeVisible()
  await page.getByRole('link', { name: 'Instructor', exact: true }).click()
  await page.getByRole('button', { name: 'Inspect attempt 1' }).click()
  await expect(page.locator('[data-fact="Goal 1 (branch): met"]')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export filtered CSV' }).click()
  expect((await download).suggestedFilename()).toBe('branchcade-local-report.csv')
  await page.getByRole('button', { name: 'Delete all local learner data' }).click()
  await page.getByLabel('Type ERASE to confirm', { exact: true }).fill('ERASE')
  await page.getByRole('button', { name: 'Permanently delete', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No local attempts in this view' })).toBeVisible()
  expect(errors).toEqual([])
})
test('lab parameter changes, real Blockly editor, undo/redo, validated world export/import', async ({
  page,
}) => {
  await page.goto('/lab')
  await page.getByRole('slider', { name: 'Obstacle distance (cm)', exact: true }).fill('32')
  await expect(page.getByRole('img', { name: /distance 32.0 centimeters/ })).toBeVisible()
  await page.getByRole('spinbutton', { name: 'Threshold (cm)', exact: true }).fill('40')
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('32 < 40 is true')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export world', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('branchcade-world.json')
  // Blocks start open on laptop-size screens; open them only if they are closed.
  if (await page.getByRole('button', { name: 'Open block editor', exact: true }).count())
    await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
  await expect(page.locator('.blocklySvg')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Stop & Edit', exact: true }).click()
  await page.getByRole('button', { name: 'Apply blocks', exact: true }).click()
  await expect(page.getByText('Validated block program applied.')).toBeVisible()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('32 < 40 is true')
  await page.getByRole('button', { name: 'Stop & Edit', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":999}'),
  })
  await expect(page.getByRole('alert')).toBeVisible()
})
test('three teammates predict privately, run actual goals and rotate roles after refresh', async ({
  page,
}) => {
  await page.goto('/team')
  await page.getByRole('button', { name: 'Create local team' }).click()
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: `I’m Robot ${i} — ready`, exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Role contribution', exact: true })
      .fill(`Role ${i}: I checked the measured distance and selected branch.`)
    await page
      .getByRole('combobox', { name: 'Individual prediction', exact: true })
      .selectOption(i === 2 ? 'stop' : 'move')
    await page
      .getByRole('button', { name: 'Hand off — lock prediction & contribution', exact: true })
      .click()
  }
  await page.getByRole('button', { name: 'Team huddle — reveal evidence', exact: true }).click()
  await page
    .getByLabel('Team hypothesis', { exact: true })
    .fill('24 is greater than 20, so the else branch moves.')
  await page.getByRole('button', { name: 'Discuss & choose', exact: true }).click()
  await page.getByRole('button', { name: 'Run the shared program' }).click()
  await expect(page.getByText('Actual goals met.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Rotate roles & start next round' }).click()
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.reload()
  await expect(page.getByText('Round 2 · active · 3 teammates', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'I’m Robot 1 — ready', exact: true })).toBeVisible()
})
test('settings persist; export/import checked before replacement; malicious import preserves current data', async ({
  page,
}) => {
  await page.goto('/settings')
  await page.getByLabel('Theme', { exact: true }).selectOption('dark')
  await page.getByRole('checkbox', { name: 'High contrast', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Reduce motion', exact: true }).check()
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await expect(page.getByText('Preferences saved on this device.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Reduce motion', exact: true })).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export local data', exact: true }).click()
  const path = await (await download).path()
  expect(path).not.toBeNull()
  await page.locator('input[type=file]').setInputFiles(path!)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('combobox', { name: 'Import strategy', exact: true }).selectOption('replace')
  await page.getByRole('button', { name: 'Replace with validated import', exact: true }).click()
  await expect(page.getByText('Replaced validated local data.', { exact: true })).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({
    name: 'evil.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"__proto__":{"x":1}}'),
  })
  await expect(page.getByRole('alert')).toContainText('Unsafe')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
test('keyboard dialog focus, navigation and not-found recovery', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.goto('/unknown')
  await page.getByRole('link', { name: 'Back to the lab entrance' }).click()
  await expect(
    page.getByRole('heading', { name: 'Figure out why your robot did that.', exact: true }),
  ).toBeVisible()
})
test('no learner-content requests during prediction, run and diagnosis', async ({ page }) => {
  const sent: string[] = []
  page.on('request', (r) => {
    if (r.method() !== 'GET' || new URL(r.url()).origin !== 'http://127.0.0.1:4173')
      sent.push(`${r.method()} ${r.url()} ${r.postData() ?? ''}`)
  })
  await start(page)
  await run(page, true)
  await page.getByTestId('probe-question').getByRole('button').first().click()
  await expect(page.getByTestId('probe-feedback')).toBeVisible()
  await page.getByRole('button', { name: 'Continue to experiment', exact: true }).click()
  await expect(page.getByTestId('experiment-rationale')).toBeVisible()
  expect(sent).toEqual([])
})
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
])
  test(`layout ${viewport.width} has no global overflow and working navigation`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (viewport.width < 900) {
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
      await page.getByRole('link', { name: 'Missions', exact: true }).click()
    } else await page.getByRole('link', { name: 'Missions', exact: true }).click()
    await expect(
      page.getByRole('heading', {
        name: 'Small programs. Big discoveries.',
        exact: true,
      }),
    ).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
for (const path of [
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
  '/not-found',
])
  test(`accessibility ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('main')).toBeVisible()
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(scan.violations).toEqual([])
  })
test('storage blocked stays usable in an explicit in-memory session', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('Storage blocked', 'SecurityError')
      },
    }),
  )
  await page.goto('/missions/m01')
  await expect(
    page.getByRole('alert').filter({ hasText: 'Progress can’t be saved on this device.' }),
  ).toBeVisible()
  await run(page)
  await expect(
    page.getByText('In-memory session — export before closing.', { exact: true }),
  ).toBeVisible()
})
test('six-person team completes one real round without any account', async ({ page }) => {
  await page.goto('/team')
  await page.getByLabel('Number of teammates', { exact: true }).selectOption('6')
  await page.getByRole('button', { name: 'Create local team' }).click()
  for (let i = 1; i <= 6; i++) {
    await page.getByRole('button', { name: `I’m Robot ${i} — ready`, exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Role contribution', exact: true })
      .fill(`Role ${i}: I checked the program and measured distance.`)
    await page
      .getByRole('button', { name: 'Hand off — lock prediction & contribution', exact: true })
      .click()
  }
  await page.getByRole('button', { name: 'Team huddle — reveal evidence', exact: true }).click()
  await page
    .getByLabel('Team hypothesis', { exact: true })
    .fill('24 is greater than 20, so the else branch moves.')
  await page.getByRole('button', { name: 'Discuss & choose', exact: true }).click()
  await page.getByRole('button', { name: 'Run the shared program' }).click()
  await expect(page.getByText('Actual goals met.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Rotate roles & start next round' }).click()
  await expect(page.getByText('Round 2 · active · 6 teammates', { exact: true })).toBeVisible()
})
test('real pointer drag changes the same obstacle; keyboard position and world import roundtrip', async ({
  page,
}) => {
  await page.goto('/lab?example=24')
  const shape = page.locator('.draggable').first(),
    box = await shape.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByRole('img')).not.toHaveAttribute(
    'aria-label',
    'Robot world: distance 24.0 centimeters, heading 0 degrees',
  )
  await page.getByText('Edit obstacles, zones & robot', { exact: true }).click()
  await page.getByLabel('Obstacle x position (cm)', { exact: true }).fill('78')
  await expect(page.getByRole('img')).toHaveAttribute(
    'aria-label',
    'Robot world: distance 32.0 centimeters, heading 0 degrees',
  )
  const d = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export world', exact: true }).click()
  const path = await (await d).path()
  await page.getByLabel('Obstacle x position (cm)', { exact: true }).fill('70')
  await page.locator('input[type=file]').setInputFiles(path!)
  await page.getByRole('button', { name: 'Import this world', exact: true }).click()
  await expect(page.getByRole('img')).toHaveAttribute(
    'aria-label',
    'Robot world: distance 32.0 centimeters, heading 0 degrees',
  )
})

test('Chromebook primary run action is fully visible before scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/missions/m01')
  await expect(
    page.getByRole('button', { name: 'Lock prediction & run', exact: true }),
  ).toBeInViewport({ ratio: 1 })
})
