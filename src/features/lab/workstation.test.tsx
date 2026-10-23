import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  act,
  waitFor,
} from '@testing-library/react'
import { Stage } from '../../components/illustration/Stage'
import { TraceView } from '../inspector/TraceView'
import { makeWorld } from '../../engine/world'
import { initialRobot } from '../../engine/robot'
import { execute } from '../../interpreter/interpreter'
import { thresholdProgram } from '../../missions/catalog'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LabLesson from './LabLesson'
import { useSession } from '../../app/session'
import { emptyData } from '../../storage/migrations'
import { fixtureProfile } from '../../test/fixtures'
import { useEditHistory } from './history'
afterEach(cleanup)
describe('workstation state and accessible camera controls', () => {
  it('keeps independent world history, preserves redo and discards future only after a new edit', () => {
    const { result } = renderHook(() => useEditHistory(makeWorld()))
    const original = result.current.value
    act(() => result.current.set(makeWorld(32)))
    act(() => result.current.set(makeWorld(44)))
    act(() => result.current.undo())
    expect(result.current.value.obstacles[0]?.position.xCm).toBe(78)
    expect(result.current.canRedo).toBe(true)
    act(() => result.current.redo())
    expect(result.current.value.obstacles[0]?.position.xCm).toBe(90)
    act(() => result.current.undo())
    act(() => result.current.set(makeWorld(12)))
    expect(result.current.canRedo).toBe(false)
    expect(original.obstacles[0]?.position.xCm).toBe(70)
  })
  it('camera zoom/grid/ray toggles never mutate measured geometry or robot state', () => {
    const world = makeWorld(),
      robot = initialRobot(world),
      snapshot = JSON.stringify({ world, robot })
    const { container } = render(<Stage world={world} robot={robot} />)
    const stage = screen.getByRole('img', { name: /distance 24.0 centimeters/ })
    const viewbox = stage.getAttribute('viewBox')
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(stage.getAttribute('viewBox')).not.toBe(viewbox)
    fireEvent.click(screen.getByRole('button', { name: 'Grid' }))
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Sensor ray' }))
    expect(container.querySelector('line')).toBeNull()
    expect(screen.getByRole('img', { name: /distance 24.0 centimeters/ })).toBeVisible()
    expect(JSON.stringify({ world, robot })).toBe(snapshot)
    fireEvent.click(screen.getByRole('button', { name: 'Fit world' }))
    expect(stage.getAttribute('viewBox')).toBe(viewbox)
  })
  it('shows sample origin, real clock and null semantics in sensor details', () => {
    render(<Stage world={makeWorld()} robot={initialRobot(makeWorld())} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sensor details' }))
    expect(screen.getByText(/Range: 100 cm/)).toHaveTextContent('tick 0, 0 ms')
    expect(screen.getByText(/Range: 100 cm/)).toHaveTextContent('never zero')
  })
  it('schematic previews can hide controls while retaining the accessible physical world', () => {
    render(<Stage controls={false} world={makeWorld()} robot={initialRobot(makeWorld())} />)
    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull()
    expect(screen.getByRole('img', { name: /distance 24.0 centimeters/ })).toBeVisible()
  })
})
describe('trace inspector presents preserved evidence', () => {
  it('restores the clicked event index and explains actual branch operands', () => {
    const world = makeWorld(),
      program = thresholdProgram(),
      run = execute(world, program),
      selected: number[] = []
    render(
      <TraceView
        events={run.events}
        cursor={run.events.length}
        onCursor={(cursor) => selected.push(cursor)}
        world={world}
        robot={run.robot}
        program={program}
        runId="actual-run"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Event 1: branch/ }))
    expect(selected).toEqual([1])
    fireEvent.click(screen.getByRole('tab', { name: 'Why?' }))
    expect(screen.getByText(/24 < 20 is false/)).toBeVisible()
    expect(screen.getByText(/Operands: 24, 20. Result: false./)).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: 'Program' }))
    expect(screen.getByText('actual-run')).toBeVisible()
    expect(screen.getByText(/Bounded interpreter completed/)).toBeVisible()
  })
  it('filters a large trace into at most 60 visible rows with genuine pagination', () => {
    const world = { ...makeWorld(), obstacles: [] },
      program = {
        schemaVersion: 1 as const,
        id: 'long-wait',
        body: [
          {
            nodeId: 'loop',
            kind: 'repeat' as const,
            count: {
              nodeId: 'count',
              kind: 'literal' as const,
              type: 'number' as const,
              value: 100,
            },
            body: [
              {
                nodeId: 'sample',
                kind: 'inspect' as const,
                expression: {
                  nodeId: 'distance',
                  kind: 'sensor' as const,
                  type: 'number' as const,
                  sensor: 'distance' as const,
                },
              },
            ],
          },
        ],
      },
      run = execute(world, program)
    const { container } = render(
      <TraceView events={run.events} cursor={0} onCursor={() => undefined} />,
    )
    expect(container.querySelectorAll('.trace-event')).toHaveLength(60)
    fireEvent.click(screen.getByRole('button', { name: 'More events' }))
    expect(container.querySelectorAll('.trace-event')).toHaveLength(40)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search events' }), {
      target: { value: 'nothing matches' },
    })
    expect(screen.getByText(/No matching events/)).toBeVisible()
  })
})

it('pauses and resumes the same preserved cursor without creating another attempt', async () => {
  useSession.setState({
    data: { ...emptyData(), profile: fixtureProfile },
    ready: true,
    ephemeral: true,
    pendingWrites: 0,
  })
  const rendered = render(
    <MemoryRouter initialEntries={['/missions/m01']}>
      <Routes>
        <Route path="/missions/:slug" element={<LabLesson />} />
      </Routes>
    </MemoryRouter>,
  )
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Lock prediction & run' }))
    await waitFor(() =>
      expect(screen.getByTestId('branch-facts')).toHaveTextContent('24 < 20 is false'),
    )
    expect(useSession.getState().data.attempts).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Step back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Step back' }))
    expect(screen.getByText('Tick 9 · Paused')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.getByText('Tick 9 · Playing')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    await new Promise((resolve) => setTimeout(resolve, 110))
    expect(screen.getByText('Tick 9 · Paused')).toBeVisible()
    expect(useSession.getState().data.attempts).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }))
    expect(screen.getByText('Tick 0 · Playing')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(useSession.getState().data.attempts).toHaveLength(1)
  } finally {
    rendered.unmount()
  }
})
