# BRANCHCADE — COMPLETE AUTONOMOUS BUILD SPECIFICATION AND CODEX MASTER PROMPT

**Paste this entire file into Codex while its working directory is your shared `branchcade` Git repository.** It is intentionally self-contained. The same prompt works on Computer 1, Computer 2, or any subsequent computer using a different authorized Codex account. Detect the codebase's state and resume from the next unfinished phase. **Do not build a new app from scratch when a working repository already exists.**

**Project:** Branchcade  
**Product description:** A premium, browser-based robotics learning laboratory that detects *possible programming misconceptions* by testing learners' predictions against the actual results of a deterministic robot simulator, then produces targeted counterexamples and re-tests understanding.  
**Audience:** Beginning robotics students, roughly ages 9–13; STEM/FLL-style instructors; small teams of up to six students.  
**Entry context:** A student-built entry for the 2026 Congressional App Challenge.  
**Primary language:** TypeScript, strict mode.  
**Platform:** Desktop-first WEB APP; optimized for ChromeOS/Chromebooks, Mac/Windows laptop browsers, and teacher projection. It is NOT a native iOS or Android app.  
**Target quality:** An actually functioning, thoroughly tested, visually coherent, production-quality MVP, not a pretty mockup.  
**Rule:** Technical correctness, honest functionality, privacy and accessibility take precedence over sheer number of features.

---

# PART A. OPERATING INSTRUCTIONS FOR CODEX

## A1. Your role and non-negotiable behavior

Act as the coordinated lead of a professional frontend, simulation-engine, applied-algorithms, accessibility, testing, security and instructional-design team. Implement—not just describe—the product specified below. You must write files, execute commands, run the browser, interact with the implemented UI, diagnose errors, repair defects, verify behavior, document results, commit changes, and push them when Git authorization permits.

1. **Inspect first.** On every session: `pwd`, `git status --short --branch`, `git remote -v`, `git log -5 --oneline`, directory tree, package scripts, `AGENTS.md`, `docs/HANDOFF.md`, `docs/STATUS.json`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, and existing tests. If those files do not exist, create them in Phase 00. Never overwrite good existing implementations.
2. **Implement the whole specification in chronological phases.** The canonical phases are 00–11 below. Discover the first phase whose acceptance gate is incomplete using `docs/STATUS.json`, the source tree, and working test evidence. A stale phase marker is not proof of completion; verify. Continue from it. You may progress through multiple phases during one session if possible. At the end of **each** phase, leave a clean, tested, committed and pushed checkpoint so a different computer can pick up immediately. If the user ends a session after a phase, the same master prompt must resume on the next machine with no added explanation.
3. **No empty claims.** Never report a test, screenshot, production deployment, external API connection, GitHub push, or cross-browser check as successful without having performed it. Never fake demo data and present it as a student's real result. If a dependency or external credential is genuinely unavailable, finish all self-contained work, label the feature as not deployed/connected, and describe the one remaining authorized action precisely.
4. **Do not stop to ask about aesthetic preferences, dependencies, colors, tiny design decisions, or implementation details.** Defaults in this specification are authoritative. You may need the human to authorize login, a GitHub remote, a deployment provider, or a child-data/privacy decision; don't invent tokens or bypass authorization. If the environment prohibits pushing, commit locally and provide exact instructions rather than claiming a push.
5. **No arbitrary code execution.** Student-created blocks become an explicitly typed, validated abstract syntax tree (AST), which a bounded deterministic interpreter executes. Never `eval`, `new Function`, unchecked script injection, or execute user-generated Python/JS in the browser context. Blockly code previews are inert text representations.
6. **No fake AI.** The misconception system is a transparent, evidence-based diagnostic algorithm, not an LLM wrapper. It can state "possible misunderstanding" and seek further evidence, never assert certainty about a learner's cognition. All result explanations come from the actual simulator/interpreter trace. Do not invent effectiveness statistics.
7. **Respect the student's work.** AI assistance must be accurately documented for competition disclosure. Add clear comments and plain-English explanations for core algorithms so student creators can inspect, edit, test and explain the actual decisions. Do not fabricate original human authorship or pretend AI tools did not contribute. Include student-review checkpoints in docs.
8. **Security/privacy first.** Some intended users may be under 13. Default to fully local, pseudonymous data, zero child registration, zero advertising, zero third-party analytics, zero external learner-content transmission, and no cloud classroom requiring under-13 personal information. No remote identifiable child profiles. Any optional multi-device service must be disabled until privacy and consent requirements are actually addressed, not quietly exposed as a production feature.
9. **Every visible action must work.** A button that appears enabled must produce its intended action; a disabled control must explain why it is disabled. No '#', `alert('coming soon')`, nonfunctional nav links, fake progress bars, or fictional online presence.
10. **Review the actual browser UI.** Use Playwright MCP to click flows, Chrome DevTools MCP for console/performance investigation, Context7 for current APIs, shadcn MCP for foundations when available; use ordinary Playwright Test/Vitest even when MCP is absent. MCP availability is advisory, never an excuse to skip tests. Screenshots must be inspected at desktop and Chromebook-sized viewports. Prefer custom teaching and simulator UI over generic dashboards.
11. **Production rigor.** Strong typing, explicit data contracts, input validation, deterministic state transitions, guarded persistence migrations, meaningful unit/integration/E2E testing, error boundaries, clear recovery paths, keyboard semantics, reduced motion, and CI.
12. **Avoid unauthorized destructive operations.** No forced Git pushes, secrets in commits, removal of unrelated user changes, suppression of failing tests, or incompatible package changes without a documented migration.

## A2. How shared-computer workflow operates

The Git remote is the shared source of truth, not Codex chat history. Everyone uses a separate account and a permitted GitHub collaborator identity. Separate workstations can consume their respective Codex allowances; do not assume the same account's usage resets just by switching devices.

- Begin with `git fetch --all --prune`; if repository is clean and work is on main, `git pull --ff-only`. If nontrivial uncommitted changes exist, inspect them and preserve them; do not reset.
- Prefer phase branches named `phase-00-foundation`, `phase-01-simulation`, etc. Where a collaborator is already modifying the same area, coordinate via a branch and avoid writing to their files. Merge through a reviewed PR if possible; otherwise fast-forward a verified branch after synchronization.
- After every phase: stage only relevant files; scan for secrets; lint; typecheck; unit tests; E2E impacted flows; production build; update `docs/HANDOFF.md`, `docs/STATUS.json`, `docs/TEST_REPORT.md`, `docs/AI_ASSISTANCE_LOG.md`; commit; push if authorized; record local/remote SHA and what's next.
- Every new session reads the repo and **the current handoff**. Do not assume another agent remembers what happened. If one phase is only partially done, complete it rather than marking it finished by fiat.
- While multiple developers are active, split work by stable boundaries: engine, interpreter, learning algorithms, missions, UI, tests. Domain contracts are versioned and changes communicated in docs; never silently break API shapes.
- If you encounter a failing gate, fix it before proceeding; if impossible due to external access, document and continue with independent work, but do not mark the gate green.
- Do not require a separate prompt, shared chat, external planning service, or a human to paste a second set of instructions. This document is the single complete instruction source. Preserve its essentials into `AGENTS.md` and `docs/SPEC.md` during Phase 00 so a future agent can continue even if an invocation is interrupted.

## A3. Definition of COMPLETE

All functional routes implemented, no deliberate placeholder UI, all planned controls either functional or transparently disabled with a reason, three or more fully working missions plus a larger complete mission curriculum specified below, deterministically correct physics/interpreter, reproducible learning diagnosis and counterexamples, persistent local progress, accessible solo and team sessions, instructor review and export, cohesive visual design, no critical console errors, verified responsive layouts, documented product limitations, passing CI, buildable deployable static bundle, honest competition demo assets, and Git checkpoints after every phase.

Note: No single prompt can guarantee a bug-free or deployed production app, and external accounts are not magically created. Prove completion through commands and evidence rather than through language.

---

# PART B. THE PRODUCT VISION AND NON-NEGOTIABLE DIFFERENTIATION

## B1. Actual problem from the founder's experience

The creator taught a small group of approximately six younger robotics students, roughly 9–10 years old or sixth grade. Team members argued about roles, avoided tasks outside their comfort zones, struggled to grasp sensors beyond knowing their practical purpose, and sometimes disengaged from lessons. One student struggled with conditionals and functions for months despite individual attention and opportunities to explain their thinking. The creator wished for an engaging way to visualize the logic behind a robot's behavior and help learners practice independently.

**Do not exaggerate or invent classroom outcomes** or claim these difficulties apply to all learners. The app directly addresses: "A beginner can successfully copy robot code without knowing why it behaves as it does; when stuck, general hints and another lecture may not reveal the exact misunderstanding."

## B2. One-sentence promise

**Branchcade helps beginner roboticists discover why their code behaves the way it does by turning predictions, sensor readings, and program execution into personalized hands-on experiments.**

Tagline: **Make the logic click.** (Internal default; editable in copy constants.)

**Core learning cycle** (each stage is implemented, not decorative):

1. **Observe** the virtual world, sensor and selected program.
2. **Predict** what will happen before pressing Run; record confidence and optional rationale.
3. **Execute** the program in a deterministic simulator with traceable measurements.
4. **Compare** expected versus actual behavior, with highlighted decision points.
5. **Investigate** with carefully chosen diagnostic probes that distinguish plausible errors.
6. **Experiment** with a generated counterexample, manipulate sensor distance/threshold/environment and observe differences.
7. **Reassess** with a *different* transfer problem; update confidence about the concept without claiming mastery from one attempt.

If a student knows the answer, the system should let them progress without forcing pointless remedial exercises. If several hypotheses fit, it should say so and ask another discriminating question. If a learner gets stuck, let them examine a worked model and retry without shame.

## B3. Scope and boundaries

In-scope: deterministic robot worlds, Blockly visual programming, restricted function/variable features, live inspection, error diagnosis, targeted counterexample generation, scaffolded missions, solo learning, pass-and-play collaboration for up to six students, instructor-facing review of **local anonymous group results**, accessible design, data export/import/delete, automated tests and public deployment.

Out of scope for the competition release: native mobile apps; real LEGO hardware control; unrestricted Python execution; generative model dependence; medical diagnosis; internet chat among children; public usernames or leaderboards; remote identity tracking; social feeds; unverified learning-outcome efficacy claims; personal data collection from children; payments; ads. Avoid cramming these in purely to inflate feature count.

## B4. Product success criteria

1. A beginner understands why a program with `if distance < 20` moves when the reading is 24 cm; the explanation must show actual values and branch selection.
2. Two learners can give identical first wrong answers and later receive *different targeted practice* if their diagnostic evidence diverges.
3. Changing a sensor threshold or dragging an obstacle changes the executed behavior immediately and correctly; no prerecorded simulation.
4. Every mission can be completed via actual logical state evaluation, not an always-pass flag.
5. A six-person team can rotate responsibilities without any child creating an online account.
6. A teacher can view real local attempts, see which concepts a group found challenging, export a report and delete the information.
7. A new person can open the hosted web app and complete a real mission without a manual onboarding explanation.

---

# PART C. TECHNICAL PLATFORM, DEPENDENCIES AND PROJECT CONTRACTS

## C1. Stack (make these defaults authoritative)

- **App:** React + Vite + TypeScript strict; React Router where needed for routes; no SSR/backend required for core product.
- **Styling:** Tailwind CSS current stable supported by Vite, CSS custom properties as design tokens, selective shadcn/ui and Radix primitives for accessible low-level controls, lucide-react icons; *custom* simulator, trace, graph, and mission UI.
- **Visual editor:** Google Blockly with JSON serialization and a typed Blockly→AST adapter. Export readable JavaScript-style and pseudocode previews, but *never execute their strings*.
- **Robot world:** Pure TypeScript state machine; SVG for accessible stage representation plus optionally Canvas 2D for smooth rendering, derived from one authoritative simulation state. Avoid heavyweight game engines unless needed and measured.
- **Core data:** Zod validation for mission documents and persistence schemas, `idb`/Dexie IndexedDB, versioned export/import. Zustand only for UI/session orchestration, not duplicate physics logic.
- **Testing:** Vitest; Testing Library/user-event; Playwright Test; axe-core/axe-playwright; ESLint; TypeScript compiler; GitHub Actions. Optional Lighthouse CI for budget checks.
- **MCP use when available:** Playwright MCP for interactive click-through, Chrome DevTools MCP for profiling/console/network, Context7 MCP for current docs, shadcn MCP for primitives, optional Figma MCP *only if a real referenced design exists*. Never claim MCP ran if not connected. Do not install irrelevant servers for decoration.
- **Deployment:** Static web build deployed to a connected Vercel/Netlify/Cloudflare Pages account, or any equivalent static hosting. With no hosting authorization, produce a deploy-ready `dist/` and documented instructions; do not claim a live site exists.
- **No API secrets and no mandatory cloud account.** Single-device collaborative mode and local group reporting are complete first-class features, not fallback mockups. Remote multiplayer would be a distinct privacy-reviewed project.
- **Package manager:** npm with `package-lock.json`; Node active maintained LTS satisfying toolchain. Verify compatibility before pinning; avoid relying on recalled stale version numbers.

## C2. Required repo structure

```
branchcade/
  public/
    assets/                          # original illustrations, optional icons
  src/
    app/                             # router, providers, error boundaries, shells
    components/
      ui/                            # buttons, dialogs, inputs, toasts, etc.
      layout/                        # top bar, panels, footers, navigation
      illustration/                  # reusable original drawings
    domain/
      types.ts                       # stable shared types
      constants.ts
      schemas.ts                     # validated external/persisted inputs
      invariants.ts
    engine/
      geometry.ts                    # pure collision, raycast, paths
      world.ts                       # world generation and fixtures
      robot.ts                       # physics/kinematics
      sensors.ts
      reducer.ts                     # deterministic simulation transitions
      replay.ts
    interpreter/
      ast.ts
      validate.ts
      block-definitions.ts
      blockly-adapter.ts
      interpreter.ts
      debugger.ts
      trace.ts
      pseudocode.ts
    learning/
      predictions.ts
      hypothesis-library.ts
      evidence-engine.ts
      probes.ts
      counterexamples.ts
      adaptive-planner.ts
      mastery.ts
      recommendations.ts
    missions/
      catalog.ts
      mission-data/                   # mission JSON or typed configs
      validation.ts
      goals.ts
      scoring.ts
    collaboration/
      roles.ts
      rotation.ts
      session.ts
      evidence-cards.ts
    storage/
      db.ts
      migrations.ts
      repositories.ts
      import-export.ts
    features/
      home/
      onboarding/
      missions/
      lab/
      inspector/
      diagnosis/
      experiments/
      progress/
      team/
      instructor/
      settings/
      about/
    styles/
      tokens.css
      globals.css
    test/                             # shared fixtures/helpers
  tests/                              # domain integration tests
  e2e/                                # browser journeys and accessibility
  docs/
    SPEC.md
    ARCHITECTURE.md
    DESIGN_SYSTEM.md
    ADR.md
    HANDOFF.md
    STATUS.json
    TEST_REPORT.md
    AI_ASSISTANCE_LOG.md
    USER_TESTING.md
    SECURITY_PRIVACY.md
    SUBMISSION_GUIDE.md
    DEMO_SCRIPT.md
    LICENSE_NOTICES.md
  .github/workflows/ci.yml
  .env.example                      # only optional *nonsecret* flags, if any
  AGENTS.md
  README.md
  package.json
  package-lock.json
```

## C3. Data contracts — define FIRST in one place

Exact names may adapt, but these semantics must be stable, serializable, versioned and tested:

- `Vec2`: `{xCm:number, yCm:number}`.
- `Obstacle`: `id`, kind (`rectangle | circle`), position, dimensions/radius, solid, visual material. Bound-check and reject impossible geometry.
- `FloorZone`: polygon or rectangle with color enum (`white | black | red | blue | green | yellow`), priority, exact containment rules.
- `World`: stable `id`, schemaVersion, width/height cm, obstacles, floorZones, waypoints, spawn, goals, collision constraints, optional difficulty.
- `RobotState`: `position`, `headingDeg`, `radiusCm`, `speedCmPerSec`, `turnDegPerSec`, `battery` cosmetic? (omit unless functional), `status`, `collision`, `simTimeMs`, `tick`, `stopReason`.
- `SensorConfig`: maxRangeCm, origin offset, reading frequency, optional deterministic noiseSeed, color sensor offset, normalization rules.
- `SensorSnapshot`: distanceCm (`number | null` with null meaning out of range), surfaceColor, position, heading, tick, metadata on measurement ray.
- `Expression` AST: literals, sensor readings, variables, arithmetic (safe division), numeric/color comparisons, boolean and/or/not. Every expression has stable `nodeId` and type.
- `Statement` AST: move/turn/stop/wait, if/else, repeat, while, variable set, function declaration/call, log/inspect optional. No arbitrary JS. Program is versioned and validated.
- `ExecutionEvent`: seq, tick, elapsed time, `nodeId`, event kind, before/after robot state, sensor snapshot, evaluated expression/operands/result, variables, stack depth, explanation facts, cause/collision if any.
- `SimulationSnapshot`: worldId, programHash, eventCursor, robotState, interpreterState, deterministic RNG state (if used), trace id.
- `Prediction`: question, programHash, worldHash, learner alias id, selected predicted action, branch and optional distance range, confidence (1–5), optional reasoning, recordedAt BEFORE reveal.
- `Probe`: id, targetHypotheses, input scenario, choices/interaction, correct outcome, rationale/explanation, discrimination table.
- `EvidenceItem`: reference to exact answer/trace/scenario, supports/contradicts hypothesis, weight and rule reason; no invented model confidence.
- `Hypothesis`: code, human title, learner-friendly text, evidence[], contradictions[], status `unverified | possible | evidence_for | evidence_against`, normalized support score (heuristic, NOT statistical probability), next probe if needed.
- `Counterexample`: changed parameters, baseline and changed trace, targeted hypotheses, predicted outcome under each model, rationale, validation checksum, no-candidate reason if none.
- `LearnerProfile`: random pseudonym id and optional selected nonidentifying nickname, accessibility settings, completed missions, responses, evidence, concept progress; no age, email or real name field required.
- `Mission`: id, version, title, concept goals, prerequisite ids, world, starter program, success predicate, failure explanation, variants, role evidence assignments, target completion steps, recommended probe bank.
- `Attempt`: unique id, learnerId, missionId, attemptIndex, started/completed timestamp, prediction, program snapshot, traceHash, diagnostic responses, reassessment result, actual goal outcome; not mutable to fabricate success.
- `TeamSession`: local id, up to 6 alias members, assigned role, rotation index, current mission, shared evidence board, each individual's prediction, chronological actions, status.
- `AppSettings`: theme, reducedMotion, audioEnabled, hintsMode, textSize, highContrast, keyboard shortcuts overlay preferences, lastOpenedMission.

All persistent records have schema versions, validated import, deterministic migration and explicit unknown-data fallback. Use opaque IDs with `crypto.randomUUID()` where supported; canonical serialization and stable hashes for program/world identity. Do not trust imported JSON.

## C4. Core invariant list

- World and robot coordinates are in **centimeters**, not pixels. Rendering may use a camera scale but physics cannot depend on CSS dimensions.
- Single authoritative engine; browser visuals, trace, instructor metrics and diagnostic results all derive from it.
- Fixed time step (for example 50 ms) for simulation updates, completely deterministic for identical world/program/seed.
- A sensor's observation **does not itself initiate movement or stopping**; program logic does.
- A paused run never moves the robot. A reset restores exact initial state and can reproduce identical trace.
- Predictions cannot be edited after results become visible. Reattempts create new immutable predictions.
- An incorrect answer alone is **insufficient** to assert a unique misconception. Include uncertainty and distinguishing probes.
- A mission's goal is judged from actual simulated behavior and configured constraints.
- Correct answer explanations use evaluated real operands (e.g. `24 < 20` is false), not hardcoded mission copy.
- Imported student data cannot cause code execution, arbitrary HTML, unbounded memory use or trace hangs.
- The learner can complete the full experience without an account, internet connection after load (where cached), paying, or identifying information.
- Instructor metrics describe evidence observed in this local browser, not an entire remote classroom.

---
# PART D. VISUAL IDENTITY — BUILD AN ACTUAL PRODUCT, NOT A GENERIC AI DASHBOARD

## D1. Art direction

Branchcade should look like an instrument panel from a delightful, carefully engineered educational robotics product: **warm editorial UI meets precise technical lab**. Serious enough for judges and instructors, delightful enough for a curious ten-year-old. The centerpiece is the robot stage, not a chat interface, a wall of statistic cards, or a cartoon mascot.

- Visual tone: friendly, clever, tactile, understated, confident, crisp.
- Layout: large simulation stage; code and trace as distinct supporting instruments; high hierarchy; proper negative space; no random empty cards.
- Light palette baseline: Canvas `#F6F4EF`, paper `#FFFFFF`, primary text `#17212B`, secondary text `#596675`, hairline `#DDE2E4`, focused blue `#30759A`, interactive amber `#E7A446`, success `#31836C`, error `#BE5651`, accent deep `#253D46`.
- Dark lab palette: stage `#14212A`, world background `#192832`, grid `#2B404B`, path/sensor cyan `#6CC4D3`, robot chassis amber `#EDB651`, error coral `#EE8373`, cyan/amber reserved for meaning.
- Typography: clean geometric/neutral humanist sans (Geist or equivalent self-hosted/open font when license allows); IBM Plex Mono or system monospace for code, time, measurements and trace. Avoid decorative futuristic lettering for important content.
- Corner radii: 8–12px for controls/panels, 14–18px for major containers, 999px only for small chips. Shadow extremely subtle; rely on boundaries and layering.
- Motion: robot accelerates/turns smoothly between *real* engine states; trace highlights selected step; panels resize smoothly; hover and focus are responsive. Animation must never rewrite physics or conceal failures. Respect `prefers-reduced-motion`.
- Original illustrations: custom SVG robot, obstacle types, color tiles, sensor beam with measured ray, start/goal markers, course badges. Do NOT borrow LEGO logos, photographs or proprietary parts that imply official affiliation.
- No "AI slop": no generic purple/cyan gradients, endless floating glass cards, 3D orbit blobs, random emojis, unsolicited AI bot faces, contrived testimonials, filler marketing hype, extraneous charts, 3D space decoration, or cloned shadcn demo dashboard.
- No "childish slop" either: avoid preschool aesthetic. Teach through direct manipulation, tactile controls and satisfying meaningful feedback.

## D2. Design token architecture

Implement tokens in CSS custom properties; Tailwind references them. Define surface layers, text colors, line colors, focus rings, selected/highlight, syntax semantic colors, stage grid, radii, spacing scale 4/8/12/16/24/32/48, typography scale, z-index conventions, transitions, and component states. Support light app shell with dark stage, plus optional full dark preference when viable. Test WCAG AA text contrast; do not rely solely on color to show correct/incorrect states. Numeric readouts use tabular figures.

## D3. Responsive layout requirements

- Primary target widths: 1366×768 Chromebook, 1440×900 laptop, 1920×1080 desktop.
- Below ~1200px: side inspector collapses into resizable drawer or bottom tabs; simulation remains visible.
- 1024px/tablet landscape: two panels or tabs; no horizontally clipped editor; toolbar remains accessible.
- Narrow 768px: editor/simulation/trace in a sensible tabbed stack; full functionality if practical, but explicitly emphasize laptop recommended.
- 390px phone: landing/onboarding/help/mission list readable and safe; full Blockly editor may show a friendly "best on laptop" advisory with a functional simplified view rather than pretending the mobile editor is optimized. Do not build a separate mobile app.
- Prevent global horizontal overflow, accidental inaccessible fixed-height sections, pointer targets smaller than 40px where possible, and giant headers that push main content offscreen.
- Simulator resizing may change camera scale but never robot world coordinates or sensor distances.

## D4. Navigation, transitions and shared components

Main routes (exact names can be optimized, but all must exist and be meaningful):

`/` Home  •  `/start` Onboarding  •  `/missions` Mission library  •  `/missions/:slug` Mission view  •  `/lab` Free lab  •  `/team` Team setup and session  •  `/progress` My learning  •  `/instructor` Local instructor view  •  `/how-it-works` Explanation of algorithms  •  `/settings` Privacy/accessibility/import/export  •  `*` Not-found recovery.

Global header:
- Logo `branchcade.` opens Home and preserves autosaved work.
- `Missions` opens library; `Lab` opens free simulator; `Team Mode` opens local cooperative mode; `Progress` opens local learner record; `Instructor` opens group view.
- `How it works` link explains physics and evidence-based learning.
- `Settings` icon opens settings; active page visible; hamburger menu on narrow screens with accessible open/close and focus trap.
- Global keyboard shortcut `?` opens shortcuts dialog when not typing; Escape closes transient dialogs; do not steal keys inside Blockly/inputs.
- Global `Resume` CTA appears only if real saved in-progress session exists and points to it. No invented progress.
- Toasts use accurate messages ("Program saved locally", "Imported 3 missions", "No matching counterexample found"); use `aria-live` politely, persistent errors for crucial faults.

Shared components: button variants, segment switch, toggle, tabs, slider+numeric input, labeled select, text field, checkbox, radio, tooltip, info popup, modal, confirmations for destructive actions, loading skeleton, error/empty panel, keyboard hints, metric readout, resize handle, timeline marker, explanation card, progress indicator, focus outline, toast/announcer.

Every control has loading, disabled, error and successful behaviors when applicable. Include visible accessible labels for icon-only buttons.

---

# PART E. COMPLETE SCREEN-BY-SCREEN AND BUTTON-BY-BUTTON INTERACTION SPEC

## E1. Home `/`

**Intent:** In 10 seconds show what Branchcade is, whom it helps, and a route into a real activity. This is a polished application landing, not a generic SaaS marketing page.

Above fold: brand, short headline "Figure out why your robot did that.", two-line promise, an original animated but state-grounded schematic mini robot scene, a sample `24 cm < 20 cm` branch comparison, meaningful CTAs, brief three-step flow.

**Every control:**
- `Try a mission` → immediately opens Mission 01 first-time flow (or `/start` if first visit).
- `Open the lab` → `/lab`, loads safe default world and starter code.
- `Continue learning` → only shown when an actual saved learner has a resumable mission; resumes exact prior state.
- `How Branchcade works` → explanation route with interactive comparison or scroll anchor.
- `Explore missions` → `/missions`.
- `Instructor mode` → `/instructor` with truthful note that stats are for this browser's local sessions.
- `Sound` quick toggle only if sounds actually implemented; never play audio unexpectedly.
- Feature preview cards must click through to a real related screen (e.g. Trace→Lab). Otherwise render plain informational content, not clickable card styling.
- Footer: About, privacy, credits, source/GitHub if URL is known, educational disclaimer, "Not affiliated with LEGO/FIRST" where relevant, honest version string.

**States:** first visit; returning with progress; storage unavailable; reduced motion. No fake learner numbers/testimonials.

## E2. Onboarding `/start`

**Intent:** setup with zero identifying information. Three short panels, skippable.

Panel 1 "Who are you exploring as?": `Learning solo` (default), `Learning with a team`, `I'm an instructor`; options change the subsequent landing route, not hidden feature access.

Panel 2 "Pick a lab name": provide generated friendly pseudonym like `Curious Otter 42`; optional editable nickname max 20 chars sanitized, no prompts for real full name, age, birthday, address, school, email. `Shuffle name` regenerates; input validates length and disallows markup; `Continue` saves local anonymous profile. Explain browser-only saving succinctly.

Panel 3 "How would you like to start?": `Guided first mission` (default), `Explore free lab`, `Join team on this device`, plus optional `Show me controls` tutorial.

Persistent controls: `Back`, `Next`, `Skip intro`, `Start`; correct step indicators; keyboard access; never wipe entered name when navigating back.

For instructor mode, directly provide `Create local group` and `See sample tutorial` (sample data explicitly marked generated and excluded from real stats).

## E3. Mission library `/missions`

Header with concise explanation and real progression; cards must show actual authored mission id, objective, target concepts, estimated time as a *content estimate* (not measured completion), difficulty, status (Not started / In progress / Completed / Available/Locked), and highest verified outcome.

Controls:
- `Search missions`: case-insensitive title/concept search, debounce if needed, clear X, "No missions match" with `Clear filters`.
- `Concept` filter chips: Sensors, Comparisons, Conditionals, Loops, Functions, Debugging. Selecting multiple uses defined OR semantics within concept category; persist current filters only in app state.
- `Difficulty` filter: All, Foundations, Intermediate, Challenge. Explain prerequisites and why any mission is locked; allow instructor override or explicit free practice if pedagogically appropriate.
- `Sort`: Recommended (adaptive planner), Learning order, Easiest first, Recently played. Sorting stable.
- `Start mission` → exact mission, creates attempt, no fake completion.
- `Resume` → stored attempt and editor state.
- `Preview` → read-only objective/world description and learning outcomes without revealing answer.
- `Retry` → opens new attempt with reset world and fresh prediction; preserves old attempt in history.
- `View results` → progress details of completed attempt.
- `Continue recommended` → next plan selection with visible reasoning.
- `Reset filters` functional.

Empty/loading/corrupted mission data states are comprehensible and recoverable.

## E4. Individual mission detail `/missions/:slug`

**Primary three-column workstation at desktop:** left programming editor (roughly 30%), center simulation (45–50%), right contextual inspector/learning prompts (20–25%); resizable splitters with min widths and a `Reset layout` action. On a 1366px Chromebook, allow stages to be collapsed to preserve a practical working area. Top progress strip: Mission name, current phase (Predict/Run/Investigate/Experiment/Reassess), role if in team, saved indicator, Return to missions.

**Top toolbar, exact behaviors:**
- `Back to missions`: navigate to library; changes autosaved; show confirmation only if unsaved nonrecoverable state.
- `Mission briefing`: opens objective, constraints, success conditions, beginner-friendly explainer; close/Escape return focus.
- `Change world` or `World variants`: available only if mission allows variants; selecting a variant invalidates prior prediction and starts a fresh attempt, explicitly explained.
- `Save`: persists current block JSON, world version and current stage immediately; confirm via toast; disabled with reason if storage unavailable, but temporary in-memory session remains usable.
- `Reset code`: confirm if edits present; restore starter program only, leave mission history intact; avoid conflating with reset robot.
- `Reset simulation`: resets robot/timeline only to initial world and beginning of current program; preserves code and prior immutable attempt evidence; if run evidence exists, clear transient result but never silently erase old attempt.
- `Run`: executes validated program if prediction step passed; if not, opens prediction prompt. When already running, disabled/replaced with `Pause` appropriately.
- `Pause`: freezes simulation scheduling and engine cursor, keeps display fixed.
- `Resume`: resumes from cursor and identical state.
- `Step`: advances exactly one meaningful interpreter action; if intermediate movement spans ticks, specify action/tick distinction and offer `Step tick` separately or show progress clearly.
- `Stop`: cancels execution safely and shows "Stopped by learner"; does not mark mission failed unless goal actually fails.
- `Speed`: 0.5× / 1× / 2× / 4×; speeds change playback clock, NOT physical measurements, program branch results, or deterministic ordering.
- `Rewind`: moves to prior preserved snapshot or replays from start deterministically; if no previous step, disabled with reason.
- `Replay`: replays exact run from recorded start without modifying program or scoring new attempt; label as replay, no doubled progress.
- `Show/Hide code`, `Show/Hide trace`, `Fullscreen stage`, `Reset layout`: adjust layout predictably with keyboard and accessible names.
- `Help`: mission-specific hints ladder without spoiling answer immediately; explains concept with new example; opening hint counts as use in attempt data, not a penalty unless explicitly described.
- `Undo/Redo` code: invoke Blockly undo/redo and keep saved state coherent; disabled when nothing to undo/redo.
- `View pseudocode`: opens read-only text rendering of program, copy button copies text and announces success.
- `Keyboard shortcuts`: modal matching implemented shortcuts only.

**Simulation panel:** responsive world with ruler/grid optional; robot chassis showing orientation and sensor origin; obstacle and floor tiles, goal region, actual trail, ghost planned path only if computed; sensor ray and hit marker; collision state; live readouts. Controls within stage:
- `Zoom in`/`Zoom out`: camera only; clamps e.g. 0.5–3×.
- `Fit world`: automatic safe fit while preserving aspect ratio.
- `Grid` toggle: visible grid lines only.
- `Sensor ray` toggle: render/hide detection line only.
- `Follow robot` toggle: camera tracking (no physics change).
- `Sensor details`: measurement units, range, sensor origin, reading timestamp and "out of range" meaning.
- Click obstacle opens inspector if editable; mission worlds locked by default, so show explanatory label rather than draggable affordance.
- Click robot opens read-only state inspector; dragging only permitted in free lab and only while stopped.

**Blockly panel:** categories Movement, Sensors, Logic, Loops, Variables, Functions, Debug; block shapes accurate, semantic colors constrained, tooltips with examples, collapsed/expanded blocks, trash, zoom, auto-layout, keyboard alternatives where available. `Blocks` and `Code preview` tabs. Prevent invalid disconnected blocks from silently executing; show understandable validation errors with clickable location and focus target. Blockly workspace save/load uses JSON serialization. Provide text alternative listing code steps for screen-reader users; Blockly's own limitations must be noted honestly.

**Inspector/debugger tabs:** `Live state`, `Timeline`, `Why?`, `Variables`, `Program`. Live state displays actual distance/color, robot heading/coordinate, active branch; timeline virtualized if large with search/filter and event indexes; clicking event highlights corresponding block and robot snapshot. `Why?` contains the branch explanation derived from operands, not static hint. Variables table shows actual values and last change. Program tab contains run ID and limits status. Trace errors display actionable causes, not stack dumps.

**Prediction interaction:** before first revealing run, modal or inline panel asks "What will the robot do first?" choices Stop/Move/Turn/Other where applicable, "Will this condition be true or false?", confidence 1–5, optional "Why do you think so?"; `Check my prediction` commits locally and runs. `I need a hint` explains interpreting input without revealing current answer. `Skip prediction` allowed only in Free Lab / instructor preview, not a mission whose core purpose is prediction; let student opt out of diagnostic questions without trapping them, marking assessment as skipped.

**Result panel:** actual success/failure and decisive trace moment; difference between prediction and result; `Investigate why`, `Try again`, `Change code`, `Run diagnostic`, `Next mission` (enabled only on true complete), `Review timeline`, `Save summary`, `Share progress` (exports nonidentifying result to file, no social sharing). If no diagnosable misconception, say "We need another example" not a diagnosis.

**Never:** awarding points merely for pressing Run, solving puzzle through fake flags, changing branch explanation because of CSS animation, auto-closing a modal before result is read.

## E5. Free Lab `/lab`

A no-pressure sandbox with same engine/editor and debugger, plus environment controls. It must be fully usable without mission requirements and support demos:

World controls:
- `New world` dropdown: Empty Room, Wall Approach, Colored Line, Maze, Threshold Playground, Function Route. Changes require confirmation when unsaved.
- `Add obstacle`: choose box/circle, then click place or use coordinate editor; clamp within bounds, reject overlapping robot spawn/solid regions as appropriate.
- `Remove obstacle`: select and delete with keyboard or button; confirmation only if destructive to complex custom object.
- `Move obstacle`: drag while stopped; snap-to-grid optional; sensor value updates accurately.
- `Add colored zone`: select color, place rectangle, drag resize handles; define overlapping zone priority deterministically; `Remove zone` functional.
- `Place robot`: click a legal coordinate or enter X/Y, heading; reject collision with solids; accessible numeric alternatives to drag.
- `Rotate robot`: heading slider 0–359 with numeric input and unit; stage updates ray measurement immediately.
- `Sensor max range`: bounded slider, unit cm; distinction between true `null` out-of-range versus zero; proper handling of limits.
- `Threshold`: slider with numeric input and a choice of comparator, directly alters a designated demo condition in code only after deliberate editing; never silently rewrites other code. Label it as example condition if used.
- `Simulation speed`: changes playback only.
- `Show world data`: well-formatted validated read-only JSON and copy; if edit-import allowed, validate and show errors.
- `Export world` → JSON download with version/checksum, sanitize filename.
- `Import world` → file picker, Zod parse, size limit, preview summary, cancel/confirm; warn and prevent unsafe external content.
- `Save world` → local collection with chosen name.
- `Reset world` → confirm, restores current preset or latest saved snapshot.
- `Undo/Redo edits` → actual action history where supported, separate from program undo/redo.

Coding/debugger controls identical to mission view, except learners may freely run without mandatory pre-run predictions. `Try prediction mode` voluntarily creates a diagnostic attempt; `Generate experiment` optionally opens learning lab using current valid world and program. `Reset everything` requires confirmation and restores demo world, code and simulation.

Lab templates must be educationally accurate, with a direct first-load scene that works before any human changes it.

## E6. Prediction and result panels

Make the diagnostic process feel like an investigation, not a multiple-choice exam. Each question references the visible code/world and requires thinking. Exact components:

- "Before we run it…" title with tiny sensor image and code line.
- One primary outcome question and a optional branch or sensor value question; constrain choices to states generated by that mission.
- Confidence selector: `Guessing`, `Not sure`, `Fairly sure`, `Certain`, with values recorded as ordinal; no pressure or penalty.
- Optional short reasoning limited to safe length with in-page explanation of local storage.
- `Lock prediction & run` shows actual engine output, closes prediction entry and cannot back-edit.
- `Change my answer` before commit edits; after commit only `Try again with new prediction` creates a new attempt.
- `Not sure yet` leaves predicted answer empty, records uncertainty and offers a practice exercise rather than classifying a misconception.
- `See code explained` opens a conceptual mini-guide using different values; doesn't reveal task answer unless intentionally selecting a worked example.
- After execution, side-by-side *Your prediction* vs *What happened* with operands, status, branch, and relevant trace position. Button `Show decision in timeline` moves focus/highlight accurately.

## E7. Misconception investigation `/missions/:slug` inline guided stage

The system should never show "AI has detected your misunderstanding". Student-facing heading: "Let's check one more thing." Show two to three targeted alternative trials selected by rule-based evidence discrimination.

Controls:
- `Answer` submits one evidence point; validates a selection and never silently advances with no response.
- `Try it in the lab` loads a small isolated world/program variation; save session first.
- `Why are you asking?` explains which competing interpretations the new test can distinguish, in age-appropriate language.
- `Show me a hint` reveals one scaffold at a time; hint use recorded but not penalized.
- `Try a different example` generates equivalent discrimination with fresh scenario, rejects same exact numerical example if avoidable.
- `I still don't get it` opens a visual worked explanation and offers a simpler prerequisite concept.
- `Back to mission` preserves all evidence and returns to exact simulation snapshot.
- `Continue to experiment` becomes available after enough information, or uses a transparent generic experiment when hypotheses remain unresolved.
- Evidence summary uses labels `Might be`, `Need more examples`, `No longer supported`; scores may be shown in a technical inspector as heuristics only, never false percentages of mental certainty.

## E8. Counterexample experiments

Layout: "Your earlier idea" versus "Let's try changing just one thing"; split world preview and numeric comparison; the learner can manipulate values and test hypotheses.

Controls:
- One variable slider and numeric input (e.g. obstacle distance 5–70 cm; threshold 0–100 cm), with realistic units and defined bounds.
- Toggle between Baseline and Changed scenarios, with identical camera transform.
- `Predict changed outcome` commits new answer before running.
- `Run experiment` uses actual engine with changed world/program; displays predicted/actual difference.
- `Reset experiment` restores original generated counterexample, not original whole mission unless specified.
- `Explain comparison` derives conditions, values, and behavior from traces.
- `Try another counterexample` searches another valid discriminator; if no alternative exists, says so and shows why.
- `Return to mission` restores mission state.
- `Take new challenge` starts transfer reassessment with new world/threshold seed.

The algorithm must select *genuinely discriminating* examples, not arbitrary easy numbers. Recompute correctness using the actual simulation. If no candidate exists within limits, use a pre-authored valid probe only if it has executable verification; otherwise provide a neutral explanation instead of fake generation.

## E9. Reassessment/feedback

After instruction, show 1–3 unseen transfer tasks for target concept, not merely the exact repaired original. Collect predicted outcome and optionally a brief reason for at least one. Mark responses from the actual interpreter and ground-truth predicate. Show:

- `What changed?`: brief factual comparison of initial/transfer attempt, never infer causation from one case.
- `Practice this again`: target same concept with different constants/world.
- `Move on`: recommended next mission if criteria met; allow returning later.
- `Review evidence`: timeline of question → experiment → transfer.
- `Retry transfer`: new legitimate attempt; keep previous score.
- `Finish`: returns progress, persists attempt, awards accomplishments only when conditions are genuinely met.

At least two distinct independent correct demonstrations plus one transfer should be required for a strong mastery label; score insufficient evidence appropriately. No fixed time-based "understood" badge.

## E10. Team Mode `/team`

This is **local pass-and-play cooperative mode** for 2–6 students on a single device. Do not disguise it as synchronous internet multiplayer; it is designed so every person can physically take a turn.

**Setup screen:**
- Team name optional, max 30 sanitized chars, generated default.
- `+ Add teammate` generates anonymous alias and editable nickname, up to 6; disable with "Maximum 6 teammates".
- `Remove teammate` with confirmation if activity already exists; reject fewer than 2 at mission start.
- `Shuffle aliases` generate unique friendly identities; retain existing progress only after explicit approval if aliases change.
- `Choose team mission` from compatible catalog; locked prerequisites can be overridden by instructor with warning.
- `Start team session`: saves team roster and assigns first roles transparently.
- `Continue previous team` only when saved group exists and session is resumable.
- `Reset team` destructive confirmation, resets current session not other students' solo records.

**Roles:** Sensor Analyst (reads sensor measurements), Programmer (edits logic), Debugger (reads execution and proposes fixes); for 4–6 participants expand to Navigator (interprets geometry), Evidence Recorder (writes the team's prediction), Tester (selects controlled variants). Every role needs a distinct meaningful action, not just a decorative avatar. If only 2 students, combine roles deterministically so both are essential. Assigned roles rotate each round/misson; avoid always giving weaker students the spectator role.

**Team round:**
1. Shared objective and role allocation; students receive an appropriately scoped information card.
2. Individual prediction prompts shown sequentially (pass-and-play privacy screen between learners), so the fastest student does not overwrite everyone else's answer.
3. `Hand off` locks the current card and displays "Pass the computer to [alias]"; next learner uses `I'm ready` to reveal their scoped information.
4. Each role records a minimum contribution before the `Team huddle` stage: one sensor observation, program change rationale, trace explanation, etc. Contributions can be short or a structured selection; no personal chat or online messaging.
5. Huddle board displays all contributions after collection; `Discuss & choose` records team hypothesis, not a vote winner by default.
6. `Run team program` executes real simulation. The result shows contributions + actual trace, with separate individual and group progress.
7. `Rotate roles` visibly assigns new roles based on rotation schedule; `Skip rotation` available to instructor with reason logged, not secretly bypassed.

**Controls:** `Edit team`, `Switch learner`, `Hand off`, `I'm ready`, `Submit observation`, `Undo my draft` (prior to handoff), `Reveal evidence` (only appropriate stage), `Team huddle`, `Run`, `Review trace`, `Rotate roles`, `Pause team session`, `Resume session`, `End session`, `Export session summary`. Each has a valid state machine and tests. Role-based gates must avoid exposing other participants' not-yet-shared predictions; this is a learning protocol, not cryptographic privacy. Disallow deleting prior contributions silently.

**Fairness metrics:** roles experienced per pseudonym, contributions made, attempted unfamiliar tasks, repeated role imbalance (descriptive). Avoid public rankings, shaming "weakest student" labels or claiming participation quality from click counts alone.

## E11. My Progress `/progress`

Components:
- Current local pseudonym selector with explicit scope; ability to create another anonymous learner.
- Actual missions started/completed, distinct concepts practiced, new transfer checks, recent attempt timeline.
- Concept map shows `Not explored`, `Working on it`, `Evidence of understanding`, `Needs another example`. Provide tooltip explaining the heuristic rule and evidence counts.
- Each concept row `View evidence` opens attempts, predictions, ground truth, probes, reassessment; all locally stored. No inaccessible decorative charts.
- Recommended next activity with reason; `Start` opens real mission.
- `Review attempt` opens read-only run replay and diagnostic timeline.
- `Retry mission` starts a fresh attempt.
- `Export my progress` generates versioned JSON or printable summary without PII.
- `Clear my progress` confirmation explicitly shows whether current learner only versus all local data.
- `Return to missions` normal navigation.

Empty state: "Your experiments will appear here after your first mission" with functional CTA. Never show invented data.

## E12. Instructor `/instructor`

**Clarifying subtitle always visible:** "This report uses activity saved in this browser. It does not monitor other computers or a remote class." This is a production feature with honest scope.

Sections:
- Select local team/learners and date range; use real stored records.
- Snapshot: sessions completed, real practice attempts, concepts practiced, how many learners supplied a prediction, distribution of potential difficulties with appropriate caution.
- Concept breakdown grouped by local learner alias and attempts, evidence-level explanation, unresolved hypotheses.
- Team participation: role coverage and recorded contributions, no automated judgments of student personality/intelligence.
- Challenge performance: per-mission completion, number of retries, where learners sought help.
- Attempt detail drilldown: timestamps, chosen prediction, trace, actual outcome, diagnostic question/answer and updated evidence; no personal messages.

Controls: `Select team`, `Select learner`, `Date range`, `Concept filter`, `View attempt`, `Assign mission for this local team` (puts assignment in local mission plan), `Clear assignment`, `Print summary`, `Export CSV`, `Export JSON`, `Import local record`, `Reset local instructor view`, `Erase all local learner data` (strong confirmation). Filter changes update graphs/tables immediately; exports reflect current selection or clearly label complete export. Empty state recommends creating a team or completing a mission. CSV injection prevention: escape spreadsheet-dangerous leading `=`, `+`, `-`, `@` in arbitrary nicknames/reasoning.

Include a **separate clearly labeled sample-data walkthrough** only if needed for judges: `Explore sample report` can load a deterministic synthetic scenario into an isolated preview that cannot contaminate real stats. Clearly mark SAMPLE on every preview and never export it as actual class outcomes.

## E13. How It Works `/how-it-works`

Provide accurate and visually comprehensible explanation (not marketing exaggeration):
- How virtual distance sensor casts a ray.
- Difference between sensor readings and code decisions.
- What the program interpreter actually evaluates.
- How "possible misunderstanding" hypotheses are inferred from real answers and discriminating probes.
- Why the system tests a new example rather than declaring mastery instantly.
- Clear disclaimer: The app does not read minds, teach every robotics concept, control physical robots, or automatically prove that a learner has improved.

Interactive controls: `Try 24 cm example` navigates to a small working lab scene with real `24 < 20`, `Try a learning mission`, `See logic trace` toggles a real example executed from the engine, `View privacy approach` navigates to Settings privacy section.

## E14. Settings `/settings`

Sections and exact behavior:
- `Appearance`: Light / Dark / System; persists locally; applies correctly to tooltips/dialogs, Blockly, charts.
- `Motion`: System / Reduce motion; honored by robot interpolation and transitions without changing tick engine.
- `Sound`: On/Off only if audio exists; default off, user-triggered short effects, mute persists.
- `Text size`: Standard/Large; preserves readable workbench layout.
- `High contrast`: toggle where implemented; use contrast-validated palette.
- `Keyboard shortcuts`: opens real shortcut legend with executable shortcuts only.
- `Show labels on sensor graphics`: on/off; symbols supplement color.
- `Autosave`: describe current behavior honestly; since it prevents data loss, do not allow off unless the consequences are explicit.
- `Export all local data`: validated JSON containing schema version, date, source app version, profiles, saved programs/worlds/attempts and team sessions; never secretly send it elsewhere.
- `Import data`: file size/mime/parse constraints, diff/preview, merge or replace choices, collision strategy, confirmation and rollback on failure.
- `Clear learner data`, `Clear saved labs`, `Erase everything`: independently scoped confirmations requiring typed confirmation for Erase everything; UI recovers to clean onboarding and verifies deletion.
- `Storage status`: local usage/availability, graceful quota errors, no unsupported claims about exact browser disk retention.
- `Privacy summary`: no registration, no tracking/ads, browser-local storage, what is saved, exports are user-controlled, school-device limitations. Mention that clearing browser data may erase progress.
- `About` link displays build version, attribution, feedback contact only if real and authorized.

## E15. Not found, error boundary, offline/network and data corruption

- Unknown path: friendly "We couldn't find that page", `Go home`, `Browse missions`, preserves stored progress.
- Route exception: never blank screen. Error boundary with `Try again` reset boundary, `Go to missions`, minimal non-sensitive diagnostics for developers (not raw stack traces to children).
- Local storage unavailable/quota reached: warning "Progress can't be saved on this device" with `Retry`, `Export current session`, `Continue without saving` if safe.
- Corrupt imported record: reject with schema/path-specific message, `Try another file`, `Cancel`; no partial destructive imports.
- Sim engine budget exceeded: stop safely and show `Program stopped after the safety step limit`; `Inspect trace`, `Edit code`, `Reset`.
- Missing mission or incompatible saved version: offer safe migration/restart preserving other data.
- Offline: app shell and cached resources can work if installed/cached and technically implemented; otherwise be honest that initial page load needs network. Never fake offline guarantees.
- Print view: no invisible text or truncated attempt summaries.

---
# PART F. ROBOTICS MATHEMATICS, INTERPRETER AND DEBUGGING — DO NOT SIMPLIFY TO PRESET ANIMATION

## F1. Coordinate system and deterministic clock

World size default 600 cm × 360 cm. Use world origin at top-left for conventional screen mapping; X increases right, Y increases downward; heading 0° points right, 90° points down, 180° left, 270° up. Consistently convert angles to radians. All physical quantities in centimeters, degrees and seconds. World objects cannot extend outside declared bounds unless intentionally clamped with an explanation. Support rectangle/circle obstacles, colored floor rectangles, sensor ray intersections, collision surface, start/goal markers.

Physics state updates at one fixed delta (suggest 50ms). Rendering interpolates between authoritative states using requestAnimationFrame but never mutates world logic independently. Seed any optional noise with deterministic PRNG and use identical seed for replay; default disabled. Playback rate adjusts wall-clock scheduling, never logical tick size. Freeze/pause/cancel must be safe. Use serializable state snapshots and an efficient ring buffer plus replay from start for very long traces; document memory caps.

## F2. Robot kinematics

Nominal robot is a circle of radius 14–18 cm with differential-drive *approximation*. Provide `moveForward(distanceCm)` and `turnAngle(degrees)` semantics explicit to students. Robot center path for straight motion is `(x + cos(heading)*distance, y + sin(heading)*distance)`; actual per-tick increment capped to configured speed. For turn use heading normalization `(h % 360 + 360) % 360`. Prevent tunnel-through collision for large steps: use swept circle versus obstacle inflation or continuous segment checks with sufficiently bounded ticks, not only endpoint collision. On impact, move no farther than contact and record `collision`; forbid penetrations. Define whether collisions stop current move automatically and apply consistently (prefer halt active movement and record a collision event). Tests should include obstacles at corners, diagonal approaches, and exact touching.

Distance sensor originates at a documented point near the robot front and measures along heading to the nearest hit among world boundary and solid obstacles. Rectangles: standard ray/AABB slab intersection with numerical epsilon guards; circles: solve quadratic and choose nearest nonnegative intersection. Reading range clamp: if actual hit farther than maxRange, return `null` "no return within range" (do not treat as 0); if collision/very close, nonnegative small value. Decide if world boundaries count as obstacles: **yes**, unless a mission explicitly sets `boundaryDetectable=false`. State this in all tutorials. Sensor values are quantized to 0.1 cm for display but comparisons use full-precision deterministic numbers unless an explicitly rounded sensor model is configured. Never visually show 19.9 if engine compares 20.0000001 without explanation; handle epsilon at thresholds and display precision carefully.

Floor color sensor samples a documented point beneath/front of robot; priority for overlapping zones is deterministic: highest priority, then declared index. If outside all zones, return white. At exact boundary, define inclusion and unit test it. Render sensor footprint, not only a pixel. When moving through colored line, detection occurs once sample enters zone, not when visual robot circle touches edge. Test that distinction.

Optional distance sensor error demo can use reproducible bounded noise. Label simulated noise and seed; OFF by default; never claim physical hardware accuracy. No made-up battery drain. If adding multiple sensors, each needs origin, measurement semantics and tests.

## F3. World editor invariants

- Every obstacle has valid id, nonnegative size, unique location, within boundaries.
- Robot must spawn in legal noncolliding position; invalid positions show nearest legal alternative, not silently teleport without notice.
- Add/move/resize operations revalidate state and calculate fresh sensors.
- World editing is disabled while simulation running; `Pause` alone may permit inspection but changes require explicit `Stop & Edit` reset to avoid time-travel ambiguity.
- Imported worlds validate limits: max 100 obstacles, 100 floor zones, bounds 100–2000cm each, no NaN/Infinity, no oversized path. Limits can be adjusted after measured performance tests.
- Scene renderer supports pan/zoom, hit testing at transformed coordinates, labeled markers and snapshot capture; stage state derived exclusively from world/robot.

## F4. Language design / Blockly AST

Define a safe beginner language, not unrestricted JavaScript. Blockly blocks must create typed nodes with stable IDs. Required vocabulary:

**Movement:** move forward `cm` bounded 1–300; move backward optional but same semantics; turn left/right `degrees` bounded 1–360; stop motors; wait `ticks` bounded 1–200.

**Sensors:** `distance_cm`, `floor_color`, optionally `heading_deg`, `robot_x_cm`, `robot_y_cm`, static values and variables.

**Logic:** comparisons `<`, `<=`, `>`, `>=`, `=`, `!=`; booleans AND, OR, NOT; `if`, `if/else`; color matching; sensor-in-range test; explicitly handle `null` distance (e.g. `is_detected` and default null-comparison error, not coerced to zero).

**Loops:** repeat fixed bounded integer 1–100; while conditional evaluated before each iteration with total global instruction budget; break/continue only if implemented safely and clearly documented.

**Variables:** define/set numeric, boolean, color; typed reference, bounded name size and reserved identifiers; show actual runtime value.

**Functions:** define named zero-argument functions (and optionally typed parameters if scope permits), call, bounded call depth, duplicate-name validation, definition-vs-execution difference illustrated, return semantics documented. No recursion beyond budget.

**Inspector/debug:** program output log of selected computed values if log block exists; nothing remotely transmitted.

Every Blockly block maps into `Statement` or `Expression` object; reject invalid disconnected program fragments or explicitly explain they are ignored. Do not execute generated strings, dynamic imports from student input, `eval`, `Function`, or arbitrary WebAssembly. Use Blockly JSON serializer. Display code preview via a printer of AST, so preview and execution cannot silently diverge. If also showing generated Python-like pseudocode, label it conceptual and note it isn't interpreted by Python.

## F5. Interpreter algorithm

Build a deterministic small-step interpreter with explicit stack frames/cursors, not recursive JS calls for user loops. States `idle | validating | ready | running | paused | completed | stopped | error | budget_exceeded` and legal transitions. Each `step()` emits at least one structured event, captures operands before truth evaluation, updates variables and robot via engine actions, and stops on bounded budget. Guard maximum 5,000 instruction events and 20,000 physics ticks/run by default (configurable with tests), recursion depth 8, max stack frames and data sizes, maximum trace bytes. Repeating user programs must never freeze the browser; run batches in Web Worker if necessary, or yield to main thread at bounded intervals. During worker operations, use typed messages and cancellation token.

**Crucial trace examples**:
- `SENSOR_READ`: `distance_cm = 24.0`.
- `COMPARE`: `24.0 < 20` → `false`.
- `BRANCH`: entered ELSE because condition false.
- `MOVE`: moved from `(100,100)` toward obstacle; exact delta.
- `COLLISION`: contact at `(x,y)`, movement stopped due to physics.
- `REPEAT_ITERATION`: iteration `3 of 5`.
- `FUNCTION_CALL`: entered `avoidWall`, call stack depth 1.
- `FUNCTION_RETURN`: left `avoidWall`.
- `PROGRAM_STOP`: explicit stop, completion, cancellation, or safety budget reason.

Compile malformed type errors into learner-readable errors with source node id and a `Go to block` action. Draw trace from the emitted events. A visible `Why did that happen?` link navigates to the EXACT comparison event; it should never guess.

## F6. Rewind, step, replay

Each meaningful code action may span multiple physical ticks. Document mode: `Step code` advances to next statement/branch boundary while playing associated motor movement as short animation; `Step tick` advances exactly one fixed physics tick. The control label must match its actual semantics. For reliable rewind store snapshots at defined intervals; if snapshot not available, deterministically replay from initial seed and programHash to selected tick. Rewind cannot mutate persistent recorded attempt or retroactively change a submitted prediction. A new run with edited code produces a new run id and trace; old attempts remain available for historical review.

**Mandatory numerical tests**: start at `(100,100)` heading 0°, empty world, distance to right boundary from sensor origin matches geometry; wall at x=250 changes reading; heading 90° points down; exact `20 < 20` false, `20 <= 20` true; color sensor on white and black zones; collision at right edge/corner; repeat loop 3 iterations exactly; while loop terminates when condition changes; while true triggers budget; 2 sequential runs same hash/seed generate identical traces; edit threshold 20→30 changes branch at distance 24; 4× playback preserves outcome; paused robot never moves.

---

# PART G. EVIDENCE-BASED LEARNING INTELLIGENCE — THE COMPETITIVE CORE

## G1. Misconception taxonomy (minimum implemented set)

Each candidate is an educational *hypothesis*, not a diagnosis. Define unique codes and required diagnostic probes:

- `SENSOR_IS_ACTION`: assumes detecting an obstacle automatically causes STOP regardless of program.
- `SENSOR_RANGE_REVERSED`: thinks bigger distance reading means obstacle is nearer (or vice versa).
- `COMPARATOR_DIRECTION`: interprets `<` as `>` or vice versa.
- `STRICT_VS_INCLUSIVE`: confuses `<` with `<=` at equality.
- `ELSE_EXECUTES_TOO`: assumes both if/else bodies execute.
- `ELSE_NEVER`: overlooks fallback branch when condition false.
- `SENSOR_NULL_ZERO`: treats "out of range" as zero centimeters.
- `COLOR_LOCATION`: confuses detected surface color with obstacle color/goal appearance.
- `LOOP_COUNT`: off-by-one loop iteration misunderstanding.
- `WHILE_PRETEST`: assumes loop body runs once even if condition initially false.
- `FUNCTION_DEFINITION_EXECUTES`: believes defining a function runs its body automatically.
- `FUNCTION_CALL_SKIPPED`: expects call to do nothing or misinterprets return flow.
- `VARIABLE_STALE_VALUE`: ignores updated variable contents after assignment.
- `MOVEMENT_VS_SENSOR_REFRESH`: assumes sensor values remain fixed while robot moves.

Every hypothesis includes a correct concept explanation, likely observable response patterns, at least two distinct probes, one counterexample template, and a prerequisite learning objective. Start with sensors/comparisons/if-else strongly reliable; expand the others after core engine passes tests. Don't label a hypothesis inferred from irrelevant questions.

## G2. Why one wrong answer is insufficient

Consider sensor distance 24 cm and condition `if distance < 20: stop else move`. Student answers STOP. This could reflect sensor-is-action, comparator confusion, or inattention. Implement a hypothesis set with uncertain initial scores and select a next probe that separates candidates.

For example:
- Probe A: "Distance is 10 cm; condition is `distance < 20`. Which branch runs?" Helps discriminate certain threshold misunderstandings.
- Probe B: "If the program only says `move_forward(10)`, does the sensor make it stop automatically?" Probes sensor/action conflation.
- Probe C: "Distance 20; compare `< 20` versus `<= 20`." Separates boundary confusion.

Store candidate predictions for each probe and use the answer to update evidence. If responses conflict, display "Still investigating" and try an unrelated example. Do NOT convert `score=0.8` to an unvalidated `80% probability` claim.

## G3. Explicit hypothesis ranking algorithm

Implement a transparent rule-based inference engine:

1. Collect immutable record of scenario (world/program hashes), chosen answer, conceptual reason if any, simulation ground truth and answer timestamp.
2. Fetch only hypotheses relevant to the observed concept(s), not all.
3. For each, compare observed answer to an authored model of how that misconception would predict outcomes. Add positive/negative bounded evidence with provenance. Avoid double-counting the same fact repeatedly.
4. Select a follow-up probe based on expected discrimination among still-plausible candidates; prefer one that divides hypotheses into differing predicted answers while remaining simple and safe.
5. Enforce minimum independent evidence: do not elevate unique hypothesis to "supported" on one response. Always retain "insufficient evidence" state.
6. Store score and a human-readable explanation of which observations supported and contradicted the hypothesis; rank tentative candidates without pretending scores are calibrated probabilities.
7. Reassess after targeted experiment and transfer: a correct transfer answer adds positive concept understanding evidence; a previous hypothesis can be contradicted and downgraded without erasing historical facts.

Unit tests **must** show two students selecting STOP in the identical first scenario but then answering A/B differently and receiving DIFFERENT next probe and eventual targeted experiment, plus correct predictions yielding no forced diagnosis. Tests for contradictory responses, multiple possible hypotheses and insufficient evidence mandatory.

## G4. Counterexample generation — algorithm, not a static hint bank

Input: original world/program, candidate misconception models, confirmed observations, curriculum constraints. Output: a **verified** small change in one parameter that produces informative differences among candidate predictions.

Candidate parameters, prioritized one at a time:
- Move an obstacle within legal world positions (e.g. 10, 19, 20, 21, 24, 30, 60 cm ahead) without overlap.
- Adjust comparison threshold around sensor value ±0, ±1, ±5 and comparator `<`, `<=`, `>`, `>=`.
- Change floor color and color condition.
- Change loop count 0/1/2/3 only when valid for model and mission.
- Toggle actual function call vs only definition in a small safe program.

For each candidate:
1. Validate world/program constraints and budget.
2. Execute authoritative interpreter with actual sensor values.
3. Predict what each hypothetical learner model would conclude; these misconception models are *explicit small rule modules* with author-verifiable predicted answers.
4. Discard candidate if model predictions do not differ, or if actual outcome and visuals are ambiguous.
5. Rank by discrimination score, number of changed elements (prefer one), numerical simplicity, closeness to original task, grade-appropriate difficulty.
6. Generate `Counterexample` containing before/after snapshots, reason, correct trace link, expected responses and confidence caveat.
7. Optionally generate two consecutive variants around the threshold to make the concept apparent. Ensure a deterministic tie-breaker for reproducibility.
8. If no candidate exists under search budget, return typed `NoCounterexample` with reason; show meaningful instructor/learner fallback.

Example: Student believes that merely seeing a wall automatically stops the robot. Generate a no-conditional move-only program with same wall; use real collision halt to distinguish **"stops because code"** versus **"stops on collision"** precisely; do not create a misleading example where the physics collision makes the misconception appear true. Test meaningful discrimination carefully.

## G5. Adaptive planning and concept mastery

Define concept DAG: readings and units → comparisons → if/else → while loops → combinations with sensors → functions and state. For each concept, maintain evidence: distinct scenarios attempted, correctness, reasoning explained, hint usage, transfer success, contradictory answers, and last practiced timestamp. Use bounded deterministic heuristic scores with rule explanation, not opaque machine learning.

Recommended progression:
- New: teach with interactive demonstration.
- First error: probe misconception and targeted experiment.
- Correct once: try new parameter variation.
- Two distinct correct predictions plus an unseen transfer and a supported reason: show "Evidence of understanding".
- Failure on transfer: show "Keep practicing" with targeted case.
- Repeated successful transfer: recommend next concept while keeping revisit suggestions.

Ensure meaningful difficulty adaptation: vary number of conditions, new obstacle geometry, combination of sensors, loop nesting and function usage; all missions remain solvable. Track hints and difficulty without unfairly penalizing students. Provide visible "Why this next?" reason linked to evidence. No arbitrary random difficulty spikes or reward inflation.

## G6. Explanations and educational copy rules

Write in simple language for a curious 9–13-year-old without talking down to them:
- Bad: "Your cognitive schema exhibits comparator inversion."
- Good: "You might be reading `<` the other way around. Let's try one smaller number and one bigger number."
- Bad: "The AI knows why you made that mistake."
- Good: "Your answers suggest two possible mix-ups. This next experiment can help us tell them apart."
- Bad: "Failure."
- Good: "Interesting result. Let's see which line made the robot move."

Show real numerical evidence in explanations and keep claims limited to supported results. No score-only instruction; student must be able to see and manipulate the deciding comparison.

---

# PART H. COMPLETE AUTHORED CURRICULUM AND MISSION DESIGN

Implement **at least 8 fully functional guided missions**, with 3 as the ultra-reliable demonstration core and 5 as progressively deeper lessons. An extra mission is allowed only if completely tested; do not ship a nonfunctional grid of 30 empty lessons.

Each mission has: ID, short engaging name, narrative in max 2–3 sentences, target concept, vocabulary, prerequisites, world geometry, robot spawn/heading, sensor configuration, starter program, expected student prediction, actual solver-valid success predicate, failure examples, misconception probe IDs, hint ladder (3 progressive hints), a deliberately flawed program or question, a verified solution or reference AST, at least 3 parameterized world variants, one transfer scenario, and teacher note. Validate all missions through automated reference-solution runs.

**M01 — The Wall Problem** (foundations; distance sensor + threshold): Robot heading toward wall; condition `distance < 20`; sample reading 24; predict branch, manipulate threshold, see actual movement. Success requires correct stop decision before boundary/collision under at least two scenarios; do not consider physics collision a successful programmed stop.

**M02 — Black Line Stop** (color sensor + if): Robot crosses white surface into black strip; student builds condition on `floor_color`. Success means explicit programmed stop when sensor footprint enters black zone within defined tolerance, not merely robot touching graphic stripe. Variation changes line position/width.

**M03 — Wrong-Way Branch** (comparison/if-else debugging): Starter program intentionally uses inverted comparator. Student predicts outcome, traces decisive branch, adjusts code. Test two obstacle placements, including threshold equality. Success demands correct branch across cases.

**M04 — The Extra Lap** (repeat loop count): Robot needs move-turn sequence performed exact N times. Intentionally flawed repeat count; show iteration events. Success requires desired waypoint pattern and correct number of loop iterations; avoid accidentally passing with overshoot.

**M05 — The Loop That Never Ends** (while loop evaluation): Robot moves toward obstacle and checks updated sensor each iteration; starter either fails to refresh condition or has reversed comparator. Success is controlled termination without budget exhaustion and correct safe stopping distance. Probe while-pretest vs ordinary repeat.

**M06 — Call the Helper** (function definition/call): Student defines a turn/avoid function and must actually call it. Success path includes traversing a turn corridor; inspect call-stack trace and distinguish definition from invocation.

**M07 — Color & Distance** (composite booleans): Robot must stop only when both/one specific sensor conditions satisfied; teach AND versus OR using changing colored zones and obstacle placements. At least three variants discriminate logic operators.

**M08 — Mystery Malfunction** (full reasoning cycle): A cohesive capstone robot mission contains a subtle conditional, sensor or function bug; user must predict, debug, explain, apply a generated counterexample, and pass unseen transfer. Show a real evidence trail and final recap.

Optional fully tested additions if time/resources: `M09 Sensor Range`, `M10 Functions and State`, `M11 Team Handoff Rescue`. These are not mandatory for shipping unless fully implemented with reference tests; do not market them on Home as available otherwise. Keep mission library compact and high quality.

### Mission success predicate examples

- M01: explicitly issued Stop statement while obstacle distance `>= safeStopCm` (and no collision), after robot traversed meaningful required distance, with at least 2 world variants.
- M02: color sensor first reads black and a Stop command occurs within allowed 0–N subsequent ticks with zero boundary collision.
- M04: reaches final region and loop counter matches N, robot heading within tolerance; raw distance traveled alone insufficient.
- M06: execution trace contains a valid `FUNCTION_CALL` event and reaches goal; copying manual movement without a function may solve physically but does **not** satisfy target concept, and UI must explain that.
- M08: multi-criteria objective: physical outcome + correct reason + transfer check; separate practice completion and concept evidence to avoid opaque grading.

### Hint ladder for each mission

Hint 1 prompts attention ("Which sensor value changes as the robot moves?"). Hint 2 shows the relevant data and a simpler example ("24 is not less than 20"). Hint 3 explicitly demonstrates a related but not identical program; never secretly alters the student's program. `Show solution` is available in safe self-directed learning modes only after intentional confirmation; mark attempt as solution-assisted, then assign novel transfer before evidence of understanding.

### Mission authoring verification

Each mission exports: `starterWorld`, `starterAST`, `referenceSolutionAST`, `objective`, `concepts`, `mistakeVariants`, `probeBank`, `transferVariants`. Automated test loops through all eight missions and ensures: parse, world validity, reference solution reaches success, deliberately flawed variant fails in the intended way, diagnostic prompt references correct data, and at least one transfer variant is genuinely distinct from baseline.

---
# PART I. IMPLEMENTATION PLAN — 12 CHRONOLOGICAL PHASES WITH INDEPENDENT GIT HANDOFFS

**Execution rule:** For each phase, perform tasks in listed order, write tests, inspect browser if the UI exists, satisfy the acceptance gate, update handoff documents, commit, and push to authorized remote before moving on. If interrupted, resume the unfinished gate next invocation. Earlier passed tests must continue passing. An agent's self-reported "complete" is not proof; source and tests must demonstrate it.

## PHASE 00 — Repository reconnaissance, product contracts, project scaffolding, CI

**Purpose:** Make every later computer operate on a reliable codebase, with unambiguous contracts.

Tasks:
1. Inspect repository and preserve files. For empty repository, create React/Vite/TS strict app, install compatible toolchain and lock dependencies. Setup ESLint with hooks/a11y rules, prettier (if chosen), path aliases, Tailwind, React Router, Zustand, Zod, IndexedDB wrapper, React Testing Library, Vitest and Playwright.
2. Define all core types and Zod schemas described in Part C. Include a sample valid world, program, mission, local profile; prevent circular dependencies; type-safe public APIs.
3. Create visible static shell with operational route links, no invented progress data, authentic Home, onboarding seed and not-found. Routes without completed features should show honest *temporary development placeholder* only during intermediate phases and must be replaced by Phase 11. Never pass a placeholder as shipping-ready.
4. Implement design tokens and foundation elements described in Part D: buttons, inputs, focus, dialogs, toasts, responsive nav, skeleton/empty/error states, at least light theme + dark stage. Build a mini visual design fixture page for testing but do not expose unneeded diagnostics on production nav.
5. Create `AGENTS.md` containing purpose, architectural guardrails, run commands, current phase determination, Git handoff discipline, AI disclosure, and no-fake-functionality rules. Copy product spec into `docs/SPEC.md` from this prompt as available.
6. Create documentation files from C2 with real starter content. `docs/STATUS.json`: schemaVersion, phases 00–11 each with status `not_started | in_progress | verified`, proof (tests/files/date/SHA), lastVerifiedAt; no fabricated timestamps.
7. Create package commands `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `test:e2e:ui` (optional), `test:a11y` (optional integrated Playwright), `check` aggregate, and `format:check` if formatter used.
8. GitHub Actions CI on push and PR: npm ci, lint, TS, Vitest and build; add Playwright test job once Phase 02 browser flows exist; upload failing traces/screenshots as artifacts when tests fail.
9. Add README with zero-secret startup: `npm ci`, `npm run dev`, `npm run check`; mission data docs. Ensure no deployment secrets required.
10. Baseline E2E: Home loads, nav works, 404 recovers, onboarding pseudonym persists if implementable; visual screenshot baseline at 1366x768.

**Files/output:** clean project with compilable typed scaffold, docs, CI, source layout, controls foundation, no empty links masquerading as real functionality.

**Gate 00:** fresh clone → npm ci → npm run check pass; Home appears in Chromium; all implemented nav works; docs/HANDOFF and STATUS accurate; no secrets committed.

## PHASE 01 — Real geometry and sensor engine

1. Write pure geometry functions: vector ops, ray vs rectangle and circle, world clipping, floor-zone containment, swept-circle collision, epsilon policy, angle normalization, world-to-screen transforms separate from physics.
2. Create deterministic `World` state and default fixtures; robot state model in centimeters and fixed logical tick.
3. Implement forward/back motion, turning, stop, collision outcome, sensor origin offset, distance ray, color sensor; recompute readings from state. Apply units and null handling exactly as Part F.
4. Build stage component with custom SVG illustration, meaningful grid, obstacles, robot heading, trail, sensor ray, hit marker, scale/measure readouts. Code component should not mutate engine.
5. Implement standalone simulator controls in `/lab`: Run demo, Step tick, Pause/Resume, Reset, zoom, fit, grid toggle, sensor ray toggle, world presets, heading and position sliders. Until interpreter exists, label demo actions as direct robot-control actions, not "program execution".
6. Add representative fixtures and unit tests: multiple obstacle shapes, boundary rays, 0/90/180/270 degrees, exact contact, color zones, range null, out-of-bounds, deterministic tick and collision.
7. Build Playwright tests altering orientation/obstacles and checking **actual** displayed numeric sensor values change. Review screenshot at Chromebook/laptop.

**Gate 01:** A real obstacle move and robot turn produce mathematically correct sensor changes; reset state and 1000-step replay are deterministic; stage interaction is smooth and no console exceptions; tests pass.

## PHASE 02 — Safe Blockly editor, complete AST, interpreter, trace

1. Implement exact language contracts in Part F, Blockly custom blocks, categorized toolbox, default programming workspaces, JSON serializer, AST adapter, type validation and human errors.
2. Write explicit-stack interpreter with bounds; sensor readings pulled from Phase 01 engine; event emission for branches, moves, variable changes, iterations, function call/return, collisions, safety stops.
3. Implement Run/Stop/Pause/Resume/Step code/Step tick/Replay/Rewind semantics with distinct run id, immutable execution trace and true deterministic state transitions.
4. Link active Blockly block to trace events; click trace moves stage to corresponding snapshot; variables/call stack panel; branch explanation interpolates actual values; readable pseudocode printer and copy button.
5. Complete editing UI: toolbox, trash, undo/redo, resize, zoom, preview, error-to-block focus, starter programs, autosave integration adapter.
6. Run mutation tests or tests for all operators (including threshold equality), nested branches, repeat, while pretest, termination budget, definitions vs calls, variables, out-of-range sensor, collision, rewind/trace invariance.
7. E2E real trace: set distance so display reads 24cm, program `if distance<20 STOP else MOVE`, choose Execute; verify false branch, move; change threshold >24 and rerun; verify true branch and stop.

**Gate 02:** No strings eval'd; Blockly changes causally alter the run; all safety caps effective; execution panel accurately points to real deciding block; Chrome DevTools shows no exceptions during mission simulation.

## PHASE 03 — Complete free lab editing, persistence and import/export

1. Implement all Part E5 editor controls, obstacle editing, floor-zone editing, robot placement and rotation, world presets, validated inspector, correct camera transforms and drag affordances.
2. Implement data persistence with IndexedDB + Zod + migrations, atomic save, debounce, throttling, quota handling, corruption recovery; persist Blockly JSON and custom world fixtures.
3. Add local anonymous profile flow, saveable lab projects, world save/clone/import/export, browser reload restoration, delete/undo confirmation where appropriate.
4. Make export schema explicit and versioned; reject malformed/oversized JSON; ensure none of the import paths can inject HTML or execute code.
5. Create test proving world modification → sensor change → program branch change → save → reload → replay same result.
6. Manual keyboard and pointer walkthrough: add/delete obstacle, rotate robot, export/import world, undo/redo code, reset world, overlay drawing, zoom/fit.

**Gate 03:** Free Lab is truly usable and saved state survives reload; invalid data cannot crash app; all lab toolbar actions verified in browser; no fake autosave toast.

## PHASE 04 — Prediction-before-execution and learning journey UI

1. Implement proper attempt state machine: briefing → prediction → locked prediction → actual run → comparison → investigation → experiment → reassessment → completion.
2. Build exact E6 prediction components, confidence, optional short rationale, "not sure" branch, context-sensitive hints, immutable commit timestamps. Make the Run button invoke prediction when required and only show ground truth after lock.
3. Implement compare panel from real trace, highlight deciding event, record outcome and attempted mission progress.
4. Create standalone embedded reusable components for prediction in missions and voluntary Lab mode; avoid duplicate behavior.
5. Write tests for ability to revise before locking, inability to revise after, skip/no-evidence, repeated new attempts, program edits invalidating prediction, lock before reveal, storage restore at each stage.
6. Test full browser flow: start mission, choose prediction, lock, run actual robot, inspect compare, retry without corrupting first attempt.

**Gate 04:** Complete factual prediction→execution comparison works, no result leak before prediction, all transition/reload routes consistent.

## PHASE 05 — Misconception hypothesis engine and discriminating probes

1. Implement the entire taxonomy from G1 with types, human-safe descriptions and pedagogical probes; prioritize the foundational four but DO NOT omit taxonomy entries if tests/content needed later.
2. Implement evidence-based rule scoring from G3, conditional branches and support/contradiction provenance, minimum evidence requirements, deterministic probe selection by discrimination power.
3. Build student-facing `Let's check one more thing` journey with actual interactive probes, hint ladder and inspectable evidence summary. Graceful ambiguous/no-result paths.
4. Build instructor/technical explanation of activated rules and corroborating/contradicting evidence without sensitive inferences.
5. Mandatory test: same first answer STOP from two synthetic learners; later answers imply one confuses sensors/action and another reverses comparator; **different** diagnosed hypothesis or next experiment. Verify no false certainty with insufficient data.
6. Add integration test: a real recorded trace and answer feed the engine; no fabricated `session.mastery=100` flags.

**Gate 05:** Deterministic evidence engine, contradictory evidence handling, different next steps for different reasoning, no unsupported confidence percentages; accessible diagnostic UI.

## PHASE 06 — Counterexample synthesis, adaptive practice and reassessment

1. Implement typed counterexample search over controlled parameter spaces, validity guard, executable ground-truth validation, discrimination scoring, stable tie-breaks, documented performance caps.
2. Build baseline/change experiment view with actual sliders/graphics, `Run experiment`, `Reset`, `Try another`, new prediction before reveal, compare from real traces.
3. Implement adaptive planner, prerequisite graph, concept evidence and status thresholds; `Why recommended?` explanation.
4. Build unseen transfer scenario generation and 1–3 reassessment checks; score from engine not authored success copy. Retry stores separate attempts.
5. Test no valid counterexample case, near-threshold ambiguity, two-hypothesis discrimination, same seed determinism, regeneration uniqueness, actual trace hash validation, status demotion after contradictory transfer.
6. Full E2E: initial wrong answer → probe → targeted counterexample → user moves slider → true behavior changes → transfer → evidence saved.

**Gate 06:** The actual product differentiator works end-to-end for at least two distinct misconceptions, no fake learner diagnosis, no static pretending to synthesize scenario.

## PHASE 07 — Eight working missions, onboarding and engagement

1. Author M01–M08 exactly per Part H; include validated mission data, prerequisite graph, difficulty classification, three valid variation scenarios each, hints, solver reference, and transfer.
2. Implement first-run onboarding E2 and mission browsing/filter/sort/preview/resume E3. Mission-specific objective/constraints and stateful results E4.
3. Build progress persistence, genuine goal evaluation, retry flow, hint ladder, graded challenge information and teacher notes.
4. Add restrained, purposeful gamification: completion stamp after real completed mission, "First Trace" after first program diagnosis, "Sensor Detective" after supported concept understanding, role variety after real rotation; no daily streak manipulations or social leaderboards.
5. Build small original mission illustrations, character-free interface consistent with visual design, contextual tooltips and occasional delightful microinteractions.
6. Automated mission solver suite: 8 reference solutions and negative fixtures and boundary variants, unlock logic, correct goals. Playwright start/complete at least 3 missions with real runtime evidence; test no impossible locked states.

**Gate 07:** At least eight authored missions actually load, execute and can be solved; primary three are polished and fully journey-tested; onboarding and recommendations work; no empty lesson thumbnails.

## PHASE 08 — Local team collaboration with meaningful role rotation

1. Implement all of Part E10: 2–6 anonymized participants, roles, unique contributions, sequential individual predictions, privacy handoff screen, shared evidence board, team selection, role rotation.
2. Ensure role tasks are educationally distinct; Sensor Analyst cannot simply click "next" while Programmer does everything. Provide fallback accommodations (e.g. teacher can help read) without forcing disclosure of disabilities.
3. Persist group session and allow resume; add safe leave/reset/end; accurate per-member activity and contributions.
4. Integrate selected missions into team flow; avoid simultaneous edits in pass-and-play; unify engine with solo mode.
5. Test team sizes 2,3,4,6; role schedule covers everyone over rounds; team member change edge; handoff does not display next person's prediction early; group success based on same physical/learning predicates.
6. Playwright multi-person sequential browser flow on one machine, including pause/reload/resume, end/export.

**Gate 08:** All six roles meaningfully participate when chosen; no fake "online" experience; local teamwork is a complete feature with appropriate limits.

## PHASE 09 — Personal learning, instructor analytics, accessibility and privacy controls

1. Implement E11 Progress route with real concept statuses, evidence drilldown, actual attempts, recommendations, restart and export.
2. Implement E12 Instructor for locally stored pseudonymous groups, date filtering, concept breakdown, group contributions, CSV/JSON exports/print, assignment to local team and clear controls.
3. Implement E14 Settings all functional: appearance, sound (if built), text, reduced motion, high contrast, local data export/import/reset, privacy explanation and storage status. All confirmations and scope clear.
4. Include local-only honest metrics; never claim to access other browsers/schools. Ensure sample report clearly isolated and SAMPLE-labeled.
5. Add privacy-focused data minimization tests and export CSV formula injection mitigation, schema migration tests, irreversible erasure verification; enforce no external telemetry, external fonts or analytics SDK by default.
6. Run axe accessibility scans, manual keyboard navigation across Home → mission → lab → progress → instructor → settings; correct semantics, focus, labels, contrast, reduced-motion behavior. Document any Blockly limitations and accessible read-only text alternative.

**Gate 09:** All displayed progress actually follows saved attempts; user can fully delete/export/import local data; screen-reader/keyboard critical flows not broken; no personal student data required.

## PHASE 10 — Premium design integration, interaction audit and performance

1. Review 100% of screens against D/E; ensure one consistent visual system and professional polish; refine spacing, fonts, icons, empty states, illustrations, popovers and error copy. Preserve functional APIs.
2. Inspect screenshots at 1366x768, 1440x900, 1920x1080, 1024x768, 768x1024 and narrow 390x844. Store non-sensitive automated artifacts in test reports; compare regressions with purposeful baselines.
3. Use Playwright MCP to **click every visible interactive element** and inspect actual resulting DOM/UI. Keep an interaction inventory in `docs/INTERACTION_AUDIT.md` listing each route/control, expected behavior, test id, observed status. For hard-to-automate drag & drop, create deterministic programmatic test and manual browser walkthrough.
4. Use Chrome DevTools MCP where possible to resolve console errors, hydration/state issues, long tasks, memory leakage, animation stutter, unstable interactions, unnecessary network calls, CSS paint performance. If MCP unavailable use browser logs and Playwright trace.
5. Profile 500+ trace events and obstacle-heavy world; prevent freeze; consider memoization, virtualization of timeline, Web Worker batching. Establish reasonable evidence-based budgets, not fabricated Lighthouse scores.
6. Accessibility verification: visible focus, tab order, Escape, accessible name, keyboard action paths, hover alternatives, no information by color alone, sufficient contrast, reduced motion, touch targets.
7. Keep 1× simulator animation smooth when feasible on a typical Chromebook; prioritize deterministic correctness over artificial 60fps claims.
8. Remove unused dependencies, dead route components, unused assets, decorative placeholders, broken feature flags; ensure production console is clean.

**Gate 10:** No critical/minor broken control known from audit; captured and inspected screenshots look coherent; no layout clipping at target sizes; test and profiling evidence documented. No claims of perfect performance without measurements.

## PHASE 11 — Integration regression, actual deployment readiness, documentation and contest demonstration

1. Run fresh clone-equivalent `npm ci` and full test matrix on actual code. Reconcile any accidental documentation-versus-implementation gap. Search for `TODO`, `FIXME`, `coming soon`, `placeholder`, `fake`, `mock`, `setTimeout`-for-simulation, `Math.random` affecting deterministic physics, `eval`, `Function`, `console.error`; understand every occurrence and remove unsafe/incomplete production paths.
2. Do a real beginner walkthrough: open app → choose pseudonym → guided mission → prediction → execute → trace → diagnostic probe → parameter experiment → transfer → progress → retry → teacher local review → export → import → clear. Run each important path through Playwright Test and interactive MCP as available.
3. Verify M01, M02, M03, M04, M05, M06, M07, M08 reference programs succeed, flawed versions fail correctly, no score without goal proof, team session pass-and-play complete.
4. Test Chromium and Firefox; WebKit if installed/supported; explain any unverified platforms. Test ChromeOS-size viewport; test keyboard navigation; inspect storage recovery.
5. Build static deploy with correct SPA route fallback config for chosen host (otherwise browser refresh on `/missions/slug` may 404); use Vite base and hashed assets, CSP compatibility, error page, custom favicon, Open Graph preview where appropriate.
6. If Vercel/Netlify authentication is already configured, deploy and smoke-test actual public site in browser; record actual live URL and proof. If not, STOP SHORT OF CLAIMING deployment and produce a verified `dist/`, hosting config and exact deployment instructions. Do not invent a website URL.
7. `README.md`: clear value proposition, why it differs, architecture, exact startup/test commands, privacy model, import/export, where to inspect simulation maths and diagnostic algorithms, supported browsers, limitations, competition AI disclosure.
8. `docs/ARCHITECTURE.md`: diagram and state flow, deterministic physics description, AST interpreter and guards, hypothesis engine and counterexample selection, persistence schema, lab/team flows.
9. `docs/SECURITY_PRIVACY.md`: child-user considerations, no PII required, local data handling, hosting logs caveat, teacher caution about shared school devices, safe exporting, lack of remote identities, retention deletion.
10. `docs/USER_TESTING.md`: printable 5–10 minute mini-study with before question(s), tasks, same-concept new post questions and nonleading interview questions; make blank data collection sheet, but **do not invent real participant results**. Participants should be appropriately authorized by responsible adults/instructors; avoid collecting real child identities or recording faces/voices without proper consent.
11. `docs/AI_ASSISTANCE_LOG.md`: document which files/algorithms AI helped create and what students personally inspected, tested or modified. Never fake student actions.
12. `docs/DEMO_SCRIPT.md`: 2–3 minute judged demonstration outline: real origin motivation, actual program with sensor 24<20 trace, learner prediction, two different diagnostic outcomes, generated counterexample and actual change, fresh transfer, instructor value, honest architecture and limitations; include safe backup screenshots/video and a live demo runbook.
13. `docs/SUBMISSION_GUIDE.md`: competition materials checklist, video, app link, screenshots, problem/solution summary, programming languages, AI-assistance disclosure, student contributions and official deadline instructions. Confirm exact up-to-date contest rules from primary sources if network allows; avoid guessing changes.
14. Conduct final secret scan, dependency audit, code formatting, commit/push final tag e.g. `v1.0.0-cac` only after tests and no credential exposure. Handoff report with actual commit SHA and live URL (if available).

**Gate 11 / SHIPPING:** app works end-to-end from fresh browser without accounts or data; all critical UI/algorithm tests pass; complete and accurate docs; clean reproducible build; real deployment or explicitly documented outside authorization; production features match marketing claims. Flag remaining noncritical issues, not conceal them.

---
# PART J. TESTING CONTRACT — "TESTED" MEANS THERE IS REPRODUCIBLE EVIDENCE

## J1. Quality gates enforced on every phase

Run from repo root after changes:

```bash
npm ci                         # on first setup or fresh environment; otherwise preserve lock
npm run lint
npm run typecheck
npm run test -- --run
npm run build
npm run test:e2e               # once Playwright flows are present
```

If exact script syntax differs, align scripts so above works or document correction. Do not invent successful outputs. Locally browser-test anything interactive. Add CI job using Node cache and package lock, `actions/checkout`, `actions/setup-node`, and playwright browser install. On failed tests, surface actual stack/errors and browser traces. No blanket `.skip` of meaningful tests to green CI. Only approved temporary skip with ticket and reason, removed before Phase 11.

## J2. Unit suite (at least these cases; include property-based checks where useful)

**Geometry/physics:** different coordinate quadrants; 0/90/180/270 ray; ray parallel to AABB; obstacle circle tangent; boundary exactly at origin; diagonal collision; world boundaries; wall contact; obstacle placement overlap; floor-color zone edge priority; fixed clock determinism; playback rate independence; long movement no collision tunneling; invalid NaN/Infinity rejection; max sensor range returns null; round/display equality safe.

**Interpreter:** all comparators; null sensor explicit handling; truth tables; if/else only correct branch; nested control; repeat 0/1/N valid semantics; while initial false zero iterations; infinite loop budget; stop/cancel; nested function limits; definition not invocation; variables update; bad block error with source id; stable trace and snapshots; export/import program JSON; edited program hashes differ; no JS code execution.

**Learning:** initial wrong answer ambiguous; same wrong first answer split into distinct hypotheses by later probes; correct prediction no forced confusion; contradictory evidence downgrades; score weights bounded; no proof of mastery on one correct answer; fresh transfer tests distinct; attempted repeated same example not double counted; counterexample discriminates two models; counterexample no candidate safe; counterexample ground truth equals current engine; no incorrect claims of statistical probability.

**Curriculum:** all authored missions validate; all reference solutions satisfy goals; deliberately flawed code fails appropriate goal; variants require concept transfer; unlock/retry/resume correctly; hint use recorded honestly; practice with revealed solution doesn't grant independent mastery.

**Local storage:** migration old schema; corrupted file; duplicate imported ids; oversize file; storage denied/quota; export/import consistency; erase all; learner-scoped erase; timestamp ordering; program replay after reload; no PII fields required.

**Team:** 2–6 members; capacity errors; meaningful role cycle; each alias's prediction recorded separately; no accidental overexposure before handoff; team round only advances after correct required contributions or authorized skip; group completion based on actual mission predicate; resume/restoration; export.

## J3. Browser E2E scenarios — create persistent Playwright specs

1. Brand new user selects solo, generated alias, starts M01, predicts MOVE at 24 cm, runs, sees `24 < 20 is false`, inspects exact trace block, saves, reloads and resumes.
2. Wrong prediction prompts at least one actual diagnostic probe; different later probes lead to different tentative hypothesis; a counterexample shows measured changed outcome; transfer saved.
3. Student drags obstacle in Lab, sensor value changes with cm readout, changes threshold block, re-runs and gets different branch; rewind reproduces prior event state.
4. Add/removes a colored zone, exports world, clears lab, imports valid world and sees same reading; import malicious/invalid data rejected.
5. Blockly: add conditional, edit numeric field, undo, redo, duplicate block, delete, run; compare trace. Test missing socket/input validation with visible error and block focus.
6. Loop budget prevents hanging tab and displays actionable error.
7. M02 color sensor line mission from fresh profile to completed; M03 comparator repair; M06 function call logic.
8. Team session with 3 pseudonyms completes handoffs and role rotation; no public online or remote messaging promised; old session resumes after refresh.
9. Instructor opens real local data, date filters, views attempt, exports CSV, clear local data; Progress now empty; confirms permanent removal.
10. Settings theme/reduced motion/high contrast and persisted preferences; settings data export/import round trip.
11. Keyboard-only: navigate main areas, operate prediction choices, focus dialogs, Escape closes, no focus traps; accessible notifications.
12. Not found and thrown error recover, no white screen; storage disabled warns and app remains usable in ephemeral mode.
13. Responsiveness checks in target viewports; no main navigation/mission action offscreen or covered.
14. Anonymous privacy check: do not send prediction, name, program, trace, or student notes in network requests; browser devtools network checks during common journey.

Favor `getByRole`, accessible names and user-observable assertions, not brittle CSS classes or time-based waits. Use seeded fixtures where deterministic test data is necessary and mark such fixtures as test data only. Save trace/video/screenshot artifacts for failed tests. Do not use real child data as test fixtures.

## J4. Mandatory interaction matrix and visual review

Create `docs/INTERACTION_AUDIT.md` listing every visible enabled button/input/menu item from E1–E15 with: route, label, initial state, action expected, result verified, test file or manual screenshot, accessibility notes. Playwright MCP must click representative controls in **all routes**, not just Home. When an action requires browser file picker/download, use appropriate Playwright APIs. For drag-and-drop Blockly, combine UI automation with Blockly serialization or direct programmatic manipulation **only in test environment**; do not falsely claim a coordinate test exercised natural dragging if it did not.

At minimum inspect screenshot for Home, Mission library, Onboarding, M01 Predict, M01 Running, Trace view, Diagnostic probe, Counterexample, Reassessment, Free Lab, Team role handoff, Progress, Instructor, Settings, mobile/narrow advisory, error state. Look for text collision, giant unused whitespace, inconsistent panels, poorly contrasted text, hidden focus, overly busy gradients, unreadable Blockly controls, and sensor values being obscured.

Visual differences should be **fixed**, not merely logged. Keep a file summarizing tested viewport sizes and actual observed layout. Do not claim "pixel-perfect" without a provided Figma reference.

## J5. Performance, safety and browser behavior

- Set meaningful fixed budgets and measure them on available hardware. Example targets (adjust after measured baselines): interactive after initial load under a few seconds on local development machine, lab pointer response appears immediate, 1,000 trace events scroll smoothly, 100 obstacles do not freeze UI, fixed-step simulation run completes within bounded computation, 500KB+ import warns or rejects per documented cap.
- Avoid rendering every trace event on each animation frame. Virtualize long lists and memoize stable geometry.
- No accidental infinite JS loops from student programs; deterministic budget guaranteed.
- Potentially expensive interpretation/generation should yield or use Web Worker with cancellation and messages to main UI.
- All SVG/CSS animations obey reduced motion. Do not activate autoplay audio.
- Use local bundled fonts/assets, no tracking pixels, no ad SDKs, no external user-content inference services.
- Guard against XSS and HTML injection; React text rendering, no unsanitized innerHTML from imports/nicknames.
- Dependency audit and license checks; record any known vulnerabilities and remediation rather than claiming none without running tool.
- If deploying as static site, configure history-route rewrites so direct load `/missions/m01` resolves app shell; test actual production preview.

---

# PART K. DOCUMENTATION, TEACHER VALIDATION, COMPETITION DEMO AND SOURCE OWNERSHIP

## K1. README sections (write completely)

Product screenshot showing actual implemented UI; What Branchcade does; founder motivation stated accurately without embellishment; differentiating "predict / investigate / experiment" system; eight real missions; local/anonymous data model; tech stack; repo tour; exact install/run/test commands; data import/export; architecture diagram; algorithm guide; key limits; licensing and trademarks; AI assistance disclosure; evidence from tests (actual values only), demo procedure; privacy notice; accessible use notes; troubleshooting.

## K2. Human study protocol (before claiming effectiveness)

Provide a short optional anonymous product test with responsible adult/instructor approval as appropriate. Do not solicit sensitive information. Before: ask student to predict one threshold behavior and explain one reason; during: observe whether they can find sensor reading/trace and execute a scenario; after: ask different numbers/concepts to test transfer; ask "What was confusing?" and "Which step helped you figure out the result?". Record descriptive usability feedback and quiz performance only if real; sample size tiny and not causal evidence. Never claim "our app improves learning by X%" from fabricated or insufficient data. Make a blank form in docs, not bogus testimonials.

## K3. Submission video: exactly what to demonstrate

Target 2:30–2:50, adapt to official video's actual allowed duration. Suggested order:

- 0:00–0:22: Personal motivation based on teaching six younger robotics learners, understanding sensor logic and engaging with difficult roles. Avoid invented quotes.
- 0:22–0:42: Explain one focused problem and how existing general simulation does not directly examine learner prediction/reasoning in the same manner.
- 0:42–1:10: Show real 24cm `< 20` Blockly run with factual trace and why it moved.
- 1:10–1:38: Show diagnostic probe distinguishing two potential errors; select response live, see different follow-up.
- 1:38–2:05: Generate live counterexample, manipulate single parameter, compare actual traces.
- 2:05–2:23: Show new transfer challenge and actual progress evidence, optional team role rotation.
- 2:23–2:45: Explain deterministic TS engine, safe Blockly AST, evidence logic; student contribution and authentic testing.

Camera/voice/video footage only when permission appropriate; screen recording alone sufficient. If program fails live, have an openly labeled prerecorded working run, not a fabricated result. Verify audio intelligibility, text legible at 1080p, browser zoom comfortable, no private tabs/credentials.

## K4. Responsible AI documentation

The competition requires transparent compliance with its current rules. Track files and algorithm sections substantially AI-assisted, student changes and evaluations actually made, and the tools used. Never invent student contributions. Have creators personally review and explain core functions, then complete code-oriented checks such as: "Why does 20<20 evaluate false?", "How does the sensor intersect a rectangle?", "Why can't student blocks execute arbitrary JavaScript?", "What is a counterexample discriminator?", "How is a wrong first answer considered ambiguous?". Actual students should perform substantive planning, implementation/revision, testing and presentation work rather than relying solely on agent execution. Confirm final requirements via official rulebook before submission.

---

# PART L. SESSION START, CHECKPOINT, HANDOFF, AND FINAL AGENT RESPONSE FORMAT

## L1. Startup commands and precautions

Run only the commands that fit the actual checked-out repo and current environment. Example:

```bash
pwd
git status --short --branch
git remote -v
git fetch --all --prune
git log -5 --oneline
node --version
npm --version
# If dependency lock exists:
npm ci
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

When repository is empty, scaffold current supported React + Vite + TS rather than assuming scripts exist. When network unavailable, use installed packages and report blockers. Do not overwrite current user files or blindly run `git pull` with dirty worktree. Don't embed deployment or GitHub credentials in code/logs.

## L2. Handoff document format after every phase

Write `docs/HANDOFF.md` with exact, human-readable fields:

```
Project: Branchcade
Current completed phase: XX
Current branch:
Commit SHA (local):
Remote pushed SHA (verified):
Start environment (Node/npm):
Changed files/modules:
Features actually working:
Features not yet implemented:
Manual browser checks actually performed:
Automated commands + actual pass/fail outcomes:
Screenshots/trace artifact paths:
Known bugs/limitations:
Architectural decisions/contract changes:
Privacy/security notes:
AI-assisted portions and student review needed:
Next chronological phase:
First actions for next Codex session:
```

Set `docs/STATUS.json` accordingly. Tests that were not run are marked `not run`, not `passed`. If no Git remote is configured, specify "push blocked: no origin" clearly, never fabricate a SHA.

## L3. End-of-session summary to user

At the end of each session, provide compact report, no unverified cheerleading:

```
BRANCHCADE BUILD CHECKPOINT
Phase(s) completed:
What now works (with demonstration steps):
Tests run and results:
Visual/browser checks:
Commit:
Push status:
Problems remaining:
Next phase:
How to run locally:
Important source files to review and understand:
```

If all phases are completed, report final functional paths, actual test counts and failure count, build status, accessibility/privacy status, actual public URL if deployed, known limitations, and what still requires student's review and competition submission. Never call an application "production-ready" solely because it compiles; attach evidence.

## L4. Final instruction — TAKE ACTION NOW

**BEGIN IMPLEMENTATION IMMEDIATELY.** Inspect this workspace and remote, read project documents, determine the first unfinished phase, implement the required code/files/tests, review resulting browser behavior, then commit and push a verified handoff checkpoint. Continue chronologically if resources allow. Do not merely paraphrase this specification, generate a generic task list, announce that you will work later, or ask for trivial decisions already set above. Each phase must have real code, tests and observed functionality. If the repository already includes some finished work, verify and reuse it. Your priority is a fully working, impressive, original Branchcade web app whose actual core learning cycle can be demonstrated to judges.

**End of master prompt.**
