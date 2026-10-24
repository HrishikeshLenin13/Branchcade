/* global document, getComputedStyle, innerWidth */
/** Reproducible Part I/J visual/control inventory using the real app.
 * All aliases and observations below are synthetic QA data. No production test hooks,
 * remote student records, or inserted application state are used. */
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const baseURL = process.env.BRANCHCADE_AUDIT_URL ?? 'http://127.0.0.1:4173'
const output = resolve(process.env.BRANCHCADE_AUDIT_OUTPUT ?? '../ij-browser-audit')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
const page = await context.newPage()
const observations = [],
  errors = [],
  requests = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('request', (request) =>
  requests.push({
    method: request.method(),
    type: request.resourceType(),
    origin: new URL(request.url()).origin,
  }),
)
const go = async (path) => {
  await page.goto(baseURL + path)
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.evaluate(() => document.fonts.ready)
}
async function capture(name, observed, fullPage = true) {
  const viewport = page.viewportSize()
  const filename = `${String(observations.length + 1).padStart(2, '0')}-${name}-${viewport.width}x${viewport.height}.png`
  const controls = await page
    .locator('a,button,input,select,textarea,summary')
    .evaluateAll((elements) =>
      elements
        .filter(
          (element) =>
            element.getClientRects().length &&
            getComputedStyle(element).visibility !== 'hidden' &&
            !element.closest('[aria-hidden="true"],[inert]'),
        )
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          label: (
            element.getAttribute('aria-label') ||
            (element.labels
              ? [...element.labels]
                  .map((label) => {
                    const copy = label.cloneNode(true)
                    for (const nested of copy.querySelectorAll('input,select,textarea,button'))
                      nested.remove()
                    return label.getAttribute('aria-label') || copy.textContent
                  })
                  .join(' ')
              : '') ||
            element.textContent ||
            element.getAttribute('title') ||
            ''
          )
            .replace(/\s+/g, ' ')
            .trim(),
          type: element.getAttribute('type'),
          disabled: element.matches(':disabled'),
          href: element.getAttribute('href'),
          pressed: element.getAttribute('aria-pressed'),
          expanded: element.getAttribute('aria-expanded'),
        })),
    )
  const geometry = await page.evaluate(() => ({
    viewport: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  await page.screenshot({ path: resolve(output, filename), fullPage })
  observations.push({
    name,
    route: new URL(page.url()).pathname,
    viewport,
    observed,
    geometry,
    screenshot: filename,
    controls,
  })
  await writeFile(
    resolve(output, 'observations.json'),
    JSON.stringify({ baseURL, observations, errors, requests }, null, 2),
  )
  console.log(
    `${name}: ${controls.length} visible controls; overflow ${geometry.scrollWidth - geometry.viewport}px`,
  )
}
try {
  await go('/')
  await capture(
    'home',
    'Fresh browser: actual sample sensor, mission/lab links and no invented Resume.',
  )
  await page.getByRole('button', { name: 'Credits', exact: true }).click()
  await capture(
    'credits-dialog',
    'Credits opens a named modal with original artwork/fonts and license source.',
  )
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Keyboard help', exact: true }).click()
  await capture(
    'shortcuts-dialog',
    'Keyboard help lists implemented keyboard behavior; Escape closes.',
  )
  await page.keyboard.press('Escape')
  await go('/start')
  await capture('onboarding-mode', 'Three learning modes; initial Back disabled with a reason.')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Your local nickname', exact: true })
    .fill('Curious Zebra 12')
  await capture(
    'onboarding-alias',
    'Synthetic nickname entered; shuffle and local-storage scope visible.',
  )
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('heading', { name: 'How would you like to start?', exact: true }).waitFor()
  await capture(
    'onboarding-destination',
    'Nickname saved; mission/lab/team choices and optional tutorial available.',
  )
  await page.getByRole('button', { name: 'Create my local alias & start', exact: true }).click()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).waitFor()
  await capture(
    'mission-predict',
    'M01 prediction before any result is revealed; code, physical stage and inspector.',
  )
  await page.getByRole('button', { name: 'Mission briefing', exact: true }).click()
  await capture(
    'mission-briefing',
    'Narrative, objective, vocabulary, success scenarios and teacher-note disclosure.',
  )
  await page.keyboard.press('Escape')
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await page.getByTestId('branch-facts').waitFor()
  await capture(
    'mission-compare-probe',
    'Actual24<20 false; wrong prediction opens tentative adaptive investigation.',
  )
  await page.getByRole('combobox', { name: 'Simulation speed', exact: true }).selectOption('0.5')
  await page.getByRole('button', { name: 'Replay', exact: true }).click()
  await capture(
    'mission-running',
    'Replay schedules preserved physical snapshots; Run is replaced by Pause.',
    false,
  )
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('button', { name: 'Why are you asking?', exact: true }).click()
  await capture(
    'probe-rationale',
    'Probe rationale lists competing ideas and their executed predictions.',
  )
  await page.getByRole('button', { name: 'Continue to experiment', exact: true }).click()
  await page.getByTestId('experiment-rationale').waitFor()
  await capture(
    'counterexample-predict',
    'Verified generated single-change experiment; changed result withheld before prediction.',
  )
  await page.locator('input[name="experiment-prediction"]').first().check()
  await page.getByRole('button', { name: 'Lock experiment prediction', exact: true }).click()
  await page.getByRole('button', { name: 'Run experiment', exact: true }).click()
  await page.getByRole('button', { name: 'Explain comparison', exact: true }).click()
  await capture(
    'counterexample-result',
    'Real changed run and baseline comparison are revealed after locked prediction.',
  )
  await page.getByRole('button', { name: 'Test my understanding with new numbers' }).click()
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).last().check()
  await page.getByRole('button', { name: 'Lock transfer prediction & reveal', exact: true }).click()
  await capture(
    'reassessment',
    'Different scenario; actual transfer result, completion checklist and next-activity reason.',
  )
  await page.getByRole('button', { name: 'Review evidence', exact: true }).click()
  await capture(
    'evidence-timeline',
    'Mission, probe, experiment and transfer records remain inspectable.',
  )
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await page.getByRole('heading', { name: 'Your learning notebook', exact: true }).waitFor()
  await capture(
    'progress',
    'Real local synthetic attempt and evidence; no fabricated learner outcomes.',
  )
  await page.getByRole('link', { name: 'Instructor', exact: true }).click()
  await page.getByRole('heading', { name: /Look at the evidence/ }).waitFor()
  await capture(
    'instructor',
    'Actual browser-local report, filters, assignments, export and scoped deletion.',
  )
  await go('/missions')
  await capture(
    'mission-library',
    'Eight real authored missions with metadata, state, prerequisites and real recommendation.',
  )
  await page.getByRole('button', { name: 'Preview', exact: true }).first().click()
  await capture(
    'mission-preview',
    'Read-only objective/world/vocabulary preview does not create an attempt.',
  )
  await page.keyboard.press('Escape')
  await go('/lab?example=24')
  await capture(
    'free-lab',
    'World controls, same authoritative interpreter, optional prediction mode and recovery.',
  )
  await page.getByRole('button', { name: 'Open block editor', exact: true }).click()
  await page.locator('.blocklySvg').waitFor()
  await capture(
    'blockly',
    'Real categorized Blockly workspace and inert preview; no claim of natural block dragging.',
  )
  await go('/team')
  await capture(
    'team-setup',
    'Local2–6 aliases, real mission selection and no account or online-presence claim.',
  )
  await page.getByRole('button', { name: 'Create local team', exact: true }).click()
  await page.getByText(/Pass the device to/).waitFor()
  await capture(
    'team-private-handoff',
    'Pass-device screen hides private predictions before Ready.',
  )
  await page.getByRole('button', { name: /I’m .+ — ready/ }).click()
  await page
    .getByRole('textbox', { name: 'Role contribution', exact: true })
    .fill('Synthetic QA observation: the starting distance is24cm; the comparison selects else.')
  await capture(
    'team-role-contribution',
    'Current role records a meaningful observation and separate prediction before handoff.',
  )
  await go('/settings')
  await capture(
    'settings',
    'Actual appearance/storage/privacy, bounded data import/export and scoped typed deletion.',
  )
  await go('/how-it-works')
  await page.getByRole('button', { name: 'See logic trace', exact: true }).click()
  await capture(
    'how-it-works-trace',
    'Explanation includes a genuinely executed sample trace and accurate limits.',
  )
  await go('/not-a-real-page')
  await capture(
    'not-found',
    'Unknown path retains local data and offers both Home and library recovery.',
  )

  // Six-size structural audit of all routes. Screenshots remain local QA artifacts;
  // only representative manually reviewed frames should be copied into docs/evidence.
  const routes = [
    '/',
    '/start',
    '/missions',
    '/missions/m01?new=1',
    '/lab?example=24',
    '/team',
    '/progress',
    '/instructor',
    '/how-it-works',
    '/settings',
    '/not-a-real-page',
  ]
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1024, 768],
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height })
    for (const route of routes) {
      await go(route)
      await capture(
        `layout-${route.split('?')[0].replaceAll('/', '-') || 'home'}`,
        'Initial route at required viewport; numeric overflow measurement and actual screenshot.',
        false,
      )
    }
  }
} finally {
  await writeFile(
    resolve(output, 'observations.json'),
    JSON.stringify({ baseURL, observations, errors, requests }, null, 2),
  )
  await browser.close()
}
