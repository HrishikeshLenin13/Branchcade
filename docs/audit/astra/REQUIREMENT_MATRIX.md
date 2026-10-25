# Requirement matrix — work in progress

Initial source02ce0dd. PASS requires current evidence, not historic acceptance prose. Final detailed matrix will distinguish source/unit/browser, failures and gaps.

| ID  | Spec    | Feature                 | Expected                                   | Observed                                     | Method/source                   | Status  | Severity | Next verification |
| --- | ------- | ----------------------- | ------------------------------------------ | -------------------------------------------- | ------------------------------- | ------- | -------- | ----------------- |
| S01 | C4/E14  | Concurrent annotations  | preserve immutable evidence and assistance | lost assistance                              | astra-storage;storage/rebase.ts | FAIL    | P0       | repair+browser    |
| S02 | C4/E14  | Queued saves            | keep unrelated committed records           | foreign attempt erased                       | astra-storage;app/session.ts    | FAIL    | P0       | repair+browser    |
| S03 | E14/E15 | Delete/stale edits      | no resurrection                            | orphan attempt persisted                     | astra-storage;repositories.ts   | FAIL    | P0       | barrier+browser   |
| S04 | C4/E14  | Initial saves/revisions | merge first writes; increasing revision    | overwrite/backward stamp                     | astra-storage                   | FAIL    | P0       | repair            |
| B01 | E4/F    | M01 prediction          | actual24<20 decision                       | controls and real production route inspected | Playwright MCP;Chrome DevTools  | PARTIAL | —        | full suite        |
| G01 | G1–G6   | Learning/cache          | trace-grounded per scenario                | source review only                           | learning/*                      | PARTIAL | —        | independent tests |
| R01 | K/L     | Approved brand          | owner approved asset                       | none found                                   | repo search                     | BLOCKED | —        | owner asset       |
