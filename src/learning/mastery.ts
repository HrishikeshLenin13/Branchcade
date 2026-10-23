/** A single answer never proves mastery. Require distinct independent transfer evidence. */
export function conceptStatus(
  distinctScenarioHashes: readonly string[],
): 'not_started' | 'practicing' | 'developing' {
  const n = new Set(distinctScenarioHashes).size
  return n === 0 ? 'not_started' : n < 2 ? 'practicing' : 'developing'
}
