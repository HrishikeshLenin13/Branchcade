import { afterEach, expect, it } from 'vitest'
import { attemptCollection } from './ij-record-fixture'
import { saveData, loadData, clearData } from '../src/storage/repositories'
import { clearModelCache, runModel, observe } from '../src/learning/mental-models'
import { attemptKey } from '../src/learning/investigation'
import { NO_MISCONCEPTION } from '../src/learning/taxonomy'
import { makeWorld } from '../src/engine/world'
import { thresholdProgram } from '../src/missions/catalog'

afterEach(clearModelCache)
it('ASTRA-005 a replacement import with a reused attempt ID cannot reuse another scenario truth', () => {
  const key = attemptKey({ id: 'user-controlled-import-id' })
  expect(
    observe('first-action', runModel(key, makeWorld(24), thresholdProgram(), NO_MISCONCEPTION)),
  ).toBe('move')
  expect(
    observe('first-action', runModel(key, makeWorld(12), thresholdProgram(), NO_MISCONCEPTION)),
  ).toBe('stop')
})
it('200 valid saved attempts survive a complete load without import-only limits', async () => {
  await clearData()
  const data = await attemptCollection(200)
  const start = performance.now()
  await saveData(data)
  expect((await loadData()).attempts).toHaveLength(200)
  console.log('200-record save+load ms', performance.now() - start)
  await clearData()
})

it('ASTRA-006 a full 200-attempt mixed-curriculum dataset remains readable after saving', async () => {
  const { MISSION_CATALOG, REFERENCE_PROGRAMS } = await import('../src/missions/catalog')
  const { recordPrediction } = await import('../src/learning/predictions')
  const { execute } = await import('../src/interpreter/interpreter')
  const { stableHash } = await import('../src/domain/invariants')
  const { judgeMission } = await import('../src/missions/judge')
  await clearData()
  const data = await attemptCollection(200)
  for (let i = 0; i < data.attempts.length; i++) {
    const a = data.attempts[i]!,
      m = MISSION_CATALOG[i % 8]!,
      program = REFERENCE_PROGRAMS[m.id]!
    const run = execute(m.world, program)
    data.attempts[i] = {
      ...a,
      missionId: m.id,
      missionVersion: m.version,
      world: m.world,
      program,
      prediction: await recordPrediction(a.learnerId, m.world, program, 'move', 3),
      traceHash: await stableHash(run.events),
      goalOutcome: judgeMission(m, m.world, program, run),
      completedAt: new Date().toISOString(),
    }
  }
  await saveData(data)
  expect((await loadData()).attempts).toHaveLength(200)
  await clearData()
})
