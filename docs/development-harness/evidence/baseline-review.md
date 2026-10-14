# Independent accepted-baseline review

**Decision: APPROVE for internal verification only.** All four `baseline-regression` criteria are satisfied within the documented scope.

Reviewed 2026-10-14. Candidate: `8343d81405b9eb3c59621a4b0ead4052e2d3949e`, accepted v0.20.32. Review assignment: `baseline-review-one`, generation 3; schema 3 revision 13 confirmed before review.

## Criteria decisions

1. **Exact live commit: PASS.** Independently retrieved deployment job 115241784287 from [run 38381205628](https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38381205628). Its checkout and Pages deployment identify the exact accepted commit. Build output identifies `index-CkAgptcj.js` and `index-B8wiTE4n.css`, matching the current live references recorded in the baseline QA report. This is deployment-plus-live-reference binding, not independent hashing of downloaded live asset bytes.

2. **Rights, full tests and build: PASS.** Independently inspected the exact deployment log: 3,443 tests across 166 files, 15 rights self-tests, production TypeScript/build and source/dist rights inventory checks passed. The smoke run covered 736 matches. Recomputed the preserved full-log SHA-256 as `241e819a941289cb2b902c40f3cffd1ed051a940d75118c251c1b00f18cca4e5`, matching its validation record. The later publication receipt establishes accepted status; the earlier historical `nativeAcceptance: pending` field is superseded. These are reused exact-release results, not newly rerun suites.

3. **Play, catalog, preservation, keyboard and narrow flow: PASS.** Reviewed the current cloud-browser observations and independently checked the isolated baseline browser artifact, harness source, runtime attachments and all ten screenshot images. [Run 38512498551](https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38512498551) baseline job 115683952142 succeeded, including immutable-source verification, production build, browser checks and unchanged-source check. Harness commit: `74ca824dcea6a92a6b350743ecfd666dd58c0941`. Results show two expected passes, ten intentional feature-specific skips, zero unexpected failures, zero flaky cases and no report errors.

4. **Evidence-backed defects and limits: PASS.** No new product defect was established in the exercised baseline flows. The report separates unsupported or untested stages from defects and does not invent feature requirements.

## Independent visual and artifact review

Chromium 141.0.7390.37; desktop viewport 1440×1000 and emulated mobile/touch viewport 390×844.

Opened catalog, story detail, team, battle and result PNGs for both projects. Catalog columns, story wrapping and focus outline, five-member party, battle HP/MP rows, command controls, result and next-battle controls are legible without an established overlap or horizontal truncation defect. Partially visible catalog rows are scrollable continuation.

Both result captures show nine-turn defeat. The harness fixes `Math.random`; this is deterministic coverage, distinct from the separately recorded live four-turn battle. Assertions verify party IDs/order and accessible labels through battle and reload, detail keyboard navigation and focus return, and document horizontal bounds at catalog/team/battle checkpoints.

Recomputed results JSON SHA-256: `aabed395eb9b1b2b2811a9fcd6d6e6b7d081704bcbc0f8ffd50c0451bf925ca1`.

Image-size nuance: the phone result PNG is **390×850**, generated with `fullPage: true`; the runtime viewport remains **390×844**. All other phone captures are 390×844; desktop captures are 1440×1000. This discrepancy does not establish a product defect.

## Required limitations

- Standalone notices delivery remains **unverified** following the browser-security rejection. Inline notices were verified by the recorded live browser check. No denied route was retried.
- Rights inventory checks are not legal clearance.
- No new release, merge, deployment, replacement-animation acceptance or final-v1 approval follows from this decision.
- No exhaustive device, browser, accessibility, animation, performance, balance or roster certification.
- This reviewer inspected evidence and pixels; it did not rerun the live interaction session or broad suites.
- No source, remote or harness-state writes were performed.
