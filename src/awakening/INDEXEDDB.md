# Isolated IndexedDB driver candidate

`IndexedDbTransactionalStorage` implements the existing `TransactionalStorage` interface using an explicitly supplied `IDBFactory`, dedicated database name, and optional captured legacy JSON string. Nothing imports it into the app. It never reads browser globals or localStorage, never touches team saves, and adds no dependency, reward policy, or gameplay integration.

## Transaction and lifetime

Every call opens version 1, creates only the `awakening-record` object store on a genuinely new database, and uses key `state`. Existing incompatible database/store layouts fail closed. Opening a new database may create its schema even for an adapter `load`; an unchanged record is never put. Every operation uses the same readwrite scope. The read, synchronous transition, detached result preparation, and optional put occur in that transaction. There is no local queue and no multi-key commit.

Only transaction completion returns success. Request success is provisional; quota, abort, callback, malformed record, and clone failures reject. Callback exceptions retain their identity; `AwakeningStorage` maps infrastructure failures to `unavailable`. No automatic retry is performed. Reload before retrying an ambiguous failure.

Every operation has a separate connection, closed on completion/abort or setup failure. Version-change events close obsolete connections while already-started transactions finish under IndexedDB's rules. A blocked open rejects promptly; because an open request cannot be cancelled, late upgrades are aborted and late connections closed without running a transition. A platform that never emits a terminal/open/blocked event can leave an operation pending; no speculative timeout or fallback writes are introduced.

All contexts must supply the same dedicated database name and use this contract. Serialization across connections depends on the browser's overlapping-scope readwrite transaction behavior, not the test fixture. The driver cannot coordinate unrelated storage or nonparticipating writers. There is no database deletion or schema repair API.

## Legacy and corruption

`legacyRaw` is an explicit snapshot passed by the caller, not an automatically discovered save. On a missing record it is used as the transition's initial legacy field and is persisted with the first changed record. On an existing record the supplied seed is ignored. The transition cannot alter retained legacy bytes. All clients participating in the initial migration must agree on the captured source; choosing and authorizing that source is an integration gate. Read-only calls on an empty database do not durably capture the seed.

Stored record shapes are validated before invoking the adapter. Invalid shapes fail without normalization or writes; their raw durable data remains in place. Envelope/domain validation and read-only recovery previews remain the unchanged adapter's responsibility. The driver does not restore checkpoints or recreate lost saves.

## Evidence and remaining browser gates

`indexedDbStorage.test.ts` uses scripted events, not a browser and not an IndexedDB emulator. It separates request success from commit/abort and checks exact record identity, failure paths, connection cleanup, schema refusal, legacy immutability, stale writes, and detached callback values. Composed adapter tests independently check preserved 0/4/99 stages: fixture HP 950/980/1000 and ATK 190/196/200, with MP/DEF/SPD unchanged. Fixture economy is not policy.

Before any production integration, verify in supported real browsers:

- Two independent tabs/connections racing the same head: exactly one transition wins; stale loser cannot overwrite.
- Actual readwrite transaction scheduling and active-transaction callback timing.
- Request success followed by abort/commit failure, quota denial, and reload/retry with receipt replay.
- Blocked upgrade/open, version changes, tab closure, unavailable/private storage and supported schema refusal.
- Captured real legacy fixtures, unchanged three team slots/37 roster entries, retention/export policy, and storage eviction limits.

The scripted tests do not establish these browser facts. Transaction completion also does not mean off-device backup, unlimited retention, resistance to save editing, or absolute power-loss durability. Economy approval, authoritative battle binding, recovery reconciliation, UI, and rollout remain separate gates.

## Sources and provenance

Original candidate TypeScript, tests, and documentation written for this project; no external code, art, identifiers, samples, or packages imported. Design reference: [W3C Indexed Database API transaction model](https://www.w3.org/TR/IndexedDB/#transaction-concept), accessed 2026-10-14. This is a standards link, not bundled source text. Existing license notices are unchanged; inventory checks are not legal clearance.
