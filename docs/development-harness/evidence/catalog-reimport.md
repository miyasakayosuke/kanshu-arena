# Catalog reimport review

Decision: **APPROVED: YES**.

Date: 2026-10-14 UTC. Schema 3 task: `catalog-filter-scroll`.
Reviewer: `combined-ui-review-one`, generation `6`.
Persisted assignment: revision `28`, checkpoint `f0a6043a8aa321f4a0ac7d3cc5d17a3ab29d8ca8`, expiry 2026-10-14 07:30:15 UTC. This exact remote checkpoint was independently fetched and its assignment, candidate and criteria verified.
Approved candidate: `14134f351d8eca79714199e1f2b34dc76e826a4e`.

This is a fresh decision under the new assignment after reimport of the unchanged candidate. It preserves the prior technical findings and limits, rather than treating the prior expired assignment as active.

## Criteria

1. **Changed filters show first result without stale scroll: PASS.** Reviewed source keys all six result-selection fields and resets only the owning list/remembered position. Independent focused tests and exact combined browser assertions cover changed results, repeated/reset/empty searches and disclosure preservation.
2. **Existing detail dismissal and scroll restoration still pass: PASS.** Unchanged source plus tests and the exact combined run cover mount/unmount restoration, route-return scroll retention, keyboard detail navigation, Escape dismissal and opener-focus restoration.
3. **Narrow viewport and keyboard QA recorded: PASS.** Chromium 141.0.7390.37 at desktop 1440x1000 and emulated touch/mobile 390x844 passed the exercised flows. All 18 original combined screenshots were previously opened directly; catalog/reset, detail and shared layouts showed no blocking captured issue.

## Evidence continuity

This review independently rechecked all 27 changed/protected source files against the previously fetched immutable candidate blobs, including all 22 changed paths. Every file remains identical. Results JSON remains SHA256 `db2037ec44f74892f591c5d0c271ca52aa3be8941f52fe3092da8dba05d43f35`. All 18 original screenshot hashes remain identical to the directly reviewed inventory. No duplicate tests or screenshot generation were needed.

Exact combined run: https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38514539330
Harness: `2c7b195442be1d3940f505477b68a59462e46712`.
Result: six passed, six intended storage skips, zero unexpected/flaky cases.

Immutable supporting reports:
- https://github.com/miyasakayosuke/kanshu-arena/blob/6a1bd283bbd10b5ee0abf92cb04ef50690c5a373/docs/development-harness/evidence/ui-checks.md
- https://github.com/miyasakayosuke/kanshu-arena/blob/6a1bd283bbd10b5ee0abf92cb04ef50690c5a373/docs/development-harness/evidence/ui-source-review.md
- https://github.com/miyasakayosuke/kanshu-arena/blob/6a1bd283bbd10b5ee0abf92cb04ef50690c5a373/docs/development-harness/evidence/ui-browser-review.md
- https://github.com/miyasakayosuke/kanshu-arena/blob/6a1bd283bbd10b5ee0abf92cb04ef50690c5a373/docs/development-harness/evidence/catalog-review.md

The original review's limitations remain: two Chromium viewports, no physical-device/WebKit/Firefox/comprehensive accessibility or exhaustive roster/artwork claim; still images do not prove every scroll position or user interleaving. Previously inspected full-suite/build evidence is reused without claiming another run.

No source, remote state, ledger, merge or deployment was changed by this reviewer. Approval covers these catalog criteria; the coordinator remains responsible for the guarded state transition, applicable publication authorization, deployment verification and acceptance.
