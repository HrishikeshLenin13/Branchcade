import * as Blockly from 'blockly/core'
import * as En from 'blockly/msg/en'
import 'blockly/blocks'
const messages: Record<string, string> = {}
for (const [key, value] of Object.entries(En)) if (typeof value === 'string') messages[key] = value
Blockly.setLocale(messages)
if (!Blockly.Blocks['bc_move'])
  Blockly.common.defineBlocksWithJsonArray([
    {
      type: 'bc_move',
      message0: 'move %1 cm',
      args0: [{ type: 'field_number', name: 'DISTANCE', value: 10, min: -300, max: 300 }],
      previousStatement: null,
      nextStatement: null,
      colour: 40,
      tooltip: 'Move by an actual distance in centimeters',
    },
    {
      type: 'bc_turn',
      message0: 'turn %1 degrees',
      args0: [{ type: 'field_number', name: 'ANGLE', value: 90, min: -360, max: 360 }],
      previousStatement: null,
      nextStatement: null,
      colour: 40,
    },
    {
      type: 'bc_wait',
      message0: 'wait %1 ms',
      args0: [{ type: 'field_number', name: 'MS', value: 500, min: 50, max: 10000, precision: 50 }],
      previousStatement: null,
      nextStatement: null,
      colour: 40,
    },
    { type: 'bc_stop', message0: 'stop', previousStatement: null, nextStatement: null, colour: 40 },
    { type: 'bc_distance', message0: 'distance (cm)', output: 'Number', colour: 190 },
    { type: 'bc_color', message0: 'surface color', output: 'String', colour: 190 },
    {
      type: 'bc_detected',
      message0: 'is detected %1',
      args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }],
      output: 'Boolean',
      colour: 190,
      tooltip: 'False for null (no distance return). Use AND to guard a distance comparison.',
    },
  ])
export const TOOLBOX = {
  kind: 'flyoutToolbox',
  contents: [
    'controls_if',
    'logic_compare',
    'math_number',
    'bc_distance',
    'bc_color',
    'bc_move',
    'bc_turn',
    'bc_stop',
    'bc_wait',
    'controls_repeat_ext',
    'controls_whileUntil',
    'logic_operation',
    'logic_boolean',
    'logic_negate',
    'math_arithmetic',
  ].map((type) => ({ kind: 'block', type })),
}
export function starterWorkspace(threshold = 20) {
  return {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'controls_if',
          id: 'decision',
          x: 24,
          y: 24,
          extraState: { hasElse: true },
          inputs: {
            IF0: {
              block: {
                type: 'logic_compare',
                id: 'condition',
                fields: { OP: 'LT' },
                inputs: {
                  A: { block: { type: 'bc_distance', id: 'sensor' } },
                  B: {
                    block: { type: 'math_number', id: 'threshold', fields: { NUM: threshold } },
                  },
                },
              },
            },
            DO0: { block: { type: 'bc_stop', id: 'stop-close' } },
            ELSE: {
              block: {
                type: 'bc_move',
                id: 'move-clear',
                fields: { DISTANCE: 10 },
                next: { block: { type: 'bc_stop', id: 'stop-done' } },
              },
            },
          },
        },
      ],
    },
  }
}
