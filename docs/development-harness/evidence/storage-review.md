# Fresh independent review: isolated awakening storage

Date: 2026-10-14 UTC

## Decision

**Technical approval: YES, for the internal verified artifact only.** No material implementation blocker was found within the four assigned criteria. This approval does not approve production integration, collection quantities, a release, or browser IndexedDB conformance.

Candidate: [miyasakayosuke/kanshu-arena commit 2b6de6bdad0b25f22de387559a70f4f9da3babb0](https://github.com/miyasakayosuke/kanshu-arena/commit/2b6de6bdad0b25f22de387559a70f4f9da3babb0).

Review assignment: schema 3, revision 7, task `awakening-storage`, reviewer `storage-review-one`, generation 3. The local durable assignment was read before this review. The coordinator supplied its remote checkpoint identity. This reviewer does not mutate the checkpoint.

## Exact candidate identity

This reviewer independently fetched the exact candidate's recursive GitHub tree. The non-truncated response contained 1,356 file blobs. Computing Git blob SHA-1 identifiers over both the frozen candidate and the separate independent review copy produced 1,356 matches in each, with no missing files or mismatches. The review copy's extra eight-case independent test file is byte-identical to the preserved independent test artifact (SHA-256 `9be9afb6ca38252a81f3ff1c310dbbdb37d8bd1f85a01bcf6589f209da51a634`). Dependencies and generated files are not included in this source-identity claim.

Comparing tracked candidate files against the preserved prior adapter candidate reconfirmed exactly six additions/changes: the IndexedDB driver, its test file, INDEXEDDB.md, STORAGE.md, the asset manifest, and the driver evidence document. Existing domain, adapter, fake, application, combat engine, roster, team save, package/lock, and notices remain unchanged.

## Criteria assessment

1. **Inspect existing storage candidate before editing: PASS.** The frozen candidate, fresh validation report, prior independent review, source files, and prior independent tests were inspected. No replacement implementation or candidate source edit was made.
2. **Versioned parsing, invalid saves, migration, repeated load/save: PASS within the isolated contract.** The adapter rejects unknown envelope/domain/stat/economy versions and malformed data; preserves corrupt bytes and exposes backup recovery only as a preview; initializes idempotently; retains removed roster entries while adding new entries at zero; rotates the exact prior head into backup atomically; and preserves legacy bytes. Exact-head checks reject stale changes, while the latest settlement receipt can replay without another grant or write. The driver validates database/store/record shape, holds read/transition/optional write in one readwrite transaction, and acknowledges success only at completion. Callback/clone/request failures cannot produce a successful commit acknowledgement. Blocked opens and late connections do not execute transitions. These findings are implementation and scripted event-contract evidence, not browser scheduling or durability certification.
3. **Keep accepted combat and collection unchanged: PASS.** No source outside the awakening directory references awakening or the new driver. The complete scope comparison leaves the production application, engine, team saves, roster, dependencies, and notices unchanged. Economy inputs remain explicit and fixtures are not accepted quantities. No production storage or user save was accessed.
4. **Independent tests of 95/98/100 HP/ATK without deciding quantities: PASS.** The independently authored eight-case suite was inspected and rerun. Its 37-entry synthetic roster preserves levels 0/4/99 across initialization/reload and checks exact HP 1900/1960/2000 and ATK 380/392/400 endpoints with MP/DEF/SPD and other fields unchanged. It also covers legacy capture timing, roster expansion, failed settlement/reload/retry/replay, corruption preview, malformed legacy rejection, and callback exception values. Existing domain tests include an independent BigInt oracle across all levels and bases 1 through 1000. No collection or progression quantity is approved by these tests.

## Checks

Freshly executed by this reviewer against the source-matched independent review copy:

- `vitest run src/awakening`: 4 files / 140 tests passed (46 domain, 46 adapter, 40 driver/composition, 8 independent cases).
- `npm run rights:test`: 15/15 passed.
- `npm run rights:check`: 5 software notices / 32 asset groups passed. Inventory success is not legal clearance.

Preserved evidence, not rerun in this final review: candidate full suite 169 files / 3,575 tests, build and TypeScript; previous independent full suite 170 files / 3,583 tests, build and TypeScript. The candidate test log and driver evidence document were inspected. Fresh focused execution and exact source identity support reuse of the prior broader evidence for this bounded internal review.

## Non-blocking implementation note

The documentation statement that callback exceptions retain identity is too broad for thrown null or undefined. Nullish fallback substitutes a generic abort Error for those values; Error objects and tested non-null primitives retain identity. The independent probes pass, and the adapter reports an unavailable transaction without acknowledging success. This is a documentation nit, not a durability or success-path blocker for the internal artifact.

## Durable evidence readback

The submitted links use the slash-containing branch `harness-public-v3/arena`. An initial lookup incorrectly split the branch as `harness-public-v3` and treated `arena` as a directory, producing a 404. Explicit ref/path reads resolved that ambiguity and confirmed both evidence documents. This is not an evidence defect or remaining blocker. Immutable evidence: [storage checks](https://github.com/miyasakayosuke/kanshu-arena/blob/b4be7410bc8bb6631049cce94b34635f63611000/docs/development-harness/evidence/storage-checks.md) and [fresh validation](https://github.com/miyasakayosuke/kanshu-arena/blob/b4be7410bc8bb6631049cce94b34635f63611000/docs/development-harness/evidence/storage-validation.md).

## Retained gates

Real browser multi-tab scheduling, active-transaction timing, quota/private-storage failures, blocked/versionchange behavior, interrupted reload/retry, real legacy-save compatibility, eviction/retention, authoritative engine binding, recovery reconciliation, UI, economy decisions, integration, and rollout remain separate unverified gates. Synthetic fixtures do not establish real-save migration. No source, remote ref, checkpoint, production setting, release, or deployment was changed by this reviewer.
