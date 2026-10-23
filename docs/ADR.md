# Architecture decisions

## 001 — One main branch and narrowly authorized scope

User explicitly requested Parts A–C and only main. This overrides the master prompt's phase-branch preference and its broader later-phase continuation language. Preserve the full original specification, append a visible invocation scope to docs/SPEC.md, and track later phases separately. The remote was empty at inspection. No branch deletion or force push was needed.

## 002 — Runtime and dependencies

Node release schedule was fetched from nodejs/Release: Node 24 is maintained through 2028-04-30; Node 26 enters LTS on 2026-10-28. Use maintained Node 24.22.1 for reproducible gates rather than the host's current Node 26.8.1. Vite 8 and Vitest 5 engines permit Node 24. npm owns package-lock.json. React 19, TypeScript 6 strict, React Router 7, Tailwind 4 Vite plugin, Blockly 13, Zod 4, idb 8 and Zustand 5 are used. Current registry engines and Context7 primary-source docs were checked.

ESLint 9.39.5 is retained because the current jsx-a11y peer range excludes ESLint 10. An attempted normal dependency upgrade correctly failed resolution and was not forced. The package marks ESLint 9 unsupported; track this tooling-maintenance limitation and upgrade once the a11y plugin supports 10. npm audit has a separate actual result in TEST_REPORT. No --force or --legacy-peer-deps override.

## 003 — Schemas own external shapes

Zod strict schemas derive all domain types except explicitly recursive AST unions. Imported objects are preflighted iteratively for bytes, depth, count and prototype-sensitive keys before recursive parsing. SHA-256 identities use sorted canonical JSON. Do not treat hashes as authentication against a malicious file author; replay checks establish internal consistency, not authorship.

## 004 — Local data, no backend

Anonymous aliases and records stay in one IndexedDB envelope. A failed storage operation switches to an explicitly noticed in-memory session. Export/import is replacement, not silent merging; existing data remains until validation and confirmation. Remote multiplayer, identities and child accounts are excluded.

## 005 — A representative real learning slice

One actual M01 investigation establishes all seven stages of Part B using real traces, ambiguous hypotheses, discriminating probes, executed counterexamples and a fresh transfer. This proves the A–C foundation without pretending the eight-mission later curriculum exists. Team mode is pass-and-play, not an online classroom. Free lab is not scored as a completed mission.

## 006 — Blockly is data, not execution

Current Blockly ESM language exports and its declarations disagree about the default export. Load the namespace and copy only string entries into setLocale; verified with a headless workspace and production bundling. The typed adapter converts connected supported blocks to AST. Previews are inert escaped text. Blockly is lazy-loaded (~790KB minified at initial measurement); no giant editor is loaded on Home. Code-split warning is documented, not hidden by changing the threshold.

## 007 — No unauthorized deployment claim

Vercel CLI was present, but `vercel whoami` returned an invalid-token error. No credentials were created or copied. Produce tested dist/, SPA configs and exact deployment instructions. A public URL remains an external authorization/deployment action, not a completed feature claim.

## F: version execution independently of the envelope

Changing collision contact, floor tie order, null handling, budgets and event granularity would invalidate A–E attempt hashes. Preserve the original runner/validator/sensors/motion/world validation under `interpreter/legacy`; add optional engineVersion1|2 to execution records without default-inserting a field into old canonical data. New attempts/results explicitly record2. Historical review/import selects the recorded version, while new authoring uses2. Verify fixed pre-F hashes and mixed-version imports. Keep the existing version1 envelope because this is an optional backward-compatible record extension, not a silent rewrite of historical facts. Unknown engine versions fail schema validation.

## F: bounded cooperative stepping and replay

Use explicit cursors and64-step async batches instead of adding a worker transport before it is needed. Set hard instruction, event, tick, call-depth, frame and trace-byte caps and test mid-run cancellation in a browser. Preserve every motion tick in a finite trace; cache20-tick snapshots in a64-slot ring. The rAF display clock never feeds interpolated state back into physics or scoring. Long programs stop transparently at a budget, rather than discarding the start of an evidentiary trace or retaining unbounded history.
