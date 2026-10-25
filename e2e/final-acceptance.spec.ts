import { test, expect, type Page } from '@playwright/test'

/** Final acceptance (2026-10-25): a disabled control must say why it is unavailable. Before
 * this, Stop, Stop & Edit, Rewind, Replay, Undo/Redo code and world edits were disabled with
 * no explanation, so they looked broken. Disabled buttons cannot show hover tooltips, so the
 * workbench also prints a visible hint. */
async function disabledWithoutReason(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('main button:disabled')]
      .filter((b) => (b as HTMLElement).offsetParent !== null && !b.closest('.blocklySvg'))
      // A reason on the button or on the locked section that contains it.
      .filter((b) => !(b.closest('[title]')?.getAttribute('title') ?? '').trim())
      .map((b) => b.textContent?.trim() ?? '(unnamed)'),
  )
}

test('every disabled workbench control explains itself, before and after a run', async ({
  page,
}) => {
  await page.goto('/missions/m01?new=1')
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)))
  expect(await disabledWithoutReason(page)).toEqual([])
  await expect(page.getByTestId('toolbar-hint')).toHaveText(
    'Step, Rewind and Replay unlock after you run the program.',
  )
  await expect(page.getByRole('button', { name: 'Rewind', exact: true })).toHaveAttribute(
    'title',
    /Run the program first/,
  )
  await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('goal-outcome')).toBeVisible()
  expect(await disabledWithoutReason(page)).toEqual([])
  await expect(page.getByTestId('toolbar-hint')).toContainText('Press Stop & Edit')
})

test('Free Lab world-edit controls explain why they are disabled', async ({ page }) => {
  await page.goto('/lab?example=24')
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)))
  expect(await disabledWithoutReason(page)).toEqual([])
  await expect(page.getByRole('button', { name: 'Undo world edit', exact: true })).toHaveAttribute(
    'title',
    'No world edit to undo yet',
  )
  await page.getByRole('button', { name: 'Run freely without prediction', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stop & Edit', exact: true })).toBeEnabled()
  expect(await disabledWithoutReason(page)).toEqual([])
})
