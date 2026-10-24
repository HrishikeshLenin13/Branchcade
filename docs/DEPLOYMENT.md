# Static deployment handoff

The I/J continuation supplies a verified local production build and committed SPA fallbacks. It does **not** claim a public deployment. On 2026-10-24, the installed Vercel CLI reported no existing credentials; no Vercel or Netlify project link exists in this checkout. The identity command attempted its automatic login flow, which was stopped. No hosting account was authorized or public URL produced.

## Reproduce the build

```bash
nvm use
npm ci
npm run check
npm run preview -- --port 4173 --strictPort
```

Visit the actual local URL printed by Vite. The app uses a root-relative Vite base and hashed assets. The Playwright suite visits and reloads deep routes in this production preview. This proves local static behavior; the chosen public host must still apply its own rewrite configuration.

## Owner-authorized publication

For Vercel, the owner signs in to the intended hosting account, links this repository to the intended project, sets the build command to `npm run build` and output directory to `dist`, and publishes. The committed `vercel.json` rewrites app routes to `index.html` while allowing assets and the favicon through; it sets no-sniff, no-referrer and restricted camera/microphone/geolocation headers.

Alternatively, publish `dist/` with an authorized Netlify or Cloudflare Pages project. `public/_redirects` is copied into the build with `/* /index.html 200`. Configure an equivalent SPA fallback on another static host. No backend, API keys or learner database is required.

After publication, record the real URL and check Home; direct `/missions/m01`, `/lab` and `/settings` loads and refreshes; bundled fonts and Blockly media; the prediction → actual trace → investigation → experiment → transfer journey; export/reload/delete; and browser console/network errors. Do not equate localhost with a deployed site. Hosting access logs may include IP addresses/page paths even though the app does not transmit learner content.

## Remaining authorization

Choose and authorize the hosting account/project, then publish and verify the resulting public URL. This is the only hosting step left to the owner. No credentials need to be pasted into chat. Student algorithm review and dedicated Parts K/L remain separate, explicitly uncompleted human work.
