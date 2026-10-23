import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean)
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9]{36,}/,
  /github_pat_[A-Za-z0-9_]{60,}/,
  /sk-proj-[A-Za-z0-9_-]{30,}/,
]
const found = []
for (const f of files) {
  if (/\.(png|gz|woff2?|zip|tsbuildinfo)$/.test(f)) continue
  const text = readFileSync(f, 'utf8')
  if (patterns.some((p) => p.test(text))) found.push(f)
}
if (found.length) {
  console.error(`Potential secrets in: ${found.join(', ')}`)
  process.exit(1)
}
console.log(`Secret scan passed (${files.length} source/document paths; no matching credentials).`)
