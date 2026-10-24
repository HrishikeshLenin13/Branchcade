import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
async function runM01(page: Page) {
  await page.goto('/missions/m01?new=1')
  await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
}
async function download(page: Page, label: string) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: label, exact: true }).click()
  const file = await pending
  return {
    name: file.suggestedFilename(),
    data: JSON.parse(await readFile((await file.path())!, 'utf8')),
  }
}
test('I/J optional branch and confidence lock into a real run; summary/share and code-change controls work', async ({
  page,
}) => {
  await page.goto('/missions/m01?new=1')
  await page.getByText('Optional: predict the branch', { exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Will the first condition be true or false?', exact: true })
    .selectOption('else')
  await page.getByText('Confidence & optional reasoning', { exact: true }).click()
  await page.getByRole('slider', { name: 'Prediction confidence', exact: true }).fill('4')
  await page
    .getByRole('textbox', { name: 'Why do you think that? (optional)', exact: true })
    .fill('24 is greater than20, so this condition is false.')
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
  const summary = await download(page, 'Save summary'),
    share = await download(page, 'Share progress')
  expect(summary.name).toBe('branchcade-m01-summary.json')
  expect(summary.data.prediction).toEqual({ action: 'move', confidence: 4 })
  expect(summary.data.goalOutcome.passed).toBe(true)
  expect(share.data).toEqual(summary.data)
  await page.getByRole('button', { name: 'Show decision in timeline', exact: true }).click()
  await expect(page.locator('.trace-event.selected')).toContainText('branch · decision')
  await page.getByRole('button', { name: 'Change code', exact: true }).click()
  await expect(page.locator('.blocklySvg')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Lock prediction & run', exact: true }),
  ).toBeEnabled()
  await page.getByRole('button', { name: 'Close block editor', exact: true }).click()
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  const exported = await download(page, 'Export my progress')
  expect(exported.data.attempts).toHaveLength(1)
  expect(exported.data.attempts[0].prediction.branch).toBe('else')
  expect(exported.data.attempts[0].traceHash).toBe(summary.data.traceHash)
})

test('I/J progress concept evidence, replay, scoped export, retry and recommendation links follow real records', async ({
  page,
}) => {
  await runM01(page)
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await page.getByRole('button', { name: 'View evidence for comparisons', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Evidence for comparisons', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Review attempt 1', exact: true }).first().click()
  await expect(page.getByRole('region', { name: 'Attempt 1 replay', exact: true })).toBeVisible()
  const report = await download(page, 'Export my progress')
  expect(report.name).toBe('branchcade-my-progress.json')
  expect(report.data.attempts).toHaveLength(1)
  expect(report.data.profiles).toEqual([])
  expect(report.data.teams).toEqual([])
  const retry = page.getByRole('link', { name: 'Retry mission', exact: true })
  await expect(retry).toHaveAttribute('href', /\/missions\/m01\?retry=/)
  await retry.click()
  // The workstation consumes the retry ID after restoring the immutable source.
  await expect(page).toHaveURL(/\/missions\/m01(?:\?retry=.*)?$/)
  await expect(
    page.getByRole('button', { name: 'Lock prediction & run', exact: true }),
  ).toBeEnabled()
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  const recommended = page.getByRole('link', { name: 'Start recommended mission', exact: true })
  const destination = await recommended.getAttribute('href')
  await recommended.click()
  expect(new URL(page.url()).pathname).toBe(destination)
})

test('I/J experiment reset/return and transfer retry preserve old evidence while new attempts unlock prediction', async ({
  page,
}) => {
  await runM01(page)
  await page.getByRole('button', { name: 'Investigate why', exact: true }).click()
  await page.getByRole('button', { name: 'Back to mission', exact: true }).click()
  await expect(page.getByTestId('diagnosis-headline')).toHaveCount(0)
  await page.getByRole('button', { name: 'Investigate why', exact: true }).click()
  await page
    .getByRole('button', { name: /Continue to experiment|Generate a targeted experiment/ })
    .click()
  await expect(page.getByTestId('experiment-rationale')).toBeVisible()
  await page.locator('input[name="experiment-prediction"]').first().check()
  await page.getByRole('button', { name: 'Lock experiment prediction', exact: true }).click()
  await page.getByRole('button', { name: 'Run experiment', exact: true }).click()
  await expect(page.getByTestId('experiment-facts')).toContainText('Your prediction')
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).click()
  await expect(page.getByTestId('experiment-facts')).toContainText(
    'Prediction comes before the result',
  )
  await expect(page.getByRole('button', { name: 'Run experiment', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Return to mission', exact: true }).click()
  await expect(page.getByTestId('experiment-rationale')).toHaveCount(0)
  await page.getByRole('button', { name: 'Try a different challenge', exact: true }).click()
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).last().check()
  await page.getByRole('button', { name: 'Lock transfer prediction & reveal', exact: true }).click()
  await expect(page.getByTestId('completion-checklist')).not.toContainText('Not yet:')
  await page.getByRole('button', { name: 'Retry transfer', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Lock transfer prediction & reveal', exact: true }),
  ).toBeEnabled()
  await page.getByRole('radio', { name: 'Move forward', exact: true }).last().check()
  await page.getByRole('button', { name: 'Lock transfer prediction & reveal', exact: true }).click()
  await page.getByRole('link', { name: 'View my progress', exact: true }).click()
  const report = await download(page, 'Export my progress')
  expect(report.data.attempts).toHaveLength(1)
  expect(report.data.attempts[0].experimentResponses).toHaveLength(1)
  expect(report.data.attempts[0].reassessment.correct).toBe(true)
  expect(report.data.attempts[0].transferRetries).toHaveLength(1)
  await page.getByRole('link', { name: 'Retry mission', exact: true }).click()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await page.getByRole('button', { name: 'Start a new attempt', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Lock prediction & run', exact: true }),
  ).toBeEnabled()
})
