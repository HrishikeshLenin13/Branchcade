import { test, expect, type Page } from '@playwright/test'
import type { AppExport } from '../src/domain/types'
import { readFile } from 'node:fs/promises'

async function stored(page: Page): Promise<AppExport | null> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('branchcade-local')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('app', 'readonly')
          const req = tx.objectStore('app').get('state')
          req.onsuccess = () => resolve(req.result ?? null)
          req.onerror = () => reject(req.error)
          tx.oncomplete = () => db.close()
        }
      }),
  )
}
async function saved(page: Page) {
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(
    page.getByText('World, code and learning stage saved on this device.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('status', { name: 'Local save status' })).toHaveText('Saved locally.')
}

for (const notifications of [true, false]) {
  test(`Astra deletion prevents stale Save and Retry resurrection (BroadcastChannel=${notifications})`, async ({
    context,
  }) => {
    if (!notifications)
      await context.addInitScript(() => {
        Object.defineProperty(window, 'BroadcastChannel', { value: undefined })
      })
    const a = await context.newPage(),
      b = await context.newPage()
    await a.goto('/missions/m01?new=1')
    await saved(a)
    await a.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
    await expect.poll(async () => (await stored(a))?.attempts.length).toBe(1)
    await saved(a)
    await b.goto('/missions/m03?new=1')
    await saved(b)
    await a.goto('/settings')
    await a.getByRole('button', { name: 'Clear learner data', exact: true }).click()
    await a.getByRole('button', { name: 'Clear selected data', exact: true }).click()
    // A fresh remote commit invalidates the deletion review rather than silently
    // deleting unseen data. Exercise that explicit recovery when it occurs.
    await expect
      .poll(
        async () =>
          (await stored(a))?.attempts.length === 0 ||
          (await a.getByRole('dialog').getByRole('alert').count()) > 0,
      )
      .toBe(true)
    if ((await stored(a))?.attempts.length) {
      await expect(a.getByRole('dialog').getByRole('alert')).toContainText('changed in another tab')
      await a.getByRole('button', { name: 'Keep data', exact: true }).click()
      await a.reload()
      await a.getByRole('button', { name: 'Clear learner data', exact: true }).click()
      await a.getByRole('button', { name: 'Clear selected data', exact: true }).click()
    }
    await expect.poll(async () => (await stored(a))?.attempts.length).toBe(0)
    if (!notifications) await b.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(b.getByText(/reset or replaced in another tab/).first()).toBeVisible()
    expect((await stored(b))?.attempts).toHaveLength(0)
    await b.getByRole('button', { name: 'Retry', exact: true }).click()
    await expect(b.getByText(/reset or replaced in another tab/).first()).toBeVisible()
    expect((await stored(b))?.attempts).toHaveLength(0)
    b.once('dialog', (dialog) => void dialog.accept())
    await b.reload()
    await saved(b)
    expect((await stored(b))?.attempts).toHaveLength(0)
  })
}

test('Astra concurrent tabs append attempts, JSON export is coherent, close/reopen preserves both', async ({
  context,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'BroadcastChannel', { value: undefined })
  })
  const a = await context.newPage(),
    b = await context.newPage()
  await a.goto('/missions/m01?new=1')
  await saved(a)
  await b.goto('/missions/m03?new=1')
  await saved(b)
  await Promise.all(
    [a, b].map((p) =>
      p.getByRole('button', { name: 'Lock prediction & run', exact: true }).click(),
    ),
  )
  await expect.poll(async () => (await stored(a))?.attempts.length).toBe(2)
  await Promise.all([a, b].map(saved))
  const expected = (await stored(a))!.attempts
  await a.close()
  await b.close()
  const c = await context.newPage()
  await c.goto('/settings')
  const download = c.waitForEvent('download')
  await c.getByRole('button', { name: 'Export local data', exact: true }).click()
  const content = JSON.parse(await readFile((await (await download).path())!, 'utf8')) as AppExport
  expect(content.attempts).toEqual(expected)
  expect(content.attempts.every((a) => a.learnerId === content.profile?.id)).toBe(true)
})

test('Astra quota failure never announces a successful manual Save', async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener(
      'astra-synthetic-quota',
      () => {
        IDBObjectStore.prototype.put = function () {
          throw new DOMException('Synthetic quota failure', 'QuotaExceededError')
        }
      },
      { once: true },
    )
  })
  await page.goto('/missions/m01?new=1')
  await saved(page)
  const before = await stored(page)
  await page.evaluate(() => window.dispatchEvent(new Event('astra-synthetic-quota')))
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(
    page.getByText('Not saved. Export your current work before closing.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('status', { name: 'Local save status' })).not.toHaveText(
    'Saved locally.',
  )
  expect(await stored(page)).toEqual(before)
})
