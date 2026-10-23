import type { Goal, World } from '../domain/types'
import type { RunResult } from '../interpreter/interpreter'
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
  }
}
