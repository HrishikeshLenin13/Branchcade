import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const stage = (page: Page) => page.getByRole('img', { name: /Robot world:/ })
async function worldData(page: Page) {
  const toggle = page.getByRole('button', { name: 'Show world data', exact: true })
  if (await toggle.count()) await toggle.click()
  return JSON.parse(await page.getByLabel('Validated world data', { exact: true }).innerText()) as {
    id: string
    widthCm: number
    heightCm: number
    obstacles: { id: string; kind: string }[]
    floorZones: unknown[]
    spawn: { position: { xCm: number; yCm: number }; headingDeg: number }
  }
}
const acceptConfirm = (page: Page) =>
  page.on('dialog', (dialog) => {
    void dialog.accept()
  })
test('I/J camera toggles, four pan directions and fullscreen preserve physical readings', async ({
  page,
}) => {
  await page.goto('/lab?example=24')
  const svg = stage(page),
    reading = await svg.getAttribute('aria-label'),
    initial = await svg.getAttribute('viewBox')
  await expect(svg.locator('rect[fill^="url("]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Grid', exact: true }).click()
  await expect(svg.locator('rect[fill^="url("]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Grid', exact: true }).click()
  await expect(svg.locator('rect[fill^="url("]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Sensor ray', exact: true }).click()
  await expect(svg.locator('line')).toHaveCount(0)
  await page.getByRole('button', { name: 'Sensor ray', exact: true }).click()
  await expect(svg.locator('line')).toHaveCount(1)
  await page.getByRole('button', { name: 'Follow robot', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Follow robot', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(svg).not.toHaveAttribute('viewBox', initial!)
  for (const direction of ['left', 'right', 'up', 'down']) {
    const before = await svg.getAttribute('viewBox')
    await page.getByRole('button', { name: `Pan ${direction}`, exact: true }).click()
    await expect(svg).not.toHaveAttribute('viewBox', before!)
  }
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
  await page.getByRole('button', { name: 'Fit world', exact: true }).click()
  await expect(svg).toHaveAttribute('viewBox', initial!)
  await expect(svg).toHaveAttribute('aria-label', reading!)
  await page.getByRole('button', { name: 'Fullscreen stage', exact: true }).click()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Boolean(document.fullscreenElement) ||
          document.body.textContent?.includes('Fullscreen is unavailable'),
      ),
    )
    .toBe(true)
  if (await page.evaluate(() => Boolean(document.fullscreenElement))) {
    await page.getByRole('button', { name: 'Fullscreen stage', exact: true }).click()
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false)
  }
  await expect(svg).toHaveAttribute('aria-label', reading!)
  await page.getByRole('button', { name: 'Sensor details', exact: true }).click()
  await expect(page.locator('.stage-details')).toContainText('null')
  await page.getByRole('button', { name: 'Robot state', exact: true }).click()
  await expect(page.locator('.stage-details').filter({ hasText: /^X / })).toContainText('0')
})
test('I/J legal object, zone and robot coordinate edits save and reset a named world', async ({
  page,
}) => {
  acceptConfirm(page)
  await page.goto('/lab?new=1')
  await page.getByRole('combobox', { name: 'New world', exact: true }).selectOption('Empty Room')
  await page.getByText('Edit obstacles, zones & robot', { exact: true }).click()
  await page.getByRole('button', { name: 'Add box', exact: true }).click()
  expect((await worldData(page)).obstacles).toHaveLength(1)
  await page.getByRole('button', { name: 'Add circle', exact: true }).click()
  expect((await worldData(page)).obstacles.map((object) => object.kind)).toEqual([
    'rectangle',
    'circle',
  ])
  await page.getByRole('spinbutton', { name: 'Radius (cm)', exact: true }).fill('8')
  await page.getByRole('button', { name: 'Remove obstacle', exact: true }).click()
  expect((await worldData(page)).obstacles).toHaveLength(1)
  await page.getByRole('spinbutton', { name: 'Obstacle x position (cm)', exact: true }).fill('70')
  await page.getByRole('spinbutton', { name: 'Obstacle y position (cm)', exact: true }).fill('20')
  await page.getByRole('spinbutton', { name: 'Box width (cm)', exact: true }).fill('15')
  await page.getByRole('spinbutton', { name: 'Box height (cm)', exact: true }).fill('15')
  await page.getByRole('spinbutton', { name: 'Robot X (cm)', exact: true }).fill('20')
  await page.getByRole('spinbutton', { name: 'Robot Y (cm)', exact: true }).fill('70')
  await page.getByRole('slider', { name: /Rotate robot/ }).fill('90')
  await expect(stage(page)).toHaveAttribute('aria-label', /heading 90 degrees/)
  await page.getByRole('spinbutton', { name: 'Robot heading (degrees)', exact: true }).fill('45')
  await expect(stage(page)).toHaveAttribute('aria-label', /heading 45 degrees/)
  await page.getByRole('spinbutton', { name: 'Robot heading (degrees)', exact: true }).fill('90')
  await page.getByRole('combobox', { name: 'New zone color', exact: true }).selectOption('blue')
  await page.getByRole('button', { name: 'Add colored zone', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Zone X (cm)', exact: true }).fill('15')
  await page.getByRole('spinbutton', { name: 'Zone Y (cm)', exact: true }).fill('60')
  await page.getByRole('spinbutton', { name: 'Zone width (cm)', exact: true }).fill('25')
  await page.getByRole('spinbutton', { name: 'Zone height (cm)', exact: true }).fill('20')
  await expect(page.locator('.readout-row')).toContainText('blue')
  await page.getByRole('button', { name: 'Remove zone', exact: true }).click()
  await expect(page.locator('.readout-row')).toContainText('white')
  await page.getByRole('button', { name: 'Undo world edit', exact: true }).click()
  await expect(page.locator('.readout-row')).toContainText('blue')
  await page.getByRole('button', { name: 'Redo world edit', exact: true }).click()
  await expect(page.locator('.readout-row')).toContainText('white')
  await page.getByText('Save or restore a world', { exact: true }).click()
  await page
    .getByRole('textbox', { name: 'World name', exact: true })
    .fill('I/J actual control sweep')
  await page.getByRole('button', { name: 'Save world', exact: true }).click()
  await expect(
    page
      .getByRole('combobox', { name: 'Saved world collection', exact: true })
      .getByRole('option', { name: 'I/J actual control sweep', exact: true }),
  ).toHaveCount(1)
  await page.getByRole('spinbutton', { name: 'Robot X (cm)', exact: true }).fill('25')
  await page.getByRole('button', { name: 'Reset world', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: 'Robot X (cm)', exact: true })).toHaveValue(
    '20',
  )
})
test('I/J every preset and world import preview/cancel/confirm changes actual validated geometry', async ({
  page,
}) => {
  acceptConfirm(page)
  await page.goto('/lab?new=1')
  for (const [name, count] of [
    ['Empty Room', 0],
    ['Wall Approach', 1],
    ['Colored Line', 0],
    ['Maze', 2],
    ['Threshold Playground', 1],
    ['Function Route', 0],
  ] as const) {
    await page.getByRole('combobox', { name: 'New world', exact: true }).selectOption(name)
    const world = await worldData(page)
    expect(world.id).toBe(name.toLowerCase().replaceAll(' ', '-'))
    expect(world.obstacles).toHaveLength(count)
  }
  await page.getByRole('combobox', { name: 'New world', exact: true }).selectOption('Wall Approach')
  const exported = await worldData(page),
    download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export world', exact: true }).click()
  const file = await download,
    raw = await readFile((await file.path())!, 'utf8')
  expect(JSON.parse(raw).world).toEqual(exported)
  await page.getByRole('combobox', { name: 'New world', exact: true }).selectOption('Empty Room')
  const input = page.getByLabel('Import world', { exact: true })
  await input.setInputFiles({
    name: 'ij-exported-world.json',
    mimeType: 'application/json',
    buffer: Buffer.from(raw),
  })
  await expect(
    page.getByRole('dialog', { name: 'Preview imported world', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cancel import', exact: true }).click()
  expect((await worldData(page)).obstacles).toHaveLength(0)
  await input.setInputFiles({
    name: 'ij-exported-world.json',
    mimeType: 'application/json',
    buffer: Buffer.from(raw),
  })
  await page.getByRole('button', { name: 'Import this world', exact: true }).click()
  expect(await worldData(page)).toEqual(exported)
})
test('I/J Save, Reset code, Run, Stop and Rewind preserve history; Reset everything unlocks a clean nominal lab', async ({
  page,
}) => {
  acceptConfirm(page)
  await page.goto('/lab?example=24')
  await page.getByRole('spinbutton', { name: 'Threshold (cm)', exact: true }).fill('30')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'World, code and learning stage saved on this device.' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('threshold-readout')).toContainText('< 30')
  await page.getByRole('button', { name: 'Reset code', exact: true }).click()
  await expect(page.getByTestId('threshold-readout')).toContainText('< 20')
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
  await page.getByRole('button', { name: 'Reset simulation', exact: true }).click()
  await page.getByRole('button', { name: 'Step tick', exact: true }).click()
  await page.getByRole('combobox', { name: 'Simulation speed', exact: true }).selectOption('0.5')
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Stopped by learner.' })).toBeVisible()
  const cursor = page.locator('.trace-steps > .mono'),
    before = Number((await cursor.innerText()).split('/')[0])
  await page.getByRole('button', { name: 'Rewind', exact: true }).click()
  await expect(cursor).toContainText(`${before - 1} /`)
  await page.getByRole('button', { name: 'Reset everything', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Lock prediction & run', exact: true }),
  ).toBeVisible()
  expect((await worldData(page)).widthCm).toBe(600)
  await expect(page.getByRole('spinbutton', { name: 'Threshold (cm)', exact: true })).toBeEnabled()
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Review attempt 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review attempt 2', exact: true })).toHaveCount(0)
})
