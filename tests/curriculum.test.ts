import { describe, it, expect } from 'vitest'
import { MISSION_CATALOG, REFERENCE_PROGRAMS, findMission } from '../src/missions/catalog'
import { MissionSchema } from '../src/domain/schemas'
import { execute } from '../src/interpreter/interpreter'
import { judgeGoals } from '../src/missions/goals'
import { readSensors } from '../src/engine/sensors'
import { initialRobot } from '../src/engine/robot'
import { DEFAULT_SENSOR, makeWorld } from '../src/engine/world'

describe('authored mission execution', () => {
  it('exposes only eight valid activities with distinct transfer scenarios', () => {
    expect(MISSION_CATALOG).toHaveLength(8)
    expect(findMission('unknown')).toBeUndefined()
    for (const mission of MISSION_CATALOG) {
      expect(MissionSchema.safeParse(mission).success).toBe(true)
      expect(mission.variants.length).toBeGreaterThan(0)
      for (const variant of mission.variants) {
        expect(JSON.stringify(variant.world)).not.toEqual(JSON.stringify(mission.world))
        expect(execute(variant.world, variant.program).error).toBeNull()
      }
    }
  })
  for (const mission of MISSION_CATALOG) {
    it(`${mission.id} reference meets actual physical and concept predicates`, () => {
      const run = execute(mission.world, REFERENCE_PROGRAMS[mission.id]!)
      expect(run.error).toBeNull()
      expect(judgeGoals(mission.world, run, mission.successPredicate).passed).toBe(true)
    })
    if (['m03', 'm04', 'm05', 'm06', 'm07', 'm08'].includes(mission.id)) {
      it(`${mission.id} deliberate starter fault does not get completion`, () => {
        const run = execute(mission.world, mission.starterProgram)
        expect(judgeGoals(mission.world, run, mission.successPredicate).passed).toBe(false)
      })
    }
  }
  it('uses a saved world sensor range in both live readings and branch execution', () => {
    const world = { ...makeWorld(), sensorConfig: { ...DEFAULT_SENSOR, maxRangeCm: 10 } }
    expect(readSensors(world, initialRobot(world)).distanceCm).toBeNull()
    const run = execute(world, findMission('m01')!.starterProgram)
    expect(run.error).toContain('No distance return')
    expect(run.events.some((event) => event.kind === 'branch')).toBe(false)
    expect(run.events[0]?.sensor.ray.maxRangeCm).toBe(10)
  })
})

it('mission-specific probes have executable, discriminating answers for each concept', async () => {
  const { probesForMission } = await import('../src/learning/probes')
  const { actualAction } = await import('../src/interpreter/trace')
  for (const mission of MISSION_CATALOG) {
    const probes = probesForMission(mission)
    expect(probes.length).toBeGreaterThan(0)
    for (const probe of probes) {
      const run = execute(probe.scenario.world, probe.scenario.program)
      expect(run.error).toBeNull()
      if (['move', 'stop', 'turn', 'wait'].includes(probe.correctChoice)) {
        expect(actualAction(run.events)).toBe(probe.correctChoice)
      }
      expect(probe.discrimination.every((item) => item.choiceId !== probe.correctChoice)).toBe(true)
    }
  }
})
