import { createServer } from 'vite'
import { performance } from 'node:perf_hooks'
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
// Run manually with node --expose-gc scripts/bench-ij.mjs [output.json]. No timing gates;
// metrics describe this machine, and the production browser suite measures rendering separately.
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: 'error',
})
try {
  const [
    interpreter,
    fixtures,
    models,
    catalog,
    counterexamples,
    taxonomy,
    validation,
    invariants,
    imports,
    records,
  ] = await Promise.all([
    server.ssrLoadModule('/src/interpreter/interpreter.ts'),
    server.ssrLoadModule('/tests/ij-fixtures.ts'),
    server.ssrLoadModule('/src/learning/mental-models.ts'),
    server.ssrLoadModule('/src/missions/catalog.ts'),
    server.ssrLoadModule('/src/learning/counterexamples.ts'),
    server.ssrLoadModule('/src/learning/taxonomy.ts'),
    server.ssrLoadModule('/src/interpreter/validate.ts'),
    server.ssrLoadModule('/src/domain/invariants.ts'),
    server.ssrLoadModule('/src/storage/import-export.ts'),
    server.ssrLoadModule('/tests/ij-record-fixture.ts'),
  ])
  const world = fixtures.obstacleHeavyWorld(),
    program = fixtures.longTraceProgram(),
    results = []
  const measure = async (name, operation, count = 7) => {
    const samples = []
    for (let i = 0; i < count; i++) {
      const begin = performance.now()
      await operation(i)
      samples.push(performance.now() - begin)
    }
    const sorted = [...samples].sort((a, b) => a - b)
    const row = {
      name,
      samplesMs: samples.map((value) => +value.toFixed(3)),
      medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(3),
      maxMs: +sorted.at(-1).toFixed(3),
    }
    results.push(row)
    process.stdout.write(`${name}: median ${row.medianMs} ms, max ${row.maxMs} ms\n`)
  }
  const run = interpreter.execute(world, program)
  if (run.error || run.events.length < 1000)
    throw new Error(`Invalid stress fixture: ${run.error ?? run.events.length + ' events'}`)
  await measure('100 obstacles / 1200+ events execute', () => interpreter.execute(world, program))
  await measure('long trace canonical SHA-256', () => invariants.stableHash(run.events))
  await measure('180-statement AST validation', () =>
    validation.validateProgram(fixtures.largeEditorProgram()),
  )
  const coldCounterexamples = []
  for (const mission of catalog.MISSION_CATALOG) {
    const start = performance.now()
    const search = counterexamples.searchCounterexamples(
      { key: `ij-cold-${mission.id}`, world: mission.world, program: mission.starterProgram },
      taxonomy.HYPOTHESIS_CODES ?? Object.keys(taxonomy.TAXONOMY),
    )
    coldCounterexamples.push({
      missionId: mission.id,
      durationMs: +(performance.now() - start).toFixed(3),
      examined: search.examined,
      ranked: search.ranked.length,
    })
  }
  const collection = await records.attemptCollection(50)
  const rawCollection = imports.exportJson(collection)
  const importBytes = new TextEncoder().encode(rawCollection).byteLength
  await measure(
    '50 executed-record full validated import',
    () => imports.validateImport(rawCollection),
    5,
  )
  const collectionMetrics = { records: collection.attempts.length, importBytes, byteLimit: 500000 }
  models.clearModelCache?.()
  globalThis.gc?.()
  const before = process.memoryUsage().heapUsed
  const retainedRuns = 60
  for (let i = 0; i < retainedRuns; i++)
    models.runModel(`ij-memory-${i}`, world, program, taxonomy.NO_MISCONCEPTION)
  globalThis.gc?.()
  const after = process.memoryUsage().heapUsed
  const output = {
    schemaVersion: 1,
    measuredAt: new Date().toISOString(),
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    runtime: process.version,
    platform: `${process.platform}/${process.arch}`,
    gcAvailable: typeof globalThis.gc === 'function',
    traceEvents: run.events.length,
    traceBytes: new TextEncoder().encode(JSON.stringify(run.events)).length,
    obstacles: world.obstacles.length,
    results,
    coldCounterexamples,
    collectionMetrics,
    cacheStress: {
      runs: retainedRuns,
      heapBeforeBytes: before,
      heapAfterBytes: after,
      deltaBytes: after - before,
      stats: models.modelCacheStats?.() ?? null,
    },
  }
  const destination = resolve(process.argv[2] ?? 'docs/evidence/ij/runtime-performance.json')
  await mkdir(resolve(destination, '..'), { recursive: true })
  await writeFile(destination, JSON.stringify(output, null, 2) + '\n')
  process.stdout.write(
    `Cache stress heap delta: ${((after - before) / 1048576).toFixed(2)} MiB. Saved ${destination}\n`,
  )
} finally {
  await server.close()
}
