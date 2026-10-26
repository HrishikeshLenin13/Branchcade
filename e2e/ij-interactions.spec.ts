/** Part I/J independent browser audit. These tests use visible controls and real local
 * persistence. Synthetic aliases are test data; no learner records leave the browser. */
import { test, expect } from '@playwright/test'
import { MISSION_CATALOG, MISSION_META } from '../src/missions/catalog'

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]
const ROUTES = [
  '/',
  '/start',
  '/missions',
  '/missions/m01',
  '/lab',
  '/team',
  '/progress',
  '/instructor',
  '/how-it-works',
  '/settings',
  '/not-a-real-page',
]
for (const viewport of VIEWPORTS) {
  test(`I/J all-route layout ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const path of ROUTES) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        path,
      ).toBe(true)
      await expect(page.getByRole('link', { name: 'Branchcade home', exact: true })).toBeInViewport(
        { ratio: 1 },
      )
      await expect(page.getByRole('link', { name: 'Settings', exact: true })).toBeInViewport({
        ratio: 1,
      })
      if (path === '/missions/m01' && viewport.width >= 1181)
        await expect(
          page.getByRole('button', { name: 'Lock prediction & run', exact: true }),
        ).toBeInViewport({ ratio: 1 })
      if (viewport.width <= 900)
        await expect(
          page.getByRole('button', { name: 'Open navigation', exact: true }),
        ).toBeInViewport({ ratio: 1 })
    }
    expect(errors).toEqual([])
  })
}

test('I/J onboarding preserves edits, validates the name and honors a selected controls tutorial', async ({
  page,
}) => {
  await page.goto('/start')
  await page.getByRole('radio', { name: /Learning with a team/ }).check()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  const name = page.getByRole('textbox', { name: 'Your local nickname', exact: true })
  await name.fill('<bad markup>')
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Shuffle name', exact: true }).click()
  await expect(name).not.toHaveValue('<bad markup>')
  await name.fill('Curious Zebra 12')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('radio', { name: /Learning with a team/ })).toBeChecked()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(name).toHaveValue('Curious Zebra 12')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(
    page.getByRole('radio', { name: 'Join team on this device', exact: true }),
  ).toBeChecked()
  await page.getByRole('radio', { name: 'Explore free lab', exact: true }).check()
  await expect(
    page.getByRole('checkbox', { name: 'Show me what each button does', exact: true }),
  ).toBeChecked()
  await page.getByRole('button', { name: 'Create my local alias & start', exact: true }).click()
  await expect(page).toHaveURL(/\/lab\?tour=1$/)
  await expect(page.getByTestId('button-tour')).toBeVisible()
  await page.goto('/progress')
  await expect(page.getByRole('combobox', { name: 'Your lab name', exact: true })).toHaveValue(/.+/)
  await expect(page.getByRole('option', { name: 'Curious Zebra 12', exact: true })).toBeAttached()
})

test('I/J mission sorts, prerequisite practice and read-only preview have their intended results', async ({
  page,
}) => {
  await page.goto('/missions')
  const sort = page.getByRole('combobox', { name: 'Sort', exact: true })
  await sort.selectOption('order')
  await expect(page.locator('.mission-card h2')).toHaveText(MISSION_CATALOG.map((m) => m.title))
  await sort.selectOption('easiest')
  const levels = ['Foundations', 'Intermediate', 'Challenge']
  const easiest = [...MISSION_CATALOG].sort(
    (a, b) =>
      levels.indexOf(MISSION_META[a.id]!.difficulty) -
        levels.indexOf(MISSION_META[b.id]!.difficulty) ||
      MISSION_CATALOG.indexOf(a) - MISSION_CATALOG.indexOf(b),
  )
  await expect(page.locator('.mission-card h2')).toHaveText(easiest.map((m) => m.title))
  await sort.selectOption('recent')
  await expect(page.locator('.mission-card h2')).toHaveText(MISSION_CATALOG.map((m) => m.title))
  await sort.selectOption('recommended')
  const card = page
    .locator('.mission-card')
    .filter({ has: page.getByRole('heading', { name: 'Call the Helper', exact: true }) })
  await card.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Call the Helper')
  await page.getByRole('button', { name: 'Close preview', exact: true }).click()
  const locked = card.getByRole('button', { name: 'Complete prerequisites', exact: true })
  if (await locked.count()) {
    await expect(locked).toBeDisabled()
    await page
      .getByRole('checkbox', {
        name: 'Allow free practice before prerequisites are complete',
        exact: true,
      })
      .check()
    await expect(card.getByRole('link', { name: /Practice mission/ })).toBeVisible()
    await card.getByRole('link', { name: /Practice mission/ }).click()
    await expect(page.getByRole('heading', { name: 'Call the Helper', exact: true })).toBeVisible()
  }
})

test('I/J explanation trace, exact 24cm example and privacy anchor work through actual links', async ({
  page,
}) => {
  await page.goto('/how-it-works')
  const toggle = page.getByRole('button', { name: 'See logic trace', exact: true })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(page.locator('#example-trace')).toContainText('24 < 20 is false')
  await toggle.click()
  await expect(page.locator('#example-trace')).toHaveCount(0)
  await page.getByRole('link', { name: 'Try 24 cm example', exact: true }).click()
  await expect(page.getByRole('img', { name: /Robot world:/ })).toHaveAttribute(
    'aria-label',
    /24.0 centimeters/,
  )
  await page.getByRole('link', { name: 'Privacy', exact: true }).click()
  await expect(page.locator('#privacy')).toBeInViewport()
  await expect(page.locator('#privacy')).toContainText('No registration')
})

test('I/J credits and shortcut dialogs close with restored focus, and both not-found exits work', async ({
  page,
}) => {
  await page.goto('/')
  const credits = page.getByRole('button', { name: 'Credits', exact: true })
  await credits.click()
  await expect(
    page.getByRole('dialog', { name: 'Made for curious roboticists', exact: true }),
  ).toContainText('original SVG')
  await page.keyboard.press('Escape')
  await expect(credits).toBeFocused()
  const keyboard = page.getByRole('button', { name: 'Keyboard help', exact: true })
  await keyboard.click()
  await expect(page.getByRole('dialog', { name: 'Keyboard help', exact: true })).toContainText(
    'Escape',
  )
  await page.keyboard.press('Escape')
  await expect(keyboard).toBeFocused()
  await page.goto('/not-a-real-page')
  await page.getByRole('link', { name: 'Browse missions', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Small programs/ })).toBeVisible()
  await page.goto('/not-a-real-page')
  await page.getByRole('link', { name: 'Back to the lab entrance', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Figure out why your robot did that.', exact: true }),
  ).toBeVisible()
})

test('I/J controlled dialogs across library, mission, progress, instructor, settings and team restore focus', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const openAndClose = async (buttonName: string) => {
    const opener = page.getByRole('button', { name: buttonName, exact: true }).first()
    await opener.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(opener).toBeFocused()
  }
  await page.goto('/missions')
  await openAndClose('Preview')
  await page.goto('/missions/m01?new=1')
  await openAndClose('Mission briefing')
  await openAndClose('Help')
  await openAndClose('Keyboard shortcuts')
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await openAndClose('Clear my progress')
  await page.getByRole('link', { name: 'Instructor', exact: true }).click()
  await openAndClose('Delete all local learner data')
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await openAndClose('Keyboard shortcuts')
  await openAndClose('Erase everything')
  await page.getByRole('link', { name: 'Team mode', exact: true }).click()
  await page.getByRole('button', { name: 'Create local team', exact: true }).click()
  await openAndClose('Edit team')
  await openAndClose('End session')
  await openAndClose('Reset team')
  await page.setViewportSize({ width: 390, height: 844 })
  await openAndClose('Open navigation')
})

test('I/J every shell and explanation link alias follows its actual route and compact menu closes', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const followLink = async (name: string, path: string, from = '/') => {
    await page.goto(from)
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll('?', '\\?')}$`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
  await followLink('Try a mission', '/start')
  await followLink('Branchcade home', '/', '/settings')
  await followLink('Missions', '/missions')
  await followLink('Lab', '/lab')
  await followLink('Team mode', '/team')
  await followLink('Progress', '/progress')
  await followLink('Instructor', '/instructor')
  await followLink('Settings', '/settings')
  await followLink('How it works', '/how-it-works')
  await followLink('Open the lab', '/lab')
  await followLink('Open the guided mission', '/missions/m01')
  await followLink('How Branchcade works', '/how-it-works')
  await followLink('Explore missions', '/missions')
  await followLink('Instructor mode', '/instructor')
  await followLink('About', '/how-it-works')
  await followLink('Privacy', '/settings#privacy')
  await expect(page.locator('#privacy')).toBeInViewport()
  await followLink('View privacy approach', '/settings#privacy', '/how-it-works')
  await expect(page.locator('#privacy')).toBeInViewport()
  await followLink('Try a learning mission', '/missions/m01', '/how-it-works')
  await followLink('Manage your local data', '/settings', '/how-it-works')
  await followLink('About the lab, algorithms and attribution', '/how-it-works', '/settings')
  await page.goto('/')
  const skip = page.getByRole('link', { name: 'Skip to content', exact: true })
  await skip.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  await page.goto('/missions/m01?new=1')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  // Resume appears from the in-memory draft before its IndexedDB write completes.
  // Wait for this explicit save's completion before followLink performs a full reload.
  await expect(
    page.getByText('World, code and learning stage saved on this device.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await expect(page.getByRole('link', { name: 'Resume', exact: true })).toBeVisible()
  await followLink('Resume', '/missions/m01')
  await followLink('Continue learning', '/missions/m01')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await page.getByRole('dialog').getByRole('link', { name: 'Missions', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/missions$/)
})

test('I/J external attribution controls open their declared isolated destinations', async ({
  page,
  context,
}) => {
  // The external service is intercepted: this verifies the real link/popup contract,
  // not live GitHub availability or a learner-content network request.
  await context.route('https://github.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<title>Isolated destination check</title>',
    }),
  )
  await page.goto('/')
  const source = page.getByRole('link', { name: 'Source / GitHub', exact: true })
  await expect(source).toHaveAttribute('rel', 'noreferrer')
  const sourcePopup = page.waitForEvent('popup')
  await source.click()
  const sourcePage = await sourcePopup
  await expect(sourcePage).toHaveURL('https://github.com/HrishikeshLenin13/Branchcade')
  await sourcePage.close()
  await page.getByRole('button', { name: 'Credits', exact: true }).click()
  const license = page.getByRole('link', { name: 'View license notices', exact: true })
  await expect(license).toHaveAttribute('rel', 'noreferrer')
  const licensePopup = page.waitForEvent('popup')
  await license.click()
  const licensePage = await licensePopup
  await expect(licensePage).toHaveURL(
    'https://github.com/HrishikeshLenin13/Branchcade/blob/main/docs/LICENSE_NOTICES.md',
  )
  await licensePage.close()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Credits', exact: true })).toBeFocused()
})

test('I/J solo, team, instructor, tutorial and skip choices open the selected actual screen', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const setup = async (mode: string) => {
    await page.goto('/start')
    await page.getByRole('radio', { name: mode, exact: true }).check()
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Your local nickname', exact: true })
      .fill('Route Tester')
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'How would you like to start?', exact: true }),
    ).toBeVisible()
  }
  await setup('Learning solo')
  await page.getByRole('radio', { name: 'Guided first mission', exact: true }).check()
  await page.getByRole('button', { name: 'Create my local alias & start', exact: true }).click()
  await expect(page).toHaveURL(/\/missions\/m01\?tour=1$/)
  await setup('Learning solo')
  await page.getByRole('radio', { name: 'Explore free lab', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Show me what each button does', exact: true }).uncheck()
  await page.getByRole('button', { name: 'Create my local alias & start', exact: true }).click()
  await expect(page).toHaveURL(/\/lab$/)
  await expect(page.getByTestId('button-tour')).toHaveCount(0)
  await setup('Learning with a team')
  await page.getByRole('radio', { name: 'Join team on this device', exact: true }).check()
  await page.getByRole('button', { name: 'Create my local alias & start', exact: true }).click()
  await expect(page).toHaveURL(/\/team$/)
  await setup('I’m an instructor')
  await page.getByRole('button', { name: 'Create my local alias & start', exact: true }).click()
  await expect(page).toHaveURL(/\/instructor$/)
  await setup('I’m an instructor')
  await page.getByRole('checkbox', { name: 'See a controls tutorial first', exact: true }).check()
  await page.getByRole('button', { name: 'Create my local alias & start', exact: true }).click()
  await expect(page).toHaveURL(/\/how-it-works$/)
  await setup('I’m an instructor')
  await page.getByRole('button', { name: 'Create local group', exact: true }).click()
  await expect(page).toHaveURL(/\/team$/)
  await page.goto('/start')
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click()
  await expect(page).toHaveURL(/\/missions\/m01$/)
  await page.goto('/start')
  await page.getByRole('radio', { name: 'I’m an instructor', exact: true }).check()
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click()
  await expect(page).toHaveURL(/\/instructor$/)
})

test('I/J each mission concept chip toggles a real matching result set', async ({ page }) => {
  await page.goto('/missions')
  for (const name of [
    'Sensors',
    'Comparisons',
    'Conditionals',
    'Loops',
    'Functions',
    'Debugging',
  ]) {
    const chip = page.getByRole('button', { name, exact: false })
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.mission-card')).not.toHaveCount(0)
    const matches = MISSION_CATALOG.filter((mission) =>
      mission.conceptGoals.some((concept) => {
        if (name === 'Sensors') return concept === 'distance-sensors' || concept === 'color-sensors'
        return concept === name.toLowerCase()
      }),
    )
    await expect(page.locator('.mission-card h2')).toHaveCount(matches.length)
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.mission-card')).toHaveCount(8)
  }
  await page.getByRole('link', { name: 'Continue recommended', exact: true }).click()
  await expect(page).toHaveURL(/\/missions\/m01$/)
})

test('I/J mission card start, result and retry links preserve real completed evidence', async ({
  page,
}) => {
  await page.goto('/missions')
  const card = page
    .locator('.mission-card')
    .filter({ has: page.getByRole('heading', { name: 'The Wall Problem', exact: true }) })
  await card.getByRole('link', { name: 'Start mission', exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/missions/m01')
  await expect(
    page.getByRole('main').getByRole('heading', {
      name: 'The Wall Problem',
      level: 1,
      exact: true,
    }),
  ).toBeVisible()
  await page.getByRole('radio', { name: 'Move forward', exact: true }).check()
  await page.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await page.getByRole('button', { name: 'Try a different challenge', exact: true }).click()
  await page.getByRole('radio', { name: 'Stop in place', exact: true }).last().check()
  await page.getByRole('button', { name: 'Lock transfer prediction & reveal', exact: true }).click()
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.getByRole('link', { name: 'Missions', exact: true }).click()
  await expect(card).toContainText('Completed')
  await card.getByRole('link', { name: 'View results', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Attempt 1 replay', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Missions', exact: true }).click()
  await card.getByRole('link', { name: 'Retry', exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/missions/m01')
  await expect(
    page.getByRole('button', { name: 'Lock prediction & run', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Move forward', exact: true })).toBeEnabled()
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Review attempt 1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review attempt 2', exact: true })).toHaveCount(0)
})
