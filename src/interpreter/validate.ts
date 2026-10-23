import { ProgramSchema } from '../domain/schemas'
import { assertBounded } from '../domain/invariants'
import { LIMITS, COLORS } from '../domain/constants'
import type { Expression, Statement } from './ast'
function validate(input: unknown) {
  assertBounded(input)
  const program = ProgramSchema.parse(input),
    ids = new Set<string>()
  let count = 0
  const functions = new Set<string>()
  const name = (value: string, nodeId: string) => {
    if (
      !/^[A-Za-z_][A-Za-z0-9_-]{0,31}$/.test(value) ||
      [
        '__proto__',
        'prototype',
        'constructor',
        'this',
        'window',
        'document',
        'eval',
        'Function',
      ].includes(value)
    )
      throw new Error(
        `Use a non-reserved name of 1–32 letters, digits, underscores or hyphens at ${nodeId}`,
      )
  }
  const register = (id: string) => {
    if (ids.has(id)) throw new Error(`Duplicate nodeId: ${id}`)
    ids.add(id)
    if (++count > LIMITS.nodes) throw new Error('Program too large')
  }
  const expr = (e: Expression): void => {
    register(e.nodeId)
    if (e.kind === 'variable') name(e.name, e.nodeId)
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
    if (e.kind === 'detected') {
      expr(e.operand)
      if (e.type !== 'boolean' || e.operand.type !== 'number')
        throw new Error(`Is detected needs a numeric sensor or variable at ${e.nodeId}`)
    }
  }
  const need = (e: Expression, type: string) => {
    expr(e)
    if (e.type !== type) throw new Error(`Expected ${type} at ${e.nodeId}`)
  }
  const walk = (ss: Statement[], top = false) => {
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
          name(s.name, s.nodeId)
          if (!top) throw new Error(`Move function definitions to the top level at ${s.nodeId}`)
          if (functions.has(s.name)) throw new Error(`Duplicate function ${s.name} at ${s.nodeId}`)
          functions.add(s.name)
          walk(s.body)
          break
        case 'set':
          name(s.name, s.nodeId)
          expr(s.value)
          break
        case 'call':
          name(s.name, s.nodeId)
          break
        case 'inspect':
          expr(s.expression)
          break
        default:
          break
      }
    }
  }
  walk(program.body, true)
  return program
}
export function validateProgram(input: unknown) {
  try {
    return validate(input)
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)) {
      const issue = error.issues[0] as { path: (string | number)[]; message: string }
      let current: unknown = input,
        nodeId = 'program'
      for (const key of issue.path) {
        if (current && typeof current === 'object') {
          if ('nodeId' in current && typeof current.nodeId === 'string') nodeId = current.nodeId
          current = (current as Record<string | number, unknown>)[key]
        }
      }
      throw new Error(`${issue.message} at ${nodeId}. Check ${issue.path.at(-1) ?? 'program'}.`)
    }
    throw error
  }
}
