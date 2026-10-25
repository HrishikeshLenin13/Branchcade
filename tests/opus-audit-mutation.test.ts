/** Opus post-L audit: mutation probe of mission judging. Every single-point mutation of each
 * reference program (numeric literal nudges, comparator swaps, statement deletion, AND/OR
 * swap) is judged against its mission. Mutants that still pass are listed for human review:
 * a pass is acceptable only when the mutant is itself a correct solution. */
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Expression, Program, Statement } from '../src/domain/types'
import { MISSION_CATALOG, REFERENCE_PROGRAMS } from '../src/missions/catalog'
import { judgeMission } from '../src/missions/judge'
import { execute } from '../src/interpreter/interpreter'
import { missionComplete } from '../src/missions/completion'

type Mutant = { label: string; program: Program }
function mutants(program: Program): Mutant[] {
  const out: Mutant[] = []
  const json = JSON.stringify(program)
  const clone = (): Program => JSON.parse(json) as Program
  // Walk with a path so each mutation applies to a fresh clone.
  const visit = (node: unknown, path: (string | number)[]) => {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    if (n.kind === 'literal' && typeof n.value === 'number')
      for (const f of [
        (v: number) => v + 1,
        (v: number) => v - 1,
        (v: number) => v * 2,
        (v: number) => Math.max(1, Math.round(v / 2)),
      ]) {
        const p = clone()
        const target = path.reduce<unknown>((a, k) => (a as Record<string, unknown>)[k], p) as {
          value: number
        }
        const before = target.value
        target.value = f(before)
        if (target.value !== before)
          out.push({ label: `${path.join('.')} ${before}→${target.value}`, program: p })
      }
    if (n.kind === 'compare')
      for (const op of ['<', '<=', '>', '>=', '==', '!='] as const)
        if (op !== n.op) {
          const p = clone()
          const target = path.reduce<unknown>(
            (a, k) => (a as Record<string, unknown>)[k],
            p,
          ) as Expression & { op: string }
          target.op = op
          out.push({ label: `${path.join('.')} ${String(n.op)}→${op}`, program: p })
        }
    if (n.kind === 'boolean') {
      const p = clone()
      const target = path.reduce<unknown>((a, k) => (a as Record<string, unknown>)[k], p) as {
        op: string
      }
      target.op = target.op === 'and' ? 'or' : 'and'
      out.push({ label: `${path.join('.')} and/or swap`, program: p })
    }
    for (const [k, v] of Object.entries(n)) {
      if (Array.isArray(v)) {
        v.forEach((child, i) => {
          if (
            child &&
            typeof child === 'object' &&
            'kind' in child &&
            ['body', 'then', 'else'].includes(k)
          ) {
            const p = clone()
            const list = [...path, k].reduce<unknown>(
              (a, key) => (a as Record<string, unknown>)[key],
              p,
            ) as Statement[]
            list.splice(i, 1)
            out.push({
              label: `delete ${[...path, k, i].join('.')} (${(child as Statement).kind})`,
              program: p,
            })
          }
          visit(child, [...path, k, i])
        })
      } else if (v && typeof v === 'object') visit(v, [...path, k])
    }
  }
  visit(program, [])
  return out
}

describe('Opus mutation probe of mission judges', () => {
  const report: string[] = []
  for (const mission of MISSION_CATALOG) {
    it(`${mission.id}: reference passes; surviving mutants are recorded`, () => {
      const ref = REFERENCE_PROGRAMS[mission.id]!
      const world = mission.world
      expect(judgeMission(mission, world, ref, execute(world, ref)).passed).toBe(true)
      const all = mutants(ref)
      const survivors = all.filter((m) => {
        try {
          return judgeMission(mission, world, m.program, execute(world, m.program)).passed
        } catch {
          return false
        }
      })
      report.push(
        `${mission.id}: ${all.length} mutants, ${survivors.length} still pass${survivors.length ? ':\n    ' + survivors.map((s) => s.label).join('\n    ') : ''}`,
      )
    })
  }
  it('prints the survivor report', () => {
    if (process.env.OPUS_AUDIT_OUT)
      writeFileSync(
        `${process.env.OPUS_AUDIT_OUT}/mutation-survivors.txt`,
        report.join('\n') + '\n',
      )
    expect(typeof missionComplete).toBe('function')
  })
})
