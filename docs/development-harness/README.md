# Resumable development coordination

This is a durable coordination harness, not a continuously running coding agent.
An authorized dot run supplies the actual implementation/review workers and uses
this repository as its shared checkpoint. Hourly recovery is a backstop; execution
still depends on the scheduler, available tools, access and approvals. There is no
24/7 uptime guarantee, paid service, API key, daemon or fabricated agent runner.

## Entry points

- `state.json`: seeded backlog and authoritative task state once installed on the
  dedicated state branch. The source branch copy is a seed, not a second ledger.
- `state.schema.json`: interchange schema; CLI additionally validates invariants.
- `acceptance.md`: proposed, bounded v1 completion checklist.
- `../../scripts/development-harness/harness.py`: atomic local transactions.
- `../../scripts/development-harness/persist.py`: Git-persisted transactions.

Requirements: Python 3.10+, Git for remote persistence, POSIX `flock`. No new
packages. Git persistence needs an existing Git author identity and authorized remote;
use the connector equivalent if those are unavailable. Tests: `python -m unittest discover -s scripts/development-harness -p
 'test_*.py' -v` (enter on one line).

## Installation and persistence contract

After independent review, an authorized coordinator installs these harness-only
files on a dedicated source branch and initializes one `harness-state/arena`
branch containing the seed. Do not reset an existing state branch. Record its
verified repository URL and head in the recovery task. Never assume a local
workspace survives a future run. No game release is implied by installation.

All coordinators read the remote state branch at the beginning of every wake.
Use `persist.py --branch harness-state/arena --command '<JSON>'` for mutations.
The configured remote must already have authorized access; this tool never asks
for or installs credentials. If only the GitHub connector is available, create a
commit whose parent is the exact observed state head and update that ref without
force and the expected old SHA when supported; verify the new commit is an ancestor of the resulting remote head. Do not
use a content update that silently rebases onto a newer head. On any conflict,
reload and recompute. Never force-push or merge divergent state ledgers.

The persistence helper reads exact remote head A, builds a child commit B with
parent A, and performs an ordinary non-force push. Two competing children of A
cannot both fast-forward the same branch. It then verifies remote ancestry and re-reads current remote state to validate
that a returned lease is still current and unexpired; ancestry alone is not a
dispatch authorization. An
uncertain push is read back before retrying. Dispatch work only after a confirmed
state commit and a fresh read confirming the same unexpired lease. Replaying a
claim whose token is no longer current or whose lease expired fails closed, even
though its historical operation receipt is preserved. The local CLI alone protects one shared filesystem, not separate
machines; its atomic replace/fsync/flock and expected revision do not substitute
for remote compare-and-swap.

## Every wake / coordinator protocol

1. Read the latest owner instructions and remote state; inspect current workers,
   branches, review artifacts, live release and pending decisions. Public state
   must contain only repository-safe summaries/references. Keep private messages,
   personal data and private document IDs out of this repository.
2. Execute `status`, then `reconcile` with a unique stable operation ID and the
   observed revision. Reconciliation fences expired leases into `blocked /
   uncertain`; it does not blindly retry them. Fresh claims remain untouched.
3. For uncertainty, inspect the previous worker, remote changes and deployment.
   Import a completed result through the normal gates; otherwise `resolve` with
   read-first evidence and `outcome: retry`. Retry only authorized work. Backoff is
   5 then 10 minutes between at most three implementation attempts. Exhaustion
   needs a scoped human/coordinator decision; never reset attempts automatically.
4. Existing external workers are blocked in the seed to prevent duplicate work.
   Reconcile their results first. A handoff authorization reference may unblock
   them only after their previous execution is known stopped. Do not claim they
   are leased until an actual worker exists.
5. Select only an existing eligible item. Start an idle worker with its exact
   scope, then commit its claim before permitting edits. A failed claim means
   cancel/keep that worker idle. At most two implementation workers, one separate
   reviewer and one publisher. On every heartbeat, verify the actual worker is
   still alive and making progress; never renew a dead or stalled worker forever.
   Default lease 30 minutes, heartbeat before expiry; max one-hour lease. A worker
   returning after expiry may provide evidence but cannot mutate using its token.
6. Workers operate on isolated feature branches/worktrees. They never update the
   shared ledger, main or deployment directly. Coordinator commits each result
   before starting the next stage. Every mutating command has `operationId` and
   `expectedRevision`; replay the same payload after an uncertain result. Reusing
   an ID for another payload is rejected. Lease-bearing commands also need the
   returned fencing `token` and exact `worker` identifier.
7. `submit` requires an exact 40-character commit, passing evidence references
   for rights:test, rights:check, test, build, scope-qa and every task criterion.
   The coordinator must read the evidence: the CLI validates records, not their
   truth. Independent review uses a different worker and the same commit. Code
   changed after review needs a new attempt and review; candidate is not released.
8. Only the single publisher may publish, after independently verified authority
   for that exact destination and scope. `release` records the reviewed commit,
   successful deployment, live behavior, credits and notices evidence. The script
   does not itself merge or deploy. A deployment timeout is uncertainty, not
   permission to redeploy. Import an already-completed release only after all
   evidence has been checked and the same reviewed commit is reconstructed.
9. `accept` records explicit owner acceptance after release. Released is not
   owner-accepted. Approval-blocked artwork stays isolated. A decision does not
   authorize unrelated scope. `owner-decision` records explicit owner scope/criteria evidence as `decided`; the
   coordinator must make a separately reviewed criteria/state amendment. It never
   silently changes game behavior or treats a rejected artifact as accepted.
10. Stop dispatching when all required implementation/validation tasks are accepted, decisions are
    recorded, and owner-approved v1
    criteria are satisfied. If only blocked decisions remain, report the specific
    decision once and wait; do not invent chores to look active. Report material
    progress, blockers, release evidence and completion. Routine wakes stay quiet.

## Local command example (not a remote claim)

Read: `python scripts/development-harness/harness.py`

Mutation JSON for a known idle worker, assuming revision 0:

```json
{"action":"claim","task":"baseline-regression","role":"implement","worker":"regression-worker-1","operationId":"wake-001-claim-regression","expectedRevision":0}
```

Pass it using `--command`. Keep returned token for `heartbeat`, `submit`, `fail`
or `block`. `status` is read-only. Full command shapes and invalid transitions
are exercised in `test_harness.py`. Validation and revision rejection leave the previous JSON intact. An I/O error
can occur after atomic replacement, so read back and replay the same operation ID
before deciding whether it committed.
Never commit `.lock`, temporary files or `__pycache__`. Preserve operation receipts
for uncertain retries; archive only after a reviewed checkpoint proves no client
can replay those IDs. Do not remove the lock file while a process might use it.

## Limits and operator decisions

This is not a security boundary against someone who can edit the JSON. Evidence
and authorization references are assertions that the coordinator/reviewer must
verify against their actual source. Lease workers and acceptance actors are not
cryptographically authenticated. Git availability failures pause new dispatch.
No automatic deletion, credential provisioning, fees, agreements, new feature
scope, rejected art adoption or owner acceptance is authorized by this harness.
