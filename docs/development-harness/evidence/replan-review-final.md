# Independent review: corrected bounded plan revisions

Date: 2026-10-15 UTC.

## Verdict

Approve exact candidate `cb8021ae2f83b037922a6ee692feaf2206572ab9` for the internal
`harness-bounded-replanning` maintenance task. No blocking findings remain.
This is a technical protocol review, not game deployment permission, visual
acceptance or owner acceptance of a release.

## Verified assignment and source

Freshly verified canonical head
`4b6fcb3dc23887802035dc44192345ab0593b236`, revision 55, records the independent
review assignment for `harness-replan-reviewer`, role review, generation 4,
expiring 2026-10-15 01:29:24 UTC. The implementation worker is the distinct
`harness-replan-builder`; its second implementation claim and the earlier rejected
review remain recorded. Public labels are audit consistency fields, not credentials.

The exact candidate has parent `33aef99fb6f7e606afd5d1636763f3f05dcdb2f2` and tree
`a0d276685917a05286df65575dce9b90b7767eb4`. That parent is the previously reviewed
candidate based on `2f6631de7d9f6314541d5817a8ca58293ef66416`. All six full-candidate
local file blobs were independently checked against the remote commits. Only
harness runtime, tests, README, JSON schema and check evidence change. The source
bootstrap template is byte-identical to its original base. No game source, art,
dependencies, workflow, deployment or retired state branch was changed or accessed
by this review.

## Correction of the rejected boundary

The rejected candidate returned `notBefore: null` when resolving a one-claim
plan's first interrupted worker into exhaustion. The corrected resolve result
omits absent retry timestamps, and exhaustion removes stale retry timestamps.
The same case now persists cleanly as blocked/exhausted without resetting claims.
A later separately approved plan can proceed through the ordinary fresh-claim
flow. Added tests cover budgets one, two and three with uncertain and quality
failure resolution, first-claim expiry, next-plan retry delays and original
no-plan exhaustion.

## Independent verification

- All 55 committed harness tests passed, including existing persistence/CAS,
  lost-acknowledgement, stale assignment, disclosure and independence tests.
- All seven additional independent probe groups passed: every finite budget and
  delay; stale heartbeat/fail/block/submit/review/release rejection; dependency and
  worker-capacity gates; approval-reference non-reuse; canonical-state dry-run
  preservation; nested disclosure checks; and Python syntax/template checks.
- In-memory compilation of every harness Python module passed.
- The canonical revision-55 dry run validated through both the runtime and JSON
  Schema. Replanning preserved all 54 existing operation receipts, every other
  task, the original motion release criteria and dependencies, and all three
  historical motion claims.
- All eight tasks and all 47 receipts predating the one-time bootstrap remain
  exactly equal as parsed values to the independently verified revision-47
  canonical snapshot.
- No candidate source or canonical state was modified by the reviewer. Additional
  tests used disposable local ledgers and local Git remotes only.

## Gate and authorization assessment

A replan retains the existing task identity and original release gates, appends
its prior dynamic state, preserves lifetime claims, invalidates current stale
candidate/review/publication/acceptance fields, and limits new claims to the
approved budget. Fresh generation and plan references remain mandatory for
subsequent claims. Uncertainty and external/publication gates cannot directly
become a new plan; original and supplemental criteria are both required on submit.
Independent exact-commit review and fresh publication/owner acceptance references
remain separate requirements.

Actual owner authorization, worker identity, changed method and read-first
evidence must still be verified by the trusted orchestrator. Public reference
uniqueness is not authentication. A one-action pilot remains an unapproved
candidate until the original full-task gates are satisfied. This review makes no
new game/npm build, art-quality, legal-clearance or production-release claim.
