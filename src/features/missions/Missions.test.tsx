import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it } from 'vitest'
import Missions from './Missions'
import { useSession } from '../../app/session'
import { emptyData } from '../../storage/migrations'
import { FIRST_MISSION, MISSION_CATALOG } from '../../missions/catalog'
import { fixtureProfile } from '../../test/fixtures'
import { missionActivity, resumableDraft } from './library-model'

beforeEach(() =>
  useSession.setState({ data: emptyData(), ready: true, ephemeral: true, notice: '' }),
)
afterEach(cleanup)
it('search is case-insensitive, recovers an empty result and previews without creating attempts', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Missions />
    </MemoryRouter>,
  )
  await user.type(
    screen.getByRole('searchbox', { name: 'Search missions' }),
    FIRST_MISSION.title.toUpperCase(),
  )
  expect(screen.getByRole('status')).toHaveTextContent('1 mission shown')
  await user.click(screen.getByRole('button', { name: 'Preview' }))
  expect(screen.getByRole('dialog', { name: FIRST_MISSION.title })).toBeVisible()
  expect(useSession.getState().data.attempts).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Close preview' }))
  await user.clear(screen.getByRole('searchbox'))
  await user.type(screen.getByRole('searchbox'), 'no such robotics mission')
  expect(screen.getByRole('heading', { name: 'No missions match' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getByRole('status')).toHaveTextContent(`${MISSION_CATALOG.length} missions shown`)
})
it('uses OR for concept filters and scopes resumable work to the selected learner', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Missions />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: 'Sensors' }))
  const sensorCount = Number(screen.getByRole('status').textContent?.split(' ')[0])
  await user.click(screen.getByRole('button', { name: 'Functions' }))
  const combinedCount = Number(screen.getByRole('status').textContent?.split(' ')[0])
  expect(combinedCount).toBeGreaterThanOrEqual(sensorCount)
  const data = emptyData()
  data.profile = fixtureProfile
  data.drafts = [
    {
      schemaVersion: 1,
      id: 'someone-else',
      learnerId: 'other',
      missionId: 'm01',
      world: FIRST_MISSION.world,
      program: FIRST_MISSION.starterProgram,
      updatedAt: '2026-10-23T12:00:00.000Z',
      stage: 'predict',
    },
  ]
  expect(resumableDraft(data)).toBeUndefined()
  expect(missionActivity(data, FIRST_MISSION).status).toBe('Not started')
  data.drafts.push({ ...data.drafts[0]!, id: 'my-draft', learnerId: fixtureProfile.id })
  expect(resumableDraft(data)?.id).toBe('my-draft')
  expect(missionActivity(data, FIRST_MISSION).status).toBe('In progress')
})

it('resumes the newest known unfinished draft after unordered imports', () => {
  const data = emptyData()
  data.profile = fixtureProfile
  const base = {
    schemaVersion: 1 as const,
    learnerId: fixtureProfile.id,
    missionId: 'm01',
    world: FIRST_MISSION.world,
    program: FIRST_MISSION.starterProgram,
    stage: 'predict',
  }
  data.drafts = [
    { ...base, id: 'newer', updatedAt: '2026-10-23T14:00:00.000Z' },
    { ...base, id: 'older-appended-later', updatedAt: '2026-10-23T12:00:00.000Z' },
    { ...base, id: 'finished', stage: 'complete', updatedAt: '2026-10-23T15:00:00.000Z' },
    { ...base, id: 'unknown', missionId: 'not-published', updatedAt: '2026-10-23T16:00:00.000Z' },
  ]
  expect(resumableDraft(data)?.id).toBe('newer')
})
