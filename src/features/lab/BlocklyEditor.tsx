import { useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly/core'
import type { Program } from '../../domain/types'
import { pseudocode } from '../../interpreter/pseudocode'
import { thresholdProgram } from '../../missions/catalog'
import { Button } from '../../components/ui/button'
import { editableProgram, FULL_TOOLBOX, programWorkspace, blockForNode } from './program-workspace'
export default function BlocklyEditor({
  onProgram,
  program = thresholdProgram(),
  activeNodeId,
  readOnly = false,
  focusNonce = 0,
}: {
  onProgram: (program: Program) => void
  program?: Program
  activeNodeId?: string
  readOnly?: boolean
  focusNonce?: number
}) {
  const container = useRef<HTMLDivElement>(null),
    workspace = useRef<Blockly.WorkspaceSvg | null>(null),
    initial = useRef(program),
    lastApplied = useRef(JSON.stringify(program))
  const [error, setError] = useState(''),
    [status, setStatus] = useState('Edit blocks, then apply the program to the lab.'),
    [undo, setUndo] = useState(false),
    [redo, setRedo] = useState(false),
    [tab, setTab] = useState<'blocks' | 'code'>('blocks'),
    [preview, setPreview] = useState(pseudocode(program))
  useEffect(() => {
    if (!container.current) return
    const ws = Blockly.inject(container.current, {
      toolbox: FULL_TOOLBOX,
      trashcan: true,
      renderer: 'zelos',
      grid: { spacing: 20, length: 3, colour: '#DDE2E4', snap: true },
      zoom: { controls: true, wheel: false, startScale: 0.7 },
      move: { scrollbars: true, drag: true, wheel: true },
    })
    workspace.current = ws
    const applyTheme = () => {
      const tokens = getComputedStyle(document.documentElement)
      const token = (name: string, fallback: string) =>
        tokens.getPropertyValue(name).trim() || fallback
      ws.setTheme(
        Blockly.Theme.defineTheme('branchcade', {
          name: 'branchcade',
          base: 'classic',
          componentStyles: {
            workspaceBackgroundColour: token('--paper', '#ffffff'),
            toolboxBackgroundColour: token('--canvas', '#f6f4ef'),
            toolboxForegroundColour: token('--ink', '#17212b'),
            flyoutBackgroundColour: token('--canvas', '#f6f4ef'),
            flyoutForegroundColour: token('--ink', '#17212b'),
            flyoutOpacity: 1,
            scrollbarColour: token('--muted', '#52616d'),
            selectedGlowColour: token('--focus', '#276689'),
            cursorColour: token('--focus', '#276689'),
          },
          fontStyle: { family: 'Geist Variable, system-ui, sans-serif', size: 12 },
        }),
      )
    }
    applyTheme()
    const appearance = new MutationObserver(applyTheme)
    appearance.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-contrast', 'data-text'],
    })
    Blockly.serialization.workspaces.load(programWorkspace(initial.current), ws)
    ws.clearUndo()
    const listener = () => {
      setUndo(ws.getUndoStack().length > 0)
      setRedo(ws.getRedoStack().length > 0)
    }
    ws.addChangeListener(listener)
    const resize = new ResizeObserver(() => Blockly.svgResize(ws))
    resize.observe(container.current)
    return () => {
      appearance.disconnect()
      resize.disconnect()
      ws.removeChangeListener(listener)
      workspace.current = null
      ws.dispose()
    }
  }, [])
  useEffect(() => {
    if (workspace.current && JSON.stringify(program) !== lastApplied.current) {
      Blockly.serialization.workspaces.load(programWorkspace(program), workspace.current)
      workspace.current.clearUndo()
      lastApplied.current = JSON.stringify(program)
    }
  }, [program])
  useEffect(() => {
    const ws = workspace.current
    const block = ws && activeNodeId ? blockForNode(ws, activeNodeId) : null
    ws?.highlightBlock(block?.id ?? null)
    if (block) ws?.centerOnBlock(block.id)
  }, [activeNodeId, focusNonce])
  useEffect(() => {
    workspace.current?.getAllBlocks(false).forEach((block) => block.setMovable(!readOnly))
  }, [readOnly])
  const apply = () => {
    try {
      if (!workspace.current) return
      const next = editableProgram(workspace.current)
      lastApplied.current = JSON.stringify(next)
      onProgram(next)
      setPreview(pseudocode(next))
      setError('')
      setStatus('Program applied. Record a new prediction to run it.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid blocks')
    }
  }
  const previewBlocks = () => {
    try {
      if (workspace.current) {
        setPreview(pseudocode(editableProgram(workspace.current)))
        setTab('code')
        setError('')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid blocks')
    }
  }
  return (
    <section className="editor" aria-label="Visual program editor">
      <div className="panel-header">
        <h2>Block workspace</h2>
        <div className="button-row">
          <Button
            variant="outline"
            disabled={!undo}
            title={!undo ? 'No block edit to undo' : 'Undo the last block edit'}
            onClick={() => workspace.current?.undo(false)}
          >
            Undo
          </Button>
          <Button
            variant="outline"
            disabled={!redo}
            title={!redo ? 'No block edit to redo' : 'Redo the last block edit'}
            onClick={() => workspace.current?.undo(true)}
          >
            Redo
          </Button>
          <Button onClick={apply} disabled={readOnly}>
            Apply blocks
          </Button>
        </div>
      </div>
      <div className="button-row">
        <Button
          variant="outline"
          aria-pressed={tab === 'blocks'}
          onClick={() => {
            setTab('blocks')
            window.setTimeout(() => {
              if (workspace.current) Blockly.svgResize(workspace.current)
            }, 0)
          }}
        >
          Blocks
        </Button>
        <Button variant="outline" aria-pressed={tab === 'code'} onClick={previewBlocks}>
          Code preview
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            workspace.current?.cleanUp()
            setStatus('Connected program blocks arranged vertically.')
          }}
        >
          Auto-layout
        </Button>
      </div>
      <p className="muted">
        Movement, sensors, logic, loops, variables, helpers and debug blocks become a bounded,
        validated program. Names use letters, numbers, underscores or hyphens. Generated pseudocode
        is read-only. For keyboard or screen reader use, inspect the text steps; Blockly’s spatial
        editing may need a pointer.
      </p>
      <div
        className="blockly-container"
        ref={container}
        style={{ display: tab === 'blocks' ? 'block' : 'none' }}
      />
      {tab === 'code' && (
        <pre className="code-preview" aria-label="Block code preview">
          {preview}
        </pre>
      )}
      <p role="status">{status}</p>
      {error && (
        <p role="alert" className="error">
          {error}
          <Button
            variant="outline"
            onClick={() => {
              const id = /(?:at |block )([\w.-]+)/.exec(error)?.[1]
              const ws = workspace.current,
                block = ws && id ? blockForNode(ws, id) : null
              if (ws && block) {
                setTab('blocks')
                ws.centerOnBlock(block.id)
                ws.highlightBlock(block.id)
              }
            }}
          >
            Go to block
          </Button>
        </p>
      )}
    </section>
  )
}
