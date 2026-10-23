import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
const [mode, input] = process.argv.slice(2)
if (!['baseline', 'modified', 'rollback'].includes(mode) || !input)
  throw new Error('Use baseline|modified|rollback and an explicit file path')
const path = resolve(input),
  data = readFileSync(path)
const original = readFileSync('docs/evidence/f/constants.original.ts')
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
if (sha(original) !== 'c949c4ccce424cbbdd6ac50ed04f51e13635b99414f2b6c3125f90811bf13478')
  throw new Error('Original constants hash changed')
const { LIMITS } = await import(pathToFileURL(path).href)
if (mode === 'modified') {
  if (
    LIMITS.events !== 5000 ||
    LIMITS.ticks !== 20000 ||
    LIMITS.callDepth !== 8 ||
    LIMITS.traceBytes !== 4000000
  )
    throw new Error('F limits mismatch')
  console.log('MODIFIED PASS: events=5000 ticks=20000 callDepth=8 traceBytes=4000000')
} else {
  if (sha(data) !== sha(original) || LIMITS.events !== 2000 || LIMITS.ticks !== 2400)
    throw new Error('Baseline hash/behavior mismatch')
  console.log(`${mode.toUpperCase()} PASS: original hash restored; events=2000 ticks=2400`)
}
