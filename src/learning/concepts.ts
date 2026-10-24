import type { Mission } from '../domain/types'

/** Part G5 concept prerequisite graph. It is a simple chain on purpose:
 * readings → comparisons → if/else → loops → sensor combinations → functions and state.
 * Each concept lists the concepts that must be explored before it is recommended. */
export const CONCEPTS = [
  {
    id: 'sensor-readings',
    title: 'Sensor readings and units',
    kid: 'What the distance and color sensors actually report, in centimeters and colors.',
    prerequisites: [],
  },
  {
    id: 'comparisons',
    title: 'Comparisons',
    kid: 'How <, <=, > and >= turn two numbers into true or false.',
    prerequisites: ['sensor-readings'],
  },
  {
    id: 'conditionals',
    title: 'If / else decisions',
    kid: 'How one true-or-false answer picks exactly one path.',
    prerequisites: ['comparisons'],
  },
  {
    id: 'loops',
    title: 'Loops',
    kid: 'How repeat counts and while conditions decide how many times code runs.',
    prerequisites: ['conditionals'],
  },
  {
    id: 'sensor-logic',
    title: 'Combining sensors',
    kid: 'How AND and OR combine two sensor checks.',
    prerequisites: ['loops'],
  },
  {
    id: 'functions-state',
    title: 'Functions and variables',
    kid: 'How a helper runs only when called, and how variables remember their latest value.',
    prerequisites: ['sensor-logic'],
  },
] as const
export type ConceptId = (typeof CONCEPTS)[number]['id']
export const CONCEPT_IDS = CONCEPTS.map((c) => c.id) as ConceptId[]
export const conceptTitle = (id: ConceptId) => CONCEPTS.find((c) => c.id === id)!.title

/** Maps a mission's authored concept goals onto the G5 graph. Debugging is a practice,
 * not a separate concept, so it maps to nothing. */
export function missionConcepts(
  mission: Pick<Mission, 'conceptGoals'> & Partial<Pick<Mission, 'starterProgram'>>,
): ConceptId[] {
  const goals = mission.conceptGoals
  const out = new Set<ConceptId>()
  if (goals.includes('distance-sensors') || goals.includes('color-sensors'))
    out.add('sensor-readings')
  // A starter program that orders two numbers (<, <=, >, >=) practices comparisons even when
  // the authored goal list names only the surrounding concept.
  const ordering = /"op":"(<|<=|>|>=)"/.test(JSON.stringify(mission.starterProgram ?? {}))
  if (goals.includes('comparisons') || ordering) out.add('comparisons')
  if (goals.includes('conditionals')) out.add('conditionals')
  if (goals.includes('loops')) out.add('loops')
  if (goals.includes('distance-sensors') && goals.includes('color-sensors')) out.add('sensor-logic')
  if (goals.includes('functions')) out.add('functions-state')
  return CONCEPT_IDS.filter((id) => out.has(id))
}
