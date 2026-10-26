# Deployment

Branchcade's production website is **[branchcade.vercel.app](https://branchcade.vercel.app)**.

The Vercel project is connected to [HrishikeshLenin13/Branchcade](https://github.com/HrishikeshLenin13/Branchcade), using the `main` branch. Initial deployment was completed on **October 25, 2026**, from commit `b3437ba12abc6d4b388eb3184edb005d8766feaf`. Vercel reported the production build as **READY** and verified the `branchcade.vercel.app` domain. Password and Vercel sign-in protection were disabled so visitors do not need a Vercel account.

This confirms successful publication on the hosting service. An independent logged-out, external-browser walkthrough of the public site has **not yet been recorded**.

## Production configuration

- **Host:** Vercel
- **Domain:** [branchcade.vercel.app](https://branchcade.vercel.app)
- **Repository:** `HrishikeshLenin13/Branchcade`, production branch `main`
- **Framework:** Vite, React and TypeScript
- **Runtime:** Node.js `24.x`
- **Build:** `npm run build`, output in `dist`
- **Routing:** `vercel.json` with SPA rewrites
- **Backend:** No hosted learner database

The project's source and deployment are linked through Vercel's Git integration. Changes pushed to the production branch trigger new deployments. The existing `vercel.json` preserves static asset requests and provides fallback routing for application pages, along with basic response headers.

You can view or manage the project at [Vercel](https://vercel.com/hrishikeshlenin13-6391s-projects/branchcade). Deployment status and source checks are also visible from the GitHub repository's [Actions](https://github.com/HrishikeshLenin13/Branchcade/actions) page.

## Verify the public website

Before sharing the application with judges or students, use a browser that is **not** signed in to the Vercel account and check:

1. [Home](https://branchcade.vercel.app) loads with the correct logo, fonts and navigation.
2. [M01: The Wall Problem](https://branchcade.vercel.app/missions/m01), `/lab` and `/settings` open directly and still work after a refresh.
3. The prediction → program run → trace → investigation → experiment → transfer flow works in M01.
4. Blockly editing, bundled media, sensor display and saved progress work normally.
5. Exporting and importing local records works, and the browser console shows no unexpected errors.

The repository has extensive local and CI browser tests, but passing tests on a local preview does not replace this public-site walkthrough.

## Local production build

With Node 24 installed:

```bash
nvm install
nvm use
npm ci
npm run check
npm run preview -- --port 4173 --strictPort
```

Open the local address printed by Vite. `npm run check` builds the app first, and `npm run preview` serves that build. Rebuild after changes to avoid testing stale output.

## Data and privacy

Branchcade keeps learning records in the current browser's IndexedDB. They are not automatically synchronized between computers. Users may manually export and import their records. The application has no learner sign-in system or hosted classroom database. A web host may still log visitor IP addresses and page requests as part of delivering the site.

See [security and privacy](SECURITY_PRIVACY.md) and [release acceptance](production/FINAL_RELEASE_ACCEPTANCE.md). Documentation of technical verification should not be read as proof of a classroom learning outcome or contest eligibility.

## Historical note

The earlier October 24 handoff in this file correctly reported that no hosting account or public URL was available at that time. That is superseded by the October 25 Vercel deployment described above. Other historical release reports may still describe their own earlier checkpoints.
