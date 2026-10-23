import { useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly/core'
import { TOOLBOX, starterWorkspace } from '../../interpreter/block-definitions'
import { workspaceToProgram } from '../../interpreter/blockly-adapter'
import type { Program } from '../../domain/types'
import { Button } from '../../components/ui/button'
export default function BlocklyEditor({ onProgram }: { onProgram: (program: Program) => void }) {
  const container = useRef<HTMLDivElement>(null),
    workspace = useRef<Blockly.WorkspaceSvg | null>(null)
  const [error, setError] = useState(''),
    [status, setStatus] = useState('Edit blocks, then apply the program to the lab.')
  useEffect(() => {
    if (!container.current) return
    const ws = Blockly.inject(container.current, {
      toolbox: TOOLBOX,
      trashcan: true,
      renderer: 'zelos',
      grid: { spacing: 20, length: 3, colour: '#DDE2E4', snap: true },
      zoom: { controls: true, wheel: false, startScale: 0.85 },
      move: { scrollbars: true, drag: true, wheel: true },
    })
    workspace.current = ws
    Blockly.serialization.workspaces.load(starterWorkspace(), ws)
    const resize = new ResizeObserver(() => Blockly.svgResize(ws))
    resize.observe(container.current)
    return () => {
      resize.disconnect()
      workspace.current = null
      ws.dispose()
    }
  }, [])
  const apply = () => {
    try {
      if (!workspace.current) return
      onProgram(workspaceToProgram(workspace.current))
      setError('')
      setStatus('Program applied. Record a new prediction to run it.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid blocks')
    }
  }
  return (
    <section className="editor" aria-label="Visual program editor">
      <div className="panel-header">
        <h2>Block workspace</h2>
        <div className="button-row">
          <Button variant="outline" onClick={() => workspace.current?.undo(false)}>
            Undo
          </Button>
          <Button variant="outline" onClick={() => workspace.current?.undo(true)}>
            Redo
          </Button>
          <Button onClick={apply}>Apply blocks</Button>
        </div>
      </div>
      <p className="muted">
        Connect one program. Generated code is text only. Variables and functions are available
        through validated AST contracts, not this initial editor toolbox.
      </p>
      <div className="blockly-container" ref={container} />
      <p role="status">{status}</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  )
}
