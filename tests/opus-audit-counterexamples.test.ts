/** Opus post-L audit: generated counterexamples re-checked against the real interpreter and
 * a structural diff. Each ranked candidate must change exactly one thing relative to its base
 * (one world field or one program literal/operator), and its stated truth must equal what an
 * independent execution of the edited scenario observes. */
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MISSION_CATALOG } from '../src/missions/catalog'
import { relevantHypotheses } from '../src/learning/diagnosis'
import { searchCounterexamples } from '../src/learning/counterexamples'
import { observe, runModel } from '../src/learning/mental-models'
import { HYPOTHESIS_CODES } from '../src/learning/taxonomy'

/** Leaf-level differences between two JSON values. */
function diff(a: unknown, b: unknown, path = ''): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return []
  if (
    a &&
    b &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    Array.isArray(a) === Array.isArray(b)
  ) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].flatMap((k) =>
      diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`),
    )
  }
  return [path]
}

describe('Opus counterexample re-verification', () => {
  const lines: string[] = []
  for (const mission of MISSION_CATALOG)
    it(`${mission.id}: every ranked candidate is a single executed change`, () => {
      const base = {
        key: `opus:${mission.id}`,
        world: mission.world,
        program: mission.starterProgram,
      }
      const targets = relevantHypotheses(mission.world, mission.starterProgram).filter((c) =>
        (HYPOTHESIS_CODES as readonly string[]).includes(c),
      )
      const search = searchCounterexamples(base, targets)
      lines.push(
        `${mission.id}: examined ${search.examined}, ranked ${search.ranked.length}, rejected ${search.rejected.length}, noCandidate=${search.noCandidateReason ?? '-'}`,
      )
      for (const c of search.ranked) {
        const changes = [
          ...diff(base.world, c.world).map((p) => `world${p}`),
          ...diff(base.program, c.program).map((p) => `program${p}`),
        ]
          // The candidate world/program ids may be regenerated; ignore id-only fields.
          .filter((p) => !/\.id$/.test(p))
        const truth = observe(
          c.question,
          runModel(`opus-recheck:${mission.id}:${c.key}`, c.world, c.program, 'NO_MISCONCEPTION'),
        )
        lines.push(
          `    ${c.field}.${c.target}=${c.value} q=${c.question} truth=${c.truth} recheck=${truth} changes=${changes.join(' ')}`,
        )
        expect(truth).toBe(c.truth)
        expect(changes.length).toBeGreaterThanOrEqual(1)
        // A function-call edit inserts or removes one call statement, which shifts later
        // statements in the leaf diff; every other edit must touch exactly one leaf.
        if (c.field === 'function-call') {
          const calls = (p: unknown) => (JSON.stringify(p).match(/"kind":"call"/g) ?? []).length
          expect(Math.abs(calls(c.program) - calls(base.program))).toBe(1)
          expect(diff(base.world, c.world)).toEqual([])
        } else expect(changes.length).toBe(1)
      }
    })
  it('writes the record', () => {
    if (process.env.OPUS_AUDIT_OUT)
      writeFileSync(
        `${process.env.OPUS_AUDIT_OUT}/counterexample-recheck.txt`,
        lines.join('\n') + '\n',
      )
  })
})
