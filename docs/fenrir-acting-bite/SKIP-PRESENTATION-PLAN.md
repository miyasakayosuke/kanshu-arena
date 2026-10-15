# Proposed next bounded UI candidate

Status: design only. No new control code, artwork or browser rerun is included in
this evidence checkpoint. Control is the reviewed781309f6 frozen-art fixture.

## Preferred experiment

Conditionally pin the existing Skip button within the short playing viewport
when its settled ordinary position is offscreen. Keep the same DOM element,
finishPlayback handler, accessible name and Tab order; do not create a duplicate
button or a second completion path. Keep the default presentation on screens
where the ordinary button fits.

The390x640 screenshots suggest a candidate bottom band below the ally cards.
Test a minimum44px hit target with safe-area spacing. Keep the existing status
paragraph beside the same button in that band, preserving its text and checking
that it fits; hide only the decorative pulse while pinned. This is a placement
hypothesis, not a measured occlusion pass. It must not cover the arena, ally
cards, status information, header controls or dialogs. Keep it below modal layers.

Choose the presentation during the existing cancellable preparation phase,
before the action clock. It must not change the scene height, character size,
floor, camera or game timer. Remove it on finish/Skip, discard and unmount.
Preserve user scrolling; do not repeatedly reveal the arena. Any QA caption must
also stay out of the actual control's target area.

## Why not automatic post-Skip restoration first

Restoring scrollTop after settlement does not make the initially hidden Skip
discoverable. It could also move the user away from command controls that just
became usable. A pinned button may avoid the scroll-to-Skip that caused the
observed crop, but command reflow can still change the viewport. Measure that
result rather than assuming it is fixed. Do not combine both interventions in
the first comparison.

## Exact later comparison and stop

Use only the existing two390x640 cases: front1x genuine Tab/Enter and rear2x
center-hit-tested pointer activation, with natural timers and frozen art. Compare
against the retained781309f6 screenshots/recordings; do not rerun its ten-case
controlled matrix. The candidate should need no wheel scroll to reach Skip.

Require initial enabled visibility, target/focus-ring containment, a real center
hit test, no overlapping essential content, unchanged floor/width while playing,
one full-state-oracle commit and no resumed cues. Record scene, command controls,
focus and inner scroll immediately after Skip and after settlement. Keep user
scroll preservation explicit; do not silently snap the viewport to make a pass.
All source hashes, game tests/build and adapter checks stay enabled.

Stop after this single test-only candidate and independent rendered review.
Failure is retained rather than followed by an automatic placement loop. The
initial visibility defect is suitable for a reversible opt-in engineering test;
the final command-versus-arena presentation and production adoption still require
review. This design does not authorize deployment or restart artwork generation.
