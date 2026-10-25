# Logo integration

- **Source and approval:** the project lead (Hrishi Lenin) shared the logo in the team chat on 2026-10-25 with the instruction "This should be the logo … Crop it properly." Only a screenshot of the chat was available to this session; no original vector or high-resolution file was supplied.
- **Preserved source:** `public/brand/branchcade-logo-source.png` is the logo card cropped unmodified from that screenshot (600×400).
- **Derived files (cropped and resized only, no redrawing):**

  | File                                      | Size    | Use                                                                 |
  | ----------------------------------------- | ------- | ------------------------------------------------------------------- |
  | `public/brand/branchcade-logo.png`        | 451×240 | Mark + wordmark lockup, used in the README                          |
  | `public/brand/branchcade-mark.png`        | 132×132 | Rounded-tile mark: header (34 px), footer (22 px), Apple touch icon |
  | `public/favicon-32.png`, `favicon-16.png` | 32, 16  | Browser tab icons                                                   |

- **Changed files:** `src/app/App.tsx` (header and footer mark; the lucide icon was removed), `src/styles/globals.css`, `index.html` (icon links), `vercel.json` (rewrites skip `brand/` and `favicon-*`), `README.md`. The old `public/favicon.svg` was removed.
- **Accessibility:** the mark is decorative (`alt=""`). The visible "branchcade." wordmark and the link's "Branchcade home" label carry the name. The mark sits on its own dark tile, so it reads on light and dark themes.
- **Verified:**
  - All assets return 200 `image/png`.
  - Header and footer render at 1366 px and 390 px (screenshots in `evidence/logo/`) with 0 console errors.
  - Regression test in `e2e/final-acceptance.spec.ts`.
  - Full Chromium E2E 116/116.
- **Limitation:** the mark comes from a ~112 px screenshot crop. It is sharp at header and favicon sizes, but larger uses (a social preview or print) need the original file. Drop it into `public/brand/` and re-export the derived files.
