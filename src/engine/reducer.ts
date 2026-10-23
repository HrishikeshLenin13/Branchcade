import type { RobotState, World } from '../domain/types'
import { advanceRobot, initialRobot } from './robot'
export type EngineAction =
  { type: 'tick' } | { type: 'pause' } | { type: 'resume' } | { type: 'reset' }
export function reduceRobot(state: RobotState, action: EngineAction, world: World): RobotState {
  switch (action.type) {
    case 'tick':
      return advanceRobot(state, world)
    case 'pause':
      return { ...state, status: state.status === 'running' ? 'paused' : state.status }
    case 'resume':
      return { ...state, status: state.status === 'paused' ? 'running' : state.status }
    case 'reset':
      return initialRobot(world)
  }
}
