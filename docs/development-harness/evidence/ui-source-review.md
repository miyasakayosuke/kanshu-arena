# Combined v0.20.34 source and isolated QA review

Reviewed 2026-10-14 UTC. No source, remote repository, workflow, or deployment state was changed by this reviewer.

## Decisions

- Combined product candidate: technical source review PASS, with final release acceptance withheld until the exact combined browser run, screenshot review, and formal schema-3 review claim are complete.
- Bounded QA revision: APPROVED for publication of the exact seven-file revision described below, subject to the coordinator verifying the final remote tree allowlist and unchanged deployment blob. This approves the isolated QA revision only; it does not approve merge, deployment, permissions changes, or product release.

## Product identity and scope

Repository: `miyasakayosuke/kanshu-arena`.
Candidate: `14134f351d8eca79714199e1f2b34dc76e826a4e`.
Accepted parent: `8343d81405b9eb3c59621a4b0ead4052e2d3949e`.
Remote compare confirms one commit ahead, zero behind, and exactly the expected 22 changed paths.

All 22 changed remote blobs were independently fetched at the immutable candidate SHA and compared byte-for-byte to the local release source. Five additional protected files were fetched and matched: App.tsx, engine.ts, teamWorkshop.ts, deploy.yml, and THIRD_PARTY_NOTICES.txt. The complete local source difference against the accepted v0.20.32 tree is the same 22-path allowlist; no extra source or artwork change is present. The rejected v0.20.33 artwork is absent from this difference.

Package and lockfile JSON differ only in root/package version metadata. Package, lock, credits and release documentation agree on v0.20.34. No new dependency, deployment change, combat change, inventory integration, or reward integration is introduced.

## Combined interaction assessment

The runtime changes are the previously reviewed result-key layout effect in RosterBrowser and the non-battle AwakeningPreview import/render in MonsterDetails, plus the new calculator component and scoped CSS. The two changes share no mutable state: catalog filter/scroll ownership stays in RosterBrowser, while stage selection stays in calculator-local React state. The calculator is keyed by monster ID and remounted when details reopen. Opening a detail does not change the catalog result key. Existing close/focus handling and catalog restoration remain unchanged.

Only MonsterDetails imports the awakening subtree from outside that subtree. Its component imports pure domain derivation and next-stat-change helpers. Domain code has no persistence import or initialization effect. Storage/fake-storage modules remain isolated source/test material; the production component cannot invoke them. HP/attack results are derived from a copied base object; MP, speed, roster and combat state are not mutated. The existing battle-context exclusion remains explicit.

The union rights inventory has three new entries for calculator UI, catalog reset, and the combined release/isolated-domain material. The existing detail entry receives the corresponding integration hash/change record. All 66 locally present per-file manifest hashes were independently verified. Existing unresolved review limits remain; this is not legal clearance.

Independent rerun: 179 tests passed across result-position, calculator preview, domain, storage and MonsterDetails suites. Prior independent feature reviews are reused for their broader mathematical/StrictMode/owner-isolation coverage. Builder logs were inspected and report 3,587 tests in 170 files, successful production build and rights checks, and 736 balance-smoke matches with 48.08% to 48.08%, a 0.00 percentage-point change. The full suite/build/lab were not rerun by this reviewer.

## QA exact revision

Baseline QA commit: `74ca824dcea6a92a6b350743ecfd666dd58c0941`.
New branch trigger/job guard: `candidate/browser-qa-v034`.
The single matrix row is `combined`, pinned to product commit `14134f351d8eca79714199e1f2b34dc76e826a4e`.

All 13 baseline harness/inventory blobs were fetched at the approved immutable QA commit. Exactly seven local paths differ: workflow, rights inventory, QA README, Playwright config, UI spec, result verifier and verifier tests. The manifest differs only in its QA-specific asset entry. Dependencies, lock, storage spec, runtime fixture and rights-test script are byte-identical to the approved QA baseline.

The combined row executes shared UI, catalog and calculator cases at desktop 1440x1000 and emulated touch/mobile 390x844: exactly six passes and six intended storage skips. Historical helper tags remain accepted locally, but the workflow matrix cannot select them. The combined row uses production build/preview, not the storage development-server import path.

The exact push branch and repository guard, read-only contents permission, disabled persisted checkout credentials, immutable application checkout verification, pinned official actions, bounded artifact paths and seven-day retention are retained. There are no new secrets, OIDC, environment grants, dispatch triggers, production deployment operations, or write permissions.

Independent checks: all 14 result-guard tests pass; all 15 rights self-tests and rights inventory pass in the assembled QA tree, whose 13 QA/inventory files match the frozen inputs exactly. All 13 final checksum entries pass. The final metadata correction records the actual immutable application SHA and retains outstanding combined browser/visual gates.

Final reviewed patch SHA256: `6819f99256c31d469eb92c04b6295230694bfc7f70467042f05f8842ffaf2aa3`.
Workflow SHA256: `d06cc577ce371841af4050b954b4e333b2377c524f44d248cd6c30cba0de3dcf`.
QA inventory SHA256: `bfc299d3f40d36901753918129e0762f6da3f10b70b4364ace42ead971e8b52d`.

## Remaining gates

The coordinator must bind the published QA commit to this seven-path delta and verify that the inherited deployment workflow is unchanged. A new successful combined browser run and direct review of its captured pixels are still required. Prior separate catalog/calculator passes do not establish combined acceptance. No fresh browser/visual pass, final schema-3 claim, main merge, product acceptance, or deployment is asserted here.
