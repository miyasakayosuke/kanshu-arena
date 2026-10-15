# Independent review: bounded plan revisions

Date: 2026-10-15 UTC.

## Verdict

Changes required for candidate `33aef99fb6f7e606afd5d1636763f3f05dcdb2f2`.
Do not record this candidate as verified or adopt it as the protocol source.

## Assignment and candidate verification

The independent reviewer freshly read canonical state revision 51 at
`4f32b2269a4442d47d29d6594299f050a008ab5d`: task
`harness-bounded-replanning`, reviewer `harness-replan-reviewer`, review generation
2, expiry 2026-10-15 01:17:20 UTC. The implementer is a different worker,
`harness-replan-builder`. Public labels document this check and are not identity
credentials or permission grants.

The exact candidate has sole parent
`2f6631de7d9f6314541d5817a8ca58293ef66416` and tree
`8814de4b3b99d1ad94b4908b2fa59ac11d9ba5c6`. All six local changed-file Git blob hashes
match the remote commit. Changes are limited to the two harness runtime modules,
one new harness test module, the harness README, JSON schema and implementation
check document. The source bootstrap template is byte-identical to its base.
No game source, art, dependency, workflow, deployment or legacy-state changes were
included or performed by this review.

## Blocking finding

A permitted one-claim plan cannot reconcile uncertainty into exhaustion.

Reproduction, entirely in a temporary local ledger:

1. Start from an eligible blocked implementation task with three historical claims.
2. Replan with `claimBudget: 1`, fresh approval/evidence, and new method/criteria.
3. Persist one implementation claim; lifetime attempts becomes four.
4. Record `fail`; the task correctly becomes uncertain.
5. Resolve with `outcome: retry` and read-first evidence.

`retry()` correctly calculates that the plan is exhausted and sets the task to
blocked/exhausted. However, `resolve` then returns `notBefore: null` because the
new plan has never scheduled a prior retry. The operation receipt validator
requires numeric `notBefore`, so the transaction raises `ValueError: Public
schema rejected unexpected or sensitive data`. Atomicity is preserved, but the
persisted task remains uncertain; `replan` appropriately refuses it. Thus the
supported one-claim budget can become stuck after a single interrupted worker.
A first-claim quality block followed by resolve has the same nullable-result
problem, although a direct newly approved replan from a quality block is allowed.

The fix should omit `notBefore` when it is absent, or otherwise use a valid
explicit result shape. Add regressions for budgets one, two and three, including
first-claim uncertainty resolution at the one-claim boundary and unchanged-state
failure behavior. Re-review the new exact candidate before adopting it.

## Checks completed

- Independently reran all 52 committed harness tests: passed.
- Independently compiled all harness Python source in memory: passed.
- Verified the source bootstrap template is unchanged.
- Additional stale-generation probes for heartbeat, fail, block, submit, review
  and release all rejected atomically.
- Replanning retained dependency and implementation-capacity gates.
- Approval references previously recorded in decisions or task evidence could
  not be reused as a new plan approval.
- Unknown/sensitive nested plan and archived fields were rejected.
- A local-only replan of the canonical revision-51 replacement-animation task
  preserved all other tasks and all 50 existing operation receipts, original
  release criteria/dependencies, and three lifetime implementation claims.
  Both runtime and JSON Schema validated that dry-run result.
- Budget-two and budget-three cycles retained their 300/600-second delays and
  exhausted at the correct lifetime count. The budget-one cycle failed as above.

The extra tests and temporary ledgers did not mutate the canonical branch or the
candidate source. No game/npm build, game release, visual approval, legal
clearance or owner acceptance is asserted by this harness-only review.

## Remaining security and operation boundaries

Plan references are public audit data, not authentication. The trusted
orchestrator must separately verify owner intent, actual worker identity,
read-first evidence and a genuinely changed method. String uniqueness cannot
prove those facts. Original release criteria remain mandatory; a one-action pilot
cannot be represented as full-task completion. Deployment and owner acceptance
still require their own explicit approvals.
