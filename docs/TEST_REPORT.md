# Test report — intermediate checkpoint

Scope: Parts A–C foundation, not whole-product shipping.

- Initial remote/workspace: empty repository; no baseline application/tests existed.
- Initial contract suite: 15 passed.
- Current check: lint and strict typecheck pass; 85 unit/integration/component tests pass; production build passes.
- First Chromium E2E run: 22 passed, 1 failed because exact Theme label lookup included option text. Fixed with explicit aria-label; focused rerun passed. Subsequent complete rerun passed all 52 tests across Chromium and Firefox (26 each), including real pointer dragging, six-person teams and storage-denied recovery. Fresh Node24/production-preview gates follow.
- Actual defects corrected: wrong OR truth-table fixture; Blockly ESM locale import mismatch (caught by build and headless test); button-link foreground found in screenshot; explicit select names.
- Playwright MCP: Home → onboarding → M01 prediction/actual run, probe selection and generated experiment exercised. Additional manual routes and target viewport review follow.
- Chrome DevTools MCP: Home console warnings/errors empty; no fetch/XHR requests. Development-server trace measured LCP1641ms and CLS0.04, no throttling. This is a local dev measurement, not a production or user-population performance claim.
- npm audit --omit=dev: zero vulnerabilities at this checkpoint. Full dependency audit and fresh Node24 verification follow.
- Lazy Blockly chunk warning (~790KB minified) remains; Home excludes it. No real-time animation or worker is claimed.

Final exact command evidence will replace this intermediate report after complete reruns.
