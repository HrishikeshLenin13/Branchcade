/** Final acceptance (2026-10-25): structurally wrong programs must not complete a mission.
 * Unlike single-point mutants, these are whole different programs: empty, stop-only,
 * blind driving, spinning, and every OTHER mission's reference solution. */
import { describe, expect, it } from 'vitest'
import type { Program, Statement } from '../src/domain/types'
import { MISSION_CATALOG, REFERENCE_PROGRAMS } from '../src/missions/catalog'
import { judgeMission } from '../src/missions/judge'
import { execute } from '../src/interpreter/interpreter'

const num = (nodeId: string, value: number) =>
  ({ nodeId, kind: 'literal', type: 'number', value }) as const
const prog = (id: string, body: Statement[]): Program => ({ schemaVersion: 1, id, body })
const generic: Record<string, Program> = {
  empty: prog('empty', []),
  'stop only': prog('stop', [{ nodeId: 's', kind: 'stop' }]),
  'drive 100 cm': prog('drive', [{ nodeId: 'm', kind: 'move', distance: num('n', 100) }]),
  'drive 100 cm then stop': prog('drive-stop', [
    { nodeId: 'm', kind: 'move', distance: num('n', 100) },
    { nodeId: 's', kind: 'stop' },
  ]),
  'spin in place then stop': prog('spin', [
    { nodeId: 't', kind: 'turn', angle: num('a', 360) },
    { nodeId: 's', kind: 'stop' },
  ]),
}

describe('structurally wrong programs never complete a mission', () => {
  for (const mission of MISSION_CATALOG) {
    it(`${mission.id}`, () => {
      const candidates: [string, Program][] = [
        ...Object.entries(generic),
        ...Object.entries(REFERENCE_PROGRAMS)
          .filter(([id]) => id !== mission.id)
          .map(([id, p]) => [`${id} reference`, p] as [string, Program]),
      ]
      const passing = candidates
        .filter(([, p]) => {
          try {
            return judgeMission(mission, mission.world, p, execute(mission.world, p)).passed
          } catch {
            return false
          }
        })
        .map(([name]) => name)
      // M01 and M03 share the same correct threshold program by design (M03 repairs a
      // reversed comparator into M01's rule), so each legitimately accepts the other's
      // reference. Nothing else may pass.
      const allowed =
        mission.id === 'm01' ? ['m03 reference'] : mission.id === 'm03' ? ['m01 reference'] : []
      expect(passing).toEqual(allowed)
    })
  }
})
