/** Instructor control coverage with explicitly synthetic local records. Every program,
 * goal and checksum is executed, then imported through the normal validated UI. */
import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { AppExport } from '../src/domain/types'
import { emptyData } from '../src/storage/migrations'
import { fixtureProfile } from '../src/test/fixtures'
import { findMission, REFERENCE_PROGRAMS } from '../src/missions/catalog'
import { curriculumFor } from '../src/missions/curriculum'
import { createTeam } from '../src/collaboration/session'
const BIRCH = '=Synthetic Birch',
  ELM = 'Synthetic Elm'
function rosterFixture(): AppExport {
  const birch = { ...fixtureProfile, id: 'ij-teacher-birch', nickname: BIRCH },
    elm = { ...fixtureProfile, id: 'ij-teacher-elm', nickname: ELM }
  const teams = [birch, elm].map((profile, i) => {
    const team = createTeam(
        [profile.nickname, `Synthetic teammate ${i + 1}`],
        i ? 'm04' : 'm01',
        i ? 'Synthetic Elm Team' : 'Synthetic Birch Team',
      ),
      originalId = team.members[0]!.learnerId
    return {
      ...team,
      id: i ? 'ij-teacher-team-elm' : 'ij-teacher-team-birch',
      createdAt: i ? '2026-10-20T11:00:00.000Z' : '2026-10-10T11:00:00.000Z',
      members: team.members.map((m) =>
        m.learnerId === originalId ? { ...m, learnerId: profile.id } : m,
      ),
      roleHistory: team.roleHistory.map((h) =>
        h.learnerId === originalId ? { ...h, learnerId: profile.id } : h,
      ),
    }
  })
  return { ...emptyData(), profile: birch, profiles: [elm], teams }
}
async function importFixture(page: Page): Promise<AppExport> {
  test.setTimeout(60_000)
  const seed = rosterFixture()
  await page.goto('/instructor')
  await page.getByLabel('Import local record', { exact: true }).setInputFiles({
    name: 'synthetic-teacher-rosters.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(seed)),
  })
  await page.getByRole('button', { name: 'Merge validated import', exact: true }).click()
  await expect(page.getByText('Merged validated local data.', { exact: true })).toBeVisible()
  await page.goto('/missions/m01?new=1')
  await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('goal-outcome')).toContainText('Mission goal met')
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.goto('/progress')
  await page
    .getByRole('combobox', { name: 'Local pseudonym', exact: true })
    .selectOption('ij-teacher-elm')
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  const draft = {
    ...emptyData(),
    profile: seed.profiles[0]!,
    drafts: [
      {
        schemaVersion: 1,
        id: 'draft-teacher-m04',
        learnerId: 'ij-teacher-elm',
        missionId: 'm04',
        world: findMission('m04')!.world,
        program: REFERENCE_PROGRAMS.m04!,
        updatedAt: new Date().toISOString(),
        stage: 'predict',
        attemptId: null,
      },
    ],
  }
  await page.goto('/settings')
  await page.getByLabel('Import local data', { exact: true }).setInputFiles({
    name: 'synthetic-m04-program.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(draft)),
  })
  await page.getByRole('button', { name: 'Merge validated import', exact: true }).click()
  await expect(page.getByText('Merged validated local data.', { exact: true })).toBeVisible()
  await page.goto('/missions/m04')
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  await page.getByRole('button', { name: 'Show next hint', exact: true }).click()
  await page.getByRole('button', { name: 'Show next hint', exact: true }).click()
  await page.getByRole('button', { name: 'Show solution…', exact: true }).click()
  await page.getByRole('button', { name: 'Yes, show the solution', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('goal-outcome')).toContainText('Mission goal met')
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.goto('/settings')
  const record = JSON.parse(await downloadText(page, 'Export local data')) as AppExport
  expect(record.attempts).toHaveLength(2)
  // Only the dates are replaced to exercise independent report ranges. Execution,
  // prediction choices, assistance and checksums came from the actual browser runs.
  for (const a of record.attempts) {
    const date = a.missionId === 'm01' ? '2026-10-10' : '2026-10-20'
    a.startedAt = `${date}T12:00:00.000Z`
    a.prediction.recordedAt = `${date}T12:00:01.000Z`
    a.completedAt = `${date}T12:00:02.000Z`
  }
  record.drafts = []
  await page.goto('/instructor')
  await page.getByLabel('Import local record', { exact: true }).setInputFiles({
    name: 'synthetic-dated-browser-records.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(record)),
  })
  await page.getByRole('combobox', { name: 'Import strategy', exact: true }).selectOption('replace')
  await page.getByRole('button', { name: 'Replace with validated import', exact: true }).click()
  await expect(page.getByText('Replaced validated local data.', { exact: true })).toBeVisible()
  await expect(page.getByRole('table', { name: '2 recorded attempts', exact: true })).toBeVisible()
  return record
}
async function downloadText(page: Page, name: string) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name, exact: true }).click()
  return readFile((await (await pending).path())!, 'utf8')
}
/** Validate a downloaded envelope using the production import's full replay checks,
 * then cancel its preview so the report selection stays unchanged. */
async function validateDownloaded(page: Page, raw: string): Promise<AppExport> {
  const record = JSON.parse(raw) as AppExport
  await page.getByLabel('Import local record', { exact: true }).setInputFiles({
    name: 'downloaded-synthetic-report.json',
    mimeType: 'application/json',
    buffer: Buffer.from(raw),
  })
  await expect(
    page.getByRole('dialog', { name: 'Review validated import', exact: true }),
  ).toContainText(`${record.attempts.length} verified attempts`)
  await page.getByRole('button', { name: 'Keep current data', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  return record
}
test('I/J instructor filters actual local rows by learner, concept, dates and team; reset, teacher notes and replay work', async ({
  page,
}) => {
  await importFixture(page)
  await expect(
    page.getByText(
      'This report uses activity saved in this browser. It does not monitor other computers or a remote class.',
      { exact: true },
    ),
  ).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Select learner', exact: true })
    .selectOption('ij-teacher-birch')
  let table = page.getByRole('table', { name: '1 recorded attempts', exact: true })
  await expect(table).toContainText(BIRCH)
  await expect(table).not.toContainText(ELM)
  await page.getByRole('button', { name: 'Inspect attempt 1', exact: true }).click()
  const replay = page.getByRole('region', { name: 'Attempt 1 replay', exact: true })
  await expect(replay).toContainText('actual first action: move')
  await replay.getByRole('button', { name: 'Step forward', exact: true }).click()
  await replay.getByText('Reproducibility checksums', { exact: true }).click()
  await expect(replay).toContainText('Trace SHA-256:')
  await page.getByRole('button', { name: 'Reset local instructor view', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Attempt 1 replay', exact: true })).toHaveCount(0)
  await page
    .getByRole('combobox', { name: 'Concept filter', exact: true })
    .selectOption(findMission('m04')!.conceptGoals[0]!)
  table = page.getByRole('table', { name: '1 recorded attempts', exact: true })
  await expect(table).toContainText(ELM)
  await expect(table).not.toContainText(BIRCH)
  await page.getByText(`Teacher note for ${findMission('m04')!.title}`, { exact: true }).click()
  await expect(page.getByText(curriculumFor('m04')!.teacherNote, { exact: true })).toBeVisible()
  await expect(page.getByText(/1 solution-assisted\./)).toBeVisible()
  await page.getByRole('button', { name: 'Reset local instructor view', exact: true }).click()
  await page.getByLabel('From date (UTC)', { exact: true }).fill('2026-10-18')
  await page.getByLabel('To date (UTC)', { exact: true }).fill('2026-10-21')
  await expect(page.getByRole('table', { name: '1 recorded attempts', exact: true })).toContainText(
    ELM,
  )
  await page.getByLabel('From date (UTC)', { exact: true }).fill('2026-10-25')
  await expect(page.getByRole('alert')).toContainText(
    'Choose an end date on or after the start date.',
  )
  await expect(
    page.getByRole('heading', { name: 'No local attempts in this view', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Reset local instructor view', exact: true }).click()
  await expect(page.getByLabel('From date (UTC)', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('To date (UTC)', { exact: true })).toHaveValue('')
  await page
    .getByRole('combobox', { name: 'Select team', exact: true })
    .selectOption('ij-teacher-team-birch')
  await expect(page.getByRole('table', { name: '1 recorded attempts', exact: true })).toContainText(
    BIRCH,
  )
  await expect(
    page.getByRole('combobox', { name: 'Select learner', exact: true }),
  ).not.toContainText(ELM)
  await page
    .getByRole('combobox', { name: 'Select team', exact: true })
    .selectOption('ij-teacher-team-elm')
  await expect(page.getByRole('table', { name: '1 recorded attempts', exact: true })).toContainText(
    ELM,
  )
  await expect(page.getByRole('combobox', { name: 'Select learner', exact: true })).toHaveValue('')
  await page.getByRole('button', { name: 'Reset local instructor view', exact: true }).click()
  await expect(page.getByRole('table', { name: '2 recorded attempts', exact: true })).toBeVisible()
})
test('I/J local assignment persists, selected CSV/JSON contain validated scoped records and print button calls browser print', async ({
  page,
}) => {
  await importFixture(page)
  await expect(
    page.getByRole('button', { name: 'Assign mission for this local team', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('combobox', { name: 'Select team', exact: true })
    .selectOption('ij-teacher-team-birch')
  await page.getByRole('combobox', { name: 'Mission to assign', exact: true }).selectOption('m03')
  await page
    .getByRole('button', { name: 'Assign mission for this local team', exact: true })
    .click()
  await expect(
    page.getByText('Mission added to this local team’s plan.', { exact: true }),
  ).toBeVisible()
  const plan = page.getByRole('heading', { name: 'Local mission plan', exact: true }).locator('..')
  await expect(plan).toContainText(`Synthetic Birch Team: ${findMission('m03')!.title}`)
  const csv = await downloadText(page, 'Export filtered CSV')
  expect(csv.trim().split('\n')).toHaveLength(2)
  expect(csv).toContain('"\'=Synthetic Birch"')
  expect(csv).not.toContain(ELM)
  const json = await downloadText(page, 'Export filtered JSON'),
    record = await validateDownloaded(page, json)
  expect(record.attempts).toHaveLength(1)
  expect(record.attempts[0]!.learnerId).toBe('ij-teacher-birch')
  expect(record.teams).toHaveLength(1)
  expect(record.assignments).toHaveLength(1)
  expect(record.assignments[0]).toMatchObject({ teamId: 'ij-teacher-team-birch', missionId: 'm03' })
  expect([record.profile, ...record.profiles].some((p) => p?.nickname === ELM)).toBe(false)
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.reload()
  await expect(plan).toContainText(`Synthetic Birch Team: ${findMission('m03')!.title}`)
  await page.getByRole('button', { name: 'Clear assignment', exact: true }).click()
  await expect(page.getByText('Assignment cleared.', { exact: true })).toBeVisible()
  const cleared = await validateDownloaded(page, await downloadText(page, 'Export filtered JSON'))
  expect(cleared.assignments).toEqual([])
  // Stub only the OS dialog entrypoint. This proves invocation and print CSS, not physical printing.
  await page.evaluate(() => {
    const state = window as Window & { __ijPrintCalls?: number }
    state.__ijPrintCalls = 0
    window.print = () => {
      state.__ijPrintCalls = (state.__ijPrintCalls ?? 0) + 1
    }
  })
  await page.getByRole('button', { name: 'Print summary', exact: true }).click()
  expect(
    await page.evaluate(() => (window as Window & { __ijPrintCalls?: number }).__ijPrintCalls),
  ).toBe(1)
  await page.emulateMedia({ media: 'print' })
  await expect(
    page.getByRole('heading', { name: 'Snapshot of selected records', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Print summary', exact: true })).toBeHidden()
})
test('I/J instructor import rejects future/corrupt records and merging the same local file never doubles actual counts', async ({
  page,
}) => {
  const fixture = await importFixture(page)
  const input = page.getByLabel('Import local record', { exact: true })
  await input.setInputFiles({
    name: 'future-schema.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":999}'),
  })
  await expect(page.getByRole('alert')).toContainText('Invalid record')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('table', { name: '2 recorded attempts', exact: true })).toBeVisible()
  await input.setInputFiles({
    name: 'same-synthetic-records.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  })
  await expect(
    page.getByRole('dialog', { name: 'Review validated import', exact: true }),
  ).toContainText('4 attempt, team or lab IDs already exist')
  await page.getByRole('button', { name: 'Merge validated import', exact: true }).click()
  await expect(page.getByText('Merged validated local data.', { exact: true })).toBeVisible()
  const exported = await validateDownloaded(page, await downloadText(page, 'Export filtered JSON'))
  expect(exported.attempts).toHaveLength(2)
  expect(exported.teams).toHaveLength(2)
  await expect(page.getByRole('table', { name: '2 recorded attempts', exact: true })).toBeVisible()
})
