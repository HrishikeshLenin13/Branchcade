import { expect, it } from 'vitest'
import * as Blockly from 'blockly/core'
import { emptyData } from '../src/storage/migrations'
import { fixtureProfile } from '../src/test/fixtures'
import { makeWorld } from '../src/engine/world'
import { thresholdProgram } from '../src/missions/catalog'
import { execute, executeRecorded } from '../src/interpreter/interpreter'
import { recordPrediction } from '../src/learning/predictions'
import { exportJson, validateImport } from '../src/storage/import-export'
import { stableHash } from '../src/domain/invariants'
import { judgeGoals } from '../src/missions/goals'
import { legacyMission } from '../src/missions/legacy-v1'
import { programWorkspace, editableProgram } from '../src/features/lab/program-workspace'
import type { Attempt, Program } from '../src/domain/types'
import golden from '../docs/evidence/f/legacy-golden.json'

it('imports real pre-F immutable attempts and new F attempts together with versioned checksums', async () => {
  const world = makeWorld(),
    program = thresholdProgram(),
    data = { ...emptyData(), profile: fixtureProfile }
  for (const version of [1, 2] as const) {
    const startedAt = new Date().toISOString(),
      prediction = await recordPrediction(fixtureProfile.id, world, program, 'move', 3)
    const run = executeRecorded(world, program, version)
    const attempt: Attempt = {
      schemaVersion: 1,
      id: `attempt-v${version}`,
      learnerId: fixtureProfile.id,
      missionId: 'm01',
      attemptIndex: version,
      startedAt,
      completedAt: new Date().toISOString(),
      prediction,
      world,
      program,
      traceHash: await stableHash(run.events),
      diagnosticResponses: [],
      reassessment: null,
      // Historical records carry no missionVersion, so they are judged with frozen v1 data.
      goalOutcome: judgeGoals(world, run, legacyMission('m01')!.successPredicate),
      ...(version === 2 ? { engineVersion: 2 as const } : {}),
    }
    if (version === 1) expect(attempt.traceHash).toBe(golden[0]!.hash)
    data.attempts.push(attempt)
  }
  expect(data.attempts[0]!.traceHash).not.toBe(data.attempts[1]!.traceHash)
  expect((await validateImport(exportJson(data))).attempts).toEqual(data.attempts)
  const forged = structuredClone(data)
  forged.attempts[0]!.engineVersion = 2
  await expect(validateImport(exportJson(forged))).rejects.toThrow('trace checksum')
})
it('roundtrips a real Blockly detected/null guard with stable nodes and inert preview execution', () => {
  const program = thresholdProgram(),
    first = program.body[0]!
  if (first.kind !== 'if') throw new Error('fixture')
  first.condition = {
    nodeId: 'guard',
    kind: 'boolean',
    type: 'boolean',
    op: 'and',
    left: {
      nodeId: 'detected',
      type: 'boolean',
      kind: 'detected',
      operand: { nodeId: 'detected-sensor', kind: 'sensor', type: 'number', sensor: 'distance' },
    },
    right: first.condition,
  }
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(programWorkspace(program), workspace)
    const ast = editableProgram(workspace)
    expect(ast.body[0]?.kind === 'if' && ast.body[0].condition.nodeId).toBe('guard')
    const json = Blockly.serialization.workspaces.save(workspace)
    workspace.clear()
    Blockly.serialization.workspaces.load(json, workspace)
    expect(editableProgram(workspace)).toEqual(ast)
    expect(execute({ ...makeWorld(), obstacles: [] }, ast).error).toBeNull()
  } finally {
    workspace.dispose()
  }
})
it('rejects disabled/disconnected blocks instead of silently dropping them', () => {
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(programWorkspace(thresholdProgram()), workspace)
    workspace.newBlock('bc_stop')
    expect(() => editableProgram(workspace)).toThrow('Connect all blocks')
  } finally {
    workspace.dispose()
  }
})
it('a new edited run has a different trace while the original program and events stay unchanged', async () => {
  const world = makeWorld(),
    program: Program = thresholdProgram(),
    run = execute(world, program)
  const snapshot = JSON.stringify({ program, events: run.events })
  expect(await stableHash(run.events)).not.toBe(
    await stableHash(execute(world, thresholdProgram(30)).events),
  )
  expect(JSON.stringify({ program, events: run.events })).toBe(snapshot)
})

it('maps punctuation Blockly IDs and synthetic literal nodes back to the actual source block', async () => {
  const { blockForNode } = await import('../src/interpreter/blockly-workspace')
  const workspace = new Blockly.Workspace()
  try {
    const block = workspace.newBlock('bc_move', 'learner!block?')
    const ast = editableProgram(workspace),
      statement = ast.body[0]!
    expect(blockForNode(workspace, statement.nodeId)).toBe(block)
    if (statement.kind === 'move')
      expect(blockForNode(workspace, statement.distance.nodeId)).toBe(block)
  } finally {
    workspace.dispose()
  }
})
it('preserves a legal pre-F compact world in historical attempts without weakening new world imports', async () => {
  const world = { ...makeWorld(), widthCm: 90, obstacles: [] },
    program = thresholdProgram(50)
  const startedAt = new Date().toISOString(),
    prediction = await recordPrediction(fixtureProfile.id, world, program, 'stop', 3)
  const run = executeRecorded(world, program)
  const attempt: Attempt = {
    schemaVersion: 1,
    id: 'old-compact',
    learnerId: fixtureProfile.id,
    missionId: 'lab',
    attemptIndex: 1,
    startedAt,
    completedAt: new Date().toISOString(),
    prediction,
    world,
    program,
    traceHash: await stableHash(run.events),
    diagnosticResponses: [],
    reassessment: null,
    goalOutcome: { passed: false, facts: ['Free exploration is not a scored mission'] },
  }
  expect(
    (
      await validateImport(
        exportJson({ ...emptyData(), profile: fixtureProfile, attempts: [attempt] }),
      )
    ).attempts[0],
  ).toEqual(attempt)
  const { parseWorldImport } = await import('../src/features/lab/world-tools')
  await expect(parseWorldImport(JSON.stringify(world))).rejects.toThrow()
})
