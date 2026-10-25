/** OPUS-001 regression: a stale tab's ordinary save must not erase records another tab
 * stored meanwhile, while this tab's own deliberate deletions still apply. */
import { beforeEach, describe, expect, it } from 'vitest'
import type { AppExport, Attempt } from '../src/domain/types'
import { emptyData } from '../src/storage/migrations'
import { fixtureProfile } from '../src/test/fixtures'
import { makeWorld } from '../src/engine/world'
import { thresholdProgram } from '../src/missions/catalog'
import { executeRecorded } from '../src/interpreter/interpreter'
import { recordPrediction } from '../src/learning/predictions'
import { stableHash } from '../src/domain/invariants'
import { rebaseEnvelope } from '../src/storage/rebase'
import { clearData, loadData, saveRebased } from '../src/storage/repositories'
import { appendAttempt, annotateAttempt } from '../src/storage/repositories'

async function attempt(id: string, learnerId = fixtureProfile.id): Promise<Attempt> {
  const world = makeWorld(),
    program = thresholdProgram()
  const startedAt = new Date(Date.now() - 1000).toISOString()
  const prediction = await recordPrediction(learnerId, world, program, 'move', 3)
  return {
    schemaVersion: 1,
    id,
    learnerId,
    missionId: 'lab',
    attemptIndex: 1,
    startedAt,
    completedAt: new Date(Date.now() + 1000).toISOString(),
    prediction,
    world,
    program,
    traceHash: await stableHash(executeRecorded(world, program).events),
    diagnosticResponses: [],
    reassessment: null,
    goalOutcome: { passed: false, facts: ['Free exploration is not a scored mission'] },
  }
}
const start = (): AppExport => ({ ...emptyData(), profile: fixtureProfile })
const draft = (id: string) => ({
  schemaVersion: 1 as const,
  id,
  learnerId: fixtureProfile.id,
  missionId: 'm03',
  world: makeWorld(),
  program: thresholdProgram(),
  updatedAt: new Date().toISOString(),
  stage: 'predict',
  cursor: 0,
  attemptId: null,
  transferIndex: 0,
})

describe('rebaseEnvelope (pure)', () => {
  it('no foreign write: returns this tab’s envelope unchanged', async () => {
    const base = start()
    const ours = appendAttempt(base, await attempt('a1'))
    expect(rebaseEnvelope(base, ours, base)).toBe(ours)
  })
  it('keeps another tab’s new attempt when a stale tab saves a draft', async () => {
    const base = start()
    const theirs = {
      ...appendAttempt(base, await attempt('from-tab-a')),
      exportedAt: '2030-01-01T00:00:00.000Z',
    }
    const ours = { ...base, drafts: [draft('d-b')] }
    const merged = rebaseEnvelope(base, ours, theirs)
    expect(merged.attempts.map((a) => a.id)).toEqual(['from-tab-a'])
    expect(merged.drafts.map((d) => d.id)).toEqual(['d-b'])
  })
  it('this tab’s deletion applies; another tab’s deletion is not undone', async () => {
    const a1 = await attempt('a1'),
      a2 = await attempt('a2')
    const base = appendAttempt(appendAttempt(start(), a1), a2)
    // Other tab deleted a2 and added a3; this tab deleted a1.
    const theirs = {
      ...appendAttempt({ ...base, attempts: [a1] }, await attempt('a3')),
      exportedAt: '2030-01-01T00:00:00.000Z',
    }
    const ours = { ...base, attempts: [a2] }
    expect(rebaseEnvelope(base, ours, theirs).attempts.map((a) => a.id)).toEqual(['a3'])
  })
  it('concurrent annotations of one attempt keep the append-only superset', async () => {
    const a1 = await attempt('a1')
    const base = appendAttempt(start(), a1)
    const response = {
      probeId: 'g.which-branch.40',
      choiceId: 'else',
      recordedAt: new Date(Date.now() + 5000).toISOString(),
    }
    const theirs = {
      ...annotateAttempt(base, 'a1', { diagnosticResponses: [response], reassessment: null }),
      exportedAt: '2030-01-01T00:00:00.000Z',
    }
    const ours = { ...base, drafts: [draft('d')] }
    expect(rebaseEnvelope(base, ours, theirs).attempts[0]!.diagnosticResponses).toHaveLength(1)
  })
  it('an erase in another tab is not resurrected by a stale save', async () => {
    const base = appendAttempt(start(), await attempt('a1'))
    const ours = { ...base, drafts: [draft('d')] }
    const merged = rebaseEnvelope(base, ours, null)
    expect(merged.attempts).toEqual([])
    expect(merged.profile).toBeNull()
    expect(merged.drafts.map((d) => d.id)).toEqual(['d'])
  })
})

describe('saveRebased against real IndexedDB (fake-indexeddb)', () => {
  beforeEach(() => clearData())
  it('reproduces the OPUS-001 sequence without losing the attempt', async () => {
    const first = (await saveRebased(null, start())).stored
    // Tabs A and B both load `first`.
    const tabA = first,
      tabB = first
    const a = await saveRebased(tabA, appendAttempt(tabA, await attempt('tab-a-attempt')))
    expect(a.foreign).toBe(false)
    const b = await saveRebased(tabB, { ...tabB, drafts: [draft('tab-b-draft')] })
    expect(b.foreign).toBe(true)
    const stored = await loadData()
    expect(stored.attempts.map((x) => x.id)).toEqual(['tab-a-attempt'])
    expect(stored.drafts.map((x) => x.id)).toEqual(['tab-b-draft'])
    expect(Date.parse(stored.exportedAt)).toBeGreaterThan(Date.parse(a.stored.exportedAt) - 1)
  })
})
