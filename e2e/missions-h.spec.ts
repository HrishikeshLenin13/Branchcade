/** Part H browser journeys: every authored mission is solved by its verified reference
 * program in the real workstation, flawed programs fail the way the curriculum says, and
 * the briefing, hint ladder, second question and capstone recap work end to end. */
import { test, expect, type Page } from '@playwright/test'
import type { Program } from '../src/domain/types'
import { MISSION_CATALOG, REFERENCE_PROGRAMS, findMission } from '../src/missions/catalog'
import { CURRICULUM } from '../src/missions/curriculum'
import { fixtureProfile } from '../src/test/fixtures'
import { execute } from '../src/interpreter/interpreter'
import { actualAction } from '../src/interpreter/trace'

const ACTION = { move: 'Move forward', stop: 'Stop in place', turn: 'Turn', wait: 'Wait' } as const

/** Loads programs into each mission as a saved, resumable draft through the real
 * validated import (no test-only shortcuts in the app). */
async function loadDrafts(page: Page, programs: Record<string, Program>) {
  const now = new Date().toISOString()
  const fixture = {
    schemaVersion: 1,
    exportedAt: now,
    profile: fixtureProfile,
    attempts: [],
    teams: [],
    savedLabs: [],
    drafts: Object.entries(programs).map(([missionId, program]) => ({
      schemaVersion: 1,
      id: `draft-${fixtureProfile.id}-${missionId}`,
      learnerId: fixtureProfile.id,
      missionId,
      world: findMission(missionId)!.world,
      program,
      updatedAt: now,
      stage: 'predict',
      attemptId: null,
    })),
  }
  await page.goto('/settings')
  await page.getByLabel('Import local data', { exact: true }).setInputFiles({
    name: 'h-drafts.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  })
  await page.getByRole('button', { name: 'Merge validated import', exact: true }).click()
  await expect(page.getByText('Merged validated local data.', { exact: true })).toBeVisible()
}
async function runMission(page: Page, id: string, program: Program) {
  await page.goto(`/missions/${id}`)
  const first = actualAction(execute(findMission(id)!.world, program).events)
  await page.getByRole('radio', { name: ACTION[first], exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  return page.getByTestId('goal-outcome')
}

test('every mission is completed by its verified reference program in the real workstation', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loadDrafts(page, REFERENCE_PROGRAMS)
  for (const mission of MISSION_CATALOG) {
    const outcome = await runMission(page, mission.id, REFERENCE_PROGRAMS[mission.id]!)
    await expect(outcome, mission.id).toContainText('Mission goal met — the robot really did it!')
    await expect(outcome.locator('.goal-fact-not-met'), mission.id).toHaveCount(0)
    // The checklist shows plain sentences; each item keeps the saved fact it came from.
    for (const scenario of mission.successScenarios ?? [])
      await expect(
        outcome.locator(`[data-fact="Scenario “${scenario.label}”: met"]`),
        mission.id,
      ).toHaveCount(1)
  }
  expect(errors).toEqual([])
})

test('flawed programs fail exactly the way the curriculum says', async ({ page }) => {
  const cases = [
    ['m03', 'inclusive'],
    ['m04', 'unrolled'],
    ['m06', 'by-hand'],
    ['m07', 'colour-only'],
  ] as const
  await loadDrafts(
    page,
    Object.fromEntries(
      cases.map(([m, v]) => [m, CURRICULUM[m]!.mistakeVariants.find((x) => x.id === v)!.program]),
    ),
  )
  for (const [m, v] of cases) {
    const variant = CURRICULUM[m]!.mistakeVariants.find((x) => x.id === v)!
    const outcome = await runMission(page, m, variant.program)
    await expect(outcome, `${m}/${v}`).toContainText('Mission goal not met yet.')
    await expect(outcome.locator(`[data-fact^="${variant.fails}"]`), `${m}/${v}`).toHaveCount(1)
  }
})

test('briefing shows the story, live readings, vocabulary, scenarios and teacher note', async ({
  page,
}) => {
  await page.goto('/missions/m07?new=1')
  await page.getByRole('button', { name: 'Mission briefing', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByTestId('mission-narrative')).toContainText('charging dock')
  await expect(dialog).toContainText('The distance sensor reads 12.0 cm')
  await expect(dialog.getByText('AND', { exact: true })).toBeVisible()
  await expect(dialog.getByTestId('success-scenarios')).toContainText('far wall on black floor')
  await dialog.getByText('For teachers', { exact: true }).click()
  await expect(dialog).toContainText('Four combinations')
})

test('hint ladder ends in a related program, and the solution needs confirmation and is recorded', async ({
  page,
}) => {
  await page.goto('/missions/m05?new=1')
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  const hints = CURRICULUM.m05!.hints
  await expect(page.getByTestId('hint-text')).toHaveText(hints[0])
  await page.getByRole('button', { name: 'Show next hint', exact: true }).click()
  await expect(page.getByTestId('hint-text')).toHaveText(hints[1])
  await page.getByRole('button', { name: 'Show next hint', exact: true }).click()
  await expect(page.getByTestId('hint-text')).toHaveText(hints[2])
  await expect(page.getByRole('dialog')).toContainText('while (distanceCm > 30)')
  await page.getByRole('button', { name: 'Show solution…', exact: true }).click()
  await expect(page.getByRole('alertdialog', { name: 'Show the solution?' })).toContainText(
    'solution-assisted',
  )
  await page.getByRole('button', { name: 'Yes, show the solution', exact: true }).click()
  await expect(page.getByTestId('solution')).toContainText('while (distanceCm > 12)')
  await page.keyboard.press('Escape')
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('goal-outcome')).toBeVisible()
  await page.getByRole('link', { name: 'Instructor', exact: true }).click()
  await expect(page.getByText(/1 solution-assisted/)).toBeVisible()
})

test('a wrong second answer opens the investigation even when the first action was right', async ({
  page,
}) => {
  await page.goto('/missions/m04?new=1')
  await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await page.getByText('Optional: one more prediction', { exact: true }).click()
  await page
    .getByRole('combobox', { name: 'How many times will the robot turn in total?' })
    .selectOption('5')
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('detail-result')).toContainText('You said “5 turns”')
  await expect(page.getByTestId('detail-result')).toContainText('the real run: “4 turns”')
  await expect(page.getByTestId('probe-question')).toHaveAttribute('data-probe-id', /^g\.repeat-/)
})

test('capstone recap lists every criterion and completes only when all are met', async ({
  page,
}) => {
  await loadDrafts(page, { m08: REFERENCE_PROGRAMS.m08! })
  await page.goto('/missions/m08')
  await page.getByRole('radio', { name: 'Turn', exact: true }).check()
  await page.getByText('Confidence & optional reasoning', { exact: true }).click()
  await page
    .getByLabel('Why do you think that? (optional)')
    .fill('safeDistance is 35 now, and 32 < 35 calls escape')
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('goal-outcome')).toContainText('Mission goal met')
  await page.getByRole('button', { name: 'Investigate why', exact: true }).click()
  await page
    .getByRole('button', { name: /Continue to experiment|Generate a targeted experiment/ })
    .click()
  await page.locator('input[name="experiment-prediction"]').first().check()
  await page.getByRole('button', { name: 'Lock experiment prediction', exact: true }).click()
  await page.getByRole('button', { name: 'Run experiment', exact: true }).click()
  await page.getByRole('button', { name: 'Test my understanding with new numbers' }).click()
  await page.getByRole('radio', { name: 'Turn', exact: true }).last().check()
  await page.getByRole('button', { name: 'Lock transfer prediction & reveal' }).click()
  const recap = page.getByTestId('completion-checklist')
  await expect(recap).toContainText('Capstone recap')
  for (const label of [
    'Mission goals met in every scenario',
    'A new-numbers challenge predicted correctly',
    'Your explanation written in the prediction',
    'At least one counterexample experiment predicted and run',
  ])
    await expect(recap).toContainText(`Done: ${label}`)
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.reload()
  await expect(page.getByTestId('completion-checklist')).toContainText('Capstone recap')
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByText(/1 mission finished/)).toBeVisible()
})

test('without a written reason the capstone is not marked complete', async ({ page }) => {
  await loadDrafts(page, { m08: REFERENCE_PROGRAMS.m08! })
  await page.goto('/missions/m08')
  await page.getByRole('radio', { name: 'Turn', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await page.getByRole('button', { name: 'Try a different challenge', exact: true }).click()
  await page.getByRole('radio', { name: 'Turn', exact: true }).last().check()
  await page.getByRole('button', { name: 'Lock transfer prediction & reveal' }).click()
  const recap = page.getByTestId('completion-checklist')
  await expect(recap).toContainText('Done: Mission goals met in every scenario')
  await expect(recap).toContainText('Not yet: Your explanation written in the prediction')
  await expect(recap).toContainText('Not yet: At least one counterexample experiment')
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByText(/0 missions finished/)).toBeVisible()
})
