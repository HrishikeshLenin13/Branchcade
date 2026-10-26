import { useEffect, useId, useRef, useState } from 'react'
import type { World, RobotState, ExecutionEvent } from '../../domain/types'
import { readSensors } from '../../engine/sensors'
import { readSensors as legacySensors } from '../../interpreter/legacy/sensors'
import { transformOffset } from '../../engine/geometry'
import { DEFAULT_SENSOR } from '../../engine/world'
import { Button } from '../ui/button'
import { Robot } from './Robot'
import './stage.css'
export function Stage({
  world,
  robot,
  onObstacleMove,
  onSelectObject,
  events = [],
  cursor = events.length,
  sensorLabels = true,
  controls = true,
  onZoneEdit,
  onRobotMove,
  engineVersion = 2,
  snapshotDisabled = false,
  goals = world.goals,
}: {
  world: World
  robot: RobotState
  onObstacleMove?: (id: string, xCm: number, yCm?: number) => void
  onSelectObject?: (id: string) => void
  events?: ExecutionEvent[]
  cursor?: number
  sensorLabels?: boolean
  controls?: boolean
  onZoneEdit?: (id: string, xCm: number, yCm: number, widthCm?: number, heightCm?: number) => void
  onRobotMove?: (xCm: number, yCm: number) => void
  engineVersion?: 1 | 2
  snapshotDisabled?: boolean
  goals?: World['goals']
}) {
  const svg = useRef<SVGSVGElement>(null),
    wrap = useRef<HTMLDivElement>(null),
    dragging = useRef<{
      id: string
      x: number
      y: number
      kind: 'obstacle' | 'zone' | 'resize' | 'robot'
    } | null>(null),
    gridId = useId().replaceAll(':', ''),
    sensors = (engineVersion === 1 ? legacySensors : readSensors)(world, robot)
  const [zoom, setZoom] = useState(1),
    [grid, setGrid] = useState(true),
    [ray, setRay] = useState(true),
    [follow, setFollow] = useState(false),
    [pan, setPan] = useState({ xCm: 0, yCm: 0 }),
    [labelSize, setLabelSize] = useState(3.5),
    [details, setDetails] = useState(false),
    [robotDetails, setRobotDetails] = useState(false),
    [fullscreenError, setFullscreenError] = useState('')
  const viewWidth = world.widthCm / zoom,
    viewHeight = world.heightCm / zoom
  // Annotation size follows the actual camera matrix, not physics units.
  useEffect(() => {
    const node = svg.current
    if (!node) return
    const update = () => {
      const matrix = node.getScreenCTM?.()
      if (matrix && Math.abs(matrix.a) > 1e-9) setLabelSize(12 / Math.abs(matrix.a))
    }
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [viewWidth, viewHeight])
  const center = follow
    ? robot.position
    : { xCm: world.widthCm / 2 + pan.xCm, yCm: world.heightCm / 2 + pan.yCm }
  const panBy = (x: number, y: number) => {
    setPan({ xCm: center.xCm - world.widthCm / 2 + x, yCm: center.yCm - world.heightCm / 2 + y })
    setFollow(false)
  }
  const pointAt = (clientX: number, clientY: number) => {
    const matrix = svg.current?.getScreenCTM()
    return matrix ? new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse()) : null
  }
  const trail = [
    world.spawn.position,
    ...events.slice(0, cursor).map((event) => event.after.position),
  ]
  return (
    <div className="stage-wrap" ref={wrap}>
      {controls && (
        <div className="stage-toolbar" aria-label="Stage camera controls">
          <Button
            variant="ghost"
            aria-label="Zoom out"
            title="Camera only"
            disabled={zoom <= 0.5}
            onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
          >
            −
          </Button>
          <span className="mono">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            aria-label="Zoom in"
            title="Camera only"
            disabled={zoom >= 3}
            onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
          >
            +
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setZoom(1)
              setFollow(false)
              setPan({ xCm: 0, yCm: 0 })
            }}
          >
            Fit world
          </Button>
          <Button variant="ghost" aria-pressed={grid} onClick={() => setGrid((value) => !value)}>
            Grid
          </Button>
          <Button variant="ghost" aria-pressed={ray} onClick={() => setRay((value) => !value)}>
            Sensor ray
          </Button>
          <Button
            variant="ghost"
            aria-pressed={follow}
            onClick={() => setFollow((value) => !value)}
          >
            Follow robot
          </Button>
          <Button variant="ghost" aria-label="Pan left" onClick={() => panBy(-viewWidth / 10, 0)}>
            ←
          </Button>
          <Button variant="ghost" aria-label="Pan right" onClick={() => panBy(viewWidth / 10, 0)}>
            →
          </Button>
          <Button variant="ghost" aria-label="Pan up" onClick={() => panBy(0, -viewHeight / 10)}>
            ↑
          </Button>
          <Button variant="ghost" aria-label="Pan down" onClick={() => panBy(0, viewHeight / 10)}>
            ↓
          </Button>
          <Button
            variant="ghost"
            disabled={snapshotDisabled}
            title={
              snapshotDisabled
                ? 'Pause replay before capturing an authoritative snapshot'
                : 'Download the current authoritative stage as SVG'
            }
            onClick={() => {
              if (!svg.current) return
              const copy = svg.current.cloneNode(true) as SVGSVGElement
              copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
              copy.setAttribute('width', '1200')
              copy.setAttribute('height', String(Math.round((1200 * viewHeight) / viewWidth)))
              const url = URL.createObjectURL(
                new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }),
              )
              const a = document.createElement('a')
              a.href = url
              a.download = `branchcade-stage-tick-${robot.tick}.svg`
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Snapshot stage
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void (
                document.fullscreenElement
                  ? document.exitFullscreen()
                  : wrap.current
                    ? wrap.current.requestFullscreen()
                    : Promise.resolve()
              ).catch(() =>
                setFullscreenError(
                  'Fullscreen is unavailable in this browser. Use browser zoom or Fit world.',
                ),
              )
            }}
          >
            Fullscreen stage
          </Button>
        </div>
      )}
      <svg
        ref={svg}
        viewBox={`${center.xCm - viewWidth / 2} ${center.yCm - viewHeight / 2} ${viewWidth} ${viewHeight}`}
        className="world"
        role="img"
        aria-label={`Robot world: distance ${sensors.distanceCm === null ? 'out of range' : sensors.distanceCm.toFixed(1) + ' centimeters'}, heading ${robot.headingDeg} degrees`}
        onPointerMove={(event) => {
          if (!dragging.current) return
          const point = pointAt(event.clientX, event.clientY)
          if (!point) return
          const moving = dragging.current
          if (moving.kind === 'obstacle')
            onObstacleMove?.(
              moving.id,
              Math.round(point.x - moving.x),
              Math.round(point.y - moving.y),
            )
          else if (moving.kind === 'robot')
            onRobotMove?.(Math.round(point.x - moving.x), Math.round(point.y - moving.y))
          else {
            const zone = world.floorZones.find((zone) => zone.id === moving.id)
            if (zone?.kind === 'rectangle') {
              if (moving.kind === 'resize')
                onZoneEdit?.(
                  zone.id,
                  zone.position.xCm,
                  zone.position.yCm,
                  Math.max(
                    1,
                    Math.min(
                      world.widthCm - zone.position.xCm,
                      Math.round(point.x - zone.position.xCm),
                    ),
                  ),
                  Math.max(
                    1,
                    Math.min(
                      world.heightCm - zone.position.yCm,
                      Math.round(point.y - zone.position.yCm),
                    ),
                  ),
                )
              else
                onZoneEdit?.(
                  zone.id,
                  Math.max(
                    0,
                    Math.min(world.widthCm - zone.widthCm, Math.round(point.x - moving.x)),
                  ),
                  Math.max(
                    0,
                    Math.min(world.heightCm - zone.heightCm, Math.round(point.y - moving.y)),
                  ),
                )
            }
          }
        }}
        onPointerUp={(event) => {
          dragging.current = null
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => {
          dragging.current = null
        }}
      >
        <defs>
          <pattern id={gridId} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="#2B404B" strokeWidth=".22" />
          </pattern>
        </defs>
        <rect width={world.widthCm} height={world.heightCm} fill="#192832" />
        {grid && <rect width={world.widthCm} height={world.heightCm} fill={`url(#${gridId})`} />}
        <rect
          x="2"
          y="2"
          width={Math.max(0, world.widthCm - 4)}
          height={Math.max(0, world.heightCm - 4)}
          rx="2"
          fill="none"
          stroke="#3F5663"
          strokeWidth=".4"
        />
        {world.floorZones
          .map((zone, index) => ({ zone, index }))
          .sort(
            (a, b) =>
              a.zone.priority - b.zone.priority ||
              (engineVersion === 1 ? b.zone.id.localeCompare(a.zone.id, 'en') : b.index - a.index),
          )
          .map(({ zone }) => zone)
          .map((zone) =>
            zone.kind === 'rectangle' ? (
              <g key={zone.id}>
                <rect
                  x={zone.position.xCm}
                  y={zone.position.yCm}
                  width={zone.widthCm}
                  height={zone.heightCm}
                  fill={zone.color}
                  opacity=".7"
                  className={onZoneEdit ? 'draggable' : ''}
                  onPointerDown={
                    onZoneEdit
                      ? (event) => {
                          const point = pointAt(event.clientX, event.clientY)
                          if (!point) return
                          onSelectObject?.(zone.id)
                          dragging.current = {
                            id: zone.id,
                            x: point.x - zone.position.xCm,
                            y: point.y - zone.position.yCm,
                            kind: 'zone',
                          }
                          svg.current?.setPointerCapture(event.pointerId)
                        }
                      : undefined
                  }
                />
                {onZoneEdit && (
                  <rect
                    x={zone.position.xCm + zone.widthCm - 2}
                    y={zone.position.yCm + zone.heightCm - 2}
                    width="4"
                    height="4"
                    fill="#fff"
                    stroke="#30759A"
                    strokeWidth=".5"
                    style={{ cursor: 'nwse-resize' }}
                    onPointerDown={(event) => {
                      onSelectObject?.(zone.id)
                      dragging.current = { id: zone.id, x: 0, y: 0, kind: 'resize' }
                      svg.current?.setPointerCapture(event.pointerId)
                    }}
                  />
                )}
              </g>
            ) : (
              <polygon
                key={zone.id}
                fillRule="evenodd"
                points={zone.points.map((point) => `${point.xCm},${point.yCm}`).join(' ')}
                fill={zone.color}
                opacity=".7"
              />
            ),
          )}
        {world.waypoints.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.xCm}
              cy={point.yCm}
              r="2"
              fill="none"
              stroke="#6CC4D3"
              strokeWidth=".5"
            />
            <text x={point.xCm + 3} y={point.yCm} fontSize={labelSize} fill="#D6E6EC">
              {i + 1}
            </text>
          </g>
        ))}
        <g fill="none" stroke="#9EE2ED" strokeWidth=".5">
          <title>Start marker</title>
          <circle
            cx={world.spawn.position.xCm}
            cy={world.spawn.position.yCm}
            r={world.spawn.radiusCm + 2}
            strokeDasharray="2 2"
          />
          {/* Below the start ring (above it near the bottom edge), so the robot sitting on
              the start never covers the word. */}
          <text
            x={world.spawn.position.xCm}
            textAnchor="middle"
            y={
              world.spawn.position.yCm + world.spawn.radiusCm + 3 + labelSize <= world.heightCm
                ? world.spawn.position.yCm + world.spawn.radiusCm + 2 + labelSize
                : world.spawn.position.yCm - world.spawn.radiusCm - 3
            }
            fill="#9EE2ED"
            stroke="none"
            fontSize={labelSize}
          >
            Start
          </text>
        </g>
        {goals
          .filter((g) => g.kind === 'reach')
          .map((g, i) => (
            <g key={`goal-${i}`}>
              <title>Goal marker</title>
              <path
                d={`M${g.position.xCm - 2} ${g.position.yCm}h4M${g.position.xCm} ${g.position.yCm - 2}v4`}
                stroke="#A5D898"
                strokeWidth=".5"
              />
              <circle
                cx={g.position.xCm}
                cy={g.position.yCm}
                r={g.toleranceCm}
                fill="none"
                stroke="#A5D898"
                strokeWidth=".5"
              />
              <text
                x={g.position.xCm}
                y={Math.min(
                  world.heightCm - labelSize * 0.4,
                  g.position.yCm + Math.max(g.toleranceCm, 2) + labelSize * 1.2,
                )}
                fill="#A5D898"
                fontSize={labelSize}
              >
                Goal
              </text>
            </g>
          ))}
        <polyline
          points={trail.map((point) => `${point.xCm},${point.yCm}`).join(' ')}
          stroke="#EDB651"
          strokeWidth=".8"
          fill="none"
          strokeDasharray="1 1"
        />
        {ray && (
          <>
            <line
              x1={sensors.ray.origin.xCm}
              y1={sensors.ray.origin.yCm}
              x2={sensors.ray.end.xCm}
              y2={sensors.ray.end.yCm}
              stroke="#6CC4D3"
              strokeWidth=".6"
              strokeDasharray="2 1"
            />
            {sensors.ray.hitId && (
              <circle cx={sensors.ray.end.xCm} cy={sensors.ray.end.yCm} r="1" fill="#9EE2ED" />
            )}
          </>
        )}
        {world.obstacles.map((object) => (
          <g
            key={object.id}
            className={onObstacleMove ? 'draggable' : ''}
            onClick={() => onSelectObject?.(object.id)}
            onPointerDown={
              onObstacleMove
                ? (event) => {
                    const point = pointAt(event.clientX, event.clientY)
                    if (!point) return
                    onSelectObject?.(object.id)
                    dragging.current = {
                      id: object.id,
                      x: point.x - object.position.xCm,
                      y: point.y - object.position.yCm,
                      kind: 'obstacle',
                    }
                    svg.current?.setPointerCapture(event.pointerId)
                  }
                : undefined
            }
          >
            {object.kind === 'rectangle' ? (
              <rect
                x={object.position.xCm}
                y={object.position.yCm}
                width={object.widthCm}
                height={object.heightCm}
                rx="1"
                fill="#576B76"
                stroke="#B7C6CC"
                strokeWidth=".4"
              />
            ) : (
              <circle
                cx={object.position.xCm}
                cy={object.position.yCm}
                r={object.radiusCm}
                fill="#576B76"
                stroke="#B7C6CC"
                strokeWidth=".4"
              />
            )}
          </g>
        ))}
        <g
          onClick={() => setRobotDetails((value) => !value)}
          className={onRobotMove ? 'draggable' : ''}
          onPointerDown={
            onRobotMove
              ? (event) => {
                  const point = pointAt(event.clientX, event.clientY)
                  if (!point) return
                  dragging.current = {
                    id: 'robot',
                    x: point.x - robot.position.xCm,
                    y: point.y - robot.position.yCm,
                    kind: 'robot',
                  }
                  svg.current?.setPointerCapture(event.pointerId)
                }
              : undefined
          }
        >
          <Robot
            x={robot.position.xCm}
            y={robot.position.yCm}
            heading={robot.headingDeg}
            radius={robot.radiusCm}
          />
        </g>
        <circle
          cx={
            transformOffset(
              robot.position,
              robot.headingDeg,
              (world.sensorConfig ?? DEFAULT_SENSOR).colorOffset,
            ).xCm
          }
          cy={
            transformOffset(
              robot.position,
              robot.headingDeg,
              (world.sensorConfig ?? DEFAULT_SENSOR).colorOffset,
            ).yCm
          }
          r="1.5"
          fill={sensors.surfaceColor}
          stroke="#6CC4D3"
          strokeWidth=".5"
        >
          <title>Floor sensor footprint (center point sample)</title>
        </circle>
        {grid && (
          <text
            x="8"
            y={world.heightCm - 6}
            fill="#C4D1D7"
            fontSize={labelSize}
            fontFamily="monospace"
          >
            1 grid square = 10 cm
          </text>
        )}
        {sensorLabels && (
          <text
            x={sensors.ray.origin.xCm}
            y={Math.max(labelSize * 1.2, sensors.ray.origin.yCm - Math.max(7, labelSize * 1.4))}
            data-testid="distance-label"
            fill="#9EE2ED"
            fontSize={labelSize}
            fontFamily="monospace"
          >
            {sensors.distanceCm === null ? 'out of range' : `${sensors.distanceCm.toFixed(1)} cm`}
          </text>
        )}
      </svg>
      <div className="stage-footer">
        <span>
          <span className="live-dot" />
          {robot.collision ? `Collision: ${robot.collision}` : 'Deterministic world'}
        </span>
        <span>cm · 50 ms / tick</span>
      </div>
      {controls && (
        <div className="stage-detail-buttons">
          <Button
            variant="ghost"
            aria-expanded={details}
            onClick={() => setDetails((value) => !value)}
          >
            Sensor details
          </Button>
          <Button
            variant="ghost"
            aria-expanded={robotDetails}
            onClick={() => setRobotDetails((value) => !value)}
          >
            Robot state
          </Button>
        </div>
      )}
      {details && (
        <p className="stage-details">
          Distance is measured from ({sensors.ray.origin.xCm.toFixed(1)},{' '}
          {sensors.ray.origin.yCm.toFixed(1)}) cm along the heading. Range: {sensors.ray.maxRangeCm}{' '}
          cm. Sample: tick {robot.tick}, {robot.simTimeMs} ms. “Out of range” means null: no hit
          within range, never zero. Floor sensor: {sensors.surfaceColor}. Boundaries{' '}
          {world.boundaryDetectable === false
            ? 'do not return a distance in this world'
            : 'count as obstacles'}
          . Floor sampling uses the shown footprint center; closed edges count inside. Overlaps use
          highest priority, then{' '}
          {engineVersion === 1 ? 'stable ID (legacy model)' : 'first declared zone'}. Readings
          display 0.1 cm; comparisons use the exact operands in the trace.
          {world.sensorConfig?.noiseSeed !== undefined &&
            ` Simulated ±0.05 cm noise; seed ${world.sensorConfig.noiseSeed}. This is not hardware accuracy.`}
        </p>
      )}
      {robotDetails && (
        <p className="stage-details">
          X {robot.position.xCm.toFixed(1)} cm · Y {robot.position.yCm.toFixed(1)} cm · Heading{' '}
          {robot.headingDeg.toFixed(1)}° · {robot.status}.{' '}
          {robot.stopReason ?? 'No stop instruction yet.'}{' '}
          {onObstacleMove
            ? 'World editing is enabled while stopped.'
            : 'World geometry is locked here. Inspect objects with the trace.'}
        </p>
      )}
      {fullscreenError && <p role="status">{fullscreenError}</p>}
    </div>
  )
}
