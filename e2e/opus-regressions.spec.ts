import { test, expect, type Page } from '@playwright/test'

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
