import { useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly/core'
import type { Program } from '../../domain/types'
import { pseudocode } from '../../interpreter/pseudocode'
import { thresholdProgram } from '../../missions/catalog'
import { Button } from '../../components/ui/button'
import { editableProgram, FULL_TOOLBOX, programWorkspace, blockForNode } from './program-workspace'

const LOCKED_REASON = 'Blocks are locked to this run. Press Stop & Edit to change them.'
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
      media: `${import.meta.env.BASE_URL}assets/blockly/`,
      sounds: false,
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
    // Blockly's own zoom buttons would share the names "Zoom in"/"Zoom out" with the robot
    // world's camera buttons, so screen readers could not tell them apart.
    for (const [selector, label] of [
      ['.blocklyZoomIn', 'Zoom blocks in'],
      ['.blocklyZoomOut', 'Zoom blocks out'],
      ['.blocklyZoomReset', 'Reset block zoom'],
    ] as const)
      container.current.querySelector(selector)?.setAttribute('aria-label', label)
    // Blockly measures text with an off-screen canvas appended to <body>; it is not content.
    document
      .querySelectorAll('canvas.blocklyComputeCanvas')
      .forEach((canvas) => canvas.setAttribute('aria-hidden', 'true'))
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
    workspace.current?.getAllBlocks(false).forEach((block) => {
      block.setMovable(!readOnly)
      block.setEditable(!readOnly)
      block.setDeletable(!readOnly)
    })
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
            disabled={!undo || readOnly}
            title={
              readOnly
                ? LOCKED_REASON
                : !undo
                  ? 'No block edit to undo'
                  : 'Undo the last block edit'
            }
            onClick={() => workspace.current?.undo(false)}
          >
            Undo
          </Button>
          <Button
            variant="outline"
            disabled={!redo || readOnly}
            title={
              readOnly
                ? LOCKED_REASON
                : !redo
                  ? 'No block edit to redo'
                  : 'Redo the last block edit'
            }
            onClick={() => workspace.current?.undo(true)}
          >
            Redo
          </Button>
          <Button
            onClick={apply}
            disabled={readOnly}
            title={readOnly ? LOCKED_REASON : 'Use these blocks as your program'}
          >
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
          disabled={readOnly}
          title={readOnly ? LOCKED_REASON : 'Line the blocks up neatly'}
          onClick={() => {
            workspace.current?.cleanUp()
            setStatus('Connected program blocks arranged vertically.')
          }}
        >
          Auto-layout
        </Button>
      </div>
      <p className="muted">
        Drag blocks from the list into your program, then press <strong>Apply blocks</strong> to use
        them. Changes you have not applied will not run. Names can use letters, numbers, _ and -.
        Using a keyboard or screen reader? “View pseudocode” shows the same program as text.
      </p>
      <div
        className="blockly-container"
        ref={container}
        inert={readOnly}
        style={{ display: tab === 'blocks' ? 'block' : 'none' }}
      />
      {tab === 'code' && (
        <pre className="code-preview" aria-label="Block code preview">
          {preview}
        </pre>
      )}
      <p role="status">
        {readOnly
          ? 'Recorded run locked. Use Stop & Edit before changing or applying blocks.'
          : status}
      </p>
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
