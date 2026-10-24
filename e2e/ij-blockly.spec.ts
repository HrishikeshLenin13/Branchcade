/** Actual Blockly context-menu editing. These checks do not claim natural block dragging. */
import { test, expect, type Page } from '@playwright/test'
const topBlocks = (page: Page) =>
  page.locator('.blocklyWorkspace > .blocklyBlockCanvas > .blocklyDraggable')
async function openEditor(page: Page) {
  await page.goto('/lab?example=24')
  await page.getByRole('slider', { name: 'Editor panel width', exact: true }).fill('38')
  await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
  await expect(page.locator('.blocklySvg')).toBeVisible()
}
test('I/J actual Blockly duplicate, undo, redo and delete preserve the applied program', async ({
  page,
}) => {
  await openEditor(page)
  await page.locator('.blocklyBlockCanvas [data-id="threshold"]').click({ button: 'right' })
  await page.getByRole('menuitem', { name: /^Duplicate/ }).click()
  const workspace = (await page.locator('.blocklySvg').boundingBox())!
  // Blockly's Duplicate command starts a pointer placement gesture. Place the copy
  // on the empty lower canvas without requiring the background to receive the click.
  await page.mouse.move(workspace.x + workspace.width - 70, workspace.y + workspace.height - 100)
  await page.mouse.click(workspace.x + workspace.width - 70, workspace.y + workspace.height - 100)
  await expect(topBlocks(page)).toHaveCount(2)
  await page.getByRole('button', { name: 'Apply blocks', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Connect all blocks' })).toBeVisible()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(topBlocks(page)).toHaveCount(1)
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(topBlocks(page)).toHaveCount(2)
  await page
    .locator(
      '.blocklyWorkspace > .blocklyBlockCanvas > .blocklyDraggable:not([data-id="decision"])',
    )
    .click({ button: 'right' })
  await page.getByRole('menuitem', { name: /^Delete Block/ }).click()
  await expect(topBlocks(page)).toHaveCount(1)
  await page.getByRole('button', { name: 'Apply blocks', exact: true }).click()
  await expect(
    page.getByText('Program applied. Record a new prediction to run it.', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
})
test('I/J deleting a required comparison input produces a focusable source error and Undo repairs it', async ({
  page,
}) => {
  await openEditor(page)
  await page.locator('.blocklyBlockCanvas [data-id="threshold"]').click({ button: 'right' })
  await page.getByRole('menuitem', { name: /^Delete Block/ }).click()
  await expect(page.locator('.blocklyBlockCanvas [data-id="threshold"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Apply blocks', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Connect B at condition' })).toBeVisible()
  await page.getByRole('button', { name: 'Go to block', exact: true }).click()
  await expect(page.locator('.blocklyBlockCanvas [data-id="condition"]')).toHaveClass(
    /blocklyHighlighted/,
  )
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('.blocklyBlockCanvas [data-id="threshold"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Apply blocks', exact: true }).click()
  await expect(
    page.getByText('Program applied. Record a new prediction to run it.', { exact: true }),
  ).toBeVisible()
})
