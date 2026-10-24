import { describe, expect, it } from 'vitest'
import type { Mission } from '../src/domain/types'
import { MissionSchema } from '../src/domain/schemas'
import { execute } from '../src/interpreter/interpreter'
import { findMission, thresholdProgram } from '../src/missions/catalog'
import { judgeMission, judgeRecorded } from '../src/missions/judge'
import { legacyMission } from '../src/missions/legacy-v1'
import { judgeGoals } from '../src/missions/goals'
import { makeWorld } from '../src/engine/world'
import { move, program, stop, turn } from '../src/learning/scenarios'

const m01 = findMission('m01')!
const withScenario = (): Mission =>
  MissionSchema.parse({
    ...m01,
    version: 2,
    successScenarios: [
      {
        id: 'close',
        label: 'wall 12 cm away',
        world: makeWorld(12),
        goals: [
          { kind: 'branch', nodeId: 'decision', expected: true },
          { kind: 'programmed-stop' },
        ],
      },
    ],
  })

describe('Part H mission judge', () => {
  it('requires the same program to pass every authored scenario', () => {
    const mission = withScenario()
    const good = judgeMission(
      mission,
      mission.world,
      thresholdProgram(20),
      execute(mission.world, thresholdProgram(20)),
    )
    expect(good.passed).toBe(true)
    expect(good.facts.at(-1)).toBe('Scenario “wall 12 cm away”: met')
    // Threshold 10 still passes the 24 cm world but fails the close wall scenario.
    const bad = judgeMission(
      mission,
      mission.world,
      thresholdProgram(10),
      execute(mission.world, thresholdProgram(10)),
    )
    expect(bad.passed).toBe(false)
    expect(bad.facts.at(-1)).toMatch(/not met \(1 goal missed\)/)
  })
  it('explains when the robot gets there physically but skips the concept', () => {
    const mission = MissionSchema.parse({
      ...m01,
      version: 2,
      world: { ...makeWorld(), obstacles: [] },
      successPredicate: [
        { kind: 'reach', position: { xCm: 50, yCm: 60 }, toleranceCm: 0.1 },
        { kind: 'event', eventKind: 'call', count: 1 },
      ],
    })
    const manual = program('manual', [move('a', 10), turn('t', 90), move('b', 10), stop()])
    const result = judgeMission(mission, mission.world, manual, execute(mission.world, manual))
    expect(result.passed).toBe(false)
    expect(result.facts.join(' ')).toMatch(/Concept check: the robot got there/)
  })
  it('judges records without a mission version against the frozen v1 predicate', () => {
    const legacy = legacyMission('m01')!
    const v1 = judgeRecorded(m01, undefined, legacy.world, legacy.starterProgram, 2)
    expect(v1).toEqual(
      judgeGoals(
        legacy.world,
        execute(legacy.world, legacy.starterProgram),
        legacy.successPredicate,
      ),
    )
    expect(() => judgeRecorded(m01, 99, m01.world, m01.starterProgram, 2)).toThrow(
      'Unsupported mission version',
    )
  })
})

describe('Part H versioned import validation', () => {
  it('re-judges v2 records with scenarios and rejects a forged mission version', async () => {
    const { recordPrediction } = await import('../src/learning/predictions')
    const { stableHash } = await import('../src/domain/invariants')
    const { appendAttempt } = await import('../src/storage/repositories')
    const { emptyData } = await import('../src/storage/migrations')
    const { exportJson, validateImport } = await import('../src/storage/import-export')
    const { fixtureProfile } = await import('../src/test/fixtures')
    const mission = findMission('m01')!
    const run = execute(mission.world, mission.starterProgram)
    const startedAt = new Date().toISOString()
    const prediction = await recordPrediction(
      fixtureProfile.id,
      mission.world,
      mission.starterProgram,
      'move',
      3,
    )
    const data = appendAttempt(
      { ...emptyData(), profile: fixtureProfile },
      {
        schemaVersion: 1,
        engineVersion: 2,
        missionVersion: mission.version,
        id: 'versioned-attempt',
        learnerId: fixtureProfile.id,
        missionId: 'm01',
        attemptIndex: 1,
        startedAt,
        completedAt: new Date().toISOString(),
        prediction,
        world: mission.world,
        program: mission.starterProgram,
        traceHash: await stableHash(run.events),
        diagnosticResponses: [],
        reassessment: null,
        goalOutcome: judgeMission(mission, mission.world, mission.starterProgram, run),
      },
    )
    expect((await validateImport(exportJson(data))).attempts).toEqual(data.attempts)
    const forged = structuredClone(data)
    forged.attempts[0]!.missionVersion = 7
    await expect(validateImport(exportJson(forged))).rejects.toThrow('Unsupported mission version')
  })
})
