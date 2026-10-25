import { useState } from 'react'
import type { World, Program } from '../../domain/types'
import { COLORS } from '../../domain/constants'
import { WorldSchema } from '../../domain/schemas'
import { opaqueId } from '../../domain/invariants'
import { DEFAULT_SENSOR } from '../../engine/world'
import { transformOffset } from '../../engine/geometry'
import { nearestLegalSpawn } from '../../engine/placement'
import { downloadFile } from '../../storage/import-export'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog'
import {
  addObstacle,
  editDemoCondition,
  parseWorldImport,
  positionObstacle,
  presetWorld,
  worldExport,
  WORLD_PRESETS,
  type WorldPreset,
} from './world-tools'
export function WorldEditor({
  world,
  program,
  onWorld,
  onProgram,
  selectedObject,
  onSelectObject,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onError,
  onNotice,
  onSave,
  savedWorlds,
  onLoadSaved,
  disabled,
}: {
  world: World
  program: Program
  onWorld: (world: World) => void
  onProgram: (program: Program) => void
  selectedObject: string
  onSelectObject: (id: string) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onError: (message: string) => void
  onNotice: (message: string) => void
  onSave: (name: string) => Promise<void>
  savedWorlds: { id: string; name: string }[]
  onLoadSaved: (id: string) => void
  disabled: boolean
}) {
  const [preset, setPreset] = useState<WorldPreset>('Threshold Playground'),
    [savedSnapshot, setSavedSnapshot] = useState(world),
    [preview, setPreview] = useState<World | null>(null),
    [showData, setShowData] = useState(false),
    [name, setName] = useState('My robot world'),
    [threshold, setThreshold] = useState(20),
    [comparator, setComparator] = useState<'<' | '<=' | '>' | '>=' | '==' | '!='>('<'),
    [zoneColor, setZoneColor] = useState<(typeof COLORS)[number]>('blue')
  const object = world.obstacles.find((item) => item.id === selectedObject) ?? world.obstacles[0],
    zone = world.floorZones.find((item) => item.id === selectedObject) ?? world.floorZones[0],
    origin = transformOffset(
      world.spawn.position,
      world.spawn.headingDeg,
      (world.sensorConfig ?? DEFAULT_SENSOR).originOffset,
    )
  const commit = (mutate: (next: World) => void) => {
    const next = structuredClone(world)
    try {
      mutate(next)
      onWorld(WorldSchema.parse(next))
      onError('')
    } catch (error) {
      const point =
        error instanceof Error && error.message.includes('Spawn')
          ? nearestLegalSpawn(next, next.spawn.position)
          : null
      onError(
        `Edit rejected. ${point ? `Nearest legal 1 cm-grid spawn: (${point.xCm}, ${point.yCm}) cm; enter it explicitly.` : 'Keep obstacles separated and all geometry within bounds.'} ${error instanceof Error ? error.message : ''}`,
      )
    }
  }
  const act = (callback: () => void) => {
    try {
      callback()
      onError('')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Edit rejected.')
    }
  }
  const dirty = JSON.stringify(world) !== JSON.stringify(savedSnapshot)
  const newPreset = (value: WorldPreset) => {
    if (
      dirty &&
      !window.confirm(
        'Replace this edited world? Its saved copies and attempt history will stay available.',
      )
    )
      return
    const next = presetWorld(value)
    setPreset(value)
    onWorld(next)
    setSavedSnapshot(next)
    onNotice(`${value} loaded. Your next run uses this world.`)
  }
  return (
    <section className="world-editor" aria-label="World editor">
      <div className="world-tools-row">
        <label>
          New world
          <select
            value={preset}
            disabled={disabled}
            onChange={(event) => newPreset(event.target.value as WorldPreset)}
          >
            {WORLD_PRESETS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          disabled={disabled || !canUndo}
          title={
            disabled
              ? 'World is locked to the current run. Press Stop & Edit to change it.'
              : canUndo
                ? 'Undo the last world edit'
                : 'No world edit to undo yet'
          }
          onClick={onUndo}
        >
          Undo world edit
        </Button>
        <Button
          variant="outline"
          disabled={disabled || !canRedo}
          title={
            disabled
              ? 'World is locked to the current run. Press Stop & Edit to change it.'
              : canRedo
                ? 'Redo the world edit you undid'
                : 'Nothing to redo'
          }
          onClick={onRedo}
        >
          Redo world edit
        </Button>
      </div>
      <div className="parameter-controls compact-parameters">
        <label>
          Obstacle distance (cm)
          <input
            aria-label="Obstacle distance (cm)"
            type="range"
            min="8"
            max="90"
            step="1"
            disabled={
              disabled ||
              world.spawn.headingDeg !== 0 ||
              !world.obstacles.some((item) => item.id === 'obstacle')
            }
            value={
              (world.obstacles.find((item) => item.id === 'obstacle')?.position.xCm ??
                origin.xCm + 24) - origin.xCm
            }
            onChange={(event) =>
              act(() =>
                onWorld(
                  positionObstacle(world, 'obstacle', origin.xCm + Number(event.target.value)),
                ),
              )
            }
          />
        </label>
        <label>
          Threshold (cm)
          <input
            aria-label="Threshold (cm)"
            type="number"
            min="0"
            max="100"
            value={threshold}
            disabled={disabled}
            onChange={(event) => {
              const value = Number(event.target.value)
              setThreshold(value)
              act(() => {
                onProgram(editDemoCondition(program, value, comparator))
                onNotice('You edited only the first example condition. A new prediction is needed.')
              })
            }}
          />
        </label>
        <label>
          Example comparator
          <select
            value={comparator}
            disabled={disabled}
            onChange={(event) => {
              const value = event.target.value as typeof comparator
              setComparator(value)
              act(() => onProgram(editDemoCondition(program, threshold, value)))
            }}
          >
            {['<', '<=', '>', '>=', '==', '!='].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Threshold and comparator deliberately edit the first numeric example condition. Other code
        stays intact.
      </p>
      <details className="world-edit-details">
        <summary>Edit obstacles, zones & robot</summary>
        <fieldset
          disabled={disabled}
          title={
            disabled
              ? 'World is locked to the current run. Press Stop & Edit to change it.'
              : undefined
          }
        >
          <legend>Geometry · centimeters</legend>
          <div className="button-row">
            <Button
              variant="outline"
              onClick={() =>
                act(() => {
                  const id = `box-${opaqueId()}`
                  onWorld(addObstacle(world, 'rectangle', id))
                  onSelectObject(id)
                })
              }
            >
              Add box
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                act(() => {
                  const id = `circle-${opaqueId()}`
                  onWorld(addObstacle(world, 'circle', id))
                  onSelectObject(id)
                })
              }
            >
              Add circle
            </Button>
          </div>
          {world.obstacles.length > 0 && (
            <>
              <label>
                Obstacle to position
                <select
                  aria-label="Obstacle to position"
                  value={object?.id ?? ''}
                  onChange={(event) => onSelectObject(event.target.value)}
                >
                  {world.obstacles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kind} · {item.id.slice(0, 22)}
                    </option>
                  ))}
                </select>
              </label>
              {object && (
                <div className="coordinate-fields">
                  <label>
                    Obstacle x position (cm)
                    <input
                      aria-label="Obstacle x position (cm)"
                      type="number"
                      value={object.position.xCm}
                      onChange={(event) =>
                        act(() =>
                          onWorld(positionObstacle(world, object.id, Number(event.target.value))),
                        )
                      }
                    />
                  </label>
                  <label>
                    Obstacle y position (cm)
                    <input
                      type="number"
                      value={object.position.yCm}
                      onChange={(event) =>
                        act(() =>
                          onWorld(
                            positionObstacle(
                              world,
                              object.id,
                              object.position.xCm,
                              Number(event.target.value),
                            ),
                          ),
                        )
                      }
                    />
                  </label>
                  {object.kind === 'circle' ? (
                    <label>
                      Radius (cm)
                      <input
                        type="number"
                        min="1"
                        value={object.radiusCm}
                        onChange={(event) =>
                          commit((next) => {
                            const item = next.obstacles.find((item) => item.id === object.id)
                            if (item?.kind === 'circle') item.radiusCm = Number(event.target.value)
                          })
                        }
                      />
                    </label>
                  ) : (
                    <>
                      <label>
                        Box width (cm)
                        <input
                          type="number"
                          min="1"
                          value={object.widthCm}
                          onChange={(event) =>
                            commit((next) => {
                              const item = next.obstacles.find((item) => item.id === object.id)
                              if (item?.kind === 'rectangle')
                                item.widthCm = Number(event.target.value)
                            })
                          }
                        />
                      </label>
                      <label>
                        Box height (cm)
                        <input
                          type="number"
                          min="1"
                          value={object.heightCm}
                          onChange={(event) =>
                            commit((next) => {
                              const item = next.obstacles.find((item) => item.id === object.id)
                              if (item?.kind === 'rectangle')
                                item.heightCm = Number(event.target.value)
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  commit((next) => {
                    next.obstacles = next.obstacles.filter((item) => item.id !== object?.id)
                  })
                }
              >
                Remove obstacle
              </Button>
            </>
          )}
          <hr />
          <div className="world-tools-row">
            <label>
              New zone color
              <select
                value={zoneColor}
                onChange={(event) => setZoneColor(event.target.value as typeof zoneColor)}
              >
                {COLORS.map((color) => (
                  <option key={color}>{color}</option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              onClick={() => {
                const id = `zone-${opaqueId()}`
                commit((next) => {
                  next.floorZones.push({
                    id,
                    kind: 'rectangle',
                    position: { xCm: 20, yCm: 20 },
                    widthCm: 30,
                    heightCm: 15,
                    color: zoneColor,
                    priority: Math.max(0, ...next.floorZones.map((item) => item.priority)) + 1,
                  })
                })
                onSelectObject(id)
              }}
            >
              Add colored zone
            </Button>
          </div>
          {world.floorZones.length > 0 && (
            <>
              <label>
                Selected floor zone
                <select
                  value={zone?.id ?? ''}
                  onChange={(event) => onSelectObject(event.target.value)}
                >
                  {world.floorZones.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.color} · priority {item.priority}
                    </option>
                  ))}
                </select>
              </label>
              {zone?.kind === 'rectangle' && (
                <div className="coordinate-fields">
                  {(['xCm', 'yCm', 'widthCm', 'heightCm'] as const).map((field) => (
                    <label key={field}>
                      Zone{' '}
                      {field === 'xCm'
                        ? 'X'
                        : field === 'yCm'
                          ? 'Y'
                          : field === 'widthCm'
                            ? 'width'
                            : 'height'}{' '}
                      (cm)
                      <input
                        type="number"
                        value={
                          field === 'xCm' || field === 'yCm' ? zone.position[field] : zone[field]
                        }
                        onChange={(event) =>
                          commit((next) => {
                            const item = next.floorZones.find((item) => item.id === zone.id)
                            if (item?.kind === 'rectangle') {
                              if (field === 'xCm' || field === 'yCm')
                                item.position[field] = Number(event.target.value)
                              else item[field] = Number(event.target.value)
                            }
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  commit((next) => {
                    next.floorZones = next.floorZones.filter((item) => item.id !== zone?.id)
                  })
                }
              >
                Remove zone
              </Button>
            </>
          )}
          <p className="muted">
            Overlapping zones use the highest priority, then the first zone in declared order. Drag
            zones in the stage; the white corner handle resizes them. Numeric position and size
            fields provide the same controls without dragging.
          </p>
          <hr />
          <div className="coordinate-fields">
            <label>
              Robot X (cm)
              <input
                type="number"
                value={world.spawn.position.xCm}
                onChange={(event) =>
                  commit((next) => {
                    next.spawn.position.xCm = Number(event.target.value)
                  })
                }
              />
            </label>
            <label>
              Robot Y (cm)
              <input
                type="number"
                value={world.spawn.position.yCm}
                onChange={(event) =>
                  commit((next) => {
                    next.spawn.position.yCm = Number(event.target.value)
                  })
                }
              />
            </label>
            <label>
              Robot heading (degrees)
              <input
                type="number"
                min="0"
                max="359"
                value={world.spawn.headingDeg}
                onChange={(event) =>
                  commit((next) => {
                    next.spawn.headingDeg = Number(event.target.value)
                  })
                }
              />
            </label>
            <label>
              Rotate robot · {world.spawn.headingDeg}°
              <input
                type="range"
                min="0"
                max="359"
                value={world.spawn.headingDeg}
                onChange={(event) =>
                  commit((next) => {
                    next.spawn.headingDeg = Number(event.target.value)
                  })
                }
              />
            </label>
          </div>
          <label>
            Sensor max range (cm)
            <input
              aria-label="Sensor max range (cm)"
              type="range"
              min="5"
              max="500"
              value={world.sensorConfig?.maxRangeCm ?? DEFAULT_SENSOR.maxRangeCm}
              onChange={(event) =>
                commit((next) => {
                  next.sensorConfig = {
                    ...(next.sensorConfig ?? DEFAULT_SENSOR),
                    maxRangeCm: Number(event.target.value),
                  }
                })
              }
            />
            <span>
              {world.sensorConfig?.maxRangeCm ?? DEFAULT_SENSOR.maxRangeCm} cm · null means out of
              range
            </span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={world.boundaryDetectable !== false}
              onChange={(event) =>
                commit((next) => {
                  next.boundaryDetectable = event.target.checked
                })
              }
            />{' '}
            Distance sensor detects world boundaries
          </label>
          <label>
            <input
              type="checkbox"
              checked={world.sensorConfig?.noiseSeed !== undefined}
              onChange={(event) =>
                commit((next) => {
                  const config = { ...(next.sensorConfig ?? DEFAULT_SENSOR) }
                  if (event.target.checked) config.noiseSeed = 1
                  else delete config.noiseSeed
                  next.sensorConfig = config
                })
              }
            />{' '}
            Simulated bounded noise (±0.05 cm; not hardware accuracy)
          </label>
          {world.sensorConfig?.noiseSeed !== undefined && (
            <label>
              Noise seed
              <input
                type="number"
                min="0"
                max="4294967295"
                value={world.sensorConfig.noiseSeed}
                onChange={(event) =>
                  commit((next) => {
                    next.sensorConfig = {
                      ...(next.sensorConfig ?? DEFAULT_SENSOR),
                      noiseSeed: Number(event.target.value),
                    }
                  })
                }
              />
            </label>
          )}
          <p className="muted">
            Heading 0° points right; 90° points down. Physics advances in fixed 50 ms ticks. Pause
            permits inspection only; Stop &amp; Edit resets the run before any changes. Drag solid
            obstacles in the stopped stage or use coordinates above. Obstacle coordinates and object
            drags clamp to world edges. Overlapping solids are rejected. Robot spawns are never
            silently teleported; enter the suggested legal position explicitly.
          </p>
        </fieldset>
      </details>
      <div className="world-tools-row">
        <Button
          variant="outline"
          onClick={() => {
            void worldExport(world)
              .then((value) =>
                downloadFile('branchcade-world.json', JSON.stringify(value, null, 2)),
              )
              .catch((error) => onError(String(error)))
          }}
        >
          Export world
        </Button>
        <label className="file-button">
          Import world
          <input
            type="file"
            accept="application/json,.json"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void (async () => {
                try {
                  if (file.size > 500_000) throw new Error('World exceeds 500 KB.')
                  setPreview(await parseWorldImport(await file.text()))
                  onError('')
                } catch (error) {
                  onError(error instanceof Error ? error.message : 'Invalid world')
                }
              })()
              event.currentTarget.value = ''
            }}
          />
        </label>
        <Button variant="outline" onClick={() => setShowData((value) => !value)}>
          {showData ? 'Hide world data' : 'Show world data'}
        </Button>
      </div>
      {showData && (
        <div>
          <pre className="code-preview world-json" aria-label="Validated world data">
            {JSON.stringify(world, null, 2)}
          </pre>
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard
                .writeText(JSON.stringify(world, null, 2))
                .then(() => onNotice('World data copied.'))
                .catch(() => onError('Clipboard unavailable; select the world data and copy it.'))
            }}
          >
            Copy world data
          </Button>
        </div>
      )}
      <details className="world-edit-details">
        <summary>Save or restore a world</summary>
        <label>
          World name
          <input maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="button-row">
          <Button
            disabled={disabled || !name.trim()}
            title={
              disabled
                ? 'World is locked to the current run. Press Stop & Edit to change it.'
                : !name.trim()
                  ? 'Type a world name first'
                  : 'Save this world to your local collection'
            }
            onClick={() => {
              void onSave(name.trim())
                .then(() => setSavedSnapshot(world))
                .catch(() => undefined)
            }}
          >
            Save world
          </Button>
          <Button
            variant="outline"
            disabled={disabled}
            title={
              disabled
                ? 'World is locked to the current run. Press Stop & Edit to change it.'
                : 'Restore the preset or your latest saved world'
            }
            onClick={() => {
              if (
                window.confirm(
                  'Restore this preset or latest saved world snapshot? Your attempt history will stay available.',
                )
              )
                onWorld(savedSnapshot)
            }}
          >
            Reset world
          </Button>
        </div>
        {savedWorlds.length > 0 && (
          <label>
            Saved world collection
            <select
              defaultValue=""
              onChange={(event) => {
                if (
                  event.target.value &&
                  (!dirty || window.confirm('Replace your edited world with this saved snapshot?'))
                )
                  onLoadSaved(event.target.value)
                event.currentTarget.value = ''
              }}
            >
              <option value="">Choose a saved world…</option>
              {savedWorlds.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </details>
      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      >
        <DialogContent>
          <DialogTitle>Preview imported world</DialogTitle>
          <DialogDescription>
            This file passed version, size, geometry and checksum checks. Apply it to start a new
            run; previous attempts stay saved.
          </DialogDescription>
          {preview && (
            <p>
              {preview.widthCm} × {preview.heightCm} cm · {preview.obstacles.length} obstacles ·{' '}
              {preview.floorZones.length} zones. Robot at {preview.spawn.position.xCm},{' '}
              {preview.spawn.position.yCm} cm.
            </p>
          )}
          <div className="button-row">
            <Button variant="outline" onClick={() => setPreview(null)}>
              Cancel import
            </Button>
            <Button
              onClick={() => {
                if (preview) {
                  onWorld(preview)
                  setSavedSnapshot(preview)
                  setPreview(null)
                  onNotice('World imported after validation and confirmation.')
                }
              }}
            >
              Import this world
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
