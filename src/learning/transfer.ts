import type { Mission, Program, Statement, Expression, World } from '../domain/types'
import { REFERENCE_PROGRAMS } from '../missions/catalog'
import { execute } from '../interpreter/interpreter'
import { applyEdit, candidateEdits } from './counterexamples'

/** Part G5/E9 transfer scenarios: the authored variants first, then a bounded set of
 * generated variants made by ONE legal edit to the authored transfer scenario. Every
 * scenario is executed here; any that error, never end, or repeat another scenario are
 * dropped. Ids are deterministic, so a saved transfer answer can be matched again. */
export interface TransferScenario {
  id: string
  world: World
  program: Program
  difficulty: number
  source: 'authored' | 'generated'
}
const GENERATED_FIELDS = new Set(['obstacle-distance', 'threshold', 'loop-count', 'variable-value'])
const MAX_GENERATED = 6

function complexity(program: Program) {
  let n = 0
  const expr = (e: Expression) => {
    if (e.kind === 'boolean' || e.kind === 'not') n++
    if ('left' in e) {
      expr(e.left)
      expr(e.right)
    }
    if (e.kind === 'not' || e.kind === 'detected') expr(e.operand)
  }
  const walk = (body: Statement[]) => {
    for (const s of body) {
      if (['if', 'while', 'repeat', 'call', 'set'].includes(s.kind)) n++
      if (s.kind === 'if') {
        expr(s.condition)
        walk(s.then)
        walk(s.else)
      }
      if (s.kind === 'while') expr(s.condition)
      if (s.kind === 'repeat' || s.kind === 'while' || s.kind === 'function') walk(s.body)
    }
  }
  walk(program.body)
  return n
}
/** Higher = harder. A decision decided by a narrow margin (or exact equality) is harder
 * to predict than one far from the threshold; more control blocks add difficulty. */
export function difficulty(world: World, program: Program) {
  const run = execute(world, program)
  const c = run.events.find((e) => e.kind === 'compare')
  const [a, b] = c?.evaluation?.operands ?? []
  const margin =
    typeof a === 'number' && typeof b === 'number'
      ? Math.abs(a - b) === 0
        ? 3
        : Math.abs(a - b) <= 2
          ? 2
          : Math.abs(a - b) <= 6
            ? 1
            : 0
      : 0
  return margin + complexity(program) / 2 + world.obstacles.length / 4
}

const pools = new Map<string, TransferScenario[]>()
export function transferPool(mission: Mission): TransferScenario[] {
  const cached = pools.get(mission.id)
  if (cached) return cached
  const seen = new Set<string>([JSON.stringify([mission.world, mission.starterProgram])])
  const out: TransferScenario[] = []
  for (const v of mission.variants) {
    const key = JSON.stringify([v.world, v.program])
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: v.id,
      world: v.world,
      program: v.program,
      difficulty: difficulty(v.world, v.program),
      source: 'authored',
    })
  }
  const base = mission.variants[0] ?? {
    world: mission.world,
    program: REFERENCE_PROGRAMS[mission.id] ?? mission.starterProgram,
  }
  let generated = 0
  for (const edit of candidateEdits(base.world, base.program)) {
    if (generated >= MAX_GENERATED) break
    if (!GENERATED_FIELDS.has(edit.field)) continue
    const scenario = applyEdit(base.world, base.program, edit)
    if (!scenario) continue
    const key = JSON.stringify([scenario.world, scenario.program])
    if (seen.has(key)) continue
    const run = execute(scenario.world, scenario.program)
    if (run.error || run.status === 'budget_exceeded') continue
    seen.add(key)
    generated++
    out.push({
      id: `gen-${edit.field}-${edit.target}-${edit.value}`.replace(/[^\w.-]/g, '_'),
      world: { ...scenario.world, id: `${mission.id}-gen-${generated}` },
      program: scenario.program,
      difficulty: difficulty(scenario.world, scenario.program),
      source: 'generated',
    })
  }
  pools.set(mission.id, out)
  return out
}

/** Adaptive choice of the next unseen transfer. The first check is always the authored
 * transfer scenario. After a correct answer the next is at least as hard; after an
 * incorrect one it is no harder, so practice adapts without random difficulty spikes. */
export function chooseTransfer(
  mission: Mission,
  history: readonly { scenarioId?: string; correct: boolean }[],
): TransferScenario | null {
  const pool = transferPool(mission)
  const used = new Set(history.map((h) => h.scenarioId).filter(Boolean))
  const unseen = pool.filter((s) => !used.has(s.id))
  if (!unseen.length) return null
  if (!history.length) return unseen[0]!
  const last = history.at(-1)!
  const lastDifficulty =
    pool.find((s) => s.id === last.scenarioId)?.difficulty ?? unseen[0]!.difficulty
  const fits = unseen.filter((s) =>
    last.correct ? s.difficulty >= lastDifficulty : s.difficulty <= lastDifficulty,
  )
  const choices = fits.length ? fits : unseen
  return [...choices].sort(
    (a, b) =>
      Math.abs(a.difficulty - lastDifficulty) - Math.abs(b.difficulty - lastDifficulty) ||
      pool.indexOf(a) - pool.indexOf(b),
  )[0]!
}
export const findTransfer = (mission: Mission, id: string | undefined) =>
  id ? transferPool(mission).find((s) => s.id === id) : undefined
