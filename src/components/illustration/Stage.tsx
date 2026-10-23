import { useRef } from 'react'
import type { World, RobotState } from '../../domain/types'
import { readSensors } from '../../engine/sensors'
import { Robot } from './Robot'
export function Stage({
  world,
  robot,
  onObstacleMove,
}: {
  world: World
  robot: RobotState
  onObstacleMove?: (id: string, xCm: number) => void
}) {
  const svg = useRef<SVGSVGElement>(null),
    dragging = useRef<{ id: string; offset: number } | null>(null),
    sensors = readSensors(world, robot)
  const update = (clientX: number, clientY: number) => {
    const el = svg.current,
      ctm = el?.getScreenCTM()
    if (!el || !ctm) return
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    if (dragging.current)
      onObstacleMove?.(dragging.current.id, Math.round(p.x - dragging.current.offset))
  }
  return (
    <div className="stage-wrap">
      <svg
        ref={svg}
        viewBox={`0 0 ${world.widthCm} ${world.heightCm}`}
        className="world"
        role="img"
        aria-label={`Robot world: distance ${sensors.distanceCm === null ? 'out of range' : sensors.distanceCm.toFixed(1) + ' centimeters'}, heading ${robot.headingDeg} degrees`}
        onPointerMove={(e) => {
          if (dragging.current) update(e.clientX, e.clientY)
        }}
        onPointerUp={(e) => {
          dragging.current = null
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId)
        }}
        onPointerCancel={() => {
          dragging.current = null
        }}
      >
        <defs>
          <pattern id="lab-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="#2B404B" strokeWidth=".22" />
          </pattern>
        </defs>
        <rect width={world.widthCm} height={world.heightCm} fill="#192832" />
        <rect width={world.widthCm} height={world.heightCm} fill="url(#lab-grid)" />
        <rect
          x="2"
          y="2"
          width={world.widthCm - 4}
          height={world.heightCm - 4}
          rx="2"
          fill="none"
          stroke="#3F5663"
          strokeWidth=".4"
        />
        {[...world.floorZones]
          .sort((a, b) => a.priority - b.priority || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
          .map((z) =>
            z.kind === 'rectangle' ? (
              <rect
                key={z.id}
                x={z.position.xCm}
                y={z.position.yCm}
                width={z.widthCm}
                height={z.heightCm}
                fill={z.color}
              />
            ) : (
              <polygon
                fillRule="evenodd"
                key={z.id}
                points={z.points.map((p) => `${p.xCm},${p.yCm}`).join(' ')}
                fill={z.color}
              />
            ),
          )}
        <path
          d={`M${world.spawn.position.xCm} ${world.spawn.position.yCm}L${robot.position.xCm} ${robot.position.yCm}`}
          stroke="#EDB651"
          strokeWidth=".8"
          strokeDasharray="1 1"
        />
        <line
          x1={sensors.ray.origin.xCm}
          y1={sensors.ray.origin.yCm}
          x2={sensors.ray.end.xCm}
          y2={sensors.ray.end.yCm}
          stroke="#6CC4D3"
          strokeWidth=".6"
          strokeDasharray="2 1"
        />
        {world.obstacles.map((o) => (
          <g
            key={o.id}
            className={onObstacleMove ? 'draggable' : ''}
            onPointerDown={
              onObstacleMove
                ? (e) => {
                    const ctm = svg.current?.getScreenCTM()
                    if (!ctm) return
                    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
                    dragging.current = { id: o.id, offset: p.x - o.position.xCm }
                    svg.current?.setPointerCapture(e.pointerId)
                  }
                : undefined
            }
          >
            {o.kind === 'rectangle' ? (
              <>
                <rect
                  x={o.position.xCm}
                  y={o.position.yCm}
                  width={o.widthCm}
                  height={o.heightCm}
                  rx="1"
                  fill="#576B76"
                  stroke="#93A4AB"
                  strokeWidth=".4"
                />
                <path
                  d={`M${o.position.xCm + 2} ${o.position.yCm + 3}v${o.heightCm - 6}M${o.position.xCm + 5} ${o.position.yCm + 3}v${o.heightCm - 6}`}
                  stroke="#84969E"
                  strokeWidth=".4"
                />
              </>
            ) : (
              <circle cx={o.position.xCm} cy={o.position.yCm} r={o.radiusCm} fill="#576B76" />
            )}
          </g>
        ))}
        <Robot x={robot.position.xCm} y={robot.position.yCm} heading={robot.headingDeg} />
        <text x="8" y="92" fill="#AFBEC6" fontSize="2.8" fontFamily="monospace">
          1 grid square = 10 cm
        </text>
        <text
          x={sensors.ray.origin.xCm}
          y={sensors.ray.origin.yCm - 5}
          fill="#9EE2ED"
          fontSize="3.5"
          fontFamily="monospace"
        >
          {sensors.distanceCm === null ? 'out of range' : `${sensors.distanceCm.toFixed(1)} cm`}
        </text>
      </svg>
      <div className="stage-footer">
        <span>
          <span className="live-dot" />
          Deterministic world
        </span>
        <span>cm · 50 ms / tick</span>
      </div>
    </div>
  )
}
