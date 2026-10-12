# Home party idle implementation

Base: public v0.20.12 commit `5c7103585b9fba301059e6813e9f3542b5f32c5b`, exact tree `5890b0e123210fa758ea7fad9b769f6cef80588b`.

Scope: the five selected home creatures only. `App.tsx`, saved-party state, the battle renderer, combat clocks, roster values, original drawing modules, and battle controls are unchanged. Team changes continue to arrive through `HomePasture.team`.

## Motion and lifecycle

- The original full-body SVG is inline on first paint; no image request, decoding race, frame-by-frame parser, hidden canvas, cache, random opponent, sound, requestAnimationFrame, or timer is created.
- Yoko uses its existing root, head, three tails, ear, eye, and pendant groups. Fenrir uses its existing torso, head, mane, tail, ear, eye, and three chain groups. Pivots match the existing rig. Body parts move independently; neither the scene nor the name buttons bob.
- The other 35 drawings have no existing idle articulation. They breathe gently at a fixed foot anchor, with slower motion for heavy forms and softer compression for water forms. Their existing path geometry, colors and proportions are retained; their floor shadows stay still.
- Native SVG `animateTransform` tracks begin only after visibility and the motion preference are known. One pasture IntersectionObserver and visibility/preference listeners pause invisible or backgrounded scenes. Removed components pause and release their native animation documents; the observer and listeners disconnect.
- Reduced motion contains no native animation elements and restores the neutral drawing. Returning to motion creates fresh tracks instead of retaining old SMIL begin/end history. Older SVG implementations keep the immediately visible static drawing.
- Five original slots, front/back order, full-body aspect ratios, clipping bounds and 44px name targets remain unchanged. Names are separate focusable buttons above the artwork.

## Validation

- Component tests cover all 37 path sets, full-body viewBoxes, unique gradient/filter IDs, deterministic tracks, separate fixed controls, initial/offscreen/hidden/reduced states, pause/resume without restart, preference toggles, party replacement and resource cleanup.
- Existing home integration tests cover actual team persistence, replacements, leader changes, saved teams, history, details focus restoration, and rematch without starting a battle/timer/opponent from home.
- Native raster QA samples the exact production tracks into full SVG frames, then composites them with the existing scene and slot equations. This verifies rendered geometry rather than calling a test a browser screenshot. Native browser SMIL playback, device performance and integrated three-team behavior require the publisher's browser acceptance after the authorized release.

## Provenance

The home animation code and its timing tracks were written directly for this game on 2026-10-12, reusing the project's already inventoried original SVG art. No generated, external, extracted or traced images, animation clips, fonts, sound, third-party code or reference-game assets were added. API behavior was checked against the SVG documentation; documentation code was not copied. Existing art provenance and professional-review limits continue to apply. Automated inventory checks and visual inspection do not establish legal clearance, ownership, or non-infringement.

## Final candidate checks

2026-10-12 UTC, before integration/publication:

- `npm run rights:test`: 15/15 passed.
- `npm run rights:check`: passed; 5 notice groups, 19 asset groups, no legal-clearance claim.
- `npm test`: 135 files, 2,776 tests passed.
- `npm run build`: TypeScript, Vite, and source/dist notice inventory passed. The existing large-bundle advisory remains; no new dependency was added.
- Native SVG/Canvas review: 333 body frames across all 37 identities and 60 scene composites across six viewport sizes; zero added overflow beyond original viewBoxes. All 37 neutral renders are exactly pixel-identical to their original SVGs (maximum RGBA-channel delta 0). Six generic tracks return exactly to their neutral pose at the sampled 7,400 ms boundary, as expected from a 3,700 ms period.
- The initial grouping heuristic was corrected before this pass: only the first floor-shadow ellipse is kept outside the body. Eyes, wheels, water rims, and ornaments retain their original paint order. An all-37 shape-order regression and pixel comparison cover the correction.
- Browser routes were not retried because the task's existing access limitations were already known. Actual browser/native-SMIL playback and reduced-motion device acceptance remain the publisher's final checks; the reviewed candidate is now integrated into the v0.20.13 release source. Postdeployment native acceptance is recorded separately.

## v0.20.13 integration

Combined with the separately reviewed editor/home change against exact public v0.20.12. Final versioned aggregate checks are recorded in docs/release-validation-v02013.json and docs/rights/releases/2026-10-12-v0.20.13.md. Native browser acceptance is performed after authorized deployment; the standalone raster/DOM checks above are not device acceptance.
