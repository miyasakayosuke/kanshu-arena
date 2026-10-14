# Isolated browser QA for awakening progression v0.20.35

Test-only infrastructure derived from exact harness commit
`2c7b195442be1d3940f505477b68a59462e46712` on
`candidate/browser-qa-v034` in `miyasakayosuke/kanshu-arena`.

## Isolation and immutable source

The new workflow runs only for pushes to `candidate/browser-qa-v035`, with a
repository/ref job guard, `contents: read`, pinned official GitHub actions and
`persist-credentials: false` on both checkouts. No pull-request/manual trigger,
secrets, OIDC, Pages actions, environment permission or deployment is added.
The existing `.github/workflows/deploy.yml` is unchanged and must never be
manually dispatched to perform QA. Its existing push trigger is main-only.

The workflow checks out the QA commit as `harness` and an immutable application
commit as `app`. Before publishing this QA branch, replace the single
`REPLACE_WITH_REVIEWED_IMMUTABLE_APPLICATION_SHA` in the matrix with the reviewed
40-character candidate SHA. The workflow verifies `app` HEAD against that SHA.
Recompute its inventory digest and review the final substitution. A placeholder
is not authorization to run an arbitrary ref. No production source, root package,
root lockfile, deployment settings or rights ledger is changed by this artifact.

The application runs its unchanged `npm run build`, including its source/dist
rights checks. UI pages are served from the production bundle by loopback Vite
preview on 4173. Progression fixtures also assert that the mounted page's module
script comes from `/kanshu-arena/assets/*.js`.

A separate loopback Vite development server on 4174 transforms the exact same
candidate's domain/storage modules for browser-side test helpers. These imports
never replace the production React UI, engine, or storage adapter. Helpers execute
in pages on the production 4173 origin, using its real IndexedDB. Seeded state is
explicit synthetic input prepared on a static credits page before React mounts.
Synthetic rewards prove claim/UI handling, not legitimately earned battle rewards.
The normal-completion test earns its reward only by completing the actual UI
battle loop; it does not settle an injected result.

## Pass contract

`QA_CANDIDATE=awakening` must execute exactly 30 tests with zero skips and retries:
15 named cases at desktop 1440×1000 and the same 15 at touch/mobile 390×844.
The JSON guard rejects a missing/duplicated/replaced named case, missing project,
unexpected skip, retries, runner errors or unexpected total. Twenty Node tests
exercise this guard; those Node tests are not browser evidence.

Coverage at both sizes:

1. Fresh AwakeningPanel, insufficient materials, zero rewards from browse-only
   navigation, reload, and no horizontal overflow.
2. Upgrade preview, cancel, two immediate native clicks, exactly one debit and
   revision, durable level/balance, and all saved-team bytes preserved.
3. One-time selection claim, disabled claim at level 99, 98→99 upgrade, cap, reload.
4. Actual production UI battle, repeated begin click, frozen starting party,
   engine-outcome-matching durable reward, no repeat on navigation/reload.
5. A stale visible upgrade confirmation after a second page's real IDB commit,
   rejection without overwrite/spending, explicit reload/review.
6. Navigation while begin waits behind a real competing IndexedDB transaction,
   staying away and returning before begin completes, no resurrection, no reward,
   and return to usable arena.
7. Real queued begin `put` followed by transaction `abort()`, no phantom battle,
   exact preserved bytes, explicit retry and later no-reward exit.
8. Active battle navigation cancel, Escape, browser Back cancel/confirm and Forward;
   no unearned reward or resurrection of the discarded match.
9. Reload of active battle, disabled new match, explicit discard cancel/confirm,
   repeated click, exactly one no-reward settlement and durable reload.
10. Existing catalog/detail keyboard/focus flow, complete play loop and saved party.
11. Existing catalog nonzero scroll retention, filter/sort reset and empty-search reset.
12. Existing hypothetical calculator, stages 0/4/99, bounds, keyboard, unchanged
    base stats and local/session storage, reset on next monster/reopen.
13. Five real same-origin two-page IDB races: one writer, one stale rejection,
    duplicate settlements, one reward, active reload and stale-write rejection.
14. Explicit synthetic legacy input, roster migration, exact backup/raw preservation,
    real transaction abort/reload and successful retry.
15. Unsupported IDB schema/future version/index refusal preserves sentinel bytes.

Normal rewards follow the approved provisional economy: completion common 1,
win bonus 4, selection every 10 wins, essence per selection 10 and flat 10-step
costs. Historical isolated-storage race tests deliberately use their unchanged
arbitrary fixture economy; they test serialization rather than product policy.

Screenshots and JSON attachments identify states and browser version/source SHA.
Controls in the progression panels are checked for ≥44px height and horizontal
viewport bounds. The normal loop and panel states are checked for document-level
horizontal overflow. Screenshots still require human visual review.

## Dependencies and running

The exact separate package manifest and lock from v034 are retained byte-for-byte:
Microsoft Playwright 1.56.1 and its locked dependencies, official npm registry URLs
and integrity hashes. Apache-2.0 package LICENSE/NOTICE files are retained by npm;
the optional macOS fsevents dependency is MIT. Dependencies and browsers are dev
only, not copied into the production bundle or committed here. No license for the
project's own code/art is selected. Added test source is AI-assisted original work;
no external artwork, descriptions or code were copied.

Build the reviewed application checkout first. In `qa/browser`:

    npm ci --ignore-scripts --no-audit --no-fund
    npm run test:guards
    npx --no-install playwright install chromium
    QA_APP_ROOT=/absolute/immutable/app QA_CANDIDATE=awakening QA_SOURCE_SHA=<exact-sha> npm test

CI installs official Chromium with required OS dependencies and then runs the
same command. `QA_CHROMIUM_PATH` may identify an already installed local Chromium;
CI leaves it unset and uses Playwright's pinned browser. Never change security or
sandbox settings to bypass a browser-launch denial. No application source is
modified by tests; a final tracked-source cleanliness check runs even on failure.
Artifacts include screenshots, failure traces, JSON and HTML reports for seven days.

## Verification and limits

Preparation verification on 2026-10-14: locked QA install succeeded, all JavaScript
files passed Node syntax checks, Playwright discovered all 30 named cases, and all
20 fail-closed guard tests passed. No browser execution or browser pass is claimed
by these preparation checks. The exact immutable candidate must pass the isolated
GitHub Actions run and its screenshots must be reviewed before UI acceptance.

Not covered: Firefox/WebKit, physical devices, OS crash durability, browser quota
exhaustion/eviction, actual user legacy-save migration, every schema variant,
blocked-open/versionchange lifetime, long-running/background-tab stress, exhaustive
accessibility, or server-side anti-cheat. Client-side fixtures can modify progress;
this test harness is not an authority or security boundary for online rewards.
A real transaction abort proves rollback for that browser event, not crash safety.
Successful browser QA is not deployment, release acceptance or legal clearance.
