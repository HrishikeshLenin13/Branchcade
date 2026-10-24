/** Deterministic documentation preflight, not human-study or eligibility certification. */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import assert from 'node:assert/strict'
const files = [
  'README.md',
  'docs/USER_TESTING.md',
  'docs/USER_TESTING_PROTOCOL.md',
  'docs/USER_TESTING_FORM.md',
  'docs/USER_TESTING_RESULTS.md',
  'docs/DEMO_SCRIPT.md',
  'docs/DEMO_VIDEO_SCRIPT.md',
  'docs/DEMO_STORYBOARD.md',
  'docs/DEMO_RECORDING_CHECKLIST.md',
  'docs/SUBMISSION_GUIDE.md',
  'docs/CONGRESSIONAL_APP_CHALLENGE_2026.md',
  'docs/SOURCE_OWNERSHIP_REVIEW.md',
  'docs/STUDENT_TECHNICAL_REVIEW.md',
  'docs/AI_DISCLOSURE_DRAFT.md',
  'docs/PART_K_ACCEPTANCE.md',
]
let links = 0
for (const file of files) {
  const content = readFileSync(file, 'utf8')
  assert(content.startsWith('# '), `Missing title: ${file}`)
  for (const [, href] of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if (/^(https?:|#|mailto:)/.test(href)) continue
    const path = decodeURIComponent(href.split('#')[0])
    assert(existsSync(resolve(dirname(file), path)), `Broken local link in ${file}: ${href}`)
    links++
  }
}
const workbook = readFileSync('docs/STUDENT_TECHNICAL_REVIEW.md', 'utf8')
const concepts = [...workbook.matchAll(/^## (\d+)\. /gm)].map((m) => Number(m[1]))
assert.deepEqual(
  concepts,
  Array.from({ length: 16 }, (_, i) => i + 1),
)
for (const section of workbook.split(/^## \d+\. /m).slice(1)) {
  for (const required of [
    '**Source:**',
    '**Example:**',
    '**Do:**',
    '**Personally implement:**',
    '**Confirm:**',
  ]) {
    // Section 1 names the source-grounded example "Actual example".
    assert(
      section.includes(required) ||
        (required === '**Example:**' && section.includes('**Actual example:**')),
      `Workbook field missing: ${required}`,
    )
  }
}
for (const file of [
  'docs/USER_TESTING_PROTOCOL.md',
  'docs/USER_TESTING_FORM.md',
  'docs/USER_TESTING_RESULTS.md',
]) {
  assert(readFileSync(file, 'utf8').includes('NOT YET CONDUCTED — AWAITING ACTUAL PARTICIPANTS'))
}
const status = JSON.parse(readFileSync('docs/STATUS.json', 'utf8'))
for (const field of [
  'humanStudy',
  'studentTechnicalReview',
  'ownerDisclosureApproval',
  'videoRecording',
  'videoUpload',
  'eligibilityConfirmation',
  'submissionReadiness',
]) {
  assert.equal(
    status.partK[field],
    'AWAITING OWNER ACTION',
    `Human action falsely completed: ${field}`,
  )
}
// Part K remains a historical prepared checkpoint when a later session authorizes L.
// Keep the cross-record scope consistent without freezing all future progress at K.
assert(['NOT STARTED', 'IN PROGRESS', 'VERIFIED'].includes(status.partK.partL))
assert.equal(status.partK.partL, status.partL?.status ?? 'NOT STARTED')
const rehearsal = JSON.parse(readFileSync('docs/evidence/k/rehearsal.json', 'utf8'))
assert.equal(rehearsal.syntheticDemoOnly, true)
assert.equal(rehearsal.videoRecorded, false)
assert.deepEqual(rehearsal.errors, [])
assert(
  rehearsal.observations.some(
    (o) => o.stage === 'experiment' && o.facts.includes('12 < 20 is true'),
  ),
)
assert(
  rehearsal.observations.some(
    (o) => o.stage === 'experiment' && o.facts.includes('30 < 20 is false'),
  ),
)
assert(rehearsal.observations.some((o) => o.stage === 'progress-after-reload'))
console.log(
  `PASS: ${files.length} Part K documents; ${links} local links; 16 workbook concepts; pending human actions; actual synthetic rehearsal evidence.`,
)
