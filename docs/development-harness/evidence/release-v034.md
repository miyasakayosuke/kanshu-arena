# v0.20.34 publication verification

Verified 2026-10-14 UTC. Released commit: `14134f351d8eca79714199e1f2b34dc76e826a4e`.
Main was advanced non-force from `8343d81405b9eb3c59621a4b0ead4052e2d3949e`, after a fresh publisher assignment persisted at checkpoint `d47bbbe5c69f893948eeb91175bb22273dc1d620`, revision 30. Exact main readback matched.

## Deployment
Existing [Build, Test and Deploy run](https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38526745338) completed successfully for the exact release commit. Job 115728784463 passed rights self-tests (15), full suite (170 files, 3587 tests), 736-match smoke (48.08% to 48.08%, paired change 0.00 percentage points), build, source/dist rights checks and Pages deployment. Pages reported success at 07:14:19 UTC. Existing test-environment act warnings, chunk-size and action-runtime deprecation warnings are not represented as failures.

## Live checks
Actual cloud Chromium UI was inspected after deployment at https://miyasakayosuke.github.io/kanshu-arena/#home .
- Home loaded with the five-member lineup; catalog displayed 37 monsters.
- Live document JS `assets/index-PLSToHrS.js` and CSS `assets/index-clY_BYXo.css` matched the successful deployment build log.
- Catalog list was scrolled to approximately 969 pixels. Selecting HP sort reset its actual scrollTop to zero.
- Monster details / abilities exposed the trial calculator. Stage 0 displayed HP150 and attack47; selecting stage99 displayed HP158 and attack49, maximum label and disabled increment.
- Actual screenshot pixels were inspected for the trial controls and scrolled results. The trial-only wording, no ownership/save/combat reflection, unchanged MP54/speed85, rates95/98/100 and no-consumption explanation were readable.
- https://miyasakayosuke.github.io/kanshu-arena/credits.html displayed v0.20.34, project provenance, license scope and ongoing-rights-review disclaimer.
- The live credits page's expanded inline notices displayed full notices for React, React DOM, Scheduler, Vite helper and Rollup helper. Direct navigation to THIRD_PARTY_NOTICES.txt returned browser-client ERR_BLOCKED_BY_CLIENT; no successful direct TXT browser check is claimed. The inline full notices were verified independently of that navigation limit, and deployed dist rights checks passed.

## Boundaries
This is a live deployment smoke check, not a repeat of the earlier six-case/two-viewport independent browser review. Earlier exact-candidate review remains recorded in catalog-reimport.md and preview-review.md. No physical-device or exhaustive browser/accessibility coverage is claimed. No gameplay progression, persisted awakening, new artwork, fees or external service was introduced. Released is not owner-accepted; final completion and separate decision gates remain open.
