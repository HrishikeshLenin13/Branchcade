import type { Expression, Program, Statement } from './ast'
export function expressionText(e: Expression): string {
  switch (e.kind) {
    case 'literal':
      return JSON.stringify(e.value)
    case 'sensor':
      return e.sensor === 'distance' ? 'distanceCm' : 'surfaceColor'
    case 'variable':
      return e.name
    case 'not':
      return `!(${expressionText(e.operand)})`
    case 'detected':
      return `isDetected(${expressionText(e.operand)})`
    case 'boolean':
      return `(${expressionText(e.left)} ${e.op === 'and' ? '&&' : '||'} ${expressionText(e.right)})`
    default:
      return `(${expressionText(e.left)} ${e.op} ${expressionText(e.right)})`
  }
}
/** Inert JavaScript-style text, not JavaScript execution. */
export function pseudocode(program: Program): string {
  const block = (body: Statement[], level = 0): string =>
    body
      .map((s) => {
        const p = '  '.repeat(level)
        switch (s.kind) {
          case 'if':
            return `${p}if ${expressionText(s.condition)} {\n${block(s.then, level + 1)}\n${p}} else {\n${block(s.else, level + 1)}\n${p}}`
          case 'move':
            return `${p}move(${expressionText(s.distance)} cm)`
          case 'turn':
            return `${p}turn(${expressionText(s.angle)}°)`
          case 'stop':
            return `${p}stop()`
          case 'wait':
            return `${p}wait(${expressionText(s.durationMs)} ms)`
          case 'set':
            return `${p}${s.name} = ${expressionText(s.value)}`
          case 'call':
            return `${p}${s.name}()`
          case 'function':
            return `${p}function ${s.name} {\n${block(s.body, level + 1)}\n${p}}`
          case 'repeat':
            return `${p}repeat ${expressionText(s.count)} {\n${block(s.body, level + 1)}\n${p}}`
          case 'while':
            return `${p}while ${expressionText(s.condition)} {\n${block(s.body, level + 1)}\n${p}}`
          case 'inspect':
            return `${p}inspect(${expressionText(s.expression)})`
        }
      })
      .join('\n')
  return block(program.body)
}
