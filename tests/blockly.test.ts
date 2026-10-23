import { it, expect } from 'vitest'
import * as Blockly from 'blockly/core'
import { starterWorkspace } from '../src/interpreter/block-definitions'
import { workspaceToProgram } from '../src/interpreter/blockly-adapter'
import { execute } from '../src/interpreter/interpreter'
import { makeWorld } from '../src/engine/world'
import { actualAction } from '../src/interpreter/trace'
it('serializes a real Blockly workspace and converts it to typed, validated AST', () => {
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(starterWorkspace(), ws)
    const ast = workspaceToProgram(ws)
    expect(actualAction(execute(makeWorld(), ast).events)).toBe('move')
    const serialized = Blockly.serialization.workspaces.save(ws)
    ws.clear()
    Blockly.serialization.workspaces.load(serialized, ws)
    expect(workspaceToProgram(ws)).toEqual(ast)
    const block = ws.getBlockById('threshold')!
    block.setFieldValue(40, 'NUM')
    expect(actualAction(execute(makeWorld(), workspaceToProgram(ws)).events)).toBe('stop')
  } finally {
    ws.dispose()
  }
})
it('reports a disconnected input rather than executing arbitrary generated strings', () => {
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(starterWorkspace(), ws)
    ws.getBlockById('condition')!.getInput('A')!.connection!.disconnect()
    expect(() => workspaceToProgram(ws)).toThrow('Connect all blocks')
  } finally {
    ws.dispose()
  }
})
