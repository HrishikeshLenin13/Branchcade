import { expect, it } from 'vitest'
import { rayCircle, transformOffset } from '../src/engine/geometry'
import { sweepCircle } from '../src/engine/sweep'
import { makeWorld } from '../src/engine/world'
import { MISSION_CATALOG, REFERENCE_PROGRAMS } from '../src/missions/catalog'
import { execute } from '../src/interpreter/interpreter'
import { judgeMission, judgeRecorded } from '../src/missions/judge'
import { missionComplete } from '../src/missions/completion'
import { runModel, clearModelCache } from '../src/learning/mental-models'
import { NO_MISCONCEPTION } from '../src/learning/taxonomy'
import { attemptCollection } from './ij-record-fixture'
import { program, stop } from '../src/learning/scenarios'

it('analytic circular contact and sensor-ray oracles are rotation invariant (seed 20261025)', () => {
  let seed = 20261025
  for (let i = 0; i < 32; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const angle = (seed / 2 ** 32) * 360
    const origin = { xCm: 1000, yCm: 1000 }
    const center = transformOffset(origin, angle, { xCm: 100, yCm: 0 })
    const direction = transformOffset({ xCm: 0, yCm: 0 }, angle, { xCm: 1, yCm: 0 })
    // Collinear distance100 minus obstacle radius20; swept robot radius6 contacts at74/150.
    expect(rayCircle(origin, direction, center, 20)).toBeCloseTo(80, 8)
    const world = {
      ...makeWorld(),
      widthCm: 2000,
      heightCm: 2000,
      obstacles: [
        {
          id: 'circle',
          kind: 'circle' as const,
          position: center,
          radiusCm: 20,
          solid: true,
          material: 'wood' as const,
        },
      ],
    }
    const hit = sweepCircle(
      origin,
      { xCm: direction.xCm * 150, yCm: direction.yCm * 150 },
      6,
      world,
    )
    expect(hit.fraction).toBeCloseTo(74 / 150, 8)
    expect(hit.collision).toBe('circle')
  }
})

it('all eight references pass while structurally replaced stop-only programs fail', () => {
  for (const m of MISSION_CATALOG) {
    const reference = REFERENCE_PROGRAMS[m.id]!
    expect(judgeMission(m, m.world, reference, execute(m.world, reference)).passed, m.id).toBe(true)
    const wrong = program('astra-stop-only', [stop()])
    expect(judgeMission(m, m.world, wrong, execute(m.world, wrong)).passed, m.id).toBe(false)
  }
})

it('M03 v2 history and v3 judging stay distinct for a structurally different never-drive program', () => {
  const m = MISSION_CATALOG.find((m) => m.id === 'm03')!
  const p = structuredClone(REFERENCE_PROGRAMS.m03!)
  const branch = p.body[0]!
  if (branch.kind !== 'if') throw new Error('fixture')
  branch.else = [stop('alternate-stop')]
  expect(judgeRecorded(m, 2, m.world, p, 2).passed).toBe(true)
  expect(judgeRecorded(m, 3, m.world, p, 2).passed).toBe(false)
})

it('authoritative model trace matches the real engine for every reference and survives caller-ID reuse', () => {
  clearModelCache()
  for (const m of MISSION_CATALOG) {
    const p = REFERENCE_PROGRAMS[m.id]!
    expect(runModel('astra-reused-label', m.world, p, NO_MISCONCEPTION).result.events).toEqual(
      execute(m.world, p).events,
    )
  }
})

it('capstone completion cannot be manufactured from a physical goal flag alone', async () => {
  const m = MISSION_CATALOG.find((m) => m.id === 'm08')!
  const a = (await attemptCollection(1)).attempts[0]!
  expect(
    missionComplete(
      { ...a, missionId: 'm08', missionVersion: 2, goalOutcome: { passed: true, facts: [] } },
      m,
    ),
  ).toBe(false)
})
