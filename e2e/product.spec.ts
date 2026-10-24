import { test, expect } from '@playwright/test'

const outcomes = [
  ['m01', 'The Wall Problem', 'Move forward', 'Stop in place'],
  ['m02', 'Black Line Stop', 'Move forward', 'Move forward'],
  ['m03', 'Wrong-Way Branch', 'Move forward', 'Stop in place'],
  ['m04', 'The Extra Lap', 'Move forward', 'Move forward'],
  ['m05', 'The Loop That Never Ends', 'Stop in place', 'Move forward'],
  ['m06', 'Call the Helper', 'Stop in place', 'Move forward'],
  ['m07', 'Color & Distance', 'Stop in place', 'Move forward'],
  ['m08', 'Mystery Malfunction', 'Move forward', 'Turn'],
] as const
for (const [id, title, initial, transfer] of outcomes) {
  test(`${id} executes its authored program and distinct transfer without page errors`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/missions/${id}?new=1`)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await page.getByRole('radio', { name: initial, exact: true }).check()
    await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
    await expect(page.getByText('Your prediction is locked', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Try a different challenge', exact: true }).click()
    await page.getByRole('radio', { name: transfer, exact: true }).check()
    await page
      .getByRole('button', { name: 'Lock transfer prediction & reveal', exact: true })
      .click()
    await expect(page.getByText(/Your prediction matches the result/)).toBeVisible()
    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText(
      'Saved locally.',
    )
    await page.reload()
    await expect(page.getByText(/Your prediction matches the result/)).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('library filters use authored metadata, OR concepts, preview and recovery', async ({
  page,
}) => {
  await page.goto('/missions')
  await expect(page.getByText('8 missions shown', { exact: true })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search missions' }).fill('function')
  await expect(page.getByText('2 missions shown', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await page.getByRole('button', { name: 'Functions', exact: true }).click()
  await page.getByRole('button', { name: 'Loops', exact: true }).click()
  await expect(page.getByText('5 missions shown', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Difficulty', exact: true }).selectOption('Challenge')
  await expect(page.getByText('1 mission shown', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Mystery Malfunction')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search missions' }).fill('zz-no-match')
  await expect(page.getByRole('heading', { name: 'No missions match', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page.getByText('8 missions shown', { exact: true })).toBeVisible()
})

test('lab edits retain physical sensor truth across world history and import preview', async ({
  page,
}) => {
  await page.goto('/lab?example=24')
  await page.getByText('Edit obstacles, zones & robot', { exact: true }).click()
  await page.getByRole('slider', { name: 'Sensor max range (cm)', exact: true }).fill('10')
  await expect(page.getByRole('img', { name: /Robot world:/ })).toHaveAttribute(
    'aria-label',
    /out of range/,
  )
  await page.getByRole('button', { name: 'Undo world edit', exact: true }).click()
  await expect(page.getByRole('img', { name: /Robot world:/ })).toHaveAttribute(
    'aria-label',
    /24.0 centimeters/,
  )
  await page.getByRole('button', { name: 'Redo world edit', exact: true }).click()
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'No distance return' }).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Stop & Edit', exact: true }).click()
  const file = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export world', exact: true }).click()
  const path = await (await file).path()
  await page.locator('input[type=file]').setInputFiles(path!)
  await expect(page.getByRole('dialog', { name: 'Preview imported world' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel import', exact: true }).click()
  await page.getByRole('button', { name: 'Undo world edit', exact: true }).click()
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
})

test('replay, speed and camera controls preserve one attempt and exact branch evidence', async ({
  page,
}) => {
  await page.goto('/missions/m01?new=1')
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await page.getByRole('button', { name: 'Replay', exact: true }).click()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('button', { name: 'Step code', exact: true }).click()
  await page.getByRole('combobox', { name: 'Simulation speed', exact: true }).selectOption('4')
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.getByRole('button', { name: 'Fit world', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByRole('table')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Review attempt 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review attempt 2', exact: true })).toHaveCount(0)
})

test('a bounded loop imported as synthetic practice stops safely and leaves the editor usable', async ({
  page,
}) => {
  const { FIRST_MISSION } = await import('../src/missions/catalog')
  const fixture = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: null,
    attempts: [],
    teams: [],
    savedLabs: [
      {
        schemaVersion: 1,
        id: 'synthetic-loop-test',
        name: 'Synthetic loop safety test',
        updatedAt: new Date().toISOString(),
        world: FIRST_MISSION.world,
        program: {
          schemaVersion: 1,
          id: 'bounded-loop-test',
          body: [
            {
              nodeId: 'loop',
              kind: 'while',
              condition: { nodeId: 'always', kind: 'literal', type: 'boolean', value: true },
              body: [],
            },
          ],
        },
      },
    ],
  }
  await page.goto('/settings')
  await page.getByLabel('Import local data', { exact: true }).setInputFiles({
    name: 'synthetic-safety-test.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  })
  await page.getByRole('button', { name: 'Merge validated import', exact: true }).click()
  await expect(page.getByText('Merged validated local data.', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Lab', exact: true }).click()
  await page.getByText('Save or restore a world', { exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Saved world collection', exact: true })
    .selectOption('synthetic-loop-test')
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Run budget reached' }).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
  await expect(page.locator('.blocklySvg')).toBeVisible()
})

test('Chromebook keeps prediction action visible with reserved scrollbar space', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/missions/m01?new=1')
  // macOS overlay scrollbars do not consume width; reserve the space used on Linux.
  await page.addStyleTag({ content: 'body { padding-right: 15px; }' })
  await page.evaluate(() => document.fonts.ready)
  await expect(
    page.getByRole('button', { name: 'Lock prediction & run', exact: true }),
  ).toBeInViewport({ ratio: 1 })
})
