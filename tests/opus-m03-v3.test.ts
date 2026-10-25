/** OPUS-002 regression: M03 must not be completed by a program that never drives forward,
 * while records made under M03 v2 keep their original verdict. */
import { describe, expect, it } from 'vitest'
import type { Program } from '../src/domain/types'
import { findMission, MISSION_CATALOG, REFERENCE_PROGRAMS } from '../src/missions/catalog'
import { judgeMission, judgeRecorded } from '../src/missions/judge'
import { LEGACY_V2, supportedMissionVersion } from '../src/missions/legacy-v2'
import { execute } from '../src/interpreter/interpreter'

const m03 = findMission('m03')!
const neverDrives = (): Program => {
  const p = structuredClone(REFERENCE_PROGRAMS.m03!)
  const s = p.body[0]!
  if (s.kind !== 'if') throw new Error('unexpected reference shape')
  s.else = [{ nodeId: 'only-stop', kind: 'stop' }]
  return p
}
const judge = (p: Program) => judgeMission(m03, m03.world, p, execute(m03.world, p))

describe('M03 v3', () => {
  it('is version 3 and is the only mission with frozen v2 rules', () => {
    expect(m03.version).toBe(3)
    expect(LEGACY_V2.map((m) => m.id)).toEqual(['m03'])
    for (const m of MISSION_CATALOG.filter((x) => x.id !== 'm03')) expect(m.version).toBe(2)
  })
  it('fails "otherwise: stop" in both far-wall scenarios and passes the reference', () => {
    const verdict = judge(neverDrives())
    expect(verdict.passed).toBe(false)
    expect(
      verdict.facts.filter((f) => f.startsWith('Scenario') && f.includes('not met')),
    ).toHaveLength(2)
    expect(judge(REFERENCE_PROGRAMS.m03!).passed).toBe(true)
  })
  it('a v2 record keeps its original verdict; v3 re-judging applies the new rule', () => {
    const p = neverDrives()
    expect(judgeRecorded(m03, 2, m03.world, p, 2).passed).toBe(true)
    expect(judgeRecorded(m03, 3, m03.world, p, 2).passed).toBe(false)
    expect(judgeRecorded(m03, 2, m03.world, REFERENCE_PROGRAMS.m03!, 2).passed).toBe(true)
    expect(() => judgeRecorded(m03, 4, m03.world, p, 2)).toThrow('Unsupported mission version')
  })
  it('v2 stays a supported record version for M03 only', () => {
    expect(supportedMissionVersion(m03, 2)).toBe(true)
    expect(supportedMissionVersion(m03, 3)).toBe(true)
    expect(supportedMissionVersion(m03, 4)).toBe(false)
    expect(supportedMissionVersion(findMission('m01')!, 3)).toBe(false)
  })
})
