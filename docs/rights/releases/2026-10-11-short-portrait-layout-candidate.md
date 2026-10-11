# Short portrait battle layout candidate

- Date (UTC): 2026-10-11
- Base: v0.18.3 staged tree `4736f1f8f2e7da7051d08688093efe9351fbeb0f`, identified by the integration owner as public commit `0769bc0c9b3a0b73339f0756c56bbad6ee5e36fe`.
- Scope: isolated working copy; no publication, version change, or independent deployment.

## Change and origin

The integration owner's deployed Chrome review found the enemy name/HP/MP/status overlay covering enemy bodies and HP bars at viewport 326×432, where the Canvas was approximately 307.14×78.86. The 457×605 and 596×381 viewports were reported readable.

The presentation code was written directly for this project with AI assistance. A generic wrapper keeps the existing Canvas and its target buttons in the same coordinate region. It uses `display: contents` outside the short-portrait breakpoint, leaving the existing Canvas-sized containing block and overlaid vitals unchanged.

Only at viewport width ≤499px and height ≤550px:

- The Canvas has a 140px minimum height and a bounded width-responsive height.
- Existing enemy vitals flow below the Canvas and can grow with long names or statuses. The existing content is reused; there is no new information panel or battle renderer.
- The stage, message/cast caption, and commands occupy separate intrinsic-height rows.
- The battle uses one vertical scroller instead of a nested command scroller. The existing exit/clock/menu row is sticky. The intended tradeoff is scrolling from the readable field to commands at extremely short sizes.

No external code, prose, artwork, fonts, sounds, dependencies, motion samples, or assets were copied or introduced. No engine, AI, statistics, save format, character art, motion timing, or command-clock implementation changed. The existing project licensing status and unresolved rights questions remain unchanged.

## Validation

- Focused regression: 6 files / 242 tests passed. Covers the target wrapper and Canvas/button selection, long state content, fallen targets, one Canvas and rAF chain, no added interval, compact-caption routing and ordering, fresh 30s clock, navigation, feedback, and responsive CSS cascade contracts.
- Complete suite: 89 files / 2,084 tests passed.
- `npm run rights:test`: 14 tests passed.
- `npm run rights:check`: passed, 5 software notices / 11 asset groups.
- `npm run build`: passed source rights check, TypeScript, Vite, and distribution rights check. The existing >500kB chunk-size warning remains.
- `git diff --check`: passed.

The CSS checks use happy-dom with media-rule parser whitespace normalized. They verify cascade/structure, not actual pixel layout. Canvas regression uses mocked drawing and bounding rectangles. These do not replace rendered-browser QA or professional rights/similarity review.

## Pending integration acceptance

The integration owner will verify the deployed build in the existing cloud browser. This patch did not attempt another local-server route or host a preview.

- At 326×432: enemy bodies/bars, ケツァルコアトル name, long status wrapping, target alignment, clock/exit visibility while scrolling, command selection and skip.
- At 457×605 and 596×381: preserve the previously readable arrangement.
- Compact casts: wrapping caption remains between the field and commands; no cast-title regression.
- Live credits/notices and exact deployed commit: pending an authorized release; not independently verified by this isolated implementation task.

Rights inventory checks are not copyright, trademark, patent, similarity, or legal clearance. No new agreement or reuse license was selected. Professional review was not performed.
