import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const [mode, path] = process.argv.slice(2)
const expected = 'f018432925c785df980a763f4da9c7ff9a3433d71ec54c65f2e52308a0a7244d'
const original = readFileSync('docs/evidence/SPEC.original.md')
const sha = (x) => createHash('sha256').update(x).digest('hex')
if (sha(original) !== expected) throw new Error('Original specification hash changed')
const fixture = readFileSync(
  path ?? (mode === 'modified' ? 'docs/SPEC.md' : 'docs/evidence/SPEC.original.md'),
)
const changed = fixture.toString().includes('## Current invocation scope')
if (mode === 'baseline' && !changed && sha(fixture) === expected)
  console.log('BASELINE PASS: scope marker absent')
else if (mode === 'modified' && changed) console.log('MODIFIED PASS: A-C/main scope present')
else if (mode === 'rollback' && !changed && sha(fixture) === expected)
  console.log('ROLLBACK PASS: original restored')
else throw new Error('Specification verification failed')
