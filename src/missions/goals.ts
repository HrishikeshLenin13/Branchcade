import type { Goal, World } from '../domain/types'
import type { RunResult } from '../interpreter/interpreter'
import { readSensors } from '../engine/sensors'
export function judgeGoals(world: World, run: RunResult, goals: Goal[]) {
  const outcomes = goals.map((g) => {
    switch (g.kind) {
      case 'branch':
        return run.events.some(
          (e) =>
            e.kind === 'branch' && e.nodeId === g.nodeId && e.evaluation?.result === g.expected,
        )
      case 'distance':
        return (
          Math.hypot(
            run.robot.position.xCm - world.spawn.position.xCm,
            run.robot.position.yCm - world.spawn.position.yCm,
          ) >= g.minCm
        )
      case 'reach':
        return (
          Math.hypot(
            run.robot.position.xCm - g.position.xCm,
            run.robot.position.yCm - g.position.yCm,
          ) <= g.toleranceCm
        )
      case 'stopped':
        return run.robot.status === 'stopped'
      case 'event': {
        const matches = run.events.filter(
          (e, i) =>
            e.kind === g.eventKind &&
            (!g.nodeId || e.nodeId === g.nodeId) &&
            // A turn/wait now emits every physics tick, not one event per instruction.
            (!run.status ||
              !['turn', 'wait'].includes(e.kind) ||
              run.events[i - 1]?.kind !== e.kind ||
              run.events[i - 1]?.nodeId !== e.nodeId),
        )
        return g.count === undefined ? matches.length > 0 : matches.length === g.count
      }
      case 'color-stop':
        return run.events.some((e) => e.kind === 'stop' && e.sensor.surfaceColor === g.color)
      case 'heading': {
        const difference = Math.abs(run.robot.headingDeg - g.headingDeg) % 360
        return Math.min(difference, 360 - difference) <= g.toleranceDeg
      }
      case 'programmed-stop':
        // A stop block ran and nothing was hit: a physical bump is never a programmed stop.
        return run.events.some((e) => e.kind === 'stop') && !run.robot.collision
      case 'final-distance': {
        const reading = readSensors(world, run.robot).distanceCm
        // No return within range counts as "farther than any minimum" but fails a maximum.
        if (reading === null) return g.maxCm === undefined
        return reading >= g.minCm - 1e-9 && (g.maxCm === undefined || reading <= g.maxCm + 1e-9)
      }
      case 'path': {
        // Waypoints must be visited in the listed order (robot centre within tolerance).
        let at = 0
        for (const point of g.points) {
          const hit = run.events.findIndex(
            (e, i) =>
              i >= at &&
              Math.hypot(e.after.position.xCm - point.xCm, e.after.position.yCm - point.yCm) <=
                g.toleranceCm,
          )
          if (hit < 0) return false
          at = hit
        }
        return true
      }
      case 'color-stop-within': {
        // The floor-sensor footprint (not the drawn robot outline) must enter the zone first,
        // then a stop block must run within the allowed number of ticks.
        const entered = run.events.findIndex((e) => e.sensor.surfaceColor === g.color)
        if (entered < 0) return false
        const t0 = run.events[entered]!.tick
        const stop = run.events.findIndex((e) => e.kind === 'stop')
        return stop >= entered && run.events[stop]!.tick - t0 <= g.ticks
      }
    }
  })
  return {
    passed: !run.error && !run.robot.collision && outcomes.every(Boolean),
    facts: outcomes.map((ok, i) => `Goal ${i + 1} (${goals[i]!.kind}): ${ok ? 'met' : 'not met'}`),
  }
}

export function describeGoal(goal: Goal): string {
  switch (goal.kind) {
    case 'branch':
      return `Block ${goal.nodeId} must select the ${goal.expected ? 'then' : 'else'} branch.`
    case 'distance':
      return `Finish at least ${goal.minCm} cm from the starting point.`
    case 'reach':
      return `Reach (${goal.position.xCm}, ${goal.position.yCm}) cm within ${goal.toleranceCm} cm.`
    case 'stopped':
      return 'Finish with an explicit stop instruction.'
    case 'event':
      return `Execute ${goal.nodeId ? `block ${goal.nodeId}` : `a ${goal.eventKind} instruction`}${goal.count === undefined ? ' at least once' : ` exactly ${goal.count} time${goal.count === 1 ? '' : 's'}`}.`
    case 'color-stop':
      return `Issue a stop instruction while the floor sensor reads ${goal.color}.`
    case 'heading':
      return `Finish facing ${goal.headingDeg}° within ${goal.toleranceDeg}°.`
    case 'programmed-stop':
      return 'End with a stop block, not by bumping into something.'
    case 'final-distance':
      return goal.maxCm === undefined
        ? `Finish with the wall at least ${goal.minCm} cm away.`
        : `Finish with the wall between ${goal.minCm} and ${goal.maxCm} cm away.`
    case 'path':
      return `Pass through ${goal.points.map((p) => `(${p.xCm}, ${p.yCm})`).join(' → ')} in order, within ${goal.toleranceCm} cm.`
    case 'color-stop-within':
      return `Run a stop block within ${goal.ticks} tick${goal.ticks === 1 ? '' : 's'} of the floor sensor first reading ${goal.color}.`
  }
}
