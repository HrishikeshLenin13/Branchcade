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

test('the approved Branchcade logo loads in the header, footer and browser tab', async ({
  page,
  request,
}) => {
  await page.goto('/missions/m01')
  for (const selector of ['img.brand-mark', 'img.footer-mark']) {
    const size = await page
      .locator(selector)
      .evaluate((img: HTMLImageElement) => [img.naturalWidth, img.complete])
    expect(size).toEqual([132, true])
  }
  // The visible wordmark keeps the link's accessible name; the mark itself is decorative.
  await expect(page.getByRole('link', { name: 'Branchcade home', exact: true })).toBeVisible()
  await expect(page.locator('img.brand-mark')).toHaveAttribute('alt', '')
  for (const href of ['/favicon-32.png', '/favicon-16.png', '/brand/branchcade-mark.png']) {
    const response = await request.get(href)
    expect(response.status(), href).toBe(200)
    expect(response.headers()['content-type'], href).toContain('image/png')
  }
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute(
    'href',
    '/favicon-32.png',
  )
})

test('mission playback starts slower (0.5×), offers 0.25× and keeps the choice between missions', async ({
  page,
}) => {
  await page.goto('/missions/m01?new=1')
  const speed = page.getByRole('combobox', { name: 'Simulation speed', exact: true })
  await expect(speed).toHaveValue('0.5')
  await expect(speed.locator('option')).toHaveText(['0.25× (slow)', '0.5×', '1×', '2×', '4×'])
  await speed.selectOption('0.25')
  await page.getByRole('link', { name: 'Missions', exact: true }).first().click()
  await page.getByRole('link', { name: 'Lab', exact: true }).first().click()
  await expect(page.getByRole('combobox', { name: 'Simulation speed', exact: true })).toHaveValue(
    '0.25',
  )
})

test('the workbench toolbar is grouped with large, labelled controls', async ({ page }) => {
  await page.goto('/missions/m01?new=1')
  const toolbar = page.locator('.workstation-toolbar')
  await expect(toolbar.getByRole('group')).toHaveCount(4)
  for (const name of ['Run', 'Watch it step by step', 'My program', 'View and help']) {
    await expect(toolbar.getByRole('group', { name, exact: true })).toBeVisible()
  }
  // Kid-sized targets: every toolbar button and the speed menu are at least 40 px tall.
  const short = await toolbar.evaluate((bar) =>
    [...bar.querySelectorAll('button, select')]
      .filter((el) => el.getBoundingClientRect().height < 40)
      .map((el) => el.textContent?.trim() ?? ''),
  )
  expect(short).toEqual([])
})

test('the button tour explains each control, can go back, finish, skip and be reopened', async ({
  page,
}) => {
  await page.goto('/missions/m01?new=1&tour=1')
  const tour = page.getByTestId('button-tour')
  await expect(tour).toBeVisible()
  await expect(tour.getByRole('heading')).toHaveText('Welcome to the workbench!')
  await expect(tour.getByRole('button', { name: 'Back', exact: true })).toBeDisabled()
  await expect(tour.locator('.tour-count')).not.toHaveText('Step 1 of 1')
  const count = await tour.locator('.tour-count').innerText()
  const total = Number(/of (\d+)/.exec(count)![1])
  expect(total).toBeGreaterThanOrEqual(20)
  await tour.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(tour.getByRole('heading')).toHaveText('The robot’s world')
  await tour.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(tour.getByRole('heading')).toHaveText('Welcome to the workbench!')
  // Walk every step; each one names a control that is really on the page.
  const titles: string[] = []
  for (let i = 1; i < total; i++) {
    await tour.getByRole('button', { name: 'Next', exact: true }).click()
    titles.push(await tour.getByRole('heading').innerText())
    await expect(page.locator('.tour-spotlight')).toBeVisible()
  }
  expect(titles).toEqual(
    expect.arrayContaining(['Run', 'Stop & Edit', 'Replay', 'Speed', 'Help', 'Keyboard shortcuts']),
  )
  await tour.getByRole('button', { name: 'Finish', exact: true }).click()
  await expect(tour).toHaveCount(0)
  expect(new URL(page.url()).searchParams.has('tour')).toBe(false)
  // Reopen from the toolbar, then skip; Escape also closes it.
  await page.getByRole('button', { name: 'Button tour', exact: true }).click()
  await expect(tour).toBeVisible()
  await expect(tour.getByRole('button', { name: 'Next', exact: true })).toBeFocused()
  await tour.getByRole('button', { name: 'Skip tutorial', exact: true }).click()
  await expect(tour).toHaveCount(0)
  await page.getByRole('button', { name: 'Button tour', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(tour).toHaveCount(0)
  // The tour never blocks the lesson itself.
  await expect(
    page.getByRole('button', { name: 'Lock prediction & run', exact: true }),
  ).toBeVisible()
})

test('progress charts are drawn from the attempts saved on this device', async ({ page }) => {
  await page.goto('/missions/m01?new=1')
  await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('goal-outcome')).toBeVisible()
  await page.getByRole('button', { name: 'Stop & Edit', exact: true }).click()
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('goal-outcome')).toBeVisible()
  await page.goto('/progress')
  await expect(page.getByTestId('progress-stats')).toContainText(
    '1 of 2predictions matched the real run',
  )
  const bars = page.getByTestId('chart-by-mission')
  await expect(bars.locator('.bar-row')).toHaveCount(1)
  await expect(bars.locator('.bar-seg.series-matched')).toHaveCount(1)
  await expect(bars.locator('.bar-seg.series-different')).toHaveCount(1)
  await bars.getByText('Show these numbers as a table').click()
  await expect(bars.getByRole('row', { name: /M01/ })).toContainText('110')
  await expect(page.getByTestId('chart-timeline').getByRole('img')).toHaveAttribute(
    'aria-label',
    'After 2 attempts, 1 prediction matched the real run.',
  )
})
