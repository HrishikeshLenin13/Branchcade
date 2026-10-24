import type { Program, World } from '../src/domain/types'
import { makeDefaultWorld } from '../src/engine/world'
export function obstacleHeavyWorld(): World {
  return {
    ...makeDefaultWorld(),
    id: 'ij-100-obstacles',
    widthCm: 2000,
    heightCm: 2000,
    obstacles: Array.from({ length: 100 }, (_, index) => ({
      id: `stress-obstacle-${index}`,
      kind: 'rectangle' as const,
      position: { xCm: 200 + (index % 10) * 150, yCm: 200 + Math.floor(index / 10) * 150 },
      widthCm: 20,
      heightCm: 20,
      solid: true,
      material: 'foam' as const,
    })),
  }
}
export function longTraceProgram(iterations = 600): Program {
  return {
    schemaVersion: 1,
    id: 'ij-long-trace',
    body: [
      {
        nodeId: 'samples',
        kind: 'repeat',
        count: {
          nodeId: 'sample-count',
          kind: 'literal',
          type: 'number',
          value: Math.min(100, iterations),
        },
        body: [
          {
            nodeId: 'inner',
            kind: 'repeat',
            count: {
              nodeId: 'inner-count',
              kind: 'literal',
              type: 'number',
              value: Math.max(1, Math.floor(iterations / 100)),
            },
            body: [
              {
                nodeId: 'sample',
                kind: 'inspect',
                expression: { nodeId: 'sample-value', kind: 'literal', type: 'number', value: 42 },
              },
            ],
          },
        ],
      },
    ],
  }
}
export function largeEditorProgram(statements = 180): Program {
  return {
    schemaVersion: 1,
    id: 'ij-large-editor',
    body: Array.from({ length: statements }, (_, index) => ({
      nodeId: `inspect-${index}`,
      kind: 'inspect' as const,
      expression: {
        nodeId: `value-${index}`,
        kind: 'literal' as const,
        type: 'number' as const,
        value: index,
      },
    })),
  }
}
export function nestedProgram(seed: number): Program {
  // Fixed seeded data variations exercise nested repeat/if/set/call without random flaky tests.
  const count = 1 + (seed % 5),
    initial = seed % 11,
    step = 1 + (seed % 3)
  return {
    schemaVersion: 1,
    id: `ij-nested-${seed}`,
    body: [
      {
        nodeId: 'init',
        kind: 'set',
        name: 'samples',
        value: { nodeId: 'initial', kind: 'literal', type: 'number', value: initial },
      },
      {
        nodeId: 'helper',
        kind: 'function',
        name: 'record',
        body: [
          {
            nodeId: 'increment',
            kind: 'set',
            name: 'samples',
            value: {
              nodeId: 'sum',
              kind: 'arithmetic',
              type: 'number',
              op: '+',
              left: { nodeId: 'old', kind: 'variable', type: 'number', name: 'samples' },
              right: { nodeId: 'step', kind: 'literal', type: 'number', value: step },
            },
          },
        ],
      },
      {
        nodeId: 'outer',
        kind: 'repeat',
        count: { nodeId: 'count', kind: 'literal', type: 'number', value: count },
        body: [
          {
            nodeId: 'branch',
            kind: 'if',
            condition: { nodeId: 'known-true', kind: 'literal', type: 'boolean', value: true },
            then: [{ nodeId: 'invoke', kind: 'call', name: 'record' }],
            else: [{ nodeId: 'unreached', kind: 'stop' }],
          },
        ],
      },
      {
        nodeId: 'read-final',
        kind: 'inspect',
        expression: { nodeId: 'final', kind: 'variable', type: 'number', name: 'samples' },
      },
    ],
  }
}
