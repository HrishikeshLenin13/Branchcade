import * as Blockly from 'blockly/core'
import './block-definitions'
import type { Expression, Statement, Program } from '../domain/types'
import { validateProgram } from './validate'
const palette = {
  movement: 40,
  sensor: 190,
  logic: 210,
  loops: 160,
  variable: 270,
  functions: 290,
  debug: 20,
}
if (!Blockly.Blocks['bc_set'])
  Blockly.common.defineBlocksWithJsonArray([
    {
      type: 'bc_set',
      message0: 'set %1 to %2',
      args0: [
        { type: 'field_input', name: 'NAME', text: 'distanceLimit' },
        { type: 'input_value', name: 'VALUE' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: palette.variable,
      tooltip: 'Store a value. Later variable reads use the latest assigned value.',
    },
    {
      type: 'bc_variable',
      message0: '%1 variable %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'TYPE',
          options: [
            ['number', 'number'],
            ['boolean', 'boolean'],
            ['color', 'color'],
          ],
        },
        { type: 'field_input', name: 'NAME', text: 'distanceLimit' },
      ],
      output: null,
      colour: palette.variable,
    },
    {
      type: 'bc_function',
      message0: 'define helper %1 %2 instructions %3',
      args0: [
        { type: 'field_input', name: 'NAME', text: 'goCorner' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'BODY' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: palette.functions,
      tooltip: 'A definition does not execute. Add a call helper instruction to run it.',
    },
    {
      type: 'bc_call',
      message0: 'call helper %1',
      args0: [{ type: 'field_input', name: 'NAME', text: 'goCorner' }],
      previousStatement: null,
      nextStatement: null,
      colour: palette.functions,
    },
    {
      type: 'bc_inspect',
      message0: 'inspect %1',
      args0: [{ type: 'input_value', name: 'VALUE' }],
      previousStatement: null,
      nextStatement: null,
      colour: palette.debug,
      tooltip: 'Record an expression value in the execution timeline without changing the robot.',
    },
    {
      type: 'bc_color_value',
      message0: 'color %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'COLOR',
          options: ['white', 'black', 'red', 'blue', 'green', 'yellow'].map((value) => [
            value,
            value,
          ]),
        },
      ],
      output: 'String',
      colour: palette.sensor,
    },
  ])
export const FULL_TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    ['Movement', palette.movement, ['bc_move', 'bc_turn', 'bc_stop', 'bc_wait']],
    ['Sensors', palette.sensor, ['bc_distance', 'bc_color', 'bc_color_value', 'bc_detected']],
    [
      'Logic',
      palette.logic,
      [
        'controls_if',
        'logic_compare',
        'logic_operation',
        'logic_boolean',
        'logic_negate',
        'math_number',
        'math_arithmetic',
      ],
    ],
    ['Loops', palette.loops, ['controls_repeat_ext', 'controls_whileUntil']],
    ['Variables', palette.variable, ['bc_set', 'bc_variable']],
    ['Functions', palette.functions, ['bc_function', 'bc_call']],
    ['Debug', palette.debug, ['bc_inspect']],
  ].map(([name, colour, blocks]) => ({
    kind: 'category',
    name,
    colour,
    contents: (blocks as string[]).map((type) => ({ kind: 'block', type })),
  })),
}

type BlockData = {
  type: string
  id: string
  fields?: Record<string, unknown>
  inputs?: Record<string, { block: BlockData }>
  extraState?: Record<string, unknown>
  next?: { block: BlockData }
  x?: number
  y?: number
}
const input = (block: BlockData) => ({ block })
function expressionBlock(expression: Expression): BlockData {
  const base = { id: expression.nodeId }
  switch (expression.kind) {
    case 'literal':
      return expression.type === 'number'
        ? { ...base, type: 'math_number', fields: { NUM: expression.value } }
        : expression.type === 'boolean'
          ? {
              ...base,
              type: 'logic_boolean',
              fields: { BOOL: expression.value ? 'TRUE' : 'FALSE' },
            }
          : { ...base, type: 'bc_color_value', fields: { COLOR: expression.value } }
    case 'sensor':
      return { ...base, type: expression.sensor === 'distance' ? 'bc_distance' : 'bc_color' }
    case 'variable':
      return {
        ...base,
        type: 'bc_variable',
        fields: { NAME: expression.name, TYPE: expression.type },
      }
    case 'compare':
      return {
        ...base,
        type: 'logic_compare',
        fields: {
          OP: { '<': 'LT', '<=': 'LTE', '>': 'GT', '>=': 'GTE', '==': 'EQ', '!=': 'NEQ' }[
            expression.op
          ],
        },
        inputs: {
          A: input(expressionBlock(expression.left)),
          B: input(expressionBlock(expression.right)),
        },
      }
    case 'boolean':
      return {
        ...base,
        type: 'logic_operation',
        fields: { OP: expression.op === 'and' ? 'AND' : 'OR' },
        inputs: {
          A: input(expressionBlock(expression.left)),
          B: input(expressionBlock(expression.right)),
        },
      }
    case 'not':
      return {
        ...base,
        type: 'logic_negate',
        inputs: { BOOL: input(expressionBlock(expression.operand)) },
      }
    case 'detected':
      return {
        ...base,
        type: 'bc_detected',
        inputs: { VALUE: input(expressionBlock(expression.operand)) },
      }
    case 'arithmetic':
      return {
        ...base,
        type: 'math_arithmetic',
        fields: { OP: { '+': 'ADD', '-': 'MINUS', '*': 'MULTIPLY', '/': 'DIVIDE' }[expression.op] },
        inputs: {
          A: input(expressionBlock(expression.left)),
          B: input(expressionBlock(expression.right)),
        },
      }
  }
}
function statementBlock(statement: Statement): BlockData {
  const base = { id: statement.nodeId }
  const bodyInput = (body: Statement[]) => {
    const chain = statementChain(body)
    return chain ? input(chain) : undefined
  }
  switch (statement.kind) {
    case 'move':
    case 'turn':
    case 'wait': {
      const expression =
        statement.kind === 'move'
          ? statement.distance
          : statement.kind === 'turn'
            ? statement.angle
            : statement.durationMs
      // Standard compact movement blocks use literals. Expression variants preserve all valid ASTs.
      const field =
        statement.kind === 'move' ? 'DISTANCE' : statement.kind === 'turn' ? 'ANGLE' : 'MS'
      if (expression.kind === 'literal' && expression.type === 'number')
        return { ...base, type: `bc_${statement.kind}`, fields: { [field]: expression.value } }
      const type = `bc_${statement.kind}_expression`
      if (!Blockly.Blocks[type])
        Blockly.common.defineBlocksWithJsonArray([
          {
            type,
            message0: `${statement.kind} %1 ${statement.kind === 'move' ? 'cm' : statement.kind === 'turn' ? 'degrees' : 'ms'}`,
            args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }],
            previousStatement: null,
            nextStatement: null,
            colour: palette.movement,
          },
        ])
      return { ...base, type, inputs: { VALUE: input(expressionBlock(expression)) } }
    }
    case 'stop':
      return { ...base, type: 'bc_stop' }
    case 'if':
      return {
        ...base,
        type: 'controls_if',
        extraState: { hasElse: true },
        inputs: Object.fromEntries(
          Object.entries({
            IF0: input(expressionBlock(statement.condition)),
            DO0: bodyInput(statement.then),
            ELSE: bodyInput(statement.else),
          }).filter(([, value]) => value),
        ) as BlockData['inputs'],
      }
    case 'repeat':
      return {
        ...base,
        type: 'controls_repeat_ext',
        inputs: {
          TIMES: input(expressionBlock(statement.count)),
          ...(statement.body.length ? { DO: bodyInput(statement.body)! } : {}),
        },
      }
    case 'while':
      return {
        ...base,
        type: 'controls_whileUntil',
        fields: { MODE: 'WHILE' },
        inputs: {
          BOOL: input(expressionBlock(statement.condition)),
          ...(statement.body.length ? { DO: bodyInput(statement.body)! } : {}),
        },
      }
    case 'set':
      return {
        ...base,
        type: 'bc_set',
        fields: { NAME: statement.name },
        inputs: { VALUE: input(expressionBlock(statement.value)) },
      }
    case 'function':
      return {
        ...base,
        type: 'bc_function',
        fields: { NAME: statement.name },
        inputs: statement.body.length ? { BODY: bodyInput(statement.body)! } : {},
      }
    case 'call':
      return { ...base, type: 'bc_call', fields: { NAME: statement.name } }
    case 'inspect':
      return {
        ...base,
        type: 'bc_inspect',
        inputs: { VALUE: input(expressionBlock(statement.expression)) },
      }
  }
}
function statementChain(body: Statement[]): BlockData | undefined {
  const [first, ...rest] = body
  if (!first) return undefined
  const block = statementBlock(first),
    next = statementChain(rest)
  return next ? { ...block, next: input(next) } : block
}
export function programWorkspace(program: Program) {
  const first = statementChain(program.body)
  if (first) {
    first.x = 24
    first.y = 24
  }
  return { blocks: { languageVersion: 0, blocks: first ? [first] : [] } }
}
const safeId = (id: string) =>
  /^[\w.-]+$/.test(id)
    ? id
    : `b-${Array.from(id)
        .map((char) => char.charCodeAt(0).toString(16))
        .join('')}`
export function editableProgram(workspace: Blockly.Workspace): Program {
  const need = (block: Blockly.Block, name: string) => {
    const child = block.getInputTargetBlock(name)
    if (!child) throw new Error(`Connect ${name} at ${safeId(block.id)}`)
    return child
  }
  const literal = (block: Blockly.Block, field: string, suffix: string): Expression => ({
    nodeId: `${safeId(block.id)}-${suffix}`,
    type: 'number',
    kind: 'literal',
    value: Number(block.getFieldValue(field)),
  })
  const expression = (block: Blockly.Block): Expression => {
    const nodeId = safeId(block.id)
    switch (block.type) {
      case 'math_number':
        return {
          nodeId,
          type: 'number',
          kind: 'literal',
          value: Number(block.getFieldValue('NUM')),
        }
      case 'logic_boolean':
        return {
          nodeId,
          type: 'boolean',
          kind: 'literal',
          value: block.getFieldValue('BOOL') === 'TRUE',
        }
      case 'bc_color_value':
        return {
          nodeId,
          type: 'color',
          kind: 'literal',
          value: block.getFieldValue('COLOR') as 'white',
        }
      case 'bc_distance':
      case 'bc_color':
        return {
          nodeId,
          type: block.type === 'bc_distance' ? 'number' : 'color',
          kind: 'sensor',
          sensor: block.type === 'bc_distance' ? 'distance' : 'color',
        }
      case 'bc_variable':
        return {
          nodeId,
          type: block.getFieldValue('TYPE') as 'number' | 'color' | 'boolean',
          kind: 'variable',
          name: String(block.getFieldValue('NAME')),
        }
      case 'logic_compare': {
        const op = ({ LT: '<', LTE: '<=', GT: '>', GTE: '>=', EQ: '==', NEQ: '!=' } as const)[
          String(block.getFieldValue('OP')) as 'LT'
        ]
        return {
          nodeId,
          type: 'boolean',
          kind: 'compare',
          op,
          left: expression(need(block, 'A')),
          right: expression(need(block, 'B')),
        }
      }
      case 'logic_operation':
        return {
          nodeId,
          type: 'boolean',
          kind: 'boolean',
          op: block.getFieldValue('OP') === 'AND' ? 'and' : 'or',
          left: expression(need(block, 'A')),
          right: expression(need(block, 'B')),
        }
      case 'logic_negate':
        return { nodeId, type: 'boolean', kind: 'not', operand: expression(need(block, 'BOOL')) }
      case 'bc_detected':
        return {
          nodeId,
          type: 'boolean',
          kind: 'detected',
          operand: expression(need(block, 'VALUE')),
        }
      case 'math_arithmetic': {
        const op = ({ ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/' } as const)[
          String(block.getFieldValue('OP')) as 'ADD'
        ]
        if (!op) throw new Error('Power is unsupported. Choose +, −, × or ÷.')
        return {
          nodeId,
          type: 'number',
          kind: 'arithmetic',
          op,
          left: expression(need(block, 'A')),
          right: expression(need(block, 'B')),
        }
      }
      default:
        throw new Error(`Unsupported expression ${block.type} on ${block.id}`)
    }
  }
  const chain = (start: Blockly.Block | null): Statement[] => {
    const body: Statement[] = []
    for (let block = start; block; block = block.getNextBlock()) {
      if (!block.isEnabled())
        throw new Error(`Block ${block.id} is disabled. Remove it or enable it before running.`)
      const nodeId = safeId(block.id)
      switch (block.type) {
        case 'bc_move':
          body.push({ nodeId, kind: 'move', distance: literal(block, 'DISTANCE', 'distance') })
          break
        case 'bc_turn':
          body.push({ nodeId, kind: 'turn', angle: literal(block, 'ANGLE', 'angle') })
          break
        case 'bc_wait':
          body.push({ nodeId, kind: 'wait', durationMs: literal(block, 'MS', 'duration') })
          break
        case 'bc_move_expression':
          body.push({ nodeId, kind: 'move', distance: expression(need(block, 'VALUE')) })
          break
        case 'bc_turn_expression':
          body.push({ nodeId, kind: 'turn', angle: expression(need(block, 'VALUE')) })
          break
        case 'bc_wait_expression':
          body.push({ nodeId, kind: 'wait', durationMs: expression(need(block, 'VALUE')) })
          break
        case 'bc_stop':
          body.push({ nodeId, kind: 'stop' })
          break
        case 'controls_if':
          if (block.getInput('IF1'))
            throw new Error(`Use nested if blocks instead of else-if at ${block.id}`)
          body.push({
            nodeId,
            kind: 'if',
            condition: expression(need(block, 'IF0')),
            then: chain(block.getInputTargetBlock('DO0')),
            else: chain(block.getInputTargetBlock('ELSE')),
          })
          break
        case 'controls_repeat_ext':
          body.push({
            nodeId,
            kind: 'repeat',
            count: expression(need(block, 'TIMES')),
            body: chain(block.getInputTargetBlock('DO')),
          })
          break
        case 'controls_whileUntil': {
          const condition = expression(need(block, 'BOOL'))
          body.push({
            nodeId,
            kind: 'while',
            condition:
              block.getFieldValue('MODE') === 'UNTIL'
                ? { nodeId: `${nodeId}-not`, type: 'boolean', kind: 'not', operand: condition }
                : condition,
            body: chain(block.getInputTargetBlock('DO')),
          })
          break
        }
        case 'bc_set':
          body.push({
            nodeId,
            kind: 'set',
            name: String(block.getFieldValue('NAME')),
            value: expression(need(block, 'VALUE')),
          })
          break
        case 'bc_variable':
          throw new Error(`Connect the variable ${block.id} to an instruction.`)
        case 'bc_function':
          body.push({
            nodeId,
            kind: 'function',
            name: String(block.getFieldValue('NAME')),
            body: chain(block.getInputTargetBlock('BODY')),
          })
          break
        case 'bc_call':
          body.push({ nodeId, kind: 'call', name: String(block.getFieldValue('NAME')) })
          break
        case 'bc_inspect':
          body.push({ nodeId, kind: 'inspect', expression: expression(need(block, 'VALUE')) })
          break
        default:
          throw new Error(`Connect or remove the disconnected ${block.type} block ${block.id}.`)
      }
    }
    return body
  }
  const top = workspace.getTopBlocks(true)
  if (top.length === 0) throw new Error('Add a connected instruction before applying.')
  if (top.length > 1)
    throw new Error(
      'Connect all blocks into one program before applying. Disconnected blocks never execute silently.',
    )
  return validateProgram({ schemaVersion: 1, id: 'blockly-program', body: chain(top[0] ?? null) })
}

/** Blockly permits punctuation in raw IDs; the AST uses a stable reversible-safe key.
 * Resolve both exact expression IDs and synthetic literal-field child IDs to the real block. */
export function blockForNode(workspace: Blockly.Workspace, nodeId: string) {
  const blocks = workspace.getAllBlocks(false)
  return (
    blocks.find((block) => block.id === nodeId || safeId(block.id) === nodeId) ??
    blocks
      .filter((block) => nodeId.startsWith(`${safeId(block.id)}-`))
      .sort((a, b) => b.id.length - a.id.length)[0] ??
    null
  )
}
