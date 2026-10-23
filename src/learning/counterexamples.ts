import type { Counterexample, Program } from '../domain/types'
import { stableHash, opaqueId } from '../domain/invariants'
import { makeWorld } from '../engine/world'
import { execute } from '../interpreter/interpreter'
import { actualAction } from '../interpreter/trace'
import { thresholdProgram } from '../missions/catalog'
/** Bounded search: validate ground truth by executing both candidate programs. */
export async function generateCounterexample(target: string): Promise<Counterexample> {
  for (const distance of ['reversed-comparison', 'sensor-stops'].includes(target)
    ? [24, 20, 32, 12, 44]
    : []) {
    const world = makeWorld(distance),
      baseline = execute(world, thresholdProgram(20))
    const truth = actualAction(baseline.events)
    const model = target === 'reversed-comparison' ? (distance > 20 ? 'stop' : 'move') : 'stop'
    if (truth === model || baseline.error) continue
    const changedThreshold = distance + 5,
      changed = execute(world, thresholdProgram(changedThreshold))
    if (changed.error || actualAction(changed.events) === truth) continue
    return {
      schemaVersion: 1,
      id: opaqueId(),
      changedParameters: [{ field: 'threshold', before: 20, after: changedThreshold }],
      baselineTrace: baseline.events,
      changedTrace: changed.events,
      targetHypotheses: [target],
      modelOutcomes: [{ hypothesisId: target, action: model }],
      rationale: `At ${distance} cm, the actual program ${truth === 'move' ? 'moves' : 'stops'}. Change only the threshold from 20 to ${changedThreshold}; the selected branch changes. A sensor measures; the comparison selects the instruction.`,
      validationChecksum: await stableHash({ baseline: baseline.events, changed: changed.events }),
      noCandidateReason: null,
    }
  }
  return {
    schemaVersion: 1,
    id: opaqueId(),
    changedParameters: [],
    baselineTrace: [],
    changedTrace: [],
    targetHypotheses: [target],
    modelOutcomes: [],
    rationale: 'No discriminating case in the bounded candidate bank.',
    validationChecksum: await stableHash([]),
    noCandidateReason: 'No validated candidate found; try a different probe.',
  }
}
export function changedThreshold(program: Program, value: number): Program {
  const p = structuredClone(program)
  const first = p.body[0]
  if (
    first?.kind === 'if' &&
    first.condition.kind === 'compare' &&
    first.condition.right.kind === 'literal'
  )
    first.condition.right.value = value
  return p
}
