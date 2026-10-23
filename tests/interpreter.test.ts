import { describe, it, expect } from 'vitest'
import type { Program, Expression, Statement } from '../src/interpreter/ast'
import { execute } from '../src/interpreter/interpreter'
import { makeWorld } from '../src/engine/world'
import { thresholdProgram } from '../src/missions/catalog'
import { pseudocode } from '../src/interpreter/pseudocode'
import { actualAction } from '../src/interpreter/trace'
let serial = 0
const num = (value: number): Expression => ({
  nodeId: `n${++serial}`,
  kind: 'literal',
  type: 'number',
  value,
})
const bool = (value: boolean): Expression => ({
  nodeId: `b${++serial}`,
  kind: 'literal',
  type: 'boolean',
  value,
})
const run = (body: Statement[]) => execute(makeWorld(), { schemaVersion: 1, id: 'test', body })
const move = (): Statement => ({ nodeId: `m${++serial}`, kind: 'move', distance: num(1) })
describe('bounded typed interpretation', () => {
  it.each([
    ['<', false],
    ['<=', false],
    ['>', true],
    ['>=', true],
    ['==', false],
    ['!=', true],
  ] as const)('evaluates comparator %s', (op, result) => {
    const p = thresholdProgram()
    const s = p.body[0]!
    if (s.kind === 'if' && s.condition.kind === 'compare') s.condition.op = op
    expect(
      execute(makeWorld(), p).events.find((e) => e.kind === 'compare')!.evaluation?.result,
    ).toBe(result)
  })
  it('uses strict comparison at equality', () => {
    expect(
      execute(makeWorld(20), thresholdProgram()).events.find((e) => e.kind === 'compare')!.facts[0],
    ).toBe('20 < 20 is false')
  })
  it('null sensor comparisons produce a learner-readable block error, never zero/false', () => {
    const w = makeWorld()
    w.obstacles = []
    const r = execute(w, thresholdProgram())
    expect(r.error).toContain('No distance return')
    expect(r.errorNodeId).toBe('condition')
    expect(r.events.some((e) => e.kind === 'branch')).toBe(false)
  })
  it.each([1, 3, 5])('repeats exactly %s times', (count) => {
    const r = run([{ nodeId: 'repeat', kind: 'repeat', count: num(count), body: [move()] }])
    expect(r.error).toBeNull()
    expect(r.robot.position.xCm).toBe(40 + count)
  })
  it('while false executes zero iterations; while true is bounded', () => {
    expect(
      run([{ nodeId: 'w', kind: 'while', condition: bool(false), body: [move()] }]).events.filter(
        (e) => e.kind === 'move',
      ),
    ).toHaveLength(0)
    expect(run([{ nodeId: 'w', kind: 'while', condition: bool(true), body: [] }]).error).toContain(
      'budget',
    )
  })
  it('stops later statements and accepts cancellation', () => {
    expect(run([{ nodeId: 'stop', kind: 'stop' }, move()]).robot.position.xCm).toBe(40)
    const c = new AbortController()
    c.abort()
    expect(execute(makeWorld(), thresholdProgram(), c.signal).error).toBe('Run cancelled')
  })
  it('declarations are not invocations and call depth is bounded', () => {
    const body = [move()]
    expect(run([{ nodeId: 'fn', kind: 'function', name: 'go', body }]).robot.position.xCm).toBe(40)
    expect(
      run([
        { nodeId: 'fn', kind: 'function', name: 'go', body },
        { nodeId: 'call', kind: 'call', name: 'go' },
      ]).robot.position.xCm,
    ).toBe(41)
    expect(
      run([
        {
          nodeId: 'fn',
          kind: 'function',
          name: 'loop',
          body: [{ nodeId: 'recursive', kind: 'call', name: 'loop' }],
        },
        { nodeId: 'invoke', kind: 'call', name: 'loop' },
      ]).error,
    ).toContain('depth')
  })
  it('updates variables and prevents safe division by zero', () => {
    const e: Expression = {
      nodeId: 'divide',
      kind: 'arithmetic',
      type: 'number',
      op: '/',
      left: num(1),
      right: num(0),
    }
    expect(run([{ nodeId: 'inspect', kind: 'inspect', expression: e }]).error).toContain(
      'Division by zero',
    )
    const r = run([
      { nodeId: 'set', kind: 'set', name: 'distance', value: num(4) },
      {
        nodeId: 'inspect',
        kind: 'inspect',
        expression: { nodeId: 'get', kind: 'variable', type: 'number', name: 'distance' },
      },
    ])
    expect(r.events.find((e) => e.kind === 'inspect')!.evaluation?.result).toBe(4)
  })
  it.each([
    [true, true, true, true],
    [true, false, false, true],
    [false, true, false, true],
    [false, false, false, false],
  ])('follows boolean truth table %#', (a, b, and, or) => {
    for (const [op, result] of [
      ['and', and],
      ['or', or],
    ] as const) {
      const e: Expression = {
        nodeId: 'logic',
        kind: 'boolean',
        type: 'boolean',
        op,
        left: bool(a!),
        right: bool(b!),
      }
      expect(
        run([{ nodeId: 'inspect', kind: 'inspect', expression: e }]).events[0]!.evaluation?.result,
      ).toBe(result)
    }
  })
  it('turns and waits at fixed steps', () => {
    const r = run([
      { nodeId: 'turn', kind: 'turn', angle: num(90) },
      { nodeId: 'wait', kind: 'wait', durationMs: num(100) },
    ])
    expect(r.robot.headingDeg).toBe(90)
    expect(r.robot.simTimeMs).toBe(1100)
  })
  it('serializes programs and produces inert previews only', () => {
    const p = thresholdProgram()
    const copy = JSON.parse(JSON.stringify(p)) as Program
    expect(execute(makeWorld(), copy)).toEqual(execute(makeWorld(), p))
    expect(pseudocode(p)).toContain('if (distanceCm < 20)')
    expect(actualAction(execute(makeWorld(), p).events)).toBe('move')
  })
})
