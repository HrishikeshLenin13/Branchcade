/** Part G algorithm tests: taxonomy, executable mental models, evidence ranking, probe
 * selection, counterexample search, adaptive planning and mastery. Learners here are
 * synthetic test fixtures, never real children. */
import { describe, expect, it } from 'vitest'
import type { Attempt, Mission, Program, World } from '../src/domain/types'
import * as S from '../src/domain/schemas'
import { execute } from '../src/interpreter/interpreter'
import { actualAction } from '../src/interpreter/trace'
import { stableHash } from '../src/domain/invariants'
import { recordPrediction } from '../src/learning/predictions'
import { MISSION_CATALOG, findMission, thresholdProgram } from '../src/missions/catalog'
import { judgeMission } from '../src/missions/judge'
import { makeWorld } from '../src/engine/world'
import { HYPOTHESIS_CODES, NO_MISCONCEPTION, TAXONOMY } from '../src/learning/taxonomy'
import { runModel, observe } from '../src/learning/mental-models'
import { ALL_PROBE_IDS, buildProbe, PROBE_TEMPLATES } from '../src/learning/probe-templates'
import {
  assess,
  hypothesisRecords,
  MAX_PROBES,
  relevantHypotheses,
  type Observation,
} from '../src/learning/diagnosis'
import {
  attemptDiagnosis,
  experimentPlan,
  experimentSearch,
  experimentTargets,
  nextProbe,
} from '../src/learning/investigation'
import { searchCounterexamples, toCounterexample, applyEdit } from '../src/learning/counterexamples'
import { conceptEvidence } from '../src/learning/mastery'
import { recommend } from '../src/learning/adaptive-planner'
import { chooseTransfer, transferPool } from '../src/learning/transfer'
import { missionConcepts } from '../src/learning/concepts'

let clock = Date.parse('2026-10-24T10:00:00.000Z')
const tick = () => new Date((clock += 1000)).toISOString()
const choiceId = (answer: string) => answer.replace(/[^\w.-]/g, '_')

async function attemptFor(
  mission: Mission,
  action: 'move' | 'stop' | 'turn' | 'wait',
  options: { world?: World; program?: Program; reasoning?: string; learnerId?: string } = {},
): Promise<Attempt> {
  const world = options.world ?? mission.world,
    program = options.program ?? mission.starterProgram,
    startedAt = tick()
  const prediction = await recordPrediction(
    options.learnerId ?? 'synthetic-learner',
    world,
    program,
    action,
    3,
    options.reasoning ?? '',
  )
  const run = execute(world, program)
  return S.AttemptSchema.parse({
    schemaVersion: 1,
    engineVersion: 2,
    missionVersion: mission.version,
    id: `attempt-${clock}`,
    learnerId: options.learnerId ?? 'synthetic-learner',
    missionId: mission.id,
    attemptIndex: 1,
    startedAt,
    prediction: { ...prediction, recordedAt: tick() },
    completedAt: tick(),
    world,
    program,
    traceHash: await stableHash(run.events),
    diagnosticResponses: [],
    reassessment: null,
    goalOutcome: judgeMission(mission, world, program, run),
  })
}
const answer = (a: Attempt, probeId: string, ans: string): Attempt => ({
  ...a,
  diagnosticResponses: [
    ...a.diagnosticResponses,
    { probeId, choiceId: choiceId(ans), recordedAt: tick() },
  ],
})
/** Runs the adaptive loop for a synthetic learner whose answers come from `answerer`. */
function investigate(attempt: Attempt, answerer: (probeId: string) => string) {
  const mission = findMission(attempt.missionId)
  let a = attempt
  const asked: string[] = []
  for (let i = 0; i < MAX_PROBES; i++) {
    // voluntary: the learner may open the investigation even after a correct first answer.
    const choice = nextProbe(a, attemptDiagnosis(a, mission), [], undefined, true)
    if (!choice) break
    asked.push(choice.probe.id)
    a = answer(a, choice.probe.id, answerer(choice.probe.id))
  }
  return { attempt: a, asked, state: attemptDiagnosis(a, mission) }
}
const m01 = findMission('m01')!

describe('G1 taxonomy and executable mental models', () => {
  it('defines all 14 hypotheses with copy, concept, objective and counterexample families', () => {
    expect(HYPOTHESIS_CODES).toHaveLength(14)
    for (const code of HYPOTHESIS_CODES) {
      const t = TAXONOMY[code]
      expect(t.code).toBe(code)
      for (const text of [
        t.title,
        t.learnerText,
        t.correctIdea,
        t.prerequisiteObjective,
        t.tryNext,
      ])
        expect(text.length).toBeGreaterThan(10)
      expect(t.learnerText).toMatch(/^You might be/)
      expect(t.responsePatterns.length).toBeGreaterThanOrEqual(2)
      expect(t.counterexamples.length).toBeGreaterThanOrEqual(1)
    }
  })
  it('every hypothesis has at least two distinct probe templates that really separate it from the truth', () => {
    for (const code of HYPOTHESIS_CODES) {
      const discriminating = new Set(
        ALL_PROBE_IDS.map((id) => buildProbe(id)!)
          .filter((p) => p && p.predictions[code] !== p.truth)
          .map((p) => p.template),
      )
      expect(discriminating.size, code).toBeGreaterThanOrEqual(2)
      for (const id of TAXONOMY[code].probes)
        expect(
          PROBE_TEMPLATES.some((t) => t.id === id),
          `${code} → ${id}`,
        ).toBe(true)
    }
  })
  it('the no-misconception model is byte-identical to the authoritative interpreter', async () => {
    const scenarios = [
      ...MISSION_CATALOG.flatMap((m) => [
        { key: `${m.id}-starter`, world: m.world, program: m.starterProgram },
        ...m.variants.map((v) => ({ key: `${m.id}-${v.id}`, world: v.world, program: v.program })),
      ]),
      ...ALL_PROBE_IDS.map((id) => ({ key: id, ...buildProbe(id)! })),
    ]
    for (const s of scenarios) {
      const model = runModel(`seam:${s.key}`, s.world, s.program, NO_MISCONCEPTION).result.events
      expect(await stableHash(model), s.key).toBe(
        await stableHash(execute(s.world, s.program).events),
      )
    }
  })
  it('each model changes exactly its own rule (spot checks with real execution)', () => {
    const p = buildProbe('g.branch-at.10-lt')!
    expect(p.truth).toBe('stop')
    expect(p.predictions.COMPARATOR_DIRECTION).toBe('move')
    expect(buildProbe('g.reading-change.40')!.predictions).toMatchObject({
      NO_MISCONCEPTION: 'smaller',
      SENSOR_RANGE_REVERSED: 'bigger',
      MOVEMENT_VS_SENSOR_REFRESH: 'same',
    })
    expect(buildProbe('g.helper-called.1')!.predictions).toMatchObject({
      NO_MISCONCEPTION: '1',
      FUNCTION_DEFINITION_EXECUTES: '2',
      FUNCTION_CALL_SKIPPED: '0',
    })
    expect(buildProbe('g.null-reading.empty')!.predictions.SENSOR_NULL_ZERO).toBe('0')
    expect(buildProbe('g.color-read.12')!.predictions.COLOR_LOCATION).toBe('black')
    expect(buildProbe('g.repeat-turns.3')!.predictions.LOOP_COUNT).toBe('4')
    expect(buildProbe('g.while-start-false.10')!.predictions.WHILE_PRETEST).toBe('move')
    expect(buildProbe('g.variable-value.10-30')!.predictions.VARIABLE_STALE_VALUE).toBe('10')
    expect(buildProbe('g.compare-numbers.20-lt-20')!.predictions.STRICT_VS_INCLUSIVE).toBe('true')
    expect(buildProbe('g.drive-to-wall.25')!.predictions).toMatchObject({
      NO_MISCONCEPTION: 'collision',
      SENSOR_IS_ACTION: 'stop',
    })
    expect(buildProbe('g.which-branch.40')!.predictions).toMatchObject({
      NO_MISCONCEPTION: 'else',
      ELSE_EXECUTES_TOO: 'both',
      ELSE_NEVER: 'neither',
    })
  })
  it('rejects unknown or tampered probe ids instead of guessing', () => {
    expect(buildProbe('g.branch-at.999-lt')).toBeNull()
    expect(buildProbe('g.not-a-template.10')).toBeNull()
    expect(buildProbe('compare-rule')).toBeNull()
  })
})

describe('G2/G3 one wrong answer is not a diagnosis', () => {
  it('STOP at 24 cm keeps four candidate ideas open and supports none of them yet', async () => {
    const state = attemptDiagnosis(await attemptFor(m01, 'stop'), m01)
    expect(state.summary).toBe('investigating')
    expect(state.active.sort()).toEqual(
      ['COMPARATOR_DIRECTION', 'ELSE_EXECUTES_TOO', 'ELSE_NEVER', 'SENSOR_IS_ACTION'].sort(),
    )
    expect(state.ranked.some((h) => h.status === 'evidence_for')).toBe(false)
    expect(state.slipPossible).toBe(true)
    expect(state.headline).toMatch(/4 possible mix-ups/)
  })
  it('only hypotheses relevant to the scenario are fetched', () => {
    expect(relevantHypotheses(m01.world, m01.starterProgram)).not.toContain('LOOP_COUNT')
    expect(
      relevantHypotheses(findMission('m04')!.world, findMission('m04')!.starterProgram),
    ).toContain('LOOP_COUNT')
    expect(
      relevantHypotheses(findMission('m06')!.world, findMission('m06')!.starterProgram),
    ).toEqual(expect.arrayContaining(['FUNCTION_DEFINITION_EXECUTES', 'FUNCTION_CALL_SKIPPED']))
  })
  it('a correct prediction yields no forced diagnosis and no probe', async () => {
    const correct = await attemptFor(m01, 'move')
    const state = attemptDiagnosis(correct, m01)
    expect(state.summary).toBe('no-mix-up-seen')
    expect(state.active).toEqual([])
    expect(state.ranked.every((h) => h.status !== 'evidence_for')).toBe(true)
    expect(nextProbe(correct, state)).toBeNull()
    // Only when the learner chooses to investigate are optional questions offered.
    expect(nextProbe(correct, state, [], undefined, true)).not.toBeNull()
  })
  it('the optional branch prediction is evidence from the same moment, not independent evidence', async () => {
    const a = await attemptFor(m01, 'stop')
    const withBranch = { ...a, prediction: { ...a.prediction, branch: 'then' as const } }
    const state = attemptDiagnosis(withBranch, m01)
    expect(state.observations.map((o) => o.question)).toEqual(['first-action', 'branch'])
    const comparator = state.ranked.find((h) => h.code === 'COMPARATOR_DIRECTION')!
    expect(comparator.supports).toHaveLength(2)
    expect(comparator.independentSupport).toBe(1)
    expect(comparator.status).toBe('possible')
  })
  it('an uncertain prediction is not evidence at all', async () => {
    const a = await attemptFor(m01, 'stop')
    const unsure = { ...a, prediction: { ...a.prediction, uncertain: true } }
    expect(attemptDiagnosis(unsure, m01).summary).toBe('no-evidence')
    expect(nextProbe(unsure, attemptDiagnosis(unsure, m01))).toBeNull()
  })
})

describe('G3 the mandatory two-student split', () => {
  it('same first answer STOP, different follow-ups → different next probe, diagnosis and experiment', async () => {
    const first = await attemptFor(m01, 'stop')
    const probe1 = nextProbe(first, attemptDiagnosis(first, m01))!
    expect(probe1).not.toBeNull()
    // Student A reads "<" backwards; student B believes the sensor stops the robot.
    const a = investigate(first, (id) => buildProbe(id)!.predictions.COMPARATOR_DIRECTION)
    const b = investigate(first, (id) => buildProbe(id)!.predictions.SENSOR_IS_ACTION)
    expect(a.asked[0]).toBe(b.asked[0])
    expect(a.asked.slice(1)).not.toEqual(b.asked.slice(1))
    const topA = a.state.ranked[0]!,
      topB = b.state.ranked[0]!
    expect([topA.code, topA.status]).toEqual(['COMPARATOR_DIRECTION', 'evidence_for'])
    expect([topB.code, topB.status]).toEqual(['SENSOR_IS_ACTION', 'evidence_for'])
    expect(topA.label).toBe('Might be')
    // Independent evidence: support from at least two different question templates.
    expect(topA.independentSupport).toBeGreaterThanOrEqual(2)
    const cxA = experimentSearch(a.attempt, a.state)!,
      cxB = experimentSearch(b.attempt, b.state)!
    expect(experimentTargets(a.state)).toEqual(['COMPARATOR_DIRECTION'])
    expect(experimentTargets(b.state)).toEqual(['SENSOR_IS_ACTION'])
    expect(cxA.ranked[0]!.key).not.toBe(cxB.ranked[0]!.key)
    expect(cxA.ranked[0]!.predictions.COMPARATOR_DIRECTION).not.toBe(cxA.ranked[0]!.truth)
    expect(cxB.ranked[0]!.predictions.SENSOR_IS_ACTION).not.toBe(cxB.ranked[0]!.truth)
  })
  it('the same answers always produce the same ranking and the same next probe', async () => {
    const first = await attemptFor(m01, 'stop')
    const run = () => investigate(first, (id) => buildProbe(id)!.predictions.ELSE_NEVER)
    const x = run(),
      y = run()
    expect(x.asked).toEqual(y.asked)
    expect(x.state.ranked.map((h) => [h.code, h.status, h.supportScore])).toEqual(
      y.state.ranked.map((h) => [h.code, h.status, h.supportScore]),
    )
  })
})

describe('G3 contradictions, double counting and slips', () => {
  const obs = (
    over: Partial<Observation> & Pick<Observation, 'answerId' | 'learnerAnswer'>,
  ): Observation => ({
    source: 'probe',
    independenceKey: 't1',
    scenarioKey: 's1',
    question: 'first-action',
    situation: 'a test example',
    truth: 'stop',
    predictions: { COMPARATOR_DIRECTION: 'move', SENSOR_IS_ACTION: 'stop' },
    ...over,
  })
  it('repeating the exact same scenario is not counted twice', () => {
    const s = assess(
      ['COMPARATOR_DIRECTION'],
      [
        obs({ answerId: 'a', learnerAnswer: 'move' }),
        obs({ answerId: 'b', learnerAnswer: 'move' }),
      ],
    )
    expect(s.ranked[0]!.supports).toHaveLength(1)
    expect(s.ranked[0]!.status).toBe('possible')
  })
  it('two supports from the SAME template are not independent', () => {
    const s = assess(
      ['COMPARATOR_DIRECTION'],
      [
        obs({ answerId: 'a', learnerAnswer: 'move' }),
        obs({ answerId: 'b', learnerAnswer: 'move', scenarioKey: 's2' }),
      ],
    )
    expect(s.ranked[0]!.supports).toHaveLength(2)
    expect(s.ranked[0]!.independentSupport).toBe(1)
    expect(s.ranked[0]!.status).toBe('possible')
  })
  it('contradictory answers mark an idea as conflicting and later downgrade it', () => {
    const support = [
      obs({ answerId: 'a', learnerAnswer: 'move' }),
      obs({ answerId: 'b', learnerAnswer: 'move', scenarioKey: 's2', independenceKey: 't2' }),
    ]
    expect(assess(['COMPARATOR_DIRECTION'], support).ranked[0]!.status).toBe('evidence_for')
    const one = assess(
      ['COMPARATOR_DIRECTION'],
      [
        ...support,
        obs({ answerId: 'c', learnerAnswer: 'stop', scenarioKey: 's3', independenceKey: 't3' }),
      ],
    )
    expect(one.ranked[0]!.conflicting).toBe(true)
    expect(one.ranked[0]!.status).toBe('possible')
    const two = assess(
      ['COMPARATOR_DIRECTION'],
      [
        ...support,
        obs({ answerId: 'c', learnerAnswer: 'stop', scenarioKey: 's3', independenceKey: 't3' }),
        obs({ answerId: 'd', learnerAnswer: 'stop', scenarioKey: 's4', independenceKey: 't4' }),
      ],
    )
    expect(two.ranked[0]!.status).toBe('evidence_against')
    expect(two.ranked[0]!.label).toBe('No longer supported')
    // History is kept, not erased.
    expect(two.ranked[0]!.supports).toHaveLength(2)
  })
  it('a wrong answer no idea explains says so instead of inventing one', () => {
    const s = assess(
      ['COMPARATOR_DIRECTION', 'SENSOR_IS_ACTION'],
      [obs({ answerId: 'a', learnerAnswer: 'turn' })],
    )
    expect(s.active).toEqual([])
    expect(s.summary).toBe('none-supported')
    expect(s.headline).toMatch(/need another example/i)
  })
  it('scores are bounded heuristics and the C3 Hypothesis contract round-trips', async () => {
    const first = await attemptFor(m01, 'stop')
    const { state } = investigate(first, (id) => buildProbe(id)!.predictions.COMPARATOR_DIRECTION)
    for (const h of state.ranked) expect(h.supportScore).toBeGreaterThanOrEqual(0)
    for (const h of state.ranked) expect(h.supportScore).toBeLessThanOrEqual(1)
    const records = await hypothesisRecords(state)
    for (const r of records)
      expect(S.HypothesisSchema.parse(JSON.parse(JSON.stringify(r)))).toEqual(r)
    expect(JSON.stringify(records)).not.toMatch(/%|probability/i)
  })
})

describe('G3 coverage: a synthetic learner holding each idea is identified', () => {
  it.each(HYPOTHESIS_CODES)('%s', async (code) => {
    const missions = MISSION_CATALOG.filter((m) =>
      relevantHypotheses(m.world, m.starterProgram).includes(code),
    )
    let found = false
    for (const mission of missions.length ? missions : MISSION_CATALOG) {
      const model = runModel(`cover:${mission.id}`, mission.world, mission.starterProgram, code)
      const first = await attemptFor(mission, observe('first-action', model) as 'move')
      const result = investigate(first, (id) => buildProbe(id)!.predictions[code])
      const top = result.state.ranked.find((h) => h.status === 'evidence_for')
      if (top?.code === code) found = true
      // A synthetic learner holding one idea is never told a DIFFERENT idea is supported alone.
      const supported = result.state.ranked
        .filter((h) => h.status === 'evidence_for')
        .map((h) => h.code)
      if (supported.length === 1) expect(supported[0]).toBe(code)
      if (found) break
    }
    // Some ideas cannot change the first action of any mission starter; they must still be
    // identifiable from a fresh lab-style attempt whose answer they explain.
    if (!found) {
      const probe = ALL_PROBE_IDS.map((id) => buildProbe(id)!).find(
        (p) => p.predictions[code] !== p.truth && p.question === 'first-action',
      )!
      const fake = await attemptFor(m01, probe.predictions[code] as 'move', {
        world: probe.world,
        program: probe.program,
      })
      const result = investigate(fake, (id) => buildProbe(id)!.predictions[code])
      expect(
        result.state.ranked.filter((h) => h.status === 'evidence_for').map((h) => h.code),
      ).toContain(code)
      found = true
    }
    expect(found).toBe(true)
  })
  it('a learner who answers every probe correctly ends with no supported idea', async () => {
    const first = await attemptFor(m01, 'stop')
    const result = investigate(first, (id) => buildProbe(id)!.truth)
    expect(result.state.ranked.some((h) => h.status === 'evidence_for')).toBe(false)
    expect(result.state.active).toEqual([])
  })
})

describe('G4 counterexample search', () => {
  it('every ranked candidate is validated by the real interpreter and discriminates', async () => {
    const first = await attemptFor(m01, 'stop')
    const { attempt, state } = investigate(
      first,
      (id) => buildProbe(id)!.predictions.COMPARATOR_DIRECTION,
    )
    const search = experimentSearch(attempt, state)!
    expect(search.ranked.length).toBeGreaterThan(0)
    for (const c of search.ranked) {
      const real = execute(c.world, c.program)
      expect(real.error).toBeNull()
      if (c.question === 'first-action') expect(actualAction(real.events)).toBe(c.truth)
      expect(c.predictions.COMPARATOR_DIRECTION).not.toBe(c.truth)
      expect(applyEdit(attempt.world as World, attempt.program, c)).toEqual({
        world: c.world,
        program: c.program,
      })
    }
    const record = await toCounterexample(
      { world: attempt.world as World, program: attempt.program },
      search,
      ['COMPARATOR_DIRECTION'],
    )
    expect(S.CounterexampleSchema.parse(JSON.parse(JSON.stringify(record)))).toEqual(record)
    expect(record.validationChecksum).toBe(
      await stableHash({ baseline: record.baselineTrace, changed: record.changedTrace }),
    )
    expect(record.rationale).toMatch(/change just one thing/)
  })
  it('never offers a physical bump as evidence about SENSOR_IS_ACTION', () => {
    const search = searchCounterexamples(
      { key: 'cx-sensor', world: m01.world, program: m01.starterProgram },
      ['SENSOR_IS_ACTION'],
    )
    for (const c of search.ranked)
      expect(execute(c.world, c.program).events.some((e) => e.kind === 'collision')).toBe(false)
  })
  it('rejects scenarios whose reading and threshold would look equal on screen', () => {
    const search = searchCounterexamples(
      { key: 'cx-near', world: makeWorld(20.02), program: thresholdProgram(25) },
      ['COMPARATOR_DIRECTION'],
    )
    expect(search.rejected.some((r) => /look equal/.test(r.reason))).toBe(true)
  })
  it('returns a typed no-candidate result instead of a fake experiment', async () => {
    const search = searchCounterexamples(
      { key: 'cx-none', world: m01.world, program: m01.starterProgram },
      ['LOOP_COUNT'],
    )
    expect(search.ranked).toEqual([])
    expect(search.noCandidateReason).toMatch(/No single-change experiment/)
    const record = await toCounterexample(
      { world: m01.world, program: m01.starterProgram },
      search,
      ['LOOP_COUNT'],
    )
    expect(record.noCandidateReason).toBe(search.noCandidateReason)
    expect(record.edit).toBeNull()
  })
  it('falls back to a verified probe scenario when the mission itself cannot separate an idea', async () => {
    const first = await attemptFor(m01, 'move')
    const { attempt, state } = investigate(
      { ...first, prediction: { ...first.prediction, action: 'stop' } },
      (id) => buildProbe(id)!.predictions.SENSOR_RANGE_REVERSED,
    )
    const plan = experimentPlan(attempt, {
      ...state,
      active: ['SENSOR_RANGE_REVERSED'],
      ranked: state.ranked.map((h) =>
        h.code === 'SENSOR_RANGE_REVERSED'
          ? { ...h, status: 'evidence_for' }
          : { ...h, status: 'evidence_against', active: false },
      ),
    })!
    expect(plan.base.probeId).toMatch(/^g\./)
    const best = plan.search.ranked[0]!
    expect(best.predictions.SENSOR_RANGE_REVERSED).not.toBe(best.truth)
    expect(execute(best.world, best.program).error).toBeNull()
  })
  it('is deterministic for the same inputs', () => {
    const a = searchCounterexamples(
      { key: 'cx-det', world: m01.world, program: m01.starterProgram },
      ['COMPARATOR_DIRECTION', 'ELSE_NEVER'],
    )
    const b = searchCounterexamples(
      { key: 'cx-det-2', world: m01.world, program: m01.starterProgram },
      ['COMPARATOR_DIRECTION', 'ELSE_NEVER'],
    )
    expect(a.ranked.map((c) => c.key)).toEqual(b.ranked.map((c) => c.key))
  })
  it('finds informative experiments for loops and functions using their own missions', () => {
    const m04 = findMission('m04')!,
      m06 = findMission('m06')!
    const loop = searchCounterexamples(
      { key: 'cx-m04', world: m04.world, program: m04.starterProgram },
      ['LOOP_COUNT'],
    )
    expect(loop.ranked[0]?.field).toBe('loop-count')
    const fn = searchCounterexamples(
      { key: 'cx-m06', world: m06.world, program: m06.starterProgram },
      ['FUNCTION_DEFINITION_EXECUTES'],
    )
    expect(fn.ranked[0]?.field).toBe('function-call')
  })
})

describe('G5 adaptive learning', () => {
  it('transfer pools start with the authored transfer, are distinct and run cleanly', () => {
    for (const m of MISSION_CATALOG) {
      const pool = transferPool(m)
      expect(pool[0]!.id).toBe(m.variants[0]!.id)
      expect(new Set(pool.map((s) => JSON.stringify([s.world, s.program]))).size).toBe(pool.length)
      for (const s of pool) expect(execute(s.world, s.program).error, `${m.id}/${s.id}`).toBeNull()
      expect(pool.length).toBeGreaterThan(m.variants.length - 1)
    }
  })
  it('difficulty adapts: harder (or equal) after a correct answer, easier (or equal) after a wrong one', () => {
    const pool = transferPool(m01)
    const firstPick = chooseTransfer(m01, [])!
    expect(firstPick.id).toBe('transfer')
    const up = chooseTransfer(m01, [{ scenarioId: firstPick.id, correct: true }])!
    const down = chooseTransfer(m01, [{ scenarioId: firstPick.id, correct: false }])!
    expect(up.difficulty).toBeGreaterThanOrEqual(firstPick.difficulty)
    expect(down.difficulty).toBeLessThanOrEqual(firstPick.difficulty)
    expect(
      chooseTransfer(
        m01,
        pool.map((s) => ({ scenarioId: s.id, correct: true })),
      ),
    ).toBeNull()
  })
  it('one correct answer is not evidence of understanding; two distinct + transfer + reason is', async () => {
    const one = await attemptFor(m01, 'move', { reasoning: '24 is not less than 20' })
    expect(
      conceptEvidence([one], MISSION_CATALOG).find((c) => c.concept === 'conditionals')!.status,
    ).toBe('working_on_it')
    const m03 = findMission('m03')!
    const truth = actualAction(execute(m03.world, m03.starterProgram).events) as 'move'
    const two = await attemptFor(m03, truth)
    const transfer = transferPool(m03)[0]!
    const withTransfer: Attempt = {
      ...two,
      reassessment: {
        schemaVersion: 1,
        worldHash: await stableHash(transfer.world),
        programHash: await stableHash(transfer.program),
        predictedAction: actualAction(execute(transfer.world, transfer.program).events),
        actualAction: actualAction(execute(transfer.world, transfer.program).events),
        correct: true,
        recordedAt: tick(),
        scenarioId: transfer.id,
      },
    }
    const c = conceptEvidence([one, withTransfer], MISSION_CATALOG).find(
      (x) => x.concept === 'conditionals',
    )!
    expect(c.correctIndependent).toBe(2)
    expect(c.status).toBe('evidence_of_understanding')
    // Hints make the same answers assisted, so they no longer count as independent.
    const hinted = conceptEvidence(
      [{ ...one, hintIds: ['hint-1'] }, withTransfer],
      MISSION_CATALOG,
    ).find((x) => x.concept === 'conditionals')!
    expect(hinted.status).toBe('working_on_it')
    // A failed transfer demotes the concept without erasing earlier answers.
    const failed = conceptEvidence(
      [
        one,
        {
          ...withTransfer,
          transferRetries: [
            {
              ...withTransfer.reassessment!,
              correct: false,
              predictedAction: withTransfer.reassessment!.actualAction === 'move' ? 'stop' : 'move',
              recordedAt: tick(),
            },
          ],
        },
      ],
      MISSION_CATALOG,
    ).find((x) => x.concept === 'conditionals')!
    expect(failed.status).toBe('needs_another_example')
    expect(failed.correctIndependent).toBe(2)
  })
  it('a correct transfer contradicts and downgrades a previously supported idea', async () => {
    const first = await attemptFor(m01, 'stop')
    const { attempt, state } = investigate(
      first,
      (id) => buildProbe(id)!.predictions.COMPARATOR_DIRECTION,
    )
    expect(state.ranked[0]!.status).toBe('evidence_for')
    const pool = transferPool(m01)
    const discriminating = pool.find((s) => {
      const p = runModel(`t:${s.id}`, s.world, s.program, 'COMPARATOR_DIRECTION')
      return actualAction(p.result.events) !== actualAction(execute(s.world, s.program).events)
    })!
    let a = attempt
    for (let i = 0; i < 2; i++) {
      const s =
        i === 0
          ? discriminating
          : pool
              .filter((x) => x !== discriminating)
              .find(
                (x) =>
                  actualAction(
                    runModel(`t:${x.id}`, x.world, x.program, 'COMPARATOR_DIRECTION').result.events,
                  ) !== actualAction(execute(x.world, x.program).events),
              )!
      const actual = actualAction(execute(s.world, s.program).events)
      const record = {
        schemaVersion: 1 as const,
        worldHash: await stableHash(s.world),
        programHash: await stableHash(s.program),
        predictedAction: actual,
        actualAction: actual,
        correct: true,
        recordedAt: tick(),
        scenarioId: s.id,
      }
      a = i === 0 ? { ...a, reassessment: record } : { ...a, transferRetries: [record] }
    }
    const after = attemptDiagnosis(a, m01).ranked.find((h) => h.code === 'COMPARATOR_DIRECTION')!
    expect(after.status).not.toBe('evidence_for')
    expect(after.supports.length).toBeGreaterThanOrEqual(2)
  })
  it('recommends a start, targeted practice, and prerequisite-ordered next steps with reasons', async () => {
    expect(recommend([], MISSION_CATALOG)).toMatchObject({ missionId: 'm01', kind: 'start' })
    const first = await attemptFor(m01, 'stop')
    const { attempt } = investigate(first, (id) => buildProbe(id)!.predictions.SENSOR_IS_ACTION)
    const targeted = recommend([attempt], MISSION_CATALOG)
    expect(targeted.kind).toBe('targeted')
    expect(targeted.concept).toBe('sensor-readings')
    expect(missionConcepts(findMission(targeted.missionId)!)).toContain('sensor-readings')
    expect(targeted.reason).toMatch(/possibility to test, not a label/)
    const ok = await attemptFor(m01, 'move', { reasoning: 'because 24 < 20 is false' })
    const next = recommend([ok], MISSION_CATALOG)
    expect(['practice', 'advance', 'prerequisite']).toContain(next.kind)
    expect(next.reason.length).toBeGreaterThan(20)
  })
})

describe('G6 student-facing language', () => {
  it('never claims certainty, mind-reading or AI diagnosis, and stays age-appropriate', async () => {
    const first = await attemptFor(m01, 'stop')
    const { state } = investigate(first, (id) => buildProbe(id)!.predictions.COMPARATOR_DIRECTION)
    const text = [
      state.headline,
      ...state.ranked.flatMap((h) => [
        h.entry.learnerText,
        h.entry.correctIdea,
        h.entry.tryNext,
        ...h.supports.map((n) => n.reason),
        ...h.contradictions.map((n) => n.reason),
      ]),
      nextProbe(first, attemptDiagnosis(first, m01))!.why,
    ].join(' ')
    expect(text).not.toMatch(
      /\bAI\b|cognitive|schema|diagnos(is|ed)|definitely|certainly|\d+%|probability|failure/i,
    )
    expect(state.headline).toMatch(/possib/i)
  })
  it('evidence reasons quote the real scenario values', async () => {
    const first = await attemptFor(m01, 'stop')
    const { state } = investigate(first, (id) => buildProbe(id)!.predictions.COMPARATOR_DIRECTION)
    const reasons = state.ranked[0]!.supports.map((n) => n.reason).join(' ')
    expect(reasons).toMatch(/\d+ cm|“\d+ [<>]=? \d+”|mission prediction/)
  })
})

describe('G persistence: adaptive answers re-validate on import', () => {
  it('round-trips probe, experiment and generated-transfer answers and rejects tampering', async () => {
    const { appendAttempt } = await import('../src/storage/repositories')
    const { emptyData } = await import('../src/storage/migrations')
    const { exportJson, validateImport } = await import('../src/storage/import-export')
    const { fixtureProfile } = await import('../src/test/fixtures')
    const first = await attemptFor(m01, 'stop', { learnerId: fixtureProfile.id })
    const { attempt, state } = investigate(
      first,
      (id) => buildProbe(id)!.predictions.COMPARATOR_DIRECTION,
    )
    const c = experimentSearch(attempt, state)!.ranked[0]!
    const generated = transferPool(m01).find((s) => s.source === 'generated')!
    const actual = actualAction(execute(generated.world, generated.program).events)
    const full: Attempt = {
      ...attempt,
      experimentResponses: [
        {
          field: c.field,
          target: c.target,
          value: c.value,
          question: c.question,
          predicted: c.predictions.COMPARATOR_DIRECTION!,
          actual: c.truth,
          recordedAt: tick(),
        },
      ],
      reassessment: {
        schemaVersion: 1,
        worldHash: await stableHash(generated.world),
        programHash: await stableHash(generated.program),
        predictedAction: actual,
        actualAction: actual,
        correct: true,
        recordedAt: tick(),
        scenarioId: generated.id,
      },
    }
    const data = appendAttempt({ ...emptyData(), profile: fixtureProfile }, full)
    const back = await validateImport(exportJson(data))
    expect(back.attempts[0]).toEqual(data.attempts[0])
    expect(attemptDiagnosis(back.attempts[0]!, m01).observations.map((o) => o.source)).toEqual(
      expect.arrayContaining(['mission', 'probe', 'experiment', 'transfer']),
    )
    const forgedExperiment = structuredClone(data)
    forgedExperiment.attempts[0]!.experimentResponses![0]!.actual = 'turn'
    await expect(validateImport(exportJson(forgedExperiment))).rejects.toThrow('Experiment answer')
    const forgedProbe = structuredClone(data)
    forgedProbe.attempts[0]!.diagnosticResponses[0]!.choiceId = 'not-a-choice'
    await expect(validateImport(exportJson(forgedProbe))).rejects.toThrow('diagnostic responses')
  })
})
