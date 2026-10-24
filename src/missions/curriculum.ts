import type { Mission, Program, World } from '../domain/types'
import { readSensors } from '../engine/sensors'
import { initialRobot } from '../engine/robot'
import { REFERENCE_PROGRAMS } from './catalog'
import { MISSION_META } from './catalog'
import { missionConcepts } from '../learning/concepts'
import { buildProbe } from '../learning/probe-templates'
import { transferPool } from '../learning/transfer'
import type { QuestionKind } from '../learning/mental-models'

/** Part H authored teaching material for each mission. Programs and worlds here are
 * ordinary validated data; every claim about them is checked by tests/h-curriculum. */
export interface MistakeVariant {
  id: string
  label: string
  program: Program
  /** Text that must appear in a goal fact that is NOT met (proves it fails as intended). */
  fails: string
  explanation: string
}
export interface MissionCurriculum {
  /** Narrative of at most three sentences. */
  narrative: string
  targetConcept: string
  vocabulary: { term: string; meaning: string }[]
  expectedPrediction: { action: 'move' | 'stop' | 'turn' | 'wait'; reason: string }
  failureExamples: string[]
  teacherNote: string
  /** Executable g.* probe ids used for this mission's investigation bank. */
  probeIds: string[]
  /** Hint ladder: 1 = where to look, 2 = the data plus a simpler example, 3 = a related
   * but different program (hintExample). None of them edits the learner's program. */
  hints: [string, string, string]
  hintExample: Program
  mistakeVariants: MistakeVariant[]
  /** Optional mission-specific second prediction, read with the G observables. */
  detail?: { question: QuestionKind; prompt: string }
}
export const CURRICULUM: Partial<Record<string, MissionCurriculum>> = {}
export const curriculumFor = (id: string) => CURRICULUM[id]

/** Live starting readings in plain words, computed from the world (never typed in). */
export function situation(world: World) {
  const s = readSensors(world, initialRobot(world))
  return {
    distance: s.distanceCm,
    color: s.surfaceColor,
    text: `${s.distanceCm === null ? 'The distance sensor sees nothing within range' : `The distance sensor reads ${s.distanceCm.toFixed(1)} cm`} and the floor sensor reads ${s.surfaceColor}.`,
  }
}

/** The spec's mission authoring export (Part H "Mission authoring verification"). */
export function missionAuthoring(mission: Mission) {
  const c = curriculumFor(mission.id)
  return {
    starterWorld: mission.world,
    starterAST: mission.starterProgram,
    referenceSolutionAST: REFERENCE_PROGRAMS[mission.id]!,
    objective: MISSION_META[mission.id]!.objective,
    concepts: missionConcepts(mission),
    mistakeVariants: c?.mistakeVariants ?? [],
    probeBank: (c?.probeIds ?? []).map((id) => buildProbe(id)),
    transferVariants: transferPool(mission),
  }
}
