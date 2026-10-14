# Candidate browser QA run 38512498551

Evidence reviewed: 2026-10-14 UTC. Scope: executable browser assertions and runtime
attachments. Manual screenshot review and candidate acceptance are separate gates.

## Identity and execution

- Run: https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38512498551
- Reviewed harness commit: `74ca824dcea6a92a6b350743ecfd666dd58c0941`
- Harness branch: `candidate/browser-qa-v032`
- Playwright: **1.56.1**; actual Chromium runtime: **141.0.7390.37**
- Projects: desktop **1440×1000** and phone **390×844** with touch/mobile emulation.
- Workflow environment: Ubuntu 24.04, Node 22; one browser worker per matrix row.
- Production UI candidates are built and served through Vite preview. The storage
  candidate is tested through isolated Vite TypeScript imports in real browser
  pages. It is not imported into the production application.
- Only the isolated QA workflow ran for this test commit. This report authorizes
  no merge, deployment, settings change or expansion of permissions.

## Exact source and result matrix

| Row | Immutable application SHA | Passed | Expected skips | Started UTC |
| --- | --- | ---: | ---: | --- |
| baseline | `8343d81405b9eb3c59621a4b0ead4052e2d3949e` | 2 | 10 | 04:40:03.828 |
| preview | `da7954108e36b69955c730eafc7bd7782be809e1` | 4 | 8 | 04:40:06.008 |
| catalog | `e91dbdb5376a44c8a851a76b0bf70251882fff62` | 4 | 8 | 04:41:03.652 |
| storage | `2b6de6bdad0b25f22de387559a70f4f9da3babb0` | 6 | 6 | 04:41:07.453 |

Across all rows: **16 executed passes, zero failures, zero flaky results and zero
retries**. Each discovered test has exactly one result with retry index zero.
Runner error arrays are empty. Per-row fail-closed result guards were rerun against
the downloaded JSON reports and reproduced the required 12-case totals and the
correct desktop/phone pass split. Expected skips exclude features absent from a
particular exact candidate; they are not missing passes counted as success.

## Shared production UI findings

Baseline, preview and catalog each passed at both viewports:

- 37-card catalog rendering and route entry, focused catalog heading.
- Real detail keyboard tab navigation, Escape dismissal and opener-focus return.
- Catalog, team and battle document-level horizontal overflow assertions.
- A complete deterministic play loop through a battle result and return to team.
- Exact party IDs/order and accessible lineup labels match before battle, after
  returning from the result, and after page reload. Observed IDs: **0, 2, 3, 4, 6**
  (妖狐, バステト, ドリュアス, バンシー, ガルーダ).
- No uncaught page errors, including startup.

Screenshots exist for catalog, detail story, team, battle and result at both sizes.
Their existence and automated assertions do not establish manual visual acceptance.

## Catalog candidate findings

Both browser projects passed actual nonzero catalog-list scrolling, route-return
scroll retention, reset to zero after sort change, retention across disclosure
toggle, reset after family filtering, five dragon results, empty search, and reset
back to 37 results/default order while keeping the disclosure open. Reset-screen
screenshots were captured. The baseline was not required to have this new behavior.

## Awakening calculator candidate findings

Both projects exercised the actual new `.awakeningPreview` calculator in the
abilities tab. The existing reading-art header was not mistaken for this feature.
The disclosure initially closed at stage zero; stage 0/4/99 outputs matched
independently calculated 95/98/100 growth-rate expectations. Step-button limits,
native slider keyboard operation, hypothetical/non-persistent wording, unchanged
MP/speed and displayed base stats, minimum control sizing/horizontal bounds, and
reset on next monster and close/reopen passed. Storage mutation-call logs remained
empty and local/session stored bytes plus catalog content were unchanged. Stage
0, 4 and 99 screenshots were captured for both viewports. These checks do not
inspect private module objects or prove every combat-engine invariant.

## Real IndexedDB findings

The exact driver and adapter were imported independently in two real same-origin
pages in the same browser context; each driver transaction used its own database
connection. IndexedDB was not replaced by an in-memory fake.

- **Ten races**, five per viewport, produced exactly one successful head writer and
  one stale rejection. Both pages won in different rounds. Desktop winning pages:
  **1, 2, 2, 2, 2**; phone winning pages: **1, 1, 2, 1, 2**.
- Reopening the second page during the active battle preserved its snapshot and
  granted no reward. Concurrent settlements produced one ordinary completion and
  one duplicate response. Every round ended at revision **3**, common balance
  **7**, one win and one selection; a later stale write left final bytes unchanged.
  The numeric economy is a deliberately synthetic test fixture, not product policy.
- Explicit whitespace-preserving synthetic legacy bytes imported once at revision
  **1**. A new roster species migrated at revision **2**, preserved balance **19**,
  initialized the new species to zero and retained the exact prior-head backup and
  original legacy bytes.
- A temporary test-only native `IDBObjectStore.put` wrapper queued one real write
  then aborted its real transaction. Both projects reported `resolved: false`,
  `writes: 1`, error code `unavailable`. Exact durable bytes matched before/after
  the abort and after reload. Retrying afterward committed successfully.
- LocalStorage bytes remained unchanged during driver operations.
- Unknown object store, unexpected index, and future database version fixtures
  were refused without altering their existing sentinel bytes.

These results establish the specific bounded Chromium behaviors above. They do
not mark the storage candidate production-ready or accept another task's artifact.

## Remaining gates and limits

- Separate manual review of screenshots and any UI acceptance decision.
- Firefox, WebKit, physical devices, and viewport sizes outside the two tested.
- Browser quota exhaustion, eviction/retention, OS/process crash durability and
  arbitrary interrupted writes. An explicitly aborted transaction is not a crash.
- Blocked-open/late-open and versionchange event lifecycles, all schema/keyPath/
  auto-increment/index variants, sustained multi-writer stress.
- Historical production-save compatibility. The imported legacy data was synthetic
  and this does not authorize migrating any actual user's saved data.
- Background-tab animation/visibility behavior, comprehensive accessibility,
  integration into production gameplay, economy acceptance and release approval.

## Artifact integrity and provenance

The following SHA-256 values were computed from the reviewed downloaded JSON
reports; every report contains the exact source SHA, harness commit/run URL,
browser version and project viewport. Names refer to the run's four retained
`browser-qa-<row>-<source-sha>` artifacts, each containing `test-results/results.json`.

| Row | results.json SHA-256 |
| --- | --- |
| baseline | `aabed395eb9b1b2b2811a9fcd6d6e6b7d081704bcbc0f8ffd50c0451bf925ca1` |
| preview | `877b50a5103e719e0173d1e0e1fcf86e12f122b8d2a2a38b2d83a875ec986345` |
| catalog | `a49cbd6e0c6e0c5818828ac39b8c5bab6df2b7ce1a0fc4f72b9a834ef9c3dff0` |
| storage | `fcf8774a1b87d762fa8306b81454206c9e8df8947cb766ec1aa75c1a89506a1f` |

This is an original evidence summary of the project's test execution; it copies
no third-party source or artwork and includes no credentials or private runtime
metadata. No license for original project work is selected. Rights inventory
checks remain inventory validation, not legal clearance. The original local
sandbox browser-launch failure was resolved for this test scope by authorized
standard CI execution, without changing sandbox security settings.
