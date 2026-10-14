# Isolated browser QA for combined v0.20.34

This is test-only infrastructure, based on accepted main commit
`8343d81405b9eb3c59621a4b0ead4052e2d3949e`. The rights self-test fixture copies only exact manifest-listed QA/workflow files with path containment checks. It changes no application source,
root dependencies, production notices, existing deployment workflow or settings.
The new workflow runs only on pushes to `candidate/browser-qa-v034` in
`miyasakayosuke/kanshu-arena`. There is no manual dispatch, pull-request trigger,
secret use, OIDC, Pages deployment, environment grant or write permission.
Independent source/security review must precede publication of that branch.

## Exact matrix and pass contract

The new branch derives from the independently reviewed QA commit
`74ca824dcea6a92a6b350743ecfd666dd58c0941`. Its matrix contains only the combined
v0.20.34 candidate. The prior four-row QA branch and run remain unchanged.

- combined: `14134f351d8eca79714199e1f2b34dc76e826a4e`, 6 passed / 6 skipped

The coordinator must substitute the independently reviewed exact combined commit
SHA before publication, update the workflow's inventory digest and have the final
substitution checked. A placeholder is not authorization to run an arbitrary ref.

The twelve discovered cases are the shared UI, catalog, calculator and storage
specifications at desktop 1440×1000 and touch/mobile 390×844. The combined row
executes shared UI, catalog reset and awakening calculator checks at both sizes;
all six storage cases are deliberately skipped. The result guard rejects missing
projects, all-skipped runs, unexpected counts, retries and runner errors. Support
for the historical tags remains in the test helpers solely to minimize unrelated
changes; the workflow cannot select them.

The combined candidate builds with its unchanged `npm run build` including source
and dist rights checks, then serves its production bundle through loopback Vite
preview. There is no development-server driver import for this matrix row.
The old storage spec remains available but is not part of combined acceptance.

## Coverage

Shared production UI checks: real catalog count/navigation, keyboard detail tabs,
Escape and opener-focus restoration, team view, complete deterministic battle loop,
result and return to team. Exact party IDs/order and accessible labels are compared before battle, after return and after reload. Screenshots capture catalog, detail, team, battle and
result at both viewports. Document-level horizontal overflow is checked.

Catalog-only checks: actual nonzero list scroll, route-return retention, sort reset,
disclosure retention, family-filter reset, empty search and reset back to 37 cards.

Preview-only checks target the NEW awakening stat calculator, not the existing
reading-art header. They open the abilities disclosure, check default zero and
stages 0/4/99 against independently calculated 95/98/100 growth rates, exercise
bounded step buttons and the native slider keyboard controls, verify hypothetical
labels and unchanged MP/speed/base stats, and reset on next monster and reopen.
Phone/desktop screenshots capture each stage. Control sizes and horizontal bounds
are checked. Storage mutation calls and before/after bytes stay unchanged;
displayed base stats and catalog roster content remain unchanged. This does not
inspect private in-memory React/module objects or prove every engine invariant.

Historical storage-only checks (skipped for combined) execute the actual driver/adapter in independent same-origin
pages and real browser IndexedDB connections. Five races per viewport assert one
head writer, one stale rejection, one duplicate settlement and exactly one reward.
A reload during an active battle grants nothing. Explicit synthetic legacy progress
is imported byte-preservingly, roster migration retains balances and exact backup,
and a native `put` followed by real transaction `abort()` rejects and preserves
bytes across reload before a successful retry. A deliberately temporary test-only
prototype wrapper injects that abort; IndexedDB itself is not mocked. Unknown
stores, unexpected indexes and future database versions fail closed and preserve
sentinel bytes. LocalStorage bytes are compared around driver operations.

## Evidence and limits

Screenshots, failure traces, JSON results, small storage evidence attachments and
HTML reports are retained for seven days. Inspect screenshots manually before any
UI acceptance: screenshots alone do not assert pixel correctness. Successful CI is
a browser-test result, not acceptance, a release, or legal clearance.

Not covered: WebKit/Firefox, physical devices, arbitrary screen sizes, OS process
kill/crash durability, actual browser quota exhaustion/eviction, retained production
legacy saves, all schema/index/keyPath variants, blocked-open/late-open and
versionchange event lifecycles, background tab visibility/animation behavior,
long-running stress or comprehensive accessibility. The synthetic legacy fixture
is not proof that any historical production save can be migrated. Real abort
rollback is not evidence of crash durability or quota handling.

Historical initial local pre-publication verification on 2026-10-14: dependency lock creation and
`npm ci --ignore-scripts` succeeded; Node syntax/test discovery and result-guard
self-tests succeeded. Chromium launch was blocked before test bodies by the local
sandbox (`socket() failed: Operation not permitted`). No browser pass is claimed.
The prior four rows subsequently passed CI run 38512498551 with16 executed passes. Those results do not establish combined-source acceptance; the new exact combined run and screenshot review remain required.

## Dependencies and local use

Official Microsoft Playwright packages are pinned to 1.56.1 in the separate
manifest/lockfile; npmjs registry URLs and integrity hashes are retained.
Playwright packages are Apache-2.0; the optional Darwin-only fsevents dependency
is MIT. They are development tools only, not included in the production bundle.
Installed package LICENSE/NOTICE files are preserved by npm; no dependency code,
browser binaries or generated reports are committed in this patch. Original QA
source was AI-assisted for this project; no outside code or artwork was copied.
No license for the project's original code/art is selected here.

For an authorized environment with a browser, from this directory:

    npm ci --ignore-scripts --no-audit --no-fund
    npm run test:guards
    npx --no-install playwright install chromium
    QA_APP_ROOT=/absolute/immutable/checkout QA_CANDIDATE=combined QA_SOURCE_SHA=<exact-sha> npm test

Build UI checkouts first using their unchanged `npm run build`. Storage does not
need a build. QA_CHROMIUM_PATH may point to an already installed local Chromium;
the CI workflow always uses Playwright's pinned browser. Do not alter sandbox or
security settings to work around a local browser-launch denial.
