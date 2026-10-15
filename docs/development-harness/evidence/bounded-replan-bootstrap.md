# One-time bounded-replanning maintenance bootstrap

Date: 2026-10-15 UTC.

The authenticated owner explicitly approved a one-time exception to register one
internal maintenance task because the current protocol has no task-registration
command. The trusted orchestrator verified that approval outside this public
ledger. This record is an audit reference, not authentication or a reusable grant.

## Exact append-only transition

- Source protocol: `2f6631de7d9f6314541d5817a8ca58293ef66416`.
- Canonical state parent: `e72cce9919edcfb3a41234c3b6e3d38726c5c843`.
- Schema remains 3; revision advances from 47 to 48.
- Append only `harness-bounded-replanning`, an internal implementation task,
  initially ready with zero claims, generation zero and no assignment.
- Preserve every existing task, decision, provenance field and all 47 operation
  receipts exactly. In particular, replacement-animation remains blocked with
  three lifetime implementation claims and generation four.
- No synthetic protocol operation receipt is added: bootstrap is an explicitly
  authorized exception, not a command supported by the existing CLI.
- Persist as an exact child of the current state head using non-force
  compare-and-swap; read back the exact bytes before claiming the maintenance task.

The unchanged CLI must then create and persist a fresh implementation assignment
for a real responsive worker before any protocol implementation edits begin.
The maintenance work requires independent exact-commit review and passing tests.
It does not authorize game deployment, owner acceptance, resetting attempt counts,
renaming exhausted art work, or weakening its original release gates.

The forthcoming change is limited to harness scripts and documentation. It will
preserve historical failures and support new bounded plans only after separately
verified scope approval, method, supplemental criteria and a finite claim budget.
