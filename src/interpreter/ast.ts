/** Serializable data only. Generated previews are never executable input. */
export type Value =
  number | boolean | 'white' | 'black' | 'red' | 'blue' | 'green' | 'yellow' | null
export type ValueType = 'number' | 'boolean' | 'color'
type Node = { nodeId: string; type: ValueType }
export type Expression =
  | (Node & { kind: 'literal'; value: Exclude<Value, null> })
  | (Node & { kind: 'sensor'; sensor: 'distance' | 'color' })
  | (Node & { kind: 'variable'; name: string })
  | (Node & { kind: 'arithmetic'; op: '+' | '-' | '*' | '/'; left: Expression; right: Expression })
  | (Node & {
      kind: 'compare'
      op: '<' | '<=' | '>' | '>=' | '==' | '!='
      left: Expression
      right: Expression
    })
  | (Node & { kind: 'boolean'; op: 'and' | 'or'; left: Expression; right: Expression })
  | (Node & { kind: 'not'; operand: Expression })
export type Statement = { nodeId: string } & (
  | { kind: 'move'; distance: Expression }
  | { kind: 'turn'; angle: Expression }
  | { kind: 'stop' }
  | { kind: 'wait'; durationMs: Expression }
  | { kind: 'if'; condition: Expression; then: Statement[]; else: Statement[] }
  | { kind: 'repeat'; count: Expression; body: Statement[] }
  | { kind: 'while'; condition: Expression; body: Statement[] }
  | { kind: 'set'; name: string; value: Expression }
  | { kind: 'function'; name: string; body: Statement[] }
  | { kind: 'call'; name: string }
  | { kind: 'inspect'; expression: Expression }
)
export type Program = { schemaVersion: 1; id: string; body: Statement[] }
