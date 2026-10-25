import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/** Stored envelope summary, read directly from IndexedDB (synthetic data only). */
const stored = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ attempts: number; drafts: number; exportedAt: string } | null>(
        (resolve, reject) => {
          const open = indexedDB.open('branchcade-local')
          open.onerror = () => reject(open.error)
          open.onsuccess = () => {
            const get = open.result.transaction('app').objectStore('app').get('state')
            get.onsuccess = () => {
              const d = get.result as
                { attempts: unknown[]; drafts: unknown[]; exportedAt: string } | undefined
              resolve(
                d
                  ? {
                      attempts: d.attempts.length,
                      drafts: d.drafts.length,
                      exportedAt: d.exportedAt,
                    }
                  : null,
              )
              open.result.close()
            }
          }
        },
      ),
  )

test('OPUS-001 a stale second tab saving does not erase an attempt recorded in the first tab', async ({
  context,
}) => {
  const a = await context.newPage()
  await a.goto('/missions/m01?new=1')
  await a.getByRole('radio', { name: 'Move forward', exact: true }).check()
  const b = await context.newPage()
  await b.goto('/missions/m03?new=1')
  await expect(b.getByRole('heading', { name: 'Wrong-Way Branch', exact: true })).toBeVisible()
  await a.bringToFront()
  await a.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
  await expect(a.getByText('Your prediction is locked', { exact: true })).toBeVisible()
  await expect.poll(async () => (await stored(a))?.attempts).toBe(1)
  await a.waitForTimeout(600) // let A's trailing draft autosave settle
  const before = (await stored(a))!.exportedAt
  await b.bringToFront()
  await b.getByRole('button', { name: 'Save', exact: true }).click()
  // Wait until B's save has actually been committed before judging what survived.
  await expect.poll(async () => (await stored(b))?.exportedAt).not.toBe(before)
  await b.waitForTimeout(600)
  expect((await stored(b))?.attempts).toBe(1)
  const c = await context.newPage()
  await c.goto('/progress')
  expect((await stored(c))?.attempts).toBe(1)
})

test('OPUS-003 phone-width workstation has no axe violations and the cycle strip is keyboard-scrollable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of ['/missions/m01', '/lab']) {
    await page.goto(route)
    const cycle = page.getByRole('region', { name: 'Learning cycle' })
    await expect(cycle).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.map((v) => v.id)).toEqual([])
    await cycle.focus()
    await expect(cycle).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('End')
    await expect.poll(() => cycle.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0)
  }
})

test('OPUS-004 stage zoom and pan buttons are at least 24 px in both dimensions', async ({
  page,
}) => {
  await page.goto('/missions/m01')
  for (const name of ['Zoom out', 'Zoom in', 'Pan left', 'Pan right', 'Pan up', 'Pan down']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox()
    expect(box!.width, name).toBeGreaterThanOrEqual(24)
    expect(box!.height, name).toBeGreaterThanOrEqual(24)
  }
})

test('OPUS-006 an unknown mission names itself and offers a styled way back', async ({ page }) => {
  await page.goto('/missions/zz-not-a-mission')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mission not found')
  await page.getByRole('link', { name: 'Back to missions', exact: true }).click()
  await expect(page).toHaveURL(/\/missions$/)
})
