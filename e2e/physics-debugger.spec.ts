import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { Program } from '../src/domain/types'
import { makeDefaultWorld } from '../src/engine/world'
const header = (page: Page) => page.locator('.world-panel > .panel-header')
const runButton = (page: Page) =>
  page.getByRole('button', { name: 'Lock prediction & run', exact: true })
async function practice(page: Page, program: Program, name: string) {
  const fixture = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: null,
    attempts: [],
    teams: [],
    savedLabs: [
      {
        schemaVersion: 1,
        id: 'f-practice',
        name,
        updatedAt: new Date().toISOString(),
        world: makeDefaultWorld(),
        program,
      },
    ],
  }
  await page.goto('/settings')
  await page.getByLabel('Import local data', { exact: true }).setInputFiles({
    name: 'f-practice.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  })
  await page.getByRole('button', { name: 'Merge validated import', exact: true }).click()
  await expect(page.getByText('Merged validated local data.', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Lab', exact: true }).click()
  await page.getByText('Save or restore a world', { exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Saved world collection', exact: true })
    .selectOption('f-practice')
}
test('F code/tick steps, pause, rewind, exact explanation and4x replay preserve one attempt', async ({
  page,
}) => {
  await page.goto('/missions/m01?new=1')
  await runButton(page).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
  await page.getByRole('button', { name: 'Reset simulation', exact: true }).click()
  await page.getByRole('button', { name: 'Step tick', exact: true }).click()
  await expect(header(page)).toContainText('Tick 1 · Paused')
  await page.waitForTimeout(150)
  await expect(header(page)).toContainText('Tick 1 · Paused')
  await page.getByRole('button', { name: 'Step code', exact: true }).click()
  await expect(header(page)).toContainText('Tick 10 · Paused')
  await page.getByRole('button', { name: 'Why did that happen?', exact: true }).click()
  await expect(page.locator('.trace-event.selected')).toContainText('compare · condition')
  await expect(page.locator('.trace-event.selected')).toContainText('24 < 20 is false')
  for (const speed of ['1', '4']) {
    await page.getByRole('combobox', { name: 'Simulation speed', exact: true }).selectOption(speed)
    await page.getByRole('button', { name: 'Replay', exact: true }).click()
    await expect(header(page)).toContainText('Tick 10 · Paused')
    await expect(page.getByRole('img', { name: /Robot world:/ })).toHaveAttribute(
      'aria-label',
      /distance 14.0 centimeters/,
    )
  }
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Review attempt 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review attempt 2', exact: true })).toHaveCount(0)
})
test('F pause permits inspection only; Stop & Edit resets before code/world changes', async ({
  page,
}) => {
  await page.goto('/lab?example=24')
  await runButton(page).click()
  await page.getByRole('button', { name: 'Replay', exact: true }).click()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(
    page.getByRole('slider', { name: 'Obstacle distance (cm)', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Apply blocks', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Stop & Edit', exact: true }).click()
  await expect(
    page.getByRole('slider', { name: 'Obstacle distance (cm)', exact: true }),
  ).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Apply blocks', exact: true })).toBeEnabled()
  await page.getByRole('slider', { name: 'Obstacle distance (cm)', exact: true }).fill('32')
  await runButton(page).click()
  await expect(page.getByTestId('branch-facts')).toContainText('32 < 20 is false')
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Review attempt 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review attempt 2', exact: true })).toBeVisible()
})
test('F null comparisons stop at source block and guarded conditions run correctly', async ({
  page,
}) => {
  await page.goto('/lab?example=24')
  await page.getByText('Edit obstacles, zones & robot', { exact: true }).click()
  await page.getByRole('slider', { name: 'Sensor max range (cm)', exact: true }).fill('10')
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'No distance return' }).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Go to block condition', exact: true }).click()
  await expect(page.locator('.blocklySvg')).toBeVisible()
  await expect(page.locator('.blocklyHighlighted')).toHaveCount(1)
  await page.getByRole('button', { name: 'Stop & Edit', exact: true }).click()
  await page.getByRole('slider', { name: 'Sensor max range (cm)', exact: true }).fill('100')
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
})
test('F nominal world, seeded noise and boundary options persist through world export/import', async ({
  page,
}) => {
  await page.goto('/lab?new=1')
  await expect(page.getByTestId('distance-label')).toBeVisible()
  await expect
    .poll(async () => (await page.getByTestId('distance-label').boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(10)
  await page.getByRole('button', { name: 'Show world data', exact: true }).click()
  await expect(page.getByLabel('Validated world data', { exact: true })).toContainText(
    '"widthCm": 600',
  )
  await expect(page.getByLabel('Validated world data', { exact: true })).toContainText(
    '"radiusCm": 16',
  )
  await page.getByText('Edit obstacles, zones & robot', { exact: true }).click()
  const noise = page.getByRole('checkbox', { name: /Simulated bounded noise/ })
  await expect(noise).not.toBeChecked()
  await noise.check()
  await page.getByRole('spinbutton', { name: 'Noise seed', exact: true }).fill('123')
  await page
    .getByRole('checkbox', { name: 'Distance sensor detects world boundaries', exact: true })
    .uncheck()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export world', exact: true }).click()
  const path = await (await download).path()
  const file = JSON.parse(await readFile(path!, 'utf8'))
  expect(file.world.boundaryDetectable).toBe(false)
  expect(file.world.sensorConfig.noiseSeed).toBe(123)
  await page.locator('input[type=file]').setInputFiles(path!)
  await page.getByRole('button', { name: 'Import this world', exact: true }).click()
  await page.getByRole('button', { name: 'Sensor details', exact: true }).click()
  await expect(page.locator('.stage-details')).toContainText('seed 123')
})
test('F panning/zoom hit transforms and SVG snapshot preserve actual world measurements', async ({
  page,
}) => {
  await page.goto('/lab?example=24')
  const stage = page.getByRole('img', { name: /Robot world:/ }),
    original = await stage.getAttribute('viewBox')
  await page.getByRole('button', { name: 'Pan right', exact: true }).click()
  await expect(stage).not.toHaveAttribute('viewBox', original!)
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Snapshot stage', exact: true }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('branchcade-stage-tick-0.svg')
  expect(await readFile((await file.path())!, 'utf8')).toContain('Floor sensor footprint')
  await expect(stage).toHaveAttribute('aria-label', /distance 24.0 centimeters/)
  const obstacle = page.locator('.draggable').first(),
    box = (await obstacle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2, { steps: 5 })
  await page.mouse.up()
  await expect(stage).not.toHaveAttribute('aria-label', /distance 24.0 centimeters/)
  await page.getByRole('button', { name: 'Fit world', exact: true }).click()
  await expect(stage).toHaveAttribute('viewBox', original!)
})
test('F a large looping run remains cancellable and returns to usable editing', async ({
  page,
}) => {
  await practice(
    page,
    {
      schemaVersion: 1,
      id: 'yield-test',
      body: [
        {
          nodeId: 'forever',
          kind: 'while',
          condition: { nodeId: 'always', kind: 'literal', type: 'boolean', value: true },
          body: [],
        },
      ],
    },
    'Yield and cancel test',
  )
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel execution', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Run cancelled' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Stop & Edit', exact: true }).click()
  await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
  await expect(page.locator('.blocklySvg')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Apply blocks', exact: true })).toBeEnabled()
})
test('F turn/wait programs expose every50ms tick instead of action-sized jumps', async ({
  page,
}) => {
  await practice(
    page,
    {
      schemaVersion: 1,
      id: 'turn-wait',
      body: [
        {
          nodeId: 'turn',
          kind: 'turn',
          angle: { nodeId: 'angle', kind: 'literal', type: 'number', value: 90 },
        },
        {
          nodeId: 'wait',
          kind: 'wait',
          durationMs: { nodeId: 'duration', kind: 'literal', type: 'number', value: 100 },
        },
      ],
    },
    'Tick granularity test',
  )
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await expect(header(page)).toContainText('Tick 22 · Paused')
  await page.getByRole('button', { name: 'Reset simulation', exact: true }).click()
  await page.getByRole('button', { name: 'Step tick', exact: true }).click()
  await expect(header(page)).toContainText('Tick 1 · Paused')
  await expect(page.getByRole('img', { name: /Robot world:/ })).toHaveAttribute(
    'aria-label',
    /heading 4.5 degrees/,
  )
  await page.getByRole('button', { name: 'Step code', exact: true }).click()
  await expect(header(page)).toContainText('Tick 20 · Paused')
  await page.getByRole('button', { name: 'Step tick', exact: true }).click()
  await expect(header(page)).toContainText('Tick 21 · Paused')
})

test('F Stop & Edit cancels active computation and unlocks editing in one action', async ({
  page,
}) => {
  await practice(
    page,
    {
      schemaVersion: 1,
      id: 'stop-edit-test',
      body: [
        {
          nodeId: 'forever',
          kind: 'while',
          condition: { nodeId: 'always', kind: 'literal', type: 'boolean', value: true },
          body: [],
        },
      ],
    },
    'Stop and edit test',
  )
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel execution', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Stop & Edit', exact: true }).click()
  await expect(
    page.getByRole('slider', { name: 'Obstacle distance (cm)', exact: true }),
  ).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Cancel execution', exact: true })).toHaveCount(0)
  await expect(
    page.getByText('New attempt ready. Your previous result stays saved locally.', { exact: true }),
  ).toBeVisible()
})

test('F cache-independent source rebuild restores exact selected tick and does not add attempts', async ({
  page,
}) => {
  await page.goto('/missions/m01?new=1')
  await runButton(page).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
  await page.getByRole('button', { name: 'Reset simulation', exact: true }).click()
  await page.getByRole('button', { name: 'Step tick', exact: true }).click()
  await expect(header(page)).toContainText('Tick 1 · Paused')
  await page.getByRole('tab', { name: 'Program', exact: true }).click()
  await page.getByRole('button', { name: 'Rebuild snapshot from source', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Verified source replay:' }),
  ).toContainText('event 4, tick 1. Trace checksum matches; recorded attempt unchanged.')
  await expect(header(page)).toContainText('Tick 1 · Paused')
  await expect(page.getByRole('img', { name: /Robot world:/ })).toHaveAttribute(
    'aria-label',
    /distance 23.0 centimeters/,
  )
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Review attempt 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review attempt 2', exact: true })).toHaveCount(0)
  await page.goto('/missions/m04?new=1')
  await expect(page.locator('svg.world text').filter({ hasText: 'Goal' })).toBeVisible()
})
