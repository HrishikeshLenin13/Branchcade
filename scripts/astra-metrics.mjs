import 'fake-indexeddb/auto'
import { createServer } from 'vite'
import { writeFile } from 'node:fs/promises'
const out = process.argv[2]
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { attemptCollection } = await server.ssrLoadModule('/tests/ij-record-fixture.ts')
  const { saveRebased, clearData, loadData } = await server.ssrLoadModule(
    '/src/storage/repositories.ts',
  )
  const { runModel, clearModelCache } = await server.ssrLoadModule('/src/learning/mental-models.ts')
  const { makeWorld } = await server.ssrLoadModule('/src/engine/world.ts')
  const { thresholdProgram } = await server.ssrLoadModule('/src/missions/catalog.ts')
  const data = await attemptCollection(200)
  const samples = []
  for (let i = 0; i < 5; i++) {
    await clearData()
    const t0 = performance.now()
    const first = (await saveRebased(null, data)).stored
    const t1 = performance.now()
    await saveRebased(first, {
      ...first,
      profile: { ...first.profile, nickname: 'Synthetic benchmark changed' },
    })
    const t2 = performance.now()
    const merged = await saveRebased(first, {
      ...first,
      profile: { ...first.profile, settings: { ...first.profile.settings, theme: 'dark' } },
    })
    const t3 = performance.now()
    const restored = await loadData()
    const t4 = performance.now()
    if (merged.stored.attempts.length !== 200 || restored.attempts.length !== 200)
      throw new Error('Lost records')
    samples.push({ initialMs: t1 - t0, saveMs: t2 - t1, rebaseMs: t3 - t2, loadMs: t4 - t3 })
  }
  clearModelCache()
  const world = makeWorld(),
    program = thresholdProgram()
  let t = performance.now()
  runModel('bench', world, program, 'NO_MISCONCEPTION')
  const coldMs = performance.now() - t
  t = performance.now()
  for (let i = 0; i < 1000; i++) runModel('bench', world, program, 'NO_MISCONCEPTION')
  const warm1000Ms = performance.now() - t
  const report = {
    node: process.version,
    platform: process.platform,
    storage: 'fake-indexeddb; CPU/merge comparison, not real disk latency',
    attempts: 200,
    bytes: Buffer.byteLength(JSON.stringify(data)),
    samples,
    cache: { coldMs, warm1000Ms },
    traces:
      'Attempts store scenario snapshots and trace hashes; complete traces are re-executed, not persisted.',
  }
  await writeFile(out, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report))
} finally {
  await server.close()
}
