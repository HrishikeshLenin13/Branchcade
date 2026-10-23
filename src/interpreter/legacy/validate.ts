import { ProgramSchema } from '../../domain/schemas'
import { assertBounded } from '../../domain/invariants'
import { COLORS } from '../../domain/constants'
import { LEGACY_LIMITS as LIMITS } from './limits'
import type { Expression, Statement } from '../ast'
export function validateProgram(input: unknown) {
  assertBounded(input)
  const program = ProgramSchema.parse(input),
    ids = new Set<string>()
  let count = 0
  const register = (id: string) => {
    if (ids.has(id)) throw new Error(`Duplicate nodeId: ${id}`)
    ids.add(id)
    if (++count > LIMITS.nodes) throw new Error('Program too large')
  }
  const expr = (e: Expression): void => {
    register(e.nodeId)
    if (
      e.kind === 'literal' &&
      ((e.type === 'number' && typeof e.value !== 'number') ||
        (e.type === 'boolean' && typeof e.value !== 'boolean') ||
        (e.type === 'color' && !(COLORS as readonly unknown[]).includes(e.value)))
    )
      throw new Error(`Literal type mismatch at ${e.nodeId}`)
    if (e.kind === 'sensor' && e.type !== (e.sensor === 'distance' ? 'number' : 'color'))
      throw new Error(`Sensor type mismatch at ${e.nodeId}`)
    if ('left' in e) {
      expr(e.left)
      expr(e.right)
    }
    if (
      e.kind === 'arithmetic' &&
      (e.type !== 'number' || e.left.type !== 'number' || e.right.type !== 'number')
    )
      throw new Error(`Arithmetic needs numbers at ${e.nodeId}`)
    if (
      e.kind === 'compare' &&
      (e.type !== 'boolean' ||
        e.left.type !== e.right.type ||
        (!['==', '!='].includes(e.op) && e.left.type !== 'number'))
    )
      throw new Error(`Comparison type mismatch at ${e.nodeId}`)
    if (
      e.kind === 'boolean' &&
      (e.type !== 'boolean' || e.left.type !== 'boolean' || e.right.type !== 'boolean')
    )
      throw new Error(`Logic needs booleans at ${e.nodeId}`)
    if (e.kind === 'not') {
      expr(e.operand)
      if (e.type !== 'boolean' || e.operand.type !== 'boolean')
        throw new Error(`Not needs boolean at ${e.nodeId}`)
    }
    if (e.kind === 'detected') throw new Error('Is detected requires engine version 2')
  }
  const need = (e: Expression, type: string) => {
    expr(e)
    if (e.type !== type) throw new Error(`Expected ${type} at ${e.nodeId}`)
  }
  const walk = (ss: Statement[]) => {
    for (const s of ss) {
      register(s.nodeId)
      switch (s.kind) {
        case 'move':
          need(s.distance, 'number')
          break
        case 'turn':
          need(s.angle, 'number')
          break
        case 'wait':
          need(s.durationMs, 'number')
          break
        case 'if':
          need(s.condition, 'boolean')
          walk(s.then)
          walk(s.else)
          break
        case 'repeat':
          need(s.count, 'number')
          walk(s.body)
          break
        case 'while':
          need(s.condition, 'boolean')
          walk(s.body)
          break
        case 'function':
          walk(s.body)
          break
        case 'set':
          expr(s.value)
          break
        case 'inspect':
          expr(s.expression)
          break
        default:
          break
      }
    }
  }
  walk(program.body)
  return program
}
