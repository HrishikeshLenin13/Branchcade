import { it, expect } from 'vitest'
import * as S from '../src/domain/schemas'
import { makeWorld, DEFAULT_SENSOR } from '../src/engine/world'
import { initialRobot } from '../src/engine/robot'
import { readSensors } from '../src/engine/sensors'
import { execute } from '../src/interpreter/interpreter'
import { thresholdProgram } from '../src/missions/catalog'
import { recordPrediction } from '../src/learning/predictions'
import { PROBES } from '../src/learning/probes'
import { assess } from '../src/learning/diagnosis'
import { hypothesisRecords } from '../src/learning/diagnosis'
import { searchCounterexamples, toCounterexample } from '../src/learning/counterexamples'
import { DEFAULT_SETTINGS } from '../src/storage/migrations'
import { stableHash } from '../src/domain/invariants'
it('every remaining C3 record has a valid serializable runtime example', async () => {
  const world = makeWorld(),
    program = thresholdProgram(),
    robot = initialRobot(world),
    sensors = readSensors(world, robot),
    run = execute(world, program),
    hash = await stableHash(program),
    prediction = await recordPrediction('example', world, program, 'move', 3)
  const examples: [{ parse: (x: unknown) => unknown }, unknown][] = [
    [S.Vec2Schema, robot.position],
    [S.ObstacleSchema, world.obstacles[0]],
    [
      S.FloorZoneSchema,
      {
        id: 'floor',
        kind: 'rectangle',
        position: { xCm: 0, yCm: 0 },
        widthCm: 10,
        heightCm: 10,
        color: 'black',
        priority: 1,
      },
    ],
    [S.RobotStateSchema, robot],
    [S.SensorConfigSchema, DEFAULT_SENSOR],
    [S.SensorSnapshotSchema, sensors],
    [S.ExecutionEventSchema, run.events[0]],
    [
      S.SimulationSnapshotSchema,
      {
        schemaVersion: 1,
        worldId: world.id,
        programHash: hash,
        eventCursor: 0,
        robotState: robot,
        interpreterState: { variables: {}, stack: [], instructions: 0, status: 'ready' },
        rngState: null,
        traceId: 'example-trace',
      },
    ],
    [S.PredictionSchema, prediction],
    [S.ProbeSchema, PROBES[0]],
    [
      S.HypothesisSchema,
      (
        await hypothesisRecords(
          assess(
            ['COMPARATOR_DIRECTION'],
            [
              {
                answerId: 'answer',
                source: 'probe',
                independenceKey: 't',
                scenarioKey: 's',
                question: 'first-action',
                situation: 'a contract example',
                learnerAnswer: 'stop',
                truth: 'move',
                predictions: { COMPARATOR_DIRECTION: 'stop' },
              },
            ],
          ),
        )
      )[0],
    ],
    [
      S.EvidenceItemSchema,
      {
        schemaVersion: 1,
        id: 'evidence',
        answerId: 'answer',
        traceHash: hash,
        scenarioHash: hash,
        hypothesisId: 'reversed-comparison',
        direction: 'supports',
        weight: 0.5,
        ruleReason: 'Exact response to the comparison probe',
      },
    ],
    [
      S.CounterexampleSchema,
      await toCounterexample(
        { world, program },
        searchCounterexamples({ key: 'contract', world, program }, ['COMPARATOR_DIRECTION']),
        ['COMPARATOR_DIRECTION'],
      ),
    ],
    [S.AppSettingsSchema, DEFAULT_SETTINGS],
  ]
  for (const [schema, example] of examples)
    expect(schema.parse(JSON.parse(JSON.stringify(example)))).toEqual(example)
})
it('seeded sensor perturbation is deterministic, bounded and passive', () => {
  const w = makeWorld(),
    r = initialRobot(w),
    config = { ...DEFAULT_SENSOR, noiseSeed: 1234 },
    a = readSensors(w, r, config)
  expect(a).toEqual(readSensors(w, r, config))
  expect(Math.abs(a.distanceCm! - 24)).toBeLessThanOrEqual(0.05)
  expect(r).toEqual(initialRobot(w))
})
it('rejects incoherent cross-record contracts', () => {
  expect(
    S.ReassessmentSchema.safeParse({
      schemaVersion: 1,
      worldHash: 'a'.repeat(64),
      programHash: 'b'.repeat(64),
      predictedAction: 'move',
      actualAction: 'stop',
      correct: true,
      recordedAt: new Date().toISOString(),
    }).success,
  ).toBe(false)
  const probe = structuredClone(PROBES[0]!)
  probe.correctChoice = 'missing'
  expect(S.ProbeSchema.safeParse(probe).success).toBe(false)
})
