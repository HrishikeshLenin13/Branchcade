import { test, expect } from '@playwright/test'
import { findMission, REFERENCE_PROGRAMS } from '../src/missions/catalog'
import { fixtureProfile } from '../src/test/fixtures'
import { execute } from '../src/interpreter/interpreter'
import { actualAction } from '../src/interpreter/trace'
import { chooseTransfer } from '../src/learning/transfer'

const actionNames = { move: 'Move forward', stop: 'Stop in place', turn: 'Turn', wait: 'Wait' }

test('three primary missions earn completion stamps only after real goal and fresh transfer checks', async ({
  page,
}) => {
  const ids = ['m01', 'm02', 'm03'],
    now = new Date().toISOString()
  // Synthetic authored program drafts go through the same import validation as real files.
  await page.goto('/settings')
  await page.getByLabel('Import local data', { exact: true }).setInputFiles({
    name: 'ij-reference-drafts.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: now,
        profile: fixtureProfile,
        attempts: [],
        teams: [],
        drafts: ids.map((id) => ({
          schemaVersion: 1,
          id: `ij-draft-${id}`,
          learnerId: fixtureProfile.id,
          missionId: id,
          world: findMission(id)!.world,
          program: REFERENCE_PROGRAMS[id],
          updatedAt: now,
          stage: 'predict',
          attemptId: null,
        })),
      }),
    ),
  })
  await page.getByRole('button', { name: 'Merge validated import', exact: true }).click()
  await expect(page.getByText('Merged validated local data.', { exact: true })).toBeVisible()
  for (const id of ids) {
    const mission = findMission(id)!,
      challenge = chooseTransfer(mission, [])!
    const truth = actualAction(execute(mission.world, REFERENCE_PROGRAMS[id]!).events)
    await page.goto(`/missions/${id}`)
    await page.getByRole('radio', { name: actionNames[truth], exact: true }).check()
    await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
    await expect(page.getByTestId('goal-outcome')).toContainText('Mission goal met')
    await page.getByRole('button', { name: 'Try a different challenge', exact: true }).click()
    const transferTruth = actualAction(execute(challenge.world, challenge.program).events)
    await page.getByRole('radio', { name: actionNames[transferTruth], exact: true }).last().check()
    await page
      .getByRole('button', { name: 'Lock transfer prediction & reveal', exact: true })
      .click()
    await expect(page.getByTestId('completion-checklist')).not.toContainText('Not yet:')
    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText(
      'Saved locally.',
    )
  }
  await page.goto('/progress')
  await expect(page.getByText(/3 completed guided investigations/)).toBeVisible()
  for (const id of ids)
    await expect(
      page.getByRole('button', {
        name: `Review completion evidence for ${id.toUpperCase()}`,
        exact: true,
      }),
    ).toBeVisible()
  await page.reload()
  await expect(
    page.getByTestId('evidence-stamps').getByText(/Completed investigation/),
  ).toHaveCount(3)
})

test('evidence stamps follow a real saved investigation, remain learner scoped and clear with it', async ({
  page,
}) => {
  await page.goto('/missions/m01?new=1')
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
  await page.getByTestId('probe-question').getByRole('button').first().click()
  await expect(page.getByTestId('probe-feedback')).toBeVisible()
  await page.goto('/progress')
  await expect(page.getByTestId('evidence-stamps')).toContainText('First Trace · Recorded')
  await expect(page.getByTestId('evidence-stamps')).toContainText('Sensor Detective · Not yet')
  await expect(page.getByTestId('evidence-stamps')).not.toContainText('Completed investigation')
  await page.getByRole('button', { name: 'Review First Trace evidence', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Diagnostic timeline', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('evidence-stamps')).toContainText('First Trace · Recorded')
  const original = await page
    .getByRole('combobox', { name: 'Local pseudonym', exact: true })
    .inputValue()
  await page.getByLabel('New anonymous alias (optional)', { exact: true }).fill('QA New Notebook')
  await page.getByRole('button', { name: 'Create another anonymous learner', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A fresh page', exact: true })).toBeVisible()
  await expect(page.getByTestId('evidence-stamps')).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Local pseudonym', exact: true }).selectOption(original)
  await expect(page.getByTestId('evidence-stamps')).toContainText('First Trace · Recorded')
  await page.getByRole('button', { name: 'Clear my progress', exact: true }).click()
  await page.getByRole('button', { name: 'Clear this learner only', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A fresh page', exact: true })).toBeVisible()
  await expect(page.getByTestId('evidence-stamps')).toHaveCount(0)
})
