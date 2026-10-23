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
