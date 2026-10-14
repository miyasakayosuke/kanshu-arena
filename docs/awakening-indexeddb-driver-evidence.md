# Awakening IndexedDB driver candidate evidence

Date: 2026-10-14 UTC. Accepted application base: v0.20.32. This candidate extends the isolated domain/storage work only. No production app import or publication.

## Scope

- New explicitly injected IndexedDB backend, using one dedicated database/store/record and completion-only transaction success.
- New deterministic event-contract and adapter-composition tests.
- Updated storage boundary documentation and original-code provenance inventory.
- Existing domain, storage adapter, fake, engine, roster, team save, UI, dependencies, package/version, and third-party notices unchanged.

## Verification

- `npm run rights:test`: 15/15 passed.
- `npm run rights:check`: source inventory passed.
- `npm test`: 169 files / 3,575 tests passed on final driver/test code.
- `npm run build`: TypeScript, production build, and dist rights inventory passed. Existing chunk-size warning remains.
- Focused `src/awakening` suite: 132/132 passed, including 40 new driver/composition cases.
- Separate TypeScript check passed.
- Scope QA: exactly the six listed files differ from the prior isolated storage candidate. Existing domain, adapter, fake, App, engine, package/lock, and notices byte-match. Only the driver's own test imports it in TypeScript sources.

Only this evidence report was updated after those code/build checks; source rights inventory was rerun after the report update. Test fixtures independently preserve HP/ATK 95/98/100 stages and leave MP/DEF/SPD unchanged. Fixture economy is deliberately different from the proposal and is not policy.

These tests script IndexedDB-shaped events; they do not execute a browser's IndexedDB implementation. Real browser multi-tab/connection conformance, real legacy-save compatibility, quota/retention behavior, and interrupted reload flows remain unverified gates. No claim of browser integration readiness or gameplay readiness is made.

## Repository-safe changed files

- src/awakening/indexedDbStorage.ts
- src/awakening/indexedDbStorage.test.ts
- src/awakening/INDEXEDDB.md
- src/awakening/STORAGE.md
- docs/rights/asset-manifest.json
- docs/awakening-indexeddb-driver-evidence.md

## Reference and limitations

Design reference: [W3C Indexed Database API transaction model](https://www.w3.org/TR/IndexedDB/#transaction-concept), accessed 2026-10-14. No third-party source excerpts or dependencies added. Rights checks are inventory validation, not legal clearance. See src/awakening/INDEXEDDB.md for lifecycle, migration, and browser gates.
