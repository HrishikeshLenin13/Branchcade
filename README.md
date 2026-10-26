# Branchcade

<p align="center"><img src="public/brand/branchcade-logo.png" alt="Branchcade logo" width="340" /></p>

**Make the logic click.**

**[Try Branchcade](https://branchcade.vercel.app)** · [Start the first mission](https://branchcade.vercel.app/missions/m01) · [How it works](docs/ARCHITECTURE.md)

Branchcade is a browser-based robotics learning app for beginners. Students build programs with Blockly, predict what a robot will do, then run the program and see _why_ it behaved that way. When the result is surprising, they can investigate their reasoning and try an experiment instead of guessing at a fix.

![Branchcade's actual mission workbench, with Blockly code, the robot simulator and prediction choices.](docs/evidence/k/readme-workbench.jpg)

_An actual local-build screenshot, not a mockup. The learner name shown is a demonstration alias._

## Why we made it

The idea came from Hrishikesh's experience helping younger students program LEGO SPIKE Prime robots for FIRST LEGO League. Getting a robot to complete a challenge can be exciting, but a working program doesn't always mean its logic makes sense to the person who wrote it.

We wanted a place where students could slow down, make a prediction, look at what the code actually did and figure out what changed. A wrong answer should give them something to explore, not just a red X.

## How a mission works

1. **Build and predict.** Connect Blockly blocks, look at the robot's surroundings and choose what you think will happen before pressing Run.
2. **Run and inspect.** The robot follows the program in a simulated world with real distance and floor-color readings. Step through the execution, rewind it or inspect the decision trace.
3. **Investigate.** Follow-up questions explore different possible reasons for a surprising prediction. One incorrect answer is not treated as proof of what a student thinks.
4. **Experiment.** Change one condition of the scenario and run it again. Then try a new problem to see whether the idea carries over.

For example, suppose a robot sees a wall **24 cm** away. Its code says *if the distance is less than 20 cm, stop; otherwise, move forward 10 cm.* Branchcade shows that `24 < 20` is false, so the robot moves. The sensor reported a number; the condition determined what happened next. Students can change the wall distance and see when that decision flips.

## What's in Branchcade

- **Eight guided missions** covering sensor thresholds, branches, line following, loops, functions and debugging, ending with a mystery-malfunction challenge.
- **A working robot simulator** with movement, collisions, obstacles, distance sensing and floor-color detection.
- **Editable Blockly programs** with conditions, loops, variables and functions, plus step-by-step execution traces tied to the original blocks.
- **Questions and experiments** that compare possible misunderstandings, test a single change and revisit the concept in a different scenario.
- **Free Lab**, with editable worlds, presets and saved experiments for trying ideas outside the guided missions.
- **Local team mode** for 2–6 learners sharing one computer, with turn-taking and different roles.
- **Progress and instructor views** with locally stored records and export options.

The learning logic runs on deterministic code, not on a chatbot generating answers at runtime.

## Try it

**[Open Branchcade →](https://branchcade.vercel.app)**

No account is required. Start with **M01: The Wall Problem** to try the predict → run → investigate cycle, or open **Free Lab** to build your own scenario.

**[Go straight to M01 →](https://branchcade.vercel.app/missions/m01)**

## Run it locally

You'll need Node.js 24 and npm. The repository includes a pinned Node version in [`.nvmrc`](.nvmrc).

```bash
git clone https://github.com/HrishikeshLenin13/Branchcade.git
cd Branchcade
nvm install
nvm use
npm ci
npm run dev
```

Open the local address printed by Vite, usually `http://127.0.0.1:5173`.

To build and preview the production version:

```bash
npm run build
npm run preview
```

To run the maintained checks:

```bash
npm run check
npx playwright install chromium firefox
npm run test:e2e
```

The CI workflow runs linting, TypeScript checks, tests and the production build. See [GitHub Actions](https://github.com/HrishikeshLenin13/Branchcade/actions) for current results.

## How it's built

Branchcade uses **React, TypeScript, Vite and Blockly**. Blockly programs are converted into validated instructions for a bounded interpreter; generated JavaScript is not evaluated. A deterministic simulation engine computes robot movement and sensor readings. Its execution trace powers both the on-screen explanations and mission judging, so they refer to the same run.

Progress, programs and experiments use versioned browser storage through **IndexedDB**. The app is deployed on **Vercel**, with the production site linked to the `main` branch.

For a deeper look, see the [architecture](docs/ARCHITECTURE.md), [mission and learning design](docs/), [testing evidence](docs/production/FINAL_RELEASE_ACCEPTANCE.md) and [deployment notes](docs/DEPLOYMENT.md).

## Progress and privacy

Branchcade doesn't require registration or send learner answers to a cloud account. Records stay in the browser where they were created. You can **export** your data and **import** it in another browser, but progress **does not automatically sync between devices**. Clearing browser data or using a private window can remove saved work.

The instructor view reports on records saved in that same browser, not on a remotely connected classroom. Use nicknames rather than students' real names. See the [privacy notes](docs/SECURITY_PRIVACY.md) for details.

## Development and attribution

Branchcade's starting idea came from Hrishikesh's experience teaching robotics. The project has also used **AI coding agents extensively**, including OpenAI Codex, GPT Astra and Anthropic Claude Code. These agents wrote and revised substantial parts of the application, tests and documentation. Their contribution should not be mistaken for independently student-written implementation.

The repository documents that work in the [AI assistance log](docs/AI_ASSISTANCE_LOG.md) and [source ownership review](docs/compliance/CAC_SOURCE_OWNERSHIP_GAPS.md). Classroom learning outcomes have not been established through a formal user study, and a successful build is not a claim of competition eligibility.

Branchcade is an independent educational project. LEGO, SPIKE Prime and FIRST are mentioned for context; there is no claimed affiliation or endorsement.

## Project notes

The web version is live, but features such as physical robot control, online accounts and automatic cross-device syncing are not part of the current release. Accessibility and browser testing have been performed in documented configurations; that is not a claim of universal device support.

The project has **no repository-wide distribution license selected**. Public source availability does not automatically grant permission to reuse the code. Third-party components retain their own terms; see [license notices](docs/LICENSE_NOTICES.md).

For test history and known limitations, see the [release acceptance report](docs/production/FINAL_RELEASE_ACCEPTANCE.md) and [project documentation](docs/).
