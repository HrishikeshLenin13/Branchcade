import { test, expect } from '@playwright/test'
import { DEFAULT_SENSOR } from '../src/engine/world'
import type { World } from '../src/domain/types'

test('I/J layout, disclosure, copy and inspector controls produce their advertised states', async ({
  page,
}) => {
  await page.goto('/lab?example=24')
  await page.getByRole('button', { name: 'Hide code', exact: true }).click()
  await expect(page.locator('.program-panel')).toHaveCount(0)
  await page.getByRole('button', { name: 'Hide trace', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Execution inspector', exact: true })).toHaveCount(
    0,
  )
  await page.getByRole('button', { name: 'Reset layout', exact: true }).click()
  await expect(page.locator('.program-panel')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Execution inspector', exact: true }),
  ).toBeVisible()
  await page.getByRole('slider', { name: 'Editor panel width', exact: true }).fill('31')
  await page.getByRole('slider', { name: 'Inspector panel width', exact: true }).fill('27')
  await expect(page.locator('.workstation-grid')).toHaveAttribute('style', /31%.*27%/)
  await page.getByRole('button', { name: 'Reset layout', exact: true }).click()
  await expect(page.locator('.workstation-grid')).toHaveAttribute('style', /29%.*25%/)
  for (const name of ['Sensor details', 'Robot state']) {
    const button = page.getByRole('button', { name, exact: true })
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('.stage-details').last()).toBeVisible()
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
  }
  // The text version is folded away while the blocks are showing.
  await page.getByText('View pseudocode', { exact: true }).click()
  await page.getByRole('button', { name: 'Copy pseudocode', exact: true }).click()
  await expect(
    page.getByText(
      /Pseudocode copied\.|Clipboard unavailable; select the pseudocode and copy it\./,
    ),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  const inspector = page.getByRole('region', { name: 'Execution inspector', exact: true })
  await expect(inspector).toContainText('events')
  for (const name of ['Live state', 'Why?', 'Variables', 'Program', 'Timeline']) {
    const tab = inspector.getByRole('tab', { name, exact: true })
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
    await expect(inspector.getByRole('tabpanel')).toBeVisible()
  }
  await inspector.getByRole('tab', { name: 'Timeline', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(inspector.getByRole('tab', { name: 'Why?', exact: true })).toBeFocused()
  await inspector.getByRole('tab', { name: 'Timeline', exact: true }).click()
  await inspector.getByRole('combobox', { name: 'Event type', exact: true }).selectOption('compare')
  await expect(inspector.locator('.trace-event')).toHaveCount(1)
  await expect(inspector.locator('.trace-event')).toContainText('compare')
  await inspector
    .getByRole('searchbox', { name: 'Search events', exact: true })
    .fill('no-such-event')
  await expect(
    inspector.getByText('No matching events. Clear the filter to see the recorded run.'),
  ).toBeVisible()
  await inspector.getByRole('searchbox', { name: 'Search events', exact: true }).fill('')
  await inspector.locator('.trace-event').click()
  await expect(inspector.locator('.trace-event')).toHaveAttribute('aria-pressed', 'true')
})

test('I/J colored-zone numeric controls change actual sensing and survive saved-world restore', async ({
  page,
}) => {
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto('/lab?example=24')
  await page.getByRole('button', { name: 'Show world data', exact: true }).click()
  const data = page.getByLabel('Validated world data', { exact: true })
  const world = JSON.parse(await data.innerText()) as World
  await page.getByText('Edit obstacles, zones & robot', { exact: true }).click()
  await page.getByRole('combobox', { name: 'New zone color', exact: true }).selectOption('blue')
  await page.getByRole('button', { name: 'Add colored zone', exact: true }).click()
  const offset = (world.sensorConfig ?? DEFAULT_SENSOR).colorOffset
  await page
    .getByRole('spinbutton', { name: 'Zone X (cm)', exact: true })
    .fill(String(world.spawn.position.xCm + offset.xCm - 5))
  await page
    .getByRole('spinbutton', { name: 'Zone Y (cm)', exact: true })
    .fill(String(world.spawn.position.yCm + offset.yCm - 5))
  await page.getByRole('spinbutton', { name: 'Zone width (cm)', exact: true }).fill('25')
  await page.getByRole('spinbutton', { name: 'Zone height (cm)', exact: true }).fill('25')
  await expect(
    page
      .locator('.readout-row > div')
      .filter({ hasText: 'Surface' })
      .getByText('blue', { exact: true }),
  ).toBeVisible()
  await page.getByText('Save or restore a world', { exact: true }).click()
  await page.getByRole('textbox', { name: 'World name', exact: true }).fill('QA blue sensor zone')
  await page.getByRole('button', { name: 'Save world', exact: true }).click()
  await expect(
    page
      .getByRole('combobox', { name: 'Saved world collection', exact: true })
      .getByRole('option', { name: 'QA blue sensor zone', exact: true }),
  ).toBeAttached()
  await page.getByRole('button', { name: 'Remove zone', exact: true }).click()
  await expect(
    page
      .locator('.readout-row > div')
      .filter({ hasText: 'Surface' })
      .getByText('white', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Reset world', exact: true }).click()
  await expect(
    page
      .locator('.readout-row > div')
      .filter({ hasText: 'Surface' })
      .getByText('blue', { exact: true }),
  ).toBeVisible()
  await expect(data).toContainText('"color": "blue"')
  await page.getByRole('button', { name: 'Hide world data', exact: true }).click()
  await expect(data).toHaveCount(0)
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Clear saved labs', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Clear selected data', exact: true })
    .click()
  await expect(
    page.getByText('The selected local data was cleared.', { exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Lab', exact: true }).click()
  await page.getByText('Save or restore a world', { exact: true }).click()
  await expect(
    page.getByRole('combobox', { name: 'Saved world collection', exact: true }),
  ).toHaveCount(0)
})

test('I/J preference alternatives and storage retry persist honest local state', async ({
  page,
}) => {
  await page.goto('/settings')
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('system')
  await page.getByRole('combobox', { name: 'Text size', exact: true }).selectOption('large')
  for (const label of ['Reduce motion', 'High contrast'])
    await page.getByRole('checkbox', { name: label, exact: true }).check()
  await page
    .getByRole('checkbox', { name: 'Show labels on sensor graphics', exact: true })
    .uncheck()
  await page.getByRole('button', { name: 'Retry storage', exact: true }).click()
  await expect(page.getByText('Current work saved locally.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveValue('system')
  await expect(page.getByRole('combobox', { name: 'Text size', exact: true })).toHaveValue('large')
  await expect(page.getByRole('checkbox', { name: 'Reduce motion', exact: true })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'High contrast', exact: true })).toBeChecked()
  await expect(
    page.getByRole('checkbox', { name: 'Show labels on sensor graphics', exact: true }),
  ).not.toBeChecked()
  await page.getByRole('link', { name: 'Lab', exact: true }).click()
  await expect(page.getByTestId('distance-label')).toHaveCount(0)
})
