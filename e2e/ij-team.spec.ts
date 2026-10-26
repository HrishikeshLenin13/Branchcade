/** Parts I/J: real pass-and-play interactions; all aliases are synthetic test data. */
import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import type { AppExport } from '../src/domain/types'
import { CURRICULUM } from '../src/missions/curriculum'
async function turn(page: Page, alias: string, note: string, action = 'move') {
  await page.getByRole('button', { name: `I’m ${alias} — ready`, exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Hand off — lock prediction & contribution', exact: true }),
  ).toBeDisabled()
  await page.getByRole('textbox', { name: 'Role contribution', exact: true }).fill(note)
  await page
    .getByRole('combobox', { name: 'Individual prediction', exact: true })
    .selectOption(action)
  await page
    .getByRole('button', { name: 'Hand off — lock prediction & contribution', exact: true })
    .click()
  await expect(page.getByRole('textbox', { name: 'Role contribution', exact: true })).toHaveCount(0)
  await expect(page.getByText(note, { exact: true })).toHaveCount(0)
}
async function huddleRun(page: Page, verifyDraftRecovery = false) {
  await page.getByRole('button', { name: 'Team huddle — reveal evidence', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Run the shared program', exact: true }),
  ).toBeDisabled()
  await expect(page.getByRole('textbox', { name: 'Team hypothesis', exact: true })).toHaveValue('')
  await page
    .getByRole('textbox', { name: 'Team hypothesis', exact: true })
    .fill('Test team: compare the real sensor value with the program condition.')
  await page.getByRole('button', { name: 'Discuss & choose', exact: true }).click()
  if (verifyDraftRecovery) {
    await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText(
      'Saved locally.',
    )
    await page.reload()
    const input = page.getByRole('textbox', { name: 'Team hypothesis', exact: true })
    await expect(input).toHaveValue(
      'Test team: compare the real sensor value with the program condition.',
    )
    await input.fill('')
    await expect(input).toHaveValue('')
    await expect(page.getByRole('button', { name: 'Discuss & choose', exact: true })).toBeDisabled()
    await expect(
      page.getByRole('button', { name: 'Run the shared program', exact: true }),
    ).toBeDisabled()
    await input.fill('Revised test hypothesis: the edited threshold selects stop.')
    await page.getByRole('button', { name: 'Discuss & choose', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Run the shared program', exact: true }).click()
  await expect(page.getByTestId('team-goal-outcome')).toBeVisible()
}
async function exportTeam(page: Page): Promise<AppExport> {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export session summary', exact: true }).click()
  return JSON.parse(await readFile((await (await download).path())!, 'utf8')) as AppExport
}
for (const size of [2, 3, 4, 5, 6])
  test(`I/J ${size} local teammates preserve private handoffs, pause and reload before a real shared result`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/team')
    await page
      .getByRole('combobox', { name: 'Number of teammates', exact: true })
      .selectOption(String(size))
    await page.getByRole('button', { name: 'Create local team', exact: true }).click()
    for (let i = 1; i <= size; i++) {
      await turn(
        page,
        `Robot ${i}`,
        `Test teammate ${i}: I checked my distinct role task.`,
        i % 2 ? 'move' : 'stop',
      )
      if (i === 1) {
        await expect(
          page.getByRole('button', { name: 'Edit team program', exact: true }),
        ).toBeDisabled()
        await page.getByRole('button', { name: 'Pause team session', exact: true }).click()
        await expect(
          page.getByRole('heading', { name: 'Your team is paused', exact: true }),
        ).toBeVisible()
        await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText(
          'Saved locally.',
        )
        await page.reload()
        await expect(
          page.getByRole('heading', { name: 'Your team is paused', exact: true }),
        ).toBeVisible()
        await expect(
          page.getByText('Test teammate 1: I checked my distinct role task.', { exact: true }),
        ).toHaveCount(0)
        await page.getByRole('button', { name: 'Resume session', exact: true }).click()
      }
    }
    await huddleRun(page)
    await expect(page.getByTestId('team-goal-outcome')).toContainText(
      'Shared program met the mission goals.',
    )
    await page.getByRole('button', { name: 'Review trace', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Execution trace', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Step back', exact: true }).click()
    const file = await exportTeam(page)
    expect(file.teams[0]!.predictions).toHaveLength(size)
    expect(file.teams[0]!.results[0]!.goalPassed).toBe(true)
    expect(file.attempts).toEqual([])
    if (size === 2) {
      await page.getByText('Instructor: skip rotation', { exact: true }).click()
      await expect(
        page.getByRole('button', { name: 'Skip rotation with logged reason', exact: true }),
      ).toBeDisabled()
      await page
        .getByRole('textbox', { name: 'Reason for keeping the roles', exact: true })
        .fill('Synthetic teacher accommodation: finish reading this role together.')
      await page
        .getByRole('button', { name: 'Skip rotation with logged reason', exact: true })
        .click()
    } else
      await page
        .getByRole('button', { name: 'Rotate roles & start next round', exact: true })
        .click()
    await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText(
      'Saved locally.',
    )
    await page.reload()
    await expect(
      page.getByText(`Round 2 · active · ${size} teammates`, { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'I’m Robot 1 — ready', exact: true }),
    ).toBeVisible()
    const rotated = await exportTeam(page)
    expect(rotated.teams[0]!.results).toHaveLength(1)
    expect(rotated.teams[0]!.predictionHistory).toHaveLength(size)
    expect(rotated.teams[0]!.contributions).toHaveLength(size)
    if (size === 2) {
      expect(rotated.teams[0]!.members).toEqual(file.teams[0]!.members)
      expect(rotated.teams[0]!.rotationSkips[0]!.reason).toContain('teacher accommodation')
    }
    if (size === 3)
      await page.screenshot({
        path: testInfo.outputPath('ij-team-handoff-chromebook.png'),
        fullPage: true,
      })
    expect(errors).toEqual([])
  })
test('I/J shared Blockly field edits affect actual judging and prior result snapshots survive repair', async ({
  page,
}) => {
  await page.goto('/team')
  await page.getByRole('combobox', { name: 'Number of teammates', exact: true }).selectOption('2')
  await page.getByRole('button', { name: 'Create local team', exact: true }).click()
  const editThreshold = async (old: string, next: string) => {
    await page.getByRole('button', { name: 'Edit team program', exact: true }).click()
    const field = page
      .locator('.blocklySvg .blocklyText')
      .filter({ hasText: new RegExp(`^${old}$`) })
      .first()
    await field.dblclick()
    await page.locator('input.blocklyHtmlInput').fill(next)
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Apply blocks', exact: true }).click()
    await expect(page.locator('.blocklySvg')).toHaveCount(0)
  }
  await editThreshold('20', '25')
  for (let i = 1; i <= 2; i++)
    await turn(page, `Robot ${i}`, `Test role ${i}: threshold is now 25.`, 'stop')
  await huddleRun(page, true)
  await expect(page.getByTestId('team-goal-outcome')).toContainText(
    'Shared program needs another test.',
  )
  const failed = await exportTeam(page)
  expect(failed.teams[0]!.results[0]!.hypothesis).toBe(
    'Revised test hypothesis: the edited threshold selects stop.',
  )
  await page.getByRole('button', { name: 'Rotate roles & start next round', exact: true }).click()
  await editThreshold('25', '20')
  for (let i = 1; i <= 2; i++)
    await turn(page, `Robot ${i}`, `Test role ${i}: 24 is not below 20.`, 'move')
  await huddleRun(page)
  await expect(page.getByTestId('team-goal-outcome')).toContainText(
    'Shared program met the mission goals.',
  )
  await expect(page.getByTestId('team-role-variety')).toHaveCount(2)
  await page.getByText('Preserved round results', { exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Round 1: needs another test', exact: true }),
  ).toBeVisible()
  const repaired = await exportTeam(page)
  expect(repaired.teams[0]!.results[0]).toEqual(failed.teams[0]!.results[0])
  expect(repaired.teams[0]!.results.map((r) => r.goalPassed)).toEqual([false, true])
  expect(repaired.profile).toBeNull()
  expect(repaired.attempts).toEqual([])
})
test('I/J shared hint ladder, confirmed solution and optional private second answer survive export/import without individual mastery', async ({
  page,
}, testInfo) => {
  await page.goto('/team')
  await page.getByRole('combobox', { name: 'Number of teammates', exact: true }).selectOption('2')
  await page.getByRole('combobox', { name: 'Choose team mission', exact: true }).selectOption('m04')
  const override = page.getByRole('checkbox', { name: /^Instructor override:/ })
  if (await override.count()) await override.check()
  await page.getByRole('button', { name: 'Create local team', exact: true }).click()
  await page.getByRole('button', { name: 'Team hints', exact: true }).click()
  await expect(page.getByTestId('team-hint-text')).toHaveText(CURRICULUM.m04!.hints[0])
  await page.getByRole('button', { name: 'Show next team hint', exact: true }).click()
  await expect(page.getByTestId('team-hint-text')).toHaveText(CURRICULUM.m04!.hints[1])
  await page.getByRole('button', { name: 'Show next team hint', exact: true }).click()
  await expect(page.getByTestId('team-hint-text')).toHaveText(CURRICULUM.m04!.hints[2])
  await page.getByRole('button', { name: 'Show team solution…', exact: true }).click()
  await expect(
    page.getByRole('alertdialog', { name: 'Show the team solution?', exact: true }),
  ).toContainText('never individual mastery')
  await expect(page.getByTestId('team-solution')).toHaveCount(0)
  await page.getByRole('button', { name: 'Keep investigating', exact: true }).click()
  await expect(page.getByTestId('team-solution')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show team solution…', exact: true }).click()
  await page.getByRole('button', { name: 'Yes, show the team solution', exact: true }).click()
  await expect(page.getByTestId('team-solution')).toContainText('repeat 3')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'I’m Robot 1 — ready', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Role contribution', exact: true })
    .fill('Test observation: the starter still repeats four times.')
  await page.getByText('Optional: one more private prediction', { exact: true }).click()
  await page
    .getByRole('combobox', { name: 'How many times will the robot turn in total?', exact: true })
    .selectOption('3')
  await page
    .getByRole('button', { name: 'Hand off — lock prediction & contribution', exact: true })
    .click()
  await expect(page.getByTestId('team-detail-results')).toHaveCount(0)
  await turn(page, 'Robot 2', 'Test observation: count the real loop entries.')
  await huddleRun(page)
  await expect(page.getByTestId('team-detail-results')).toContainText('Actual run: 4 turns')
  await expect(page.getByTestId('team-detail-results')).toContainText(
    'Robot 1: predicted 3 turns · differs from this run',
  )
  await expect(page.getByTestId('team-detail-results')).not.toContainText('Robot 2: predicted')
  await expect(page.getByTestId('team-goal-outcome')).toContainText(
    'Shared program needs another test.',
  )
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.reload()
  await expect(page.getByTestId('team-detail-results')).toContainText('Actual run: 4 turns')
  await page.getByText('Recorded shared assistance', { exact: true }).click()
  await expect(
    page.getByText(/show-solution · 0 individual predictions already locked/),
  ).toBeVisible()
  const record = await exportTeam(page)
  expect(record.teams[0]!.assistance).toHaveLength(4)
  expect(record.teams[0]!.results[0]!.assistanceIds).toHaveLength(4)
  expect(record.teams[0]!.predictions.filter((p) => p.detail)).toHaveLength(1)
  expect(record.profile).toBeNull()
  expect(record.attempts).toEqual([])
  await page.getByRole('button', { name: 'Reset team', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm reset', exact: true }).click()
  await page.goto('/settings')
  await page.getByLabel('Import local data', { exact: true }).setInputFiles({
    name: 'synthetic-team-round.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(record)),
  })
  await page.getByRole('button', { name: 'Merge validated import', exact: true }).click()
  await expect(page.getByText('Merged validated local data.', { exact: true })).toBeVisible()
  await page.goto('/team')
  await expect(page.getByTestId('team-detail-results')).toContainText('Actual run: 4 turns')
  await page.getByRole('button', { name: 'Team hints', exact: true }).click()
  await expect(page.getByTestId('team-solution')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('ij-team-hints-phone.png'), fullPage: true })
  await page.keyboard.press('Escape')
  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations).toEqual([])
})
test('I/J roster sanitization, draft undo, learner switch, end and reset preserve other local learners', async ({
  page,
}) => {
  await page.goto('/progress')
  await page
    .getByRole('textbox', { name: 'New lab name (optional)', exact: true })
    .fill('Synthetic Solo Learner')
  await page.getByRole('button', { name: 'Add another learner', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Your lab name', exact: true })).toContainText(
    'Synthetic Solo Learner',
  )
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.goto('/team')
  await page.getByRole('button', { name: '+ Add teammate', exact: true }).click()
  await expect(
    page.getByRole('combobox', { name: 'Number of teammates', exact: true }),
  ).toHaveValue('4')
  await page.getByRole('button', { name: 'Remove teammate 4', exact: true }).click()
  await page.getByRole('button', { name: 'Shuffle aliases', exact: true }).click()
  await page.getByRole('combobox', { name: 'Number of teammates', exact: true }).selectOption('2')
  await page.getByRole('textbox', { name: /^Teammate 1/ }).fill('A<')
  await page.getByRole('textbox', { name: /^Teammate 2/ }).fill('A>')
  await page.getByRole('button', { name: 'Create local team', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('different non-empty alias')
  await page.getByRole('textbox', { name: /^Teammate 1/ }).fill('Test Birch')
  await page.getByRole('textbox', { name: /^Teammate 2/ }).fill('Test Elm')
  await page.getByRole('button', { name: 'Create local team', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Switch learner', exact: true })
    .selectOption({ label: 'Test Elm' })
  await page.getByRole('button', { name: 'I’m Test Elm — ready', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Role contribution', exact: true })
    .fill('A draft that has not been handed off.')
  await page
    .getByRole('combobox', { name: 'Individual prediction', exact: true })
    .selectOption('stop')
  await page.getByRole('button', { name: 'Undo my draft', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Role contribution', exact: true })).toHaveValue(
    '',
  )
  await expect(
    page.getByRole('combobox', { name: 'Individual prediction', exact: true }),
  ).toHaveValue('move')
  await page
    .getByRole('textbox', { name: 'Role contribution', exact: true })
    .fill('A locked synthetic observation with no personal information.')
  await page
    .getByRole('button', { name: 'Hand off — lock prediction & contribution', exact: true })
    .click()
  await page.getByRole('button', { name: 'Edit team', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Teammate 1', exact: true }).fill('B<')
  await dialog.getByRole('textbox', { name: 'Teammate 2', exact: true }).fill('B>')
  await dialog.getByRole('button', { name: 'Confirm alias changes', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('unique non-empty alias')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'I’m Test Birch — ready', exact: true }),
  ).toBeVisible()
  const endSession = page.getByRole('button', { name: 'End session', exact: true })
  await endSession.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(endSession).toBeFocused()
  await endSession.click()
  await page.getByRole('button', { name: 'Confirm end', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Session ended', exact: true })).toBeVisible()
  const record = await exportTeam(page)
  expect(record.teams[0]!.status).toBe('ended')
  expect(record.teams[0]!.results).toHaveLength(0)
  expect(record.teams[0]!.contributions).toHaveLength(1)
  await page.getByRole('button', { name: 'Reset team', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm reset', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Set up your group', exact: true })).toBeVisible()
  await page.goto('/progress')
  await expect(page.getByRole('combobox', { name: 'Your lab name', exact: true })).toContainText(
    'Synthetic Solo Learner',
  )
})
