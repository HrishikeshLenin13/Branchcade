import { chromium, firefox, webkit, expect } from '@playwright/test'
import { createServer } from 'vite'
import { readFile, writeFile } from 'node:fs/promises'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const results = []
try {
  const { validateImport } = await server.ssrLoadModule('/src/storage/import-export.ts')
  for (const [name, engine] of [
    ['chromium', chromium],
    ['firefox', firefox],
    ['webkit', webkit],
  ]) {
    const browser = await engine.launch()
    try {
      const context = await browser.newContext()
      const a = await context.newPage(),
        b = await context.newPage()
      await a.goto('http://127.0.0.1:4173/missions/m01?new=1')
      await a.getByRole('button', { name: 'Lock prediction & run', exact: true }).click()
      await expect(a.getByTestId('goal-outcome')).toBeVisible()
      await a.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(
        a.getByText('World, code and learning stage saved on this device.', { exact: true }),
      ).toBeVisible()
      await expect(a.getByRole('status', { name: 'Local save status' })).toHaveText(
        'Saved locally.',
      )
      await a.goto('http://127.0.0.1:4173/settings')
      await b.goto('http://127.0.0.1:4173/settings')
      await a.getByRole('button', { name: 'Clear learner data', exact: true }).click()
      const download = b.waitForEvent('download')
      await Promise.all([
        a.getByRole('button', { name: 'Clear selected data', exact: true }).click(),
        b.getByRole('button', { name: 'Export local data', exact: true }).click(),
      ])
      const raw = await readFile(await (await download).path(), 'utf8')
      const exported = await validateImport(raw)
      if (![0, 1].includes(exported.attempts.length)) throw new Error('Incoherent export count')
      for (const draft of exported.drafts)
        if (draft.attemptId && !exported.attempts.some((x) => x.id === draft.attemptId))
          throw new Error('Orphan export draft')
      await a.reload()
      await a.getByRole('link', { name: 'Progress', exact: true }).click()
      await expect(a.getByText('A fresh page', { exact: true })).toBeVisible()
      results.push({
        browser: name,
        version: browser.version(),
        passed: true,
        exportedAttempts: exported.attempts.length,
        finalAttempts: 0,
        replayValidated: true,
        synthetic: true,
      })
    } finally {
      await browser.close()
    }
  }
} finally {
  await server.close()
}
await writeFile(
  'docs/audit/astra/evidence/export-delete-race.json',
  JSON.stringify(results, null, 2) + '\n',
)
console.log(JSON.stringify(results, null, 2))
