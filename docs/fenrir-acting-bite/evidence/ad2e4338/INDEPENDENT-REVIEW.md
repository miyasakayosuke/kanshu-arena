# Independent actual-layout review

Source ad2e43380ce50f21781d62d28abd6547e7f217f8. Reviewed the actual Chromium
screenshots and recorded geometry; this is a static layout comparison.

At390×640, the existing stage clips the apex tail/back, and the rear slot loses
much of the upper body. Airborne overlay restores the silhouette but visibly
paints over TURN and nearby header text. Tall231/262px scenes preserve the full
apex/descent at unchanged123.3/114.1px Fenrir sizes. Rear contact is behind the
front troll, demonstrating the real depth order.

After scrolling to the turn-start button, the sticky header hides much of the
tall scene and rear Fenrir. A command-to-playing reflow and inner-scroll check is
required before selection. The current baseline is command UI only.

390×844 fits comfortably without accommodation. Landscape and desktop front
slots fit. Rear baseline top clearance is only about0.45/0.86px at the worst
sampled point, so a modest margin is useful. Tall rear adds about20px clearance,
but pushes landscape vitals downward and desktop controls farther below the
viewport. Prefer only the headroom needed, subject to playing-layout review.

Evidence limits: the original reachable-control check is programmatic scroll
and focus, not actual Tab navigation or activation. UI intersection values are
alpha-bounding-rectangle potential overlap, not opaque-pixel measurements.
Document scrollHeight is not the battle inner scroller. Only Fenrir's physical
size is frozen; other enemies keep real height-dependent formation sizing.
The production transform/bounds math was independently inspected and agrees
with the real idle fixture. No blocking fixture bug was found for this scope.

Recommendation: no blanket overlay adoption. Retain the clipped/overlay failures
and continue the narrow playing-layout and scroll comparison before choosing a
candidate staging accommodation. This does not establish combat integration,
keyboard usability, final identity, smoothness, or release acceptance.
