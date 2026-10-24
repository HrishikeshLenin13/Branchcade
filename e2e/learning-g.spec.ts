/** Part G browser journeys. Synthetic learners answer from the executable mental models,
 * read through the real UI (probe ids come from the rendered page, never injected). */
import { test, expect, type Page } from '@playwright/test'
import { buildProbe } from '../src/learning/probe-templates'
import type { ModelCode } from '../src/learning/taxonomy'

async function wrongStopAtM01(page: Page) {
  await page.goto('/missions/m01?new=1')
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByTestId('branch-facts')).toContainText('24 < 20 is false')
  await expect(page.getByTestId('diagnosis-headline')).toContainText('4 possible mix-ups')
}
/** Answers adaptive questions as a learner holding `model` would, returning the probe ids. */
async function answerAs(page: Page, model: ModelCode) {
  const asked: string[] = []
  for (let i = 0; i < 4; i++) {
    const question = page.getByTestId('probe-question')
    if (!(await question.count())) break
    const id = (await question.getAttribute('data-probe-id'))!
    asked.push(id)
    const probe = buildProbe(id)!
    const answer = probe.predictions[model]
    const label = probe.choices.find((c) => c.id === answer.replace(/[^\w.-]/g, '_'))!.label
    await question.getByRole('button', { name: label, exact: true }).click()
    await expect(page.getByTestId('probe-feedback')).toBeVisible()
    await expect
      .poll(
        async () =>
          (await question.count()) === 0 || (await question.getAttribute('data-probe-id')) !== id,
      )
      .toBe(true)
  }
  return asked
}

test('same first wrong answer + different follow-ups → different probes, ideas and experiments', async ({
  browser,
}) => {
  const results: { asked: string[]; summary: string; rationale: string }[] = []
  for (const model of ['COMPARATOR_DIRECTION', 'SENSOR_IS_ACTION'] as const) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await wrongStopAtM01(page)
    const asked = await answerAs(page, model)
    await expect(page.getByTestId(`hypothesis-${model}`)).toContainText('Might be')
    const summary = await page.getByTestId('evidence-summary').innerText()
    await page.getByRole('button', { name: 'Generate a targeted experiment', exact: true }).click()
    const rationale = await page.getByTestId('experiment-rationale').innerText()
    results.push({ asked, summary, rationale })
    expect(errors).toEqual([])
    await context.close()
  }
  const [a, b] = results as [(typeof results)[0], (typeof results)[0]]
  expect(a.asked[0]).toBe(b.asked[0])
  expect(a.asked.slice(1)).not.toEqual(b.asked.slice(1))
  expect(a.rationale).toContain('comparison direction')
  expect(b.rationale).toContain('sensor versus instruction')
  expect(a.rationale).not.toEqual(b.rationale)
})

test('investigation helpers, generated experiment slider, transfer and saved evidence after reload', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await wrongStopAtM01(page)
  const first = await page.getByTestId('probe-question').getAttribute('data-probe-id')
  await page.getByRole('button', { name: 'Why are you asking?', exact: true }).click()
  await expect(page.getByTestId('probe-why')).toContainText(
    'Someone who understands it would expect',
  )
  await page.getByRole('button', { name: 'I still don’t get it', exact: true }).click()
  await expect(page.getByTestId('worked-explanation')).toBeVisible()
  await page.getByRole('button', { name: 'Try a different example', exact: true }).click()
  await expect(page.getByTestId('probe-question')).not.toHaveAttribute('data-probe-id', first!)
  await answerAs(page, 'COMPARATOR_DIRECTION')
  await page.getByRole('button', { name: 'Generate a targeted experiment', exact: true }).click()
  // Move the wall with the real slider: the executed comparison must follow the value.
  const slider = page.getByRole('slider', { name: 'Experiment wall distance', exact: true })
  await slider.fill('30')
  await page.getByRole('radio', { name: 'It moves forward', exact: true }).check()
  await page.getByRole('button', { name: 'Lock experiment prediction', exact: true }).click()
  await page.getByRole('button', { name: 'Run experiment', exact: true }).click()
  await expect(page.getByTestId('experiment-facts')).toContainText('30 < 20 is false')
  await expect(page.getByTestId('experiment-facts')).toContainText('matches')
  await slider.fill('12')
  await page.getByRole('radio', { name: 'It stops / stays still', exact: true }).check()
  await page.getByRole('button', { name: 'Lock experiment prediction', exact: true }).click()
  await page.getByRole('button', { name: 'Run experiment', exact: true }).click()
  await expect(page.getByTestId('experiment-facts')).toContainText('12 < 20 is true')
  await page.getByRole('button', { name: 'Explain comparison', exact: true }).click()
  await expect(page.getByTestId('experiment-explanation')).toContainText('The result changed')
  await page.getByRole('button', { name: 'Try another counterexample', exact: true }).click()
  await page.getByRole('button', { name: 'Test my understanding with new numbers' }).click()
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).last().check()
  await page.getByRole('button', { name: 'Lock transfer prediction & reveal' }).click()
  await expect(page.getByTestId('transfer-advice')).toContainText('isn’t mastery')
  await expect(page.getByTestId('why-next')).toContainText('Why this next?')
  await page.getByRole('button', { name: 'Review evidence', exact: true }).click()
  const timeline = page.getByTestId('evidence-timeline')
  await expect(timeline.getByTestId('hypothesis-COMPARATOR_DIRECTION')).not.toContainText(
    'Might be',
  )
  await expect(timeline).toContainText('Mission prediction')
  await expect(timeline).toContainText('Experiment')
  await expect(timeline).toContainText('New-numbers challenge')
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.reload()
  await page.getByRole('button', { name: 'Review evidence', exact: true }).click()
  await expect(page.getByTestId('evidence-timeline')).toContainText('Experiment')
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByTestId('progress-why-next')).toContainText('Why this next?')
  // Both experiment predictions above were correct, which contradicts the earlier idea
  // twice: the concept is no longer flagged, and nothing claims mastery from one session.
  await expect(page.getByTestId('concept-comparisons')).toContainText('Working on it')
  await expect(page.getByTestId('concept-comparisons')).toContainText('Still needed')
  await page
    .getByRole('button', { name: /Review attempt 1/ })
    .first()
    .click()
  await expect(page.getByText(/Experiment \(obstacle distance → 12\)/)).toBeVisible()
  expect(errors).toEqual([])
})

test('a correct prediction is never forced into a diagnosis', async ({ page }) => {
  await page.goto('/missions/m01?new=1')
  await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(page.getByText('Your prediction matches the run.', { exact: false })).toBeVisible()
  await expect(page.getByTestId('probe-question')).toHaveCount(0)
  // Nothing opens by itself. Investigating is the learner's own choice and says so.
  await page.getByRole('button', { name: 'Investigate why', exact: true }).click()
  await expect(page.getByTestId('diagnosis-headline')).toContainText('These questions are optional')
  await expect(page.getByTestId('evidence-summary')).toHaveCount(0)
})

test('free lab can generate a validated experiment from the current world and program', async ({
  page,
}) => {
  await page.goto('/lab')
  await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await page.getByRole('button', { name: 'Generate experiment', exact: true }).click()
  await expect(page.getByTestId('experiment-rationale')).toContainText('change just one thing')
  await page.locator('input[name="experiment-prediction"]').first().check()
  await page.getByRole('button', { name: 'Lock experiment prediction', exact: true }).click()
  await page.getByRole('button', { name: 'Run experiment', exact: true }).click()
  await expect(page.getByTestId('experiment-facts')).toContainText('Your prediction')
})
