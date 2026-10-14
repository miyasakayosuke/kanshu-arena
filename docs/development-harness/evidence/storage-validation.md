# Fresh validation: preserved IndexedDB storage candidate

Date: 2026-10-14 UTC

## Disposition

PASS for preservation as an isolated, unreleased implementation candidate. No new material technical blocker found. This is bounded candidate validation, not production approval, browser conformance certification, gameplay/economy approval, or authorization to publish.

Candidate: [miyasakayosuke/kanshu-arena commit 2b6de6bdad0b25f22de387559a70f4f9da3babb0](https://github.com/miyasakayosuke/kanshu-arena/commit/2b6de6bdad0b25f22de387559a70f4f9da3babb0).

## Fresh identity verification

The reviewer independently fetched the exact commit's recursive GitHub tree. The response was not truncated and contained 1,356 file blobs. Computing Git blob SHA-1 identifiers from every corresponding local candidate file produced 1,356 matches, zero missing files, and zero mismatches. Thus every repository-tracked candidate file inspected locally matches the exact remote candidate. Installed dependencies and generated output are not claimed to be repository source.

All six incremental-file SHA-256 values also match the prior independent review:

| File | SHA-256 |
| --- | --- |
| src/awakening/indexedDbStorage.ts | d09ea370ac6dfd62b6510d1c24d715785864878363a211a6b2004c6b9ace1f1c |
| src/awakening/indexedDbStorage.test.ts | 9ccc31cecf4ff66fbcd02fae82fec5175a2cdcf75de35438abb5918405e7d0f6 |
| src/awakening/INDEXEDDB.md | 411d8d617c5b7c262cf8863876fcd52a2503a7f19ccbd7afcceaa4f3c491b899 |
| src/awakening/STORAGE.md | 5389d722c7c587a3a59fde30ca27ed9732c29727856693362f04a063d2e3f7a3 |
| docs/rights/asset-manifest.json | a80b7324f2d91b32b326e47ef1e6a318a381a3f6091d3818bebdcd6c59fc6b2d |
| docs/awakening-indexeddb-driver-evidence.md | 307eb7fb3ffd07e37a423d00124a2d54ac7095fbce5a825bd94e883edafdf74b |

No candidate source, test, documentation, package, or notice was edited.

## Implementation criteria

Fresh source and test inspection reconfirmed:

- Explicit IDBFactory and dedicated database-name injection; no default browser storage, localStorage fallback, production import, engine integration, or team-save access.
- One fixed database version, one dedicated object store and record; read, synchronous transition, detached result preparation, and optional put share a readwrite transaction.
- Success is returned only at transaction completion. Individual read/put success is provisional. Request failures, callback/clone failures, and invalid records do not produce a successful commit acknowledgement.
- Unknown database/store layouts and malformed record shapes fail closed without implicit repair. A missing record may receive an explicit legacy seed, which is retained only with the first changed write; existing records ignore replacement seeds. Retained legacy bytes cannot be changed by a transition.
- Independent connections are closed at terminal/setup paths; blocked requests reject promptly, late upgrades abort, late successful connections close without executing transitions, and version-change closes obsolete connections.
- The unchanged adapter preserves exact-head stale-write checks, atomic head/backup rotation, idempotent initialization, latest-receipt replay without another grant, and read-only backup recovery previews. Configuration, commands, and returned snapshots are detached.
- Focused composition tests preserve levels 0/4/99 with HP/ATK 95/98/100 endpoints and unchanged MP/DEF/SPD. Fixture economy is explicitly not approved policy.
- No new dependencies, notice edits, gameplay policy, or production wiring were introduced. The exact remote/local match preserves the prior independent review's broader scope evidence.

These are implementation/event-contract findings. Actual browser serialization and durability behavior remain unverified.

## Fresh checks and preserved evidence

- Fresh focused run: `npx vitest run src/awakening` passed 3 files / 132 tests, comprising 46 domain, 46 adapter, and 40 driver/composition tests.
- Fresh `npm run rights:check` passed source inventory: 5 software notices and 32 asset groups. This is inventory validation, not legal clearance.
- The existing repository candidate evidence records 169 files / 3,575 tests, production build, TypeScript, rights self-tests, and source/dist inventory passing on the frozen candidate.
- The inspected prior independent review records 170 files / 3,583 tests, build, TypeScript, and rights checks passing in its separate review copy, including eight independently written adversarial cases.
- Full suites and build were not repeated in this bounded validation because the candidate bytes are unchanged and the fresh focused suite passed. The older full-suite/build results are preserved evidence, not falsely presented as fresh executions.

## Known non-blocking limitation

The prior documentation nit remains: “Callback exceptions retain their identity” overstates behavior for thrown null or undefined. The current nullish fallback converts these into a generic failure Error. Error objects and previously tested non-null primitive throws retain identity. This does not create a durability or adapter success-path regression; the adapter maps infrastructure failure to unavailable. The frozen candidate remains unchanged.

## Remaining gates

Real browser multi-tab/readwrite scheduling, active-transaction timing, blocked/versionchange behavior, quota/private-storage failure, interrupted reload/retry, real legacy-save compatibility, eviction/retention, and production integration remain unverified. Synthetic 37-entry tests in the prior review do not establish real save migration. Recovery reconciliation, authoritative engine binding, economy approval, UI, and rollout remain separate decisions.

No browser was used, no user save was touched, and no remote write, release, or deployment was performed.
