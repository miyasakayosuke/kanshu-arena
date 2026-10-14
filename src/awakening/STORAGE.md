> v0.20.35 integration update: production now uses the reviewed IndexedDB driver and approvedTrialRules (flat ten materials per stage). The following candidate notes are historical design context; current integration and recovery behavior is in ../../docs/awakening-progression.md. proposedTrialRules remains an isolated old test fixture, never the production default.

# Isolated awakening storage candidate

Injected adapter and in-memory transactional fake only. No app imports, browser globals, localStorage/IndexedDB calls, team writes, engine changes, network access, or final economy choices. Tests deliberately use an explicit fixture different from the proposal.

## Contract

Construct `AwakeningStorage` with an injected `TransactionalStorage`, stable roster IDs, and approved immutable/versioned economy rules. `load()` is read-only: ready, empty, or blocked. Empty may include pending legacy data, which `initialize()` must validate before use.

`initialize()` validates/imports legacy domain JSON or adds missing roster IDs atomically. Existing and retired IDs, materials, receipt, and active battle remain intact. Repeated initialization is byte-idempotent. The existing 37 roster records and three team slots are outside this adapter's storage capability.

`dispatch(token, command)` rereads within a transaction, validates the exact-head stale token, runs the domain transition, and commits the entire new head and previous-head backup together. Revisions cannot wrap. Callers must await commit before showing success or consuming a result. Latest-sequence settlement replay returns the stored receipt without writing, even with an old token or changed outcome. After another battle starts, older sequences fail closed. Receipt history is bounded to the latest receipt.

Original `legacyRaw` bytes remain unaltered. Migration retains the exact previous envelope in backup. Subsequent transitions rotate that single previous-head checkpoint; it is not an unlimited archive. Team data is neither interpreted nor passed into this backend.

Every writer must use the same serializable transaction mechanism. Callbacks are synchronous and retry-safe, with no external side effects. Failed writes must abort every field. Resolve after transaction completion, not an individual request's success. Backend failures reject with `unavailable`; stale/invalid operations reject without writes. Reload after ambiguous errors before retrying. A successfully committed latest settlement safely replays.

Configuration, commands, and returned snapshots are detached copies. `FakeTransactionalStorage` serializes clients sharing one instance, injects read/quota-write failures, and never accesses a browser. Separate instances are separate databases.

## Corruption and recovery

Corrupt or unsupported head JSON/schema/progress, rule mismatch, or a missing head with retained backup block mutation. `load()` can return a validated compatible backup as a read-only recovery preview. Damaged raw bytes are preserved.

There is no automatic restore or writable recovery button. A backup may predate a reward, selection claim, or spend. Restoring it without reconciling subsequent durable history could reopen a battle or recreate consumed materials. A checkpoint is evidence, not proof of the missing latest state. Reconciliation or an explicit loss/rollback policy is a separate integration decision. Two corrupt copies offer no verified recovery. Entire database deletion, edited saves, browser eviction, device loss, and tampering are outside these guarantees; no anti-cheat or cross-device guarantee is claimed.

## Why not localStorage

The [HTML Standard](https://html.spec.whatwg.org/multipage/webstorage.html) tells authors to assume no cross-agent locking. Reading a revision then calling `setItem` is not compare-and-swap: two tabs may both read N and overwrite one another. A final reread, storage events, BroadcastChannel, tab-local promise queue, or lock-shaped localStorage key cannot establish atomic read-modify-write. Separate backup/marker/balance/receipt keys add partial-commit windows. A single JSON key still cannot serialize competing updates.

Future browser integration should use the supported [IndexedDB transaction model](https://www.w3.org/TR/IndexedDB/#transaction-concept): one database/object-store record, read plus synchronous transition plus put in the same overlapping-scope readwrite transaction for every connection. Abort on exceptions and resolve only on transaction completion. Handle open/version-change/blocked/abort/quota failures, close obsolete connections, and do not await unrelated work inside a transaction. Browser/platform durability and retention limits remain; transaction completion is not off-device backup or a guarantee against every power failure. A transaction cannot coordinate the separate unchanged localStorage team save, which remains untouched.

No production IndexedDB driver or real browser multi-context conformance test is included or claimed. The fake tests application behavior against the contract, not a browser backend. Those missing pieces must be verified before browser integration. An optimistic localStorage fallback must not implement this interface.

## Integration gates

1. Approve actual reward/material rules and duplicate representation. Rule versions identify immutable values; changed rules need a new version and explicit migration.
2. Implement and browser-test the transactional driver, including commit-time failure and independent tabs/connections. Choose retention/export and recovery reconciliation policies.
3. Bind each sequence and persisted starting snapshot to the authoritative engine instance. Caller-supplied completions are not authenticated here. Define abandonment/resume handling; reload alone grants nothing.
4. Add UI success only after commit and explicit stale/failure/recovery displays with retained retry context. Never award provisional UI-only materials.
5. Integrate derivation/leader order and real save-fixture checks for all 37 roster entries/three slots under separately approved rollout. No production wiring or user-save writes are part of this patch.

## Provenance

New original TypeScript/documentation for this isolated candidate. No third-party code, art, names, assets, copied excerpts, dependencies, or license changes. Standards are linked for design evidence, not bundled. Existing notices and assets remain unchanged. Rights checks are inventory checks, not legal clearance.
