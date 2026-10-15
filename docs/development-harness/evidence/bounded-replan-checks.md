# Bounded replanning: implementation checks

Date: 2026-10-15 UTC.

## Scope and verified assignment

Source base: `2f6631de7d9f6314541d5817a8ca58293ef66416`.
Authorized one-task bootstrap: `e0d66bc90b69ec3115cee714c3212ff65ac3091e`.
Fresh implementation assignment read back at state commit
`7d3283aa792a720079f20d9525dc387b7ff6d4ca`, revision 49:
`harness-bounded-replanning`, worker `harness-replan-builder`, generation 1.

Only harness scripts and documentation change. The source bootstrap template,
game source, assets, package manifests/locks, workflows, deployment settings and
original notices remain unchanged. No game deployment or visual acceptance is
part of this technical maintenance candidate.

## Evidence for the five harness check categories

- rights:test: strict public-schema/disclosure adversarial tests pass as part of
  the 52-test suite. Archived plan data receives the same strict nested allowlists.
- rights:check: source changes are original AI-assisted protocol/test/document
  work based on this repository. No third-party content, assets or dependencies
  were added, and no project license or legal clearance is asserted. Existing
  notices and game rights inventory were not modified.
- test: `python -m unittest discover -s scripts/development-harness -p test_*.py -v`
  passes 52 tests, including all 37 preexisting cases and 15 new cases.
- build: `python -m py_compile scripts/development-harness/*.py` passes. This is
  the Python harness build check, not a new game/npm build claim.
- scope-qa: the unchanged canonical revision-49 state validates; a local-only
  replan dry run preserves all 48 old receipts, every other task, original motion
  gates, all three lifetime claims and the exact previous failure snapshot.
  The updated JSON schema validates the source seed, pre-bootstrap state,
  append-only bootstrap, fresh claim and new-plan state. JSON Schema validation
  was additionally exercised with the already installed validator; the runtime
  and committed unit suite require only the Python standard library.

## Regression coverage

The new cases cover bounded 1..3 claim budgets, lifetime-count preservation,
original plus supplemental criteria, new method and approval references, old
approval/acceptance non-reuse, old evidence retirement, stale generation and
assignment receipts, exact operation replay, invalid/sensitive nested data,
immutable task scope, local competing CAS, remote parent-exact CAS, concurrent
remote loser rejection, and lost-acknowledgement reconciliation without duplicate
budget. Original two-implementer/one-reviewer/one-publisher limits remain intact.

A plan reference is not authentication. The trusted orchestrator must separately
verify actual owner intent, worker identity, changed method and evidence. Unknown
or unresolved external/publisher/uncertain gates cannot directly replan. A pilot
does not satisfy the original owner-approval or release criteria.

## Candidate file SHA-256 hashes

- `scripts/development-harness/harness.py`: `b2c177b63050be2523926618bc9429d559cd74497acb1986772b07bb50379ee3`
- `scripts/development-harness/public_schema.py`: `fab0fce79c713422187708c78bfd16b9ea6d951dcad88b8babfdd48f20ed11b3`
- `scripts/development-harness/test_replan.py`: `422f055ac589e7e76bd555d954628ee28c1fe1e9bf16d59defee0d91eb0bd31f`
- `docs/development-harness/README.md`: `5a8f8aaf053fd5dcba1818d97b06d451a7c2d3969384b9f73588b2e5418f3c7e`
- `docs/development-harness/state.schema.json`: `da412c8b23e7a877e730fcc8a41507bb86d475c175891a7ec6b48b07706afe58`

The separate exact-commit independent review is still required before adopting
this protocol source. No approval is inferred from this implementation report.
