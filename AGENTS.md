# Branchcade working instructions

## Scope and source of truth

- Read docs/HANDOFF.md, docs/STATUS.json, docs/SPEC.md, architecture, design system and tests before editing.
- Current user request: implement master-prompt Part F on the updated remote A–E foundation, verify earlier behavior, and push tested checkpoints. Parts G–L do not expand this scope.
- Work only on main. The user's single-branch request overrides the prompt's phase-branch preference. Never force-push or discard user work.
- Start with pwd, git status, remotes, fetch --all --prune, log, source tree and scripts; pull --ff-only only when clean.

## Product and contracts

Branchcade helps beginner roboticists discover why their code behaves as it does. Observe → predict → execute → compare → investigate → experiment → reassess. Derive explanations and goals from actual execution. One wrong answer is not a diagnosis; evidence scores are heuristics, not probabilities. No fabricated outcomes or student contributions.

- Strict TypeScript. Shared types in src/domain/types.ts; runtime boundaries in schemas.ts and invariants.ts. Version persistent data. Coordinates in centimeters; fixed 50ms steps.
- Pure authoritative engine. Validate typed ASTs before bounded interpretation. Never eval, construct Function or execute generated strings. Blockly is an editor, not an execution sandbox.
- Local pseudonyms, no accounts, ads, analytics, child PII or learner-content network calls. Import untrusted JSON with byte/node/depth limits and strict schemas. Unknown versions leave data untouched.
- Immutable prediction/attempt snapshots. No mutable success overrides, invented progress, fake online presence or enabled dead controls.
- Use Context7 for current APIs, shadcn for accessible foundations, Playwright MCP for real interactions and Chrome DevTools for console/network. Figma only with a real referenced design.
- Document limitations honestly. Maintain keyboard, reduced motion, high contrast and recovery. Inspect desktop and Chromebook screenshots.

## Commands and checkpoints

- Maintained Node 24 LTS (see .nvmrc); npm with committed lockfile. npm ci, npm run dev, npm run check, npm run test:e2e.
- Check includes lint, typecheck, unit/integration tests and production build. No hiding failures or blanket skipping tests.
- At tested checkpoints update HANDOFF, STATUS, TEST_REPORT and AI_ASSISTANCE_LOG; scan for secrets; stage relevant files; commit and push main. Verify remote SHA. Do not claim CI/deployment without evidence.
- Record previous verified checkpoint SHAs to avoid self-referential commit hashes.
- Preserve the attached specification/hash. Test rollback on a separate copy, never reset live work automatically.
- Student review of algorithms and AI disclosure stays explicitly uncompleted until performed by the student.

## Reusable continuation prompt

Read AGENTS.md and docs/HANDOFF.md, fetch main, verify status against source and tests, then implement the next unfinished user-authorized scope. Preserve working code and honest evidence. Run gates, inspect the browser, update docs, commit and push only main.
