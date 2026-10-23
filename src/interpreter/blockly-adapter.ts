import type * as Blockly from 'blockly/core'
import type { Expression, Statement, Program } from './ast'
import { validateProgram } from './validate'
const nid = (id: string) =>
  `b-${Array.from(id)
    .map((c) => c.charCodeAt(0).toString(16))
    .join('')}`
export function workspaceToProgram(workspace: Blockly.Workspace): Program {
  const need = (b: Blockly.Block, input: string) => {
    const child = b.getInputTargetBlock(input)
    if (!child) throw new Error(`Connect ${input} on block ${b.id}`)
    return child
  }
  const literal = (b: Blockly.Block, name: string, suffix: string): Expression => ({
    nodeId: `${nid(b.id)}-${suffix}`,
    kind: 'literal',
    type: 'number',
    value: Number(b.getFieldValue(name)),
  })
  const expression = (b: Blockly.Block): Expression => {
    const nodeId = nid(b.id)
    switch (b.type) {
      case 'math_number':
        return { nodeId, kind: 'literal', type: 'number', value: Number(b.getFieldValue('NUM')) }
      case 'logic_boolean':
        return {
          nodeId,
          kind: 'literal',
          type: 'boolean',
          value: b.getFieldValue('BOOL') === 'TRUE',
        }
      case 'bc_distance':
        return { nodeId, kind: 'sensor', type: 'number', sensor: 'distance' }
      case 'bc_color':
        return { nodeId, kind: 'sensor', type: 'color', sensor: 'color' }
      case 'logic_compare': {
        const ops: Record<string, '<' | '<=' | '>' | '>=' | '==' | '!='> = {
          LT: '<',
          LTE: '<=',
          GT: '>',
          GTE: '>=',
          EQ: '==',
          NEQ: '!=',
        }
        const op = ops[String(b.getFieldValue('OP'))]
        if (!op) throw new Error(`Invalid comparator on ${b.id}`)
        return {
          nodeId,
          kind: 'compare',
          type: 'boolean',
          op,
          left: expression(need(b, 'A')),
          right: expression(need(b, 'B')),
        }
      }
      case 'logic_operation':
        return {
          nodeId,
          kind: 'boolean',
          type: 'boolean',
          op: b.getFieldValue('OP') === 'AND' ? 'and' : 'or',
          left: expression(need(b, 'A')),
          right: expression(need(b, 'B')),
        }
      case 'logic_negate':
        return { nodeId, kind: 'not', type: 'boolean', operand: expression(need(b, 'BOOL')) }
      case 'math_arithmetic': {
        const ops: Record<string, '+' | '-' | '*' | '/'> = {
          ADD: '+',
          MINUS: '-',
          MULTIPLY: '*',
          DIVIDE: '/',
        }
        const op = ops[String(b.getFieldValue('OP'))]
        if (!op) throw new Error('Power is not supported; choose +, -, × or ÷')
        return {
          nodeId,
          kind: 'arithmetic',
          type: 'number',
          op,
          left: expression(need(b, 'A')),
          right: expression(need(b, 'B')),
        }
      }
      default:
        throw new Error(`Unsupported expression ${b.type} on ${b.id}`)
    }
  }
  const chain = (start: Blockly.Block | null): Statement[] => {
    const body: Statement[] = []
    for (let b = start; b; b = b.getNextBlock()) {
      if (!b.isEnabled()) continue
      const nodeId = nid(b.id)
      switch (b.type) {
        case 'bc_move':
          body.push({ nodeId, kind: 'move', distance: literal(b, 'DISTANCE', 'distance') })
          break
        case 'bc_turn':
          body.push({ nodeId, kind: 'turn', angle: literal(b, 'ANGLE', 'angle') })
          break
        case 'bc_wait':
          body.push({ nodeId, kind: 'wait', durationMs: literal(b, 'MS', 'duration') })
          break
        case 'bc_stop':
          body.push({ nodeId, kind: 'stop' })
          break
        case 'controls_if': {
          if (b.getInput('IF1'))
            throw new Error('Use nested if blocks rather than else-if in this editor')
          body.push({
            nodeId,
            kind: 'if',
            condition: expression(need(b, 'IF0')),
            then: chain(b.getInputTargetBlock('DO0')),
            else: chain(b.getInputTargetBlock('ELSE')),
          })
          break
        }
        case 'controls_repeat_ext':
          body.push({
            nodeId,
            kind: 'repeat',
            count: expression(need(b, 'TIMES')),
            body: chain(b.getInputTargetBlock('DO')),
          })
          break
        case 'controls_whileUntil': {
          const condition = expression(need(b, 'BOOL'))
          body.push({
            nodeId,
            kind: 'while',
            condition:
              b.getFieldValue('MODE') === 'UNTIL'
                ? { nodeId: `${nodeId}-not`, kind: 'not', type: 'boolean', operand: condition }
                : condition,
            body: chain(b.getInputTargetBlock('DO')),
          })
          break
        }
        default:
          throw new Error(`Unsupported statement ${b.type} on ${b.id}`)
      }
    }
    return body
  }
  const top = workspace.getTopBlocks(true).filter((b) => b.isEnabled())
  if (top.length === 0) throw new Error('Add at least one connected instruction before applying')
  if (top.length > 1) throw new Error('Connect your blocks into one program before running')
  const program = { schemaVersion: 1 as const, id: 'blockly-program', body: chain(top[0] ?? null) }
  return validateProgram(program)
}
