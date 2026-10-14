> v0.20.35 integration update: production now uses the reviewed IndexedDB driver and approvedTrialRules (flat ten materials per stage). The following candidate notes are historical design context; current integration and recovery behavior is in ../../docs/awakening-progression.md. proposedTrialRules remains an isolated old test fixture, never the production default.

# Awakening domain candidate (not connected)

This folder is a pure, isolated implementation trial. Nothing imports it in the
production app. It does not alter the engine, roster, saved teams, art, UI,
localStorage, IndexedDB, or reward balances in any user browser. No deployment.

## Policy and API boundaries

- `awakeningStat` implements the approved preserve-zero 95/98/100 design ratio,
  positive integer half-up rounding and linear levels 4..99. Only HP and ATK are
  derived. Supply original level-zero roster values on every calculation, then
  apply the existing leader rules without changing their rounding.
- `proposedTrialRules()` is an explicit opt-in **unapproved economy fixture**:
  step costs 10 for 0..3 and 20 for 4..98; completed match 1 common plus 4 for a
  win; each 10th win gives a deferred choice of 10 same-species essence. No API
  defaults to this fixture. Callers pass their configured rules explicitly.
  Select an immutable version for each final economy configuration; reusing a
  version string for different values is prohibited at the integration layer.
- `previewUpgrade` and `upgradeOnce` handle one stage using matching-species
  essence first, then common materials. An expected level rejects stale double
  clicks. Unknown/retired species cannot consume materials. Existing roster
  entries and teams are never inventory or duplicate sources.
- `claimSelection` consumes the explicitly named earned selection, not whichever
  selection is next. Maxed species and claims exceeding the remaining level-99
  material need are blocked without losing the right. Two callbacks cannot
  accidentally claim two rights.
  This candidate models proposed same-species rewards, not owned duplicate
  individuals, paid draws, or an existing acquisition system.
- `beginBattle` captures the caller's actual initial engine snapshot, mode,
  team identity, stat version and a cloned reward configuration. Callers must
  include both sides and levels in that snapshot once combat integration exists.
- `settleBattle` takes the actual authoritative engine state's terminal winner,
  bound by the future adapter to that battle sequence and starting snapshot.
  Do not call it from result-screen rendering, navigation, animation completion
  or a player-supplied claimed outcome. Surrender/abandonment always earn zero.
  A repeated receipt returns its saved outcome without changing balances.
  Starting a later battle discards the previous receipt; its lower sequence is
  then rejected, so the receipt history is bounded.
- This is local integrity, not anti-cheat. TypeScript cannot authenticate a
  caller, prove engine provenance, prevent edited saves, or synchronize tabs.
  The starting snapshot is retained as parseable object JSON, not interpreted
  or validated against a future combat schema by this generic domain module.

## Persistence and migration contract (not implemented here)

`planMigration` returns a plan and the untouched existing team-save object by
identity. Absence creates zero state for all supplied roster IDs; existing
schema 1 is strictly validated and preserved; new IDs are zero; retired IDs
remain intact. Malformed, future-schema or different economy/stat-version data
is blocked with original raw bytes retained. No historical battle rewards are
invented. No prior awakening schema has shipped, so no fabricated legacy
conversion is supplied. Rule-version upgrades require a separately reviewed
migration; they never reset earned levels or balances implicitly.

For a changed existing state, commit `backupRaw`, migration `marker` and new
state atomically, or use none of them. The plan itself does not prove a backup
was saved. Preserve the old progression database on downgrade; an older build
will ignore it and therefore act as level zero until compatible restoration.

Every state transition must run against fresh state in a SINGLE IndexedDB
readwrite transaction, including validation, sequence allocation, receipt,
wallet, win count and selection updates. Publish success only after commit.
Never persist these pieces using several localStorage writes. Until this
adapter exists, this module does not guarantee cross-tab serialization,
crash recovery or at-most-once durable effects. Retrying an aborted transaction
starts with the unchanged old state; retrying a committed one uses the saved
receipt. An active record blocks a new eligible battle or material consumption.
Abandon it only through explicit user confirmation; late results cannot grant.
Storage-disabled play must remain available separately, without retroactive
rewards. Backup failures must block migration, not erase or overwrite evidence.

## Integration decisions still required

1. Approve reward policy and duplicate-reward representation/quantities; this
   code is not an approval of the suggested 10-win distribution.
2. Implement and independently test the transactional storage adapter, invalid
   data recovery, backup/rollback and multi-tab interruption flows.
3. Bind battle sequence/snapshot to the real engine lifecycle. Freeze both sides'
   stats and versions; do not silently share player progression with the AI.
4. Integrate integer HP/ATK before existing leader effects; regression-test
   level-zero battles and every displayed/combat value. No battle-engine
   integration is present here.
5. Provide consumption confirmation, unchanged-stat disclosure, receipt save
   status and later selection UI. No unmade cosmetic reward promises.

## Checks

Focused tests: `npx vitest run src/awakening/domain.test.ts`.
Typecheck: `npx tsc --noEmit`. Existing full-suite/build checks are recorded in
an external candidate report, not claimed by this README in advance.
