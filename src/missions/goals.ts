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
    }
  })
  return {
    passed: !run.error && !run.robot.collision && outcomes.every(Boolean),
    facts: outcomes.map((ok, i) => `Goal ${i + 1} (${goals[i]!.kind}): ${ok ? 'met' : 'not met'}`),
  }
}
