/** Part H "Mission authoring verification": every authored mission is checked against the
 * real interpreter — parse, world validity, reference success in every scenario, each
 * deliberately flawed variant failing in the intended way, probes and prompts that use
 * the real data, and transfer variants genuinely distinct from the baseline. */
import { describe, expect, it } from 'vitest'
import { MissionSchema, ProgramSchema, WorldSchema } from '../src/domain/schemas'
import { execute } from '../src/interpreter/interpreter'
import { actualAction } from '../src/interpreter/trace'
import { validateProgram } from '../src/interpreter/validate'
import { MISSION_CATALOG, MISSION_META } from '../src/missions/catalog'
import { CURRICULUM, missionAuthoring, situation } from '../src/missions/curriculum'
import { judgeMission } from '../src/missions/judge'
import { readSensors } from '../src/engine/sensors'
import { initialRobot } from '../src/engine/robot'
import { runModel, observe } from '../src/learning/mental-models'
import { HYPOTHESIS_CODES, NO_MISCONCEPTION } from '../src/learning/taxonomy'

const authored = MISSION_CATALOG.filter((m) => CURRICULUM[m.id])

describe.each(authored.map((m) => [m.id, m] as const))('%s authoring', (_, mission) => {
  const c = CURRICULUM[mission.id]!
  const a = missionAuthoring(mission)
  it('parses, has a valid world and a version above the frozen v1', () => {
    expect(MissionSchema.parse(mission)).toEqual(mission)
    expect(WorldSchema.parse(a.starterWorld)).toEqual(a.starterWorld)
    expect(mission.version).toBeGreaterThanOrEqual(2)
    for (const p of [a.starterAST, a.referenceSolutionAST, c.hintExample])
      expect(() => validateProgram(ProgramSchema.parse(p))).not.toThrow()
    expect(a.objective).toBe(MISSION_META[mission.id]!.objective)
    expect(a.concepts.length).toBeGreaterThan(0)
  })
  it('the reference solution succeeds in the mission world and every success scenario', () => {
    const run = execute(mission.world, a.referenceSolutionAST)
    const result = judgeMission(mission, mission.world, a.referenceSolutionAST, run)
    expect(result.facts.filter((f) => f.includes('not met'))).toEqual([])
    expect(result.passed).toBe(true)
  })
  it('the starter does not get completion unless the mission is a pure prediction mission', () => {
    const run = execute(mission.world, mission.starterProgram)
    const passed = judgeMission(mission, mission.world, mission.starterProgram, run).passed
    // m01 asks for a prediction about a working program; every other starter is flawed.
    expect(passed).toBe(mission.id === 'm01')
  })
  it('each deliberately flawed variant fails exactly the way the curriculum says', () => {
    expect(c.mistakeVariants.length).toBeGreaterThanOrEqual(2)
    for (const v of c.mistakeVariants) {
      const run = execute(mission.world, v.program)
      const result = judgeMission(mission, mission.world, v.program, run)
      expect(result.passed, v.id).toBe(false)
      expect(result.facts.join(' | '), v.id).toContain(v.fails)
    }
  })
  it('has narrative, vocabulary, a three-step hint ladder, teacher note and failure examples', () => {
    expect(c.narrative.split(/(?<=[.!?])\s/).length).toBeLessThanOrEqual(3)
    expect(c.vocabulary.length).toBeGreaterThanOrEqual(2)
    expect(c.hints).toHaveLength(3)
    expect(c.hintExample).not.toEqual(a.referenceSolutionAST)
    expect(c.hintExample).not.toEqual(a.starterAST)
    expect(c.teacherNote.length).toBeGreaterThan(40)
    expect(c.failureExamples.length).toBeGreaterThanOrEqual(1)
  })
  it('the expected prediction matches the real first action of the starter', () => {
    expect(actualAction(execute(mission.world, mission.starterProgram).events)).toBe(
      c.expectedPrediction.action,
    )
  })
  it('the probe bank is executable and every probe separates at least one idea from the truth', () => {
    expect(a.probeBank.length).toBeGreaterThanOrEqual(2)
    for (const p of a.probeBank) {
      expect(p).not.toBeNull()
      expect(HYPOTHESIS_CODES.some((h) => p!.predictions[h] !== p!.truth)).toBe(true)
    }
  })
  it('prompts use the real starting readings', () => {
    const s = readSensors(mission.world, initialRobot(mission.world))
    const text = situation(mission.world).text
    expect(text).toContain(s.surfaceColor)
    if (s.distanceCm !== null) expect(text).toContain(s.distanceCm.toFixed(1))
    else expect(text).toContain('nothing within range')
  })
  it('the optional second question is answerable and can reveal at least one idea', () => {
    if (!c.detail) return
    const key = `h-detail:${mission.id}`
    const truth = observe(
      c.detail.question,
      runModel(key, mission.world, mission.starterProgram, NO_MISCONCEPTION),
    )
    expect(truth).not.toBe('none')
    expect(
      HYPOTHESIS_CODES.some(
        (h) =>
          observe(c.detail!.question, runModel(key, mission.world, mission.starterProgram, h)) !==
          truth,
      ),
    ).toBe(true)
  })
  it('has at least three variants, all valid, and transfer scenarios distinct from the baseline', () => {
    expect(mission.variants.length).toBeGreaterThanOrEqual(3)
    const baseline = JSON.stringify([mission.world, mission.starterProgram])
    for (const t of a.transferVariants) {
      expect(JSON.stringify([t.world, t.program])).not.toBe(baseline)
      expect(execute(t.world, t.program).error).toBeNull()
    }
  })
})
