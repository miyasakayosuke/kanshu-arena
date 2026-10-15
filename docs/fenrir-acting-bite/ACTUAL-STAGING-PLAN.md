# Same-art actual battle layout diagnostic

Scope: compare presentation headroom and layering before further high-leap art.
Use the same two keys and contact source, unchanged physical character size and
unchanged800/1500ms action contract. Preserve the earlier surrogate failures.
This is an isolated QA fixture, not production adoption.

The fixture imports the real App, BattleStage, enemyFormation and CSS from the
accepted main14134f351d8eca79714199e1f2b34dc76e826a4e. Exact Git-blob hashes of six
production inputs are checked before serving. A test-only Vite transform supplies
a deterministic five-enemy encounter, initial battle navigation and a Fenrir-only
draw hook. It does not edit production source, combat logic or a deployed route.

Use the real358/460 floor, real rear-row depth and actual responsive layout. Test
front and rear Fenrir at390×844,390×640,844×390 and1120×900. The selected original
PNG is the neutral endpoint. At each viewport, cache the baseline physical sprite
width from the real formation and retain it across all study modes and phases.
Report measured widths rather than relabeling them130/142 when the game differs.

Compare three bounded modes:
1. Existing clipped stage: demonstrate the current limitation in actual context.
2. Airborne-only actor overlay at the existing floor: no sprite shrinking or
   stage crop, but explicitly measure overlaps with header, turn controls, enemy
   vitals and command UI. Return to the real enemy paint order for contact.
3. Taller scene reserved before the action: derive sufficient headroom from the
   same physical width and rear-row depth. Keep the landing floor stable during
   that variant, preserve physical size, and retain the actual enemy paint order.
   The scene is laid out before the cast; its absolute page floor and the amount
   of scrolling can differ from the baseline. Report that reflow cost explicitly.

Sample500–890ms every10ms and capture original, apex, descent and contact in each
case. Record screen/stage alpha bounds, UI intersections, source hashes, scene
and command-dock rectangles, horizontal overflow, and programmatic focus of turn
controls after scrolling. This original focus check does not establish Tab order
or enabled activation. UI intersections are alpha-bound-rectangle potential
overlap, not per-pixel opaque occlusion. Only Fenrir physical size is frozen;
other enemies retain the real formation height-dependent sizing. Reduced-motion media is set only to suppress unrelated
background motion in this staging diagnostic; the test hook still displays its
explicit poses. This does not replace the motion controller's reduced-mode test.

No further artwork during this comparison. The existing two-key articulation pop,
missing jaw closure/reach, source-edge and anatomy-detail cleanup remain open.
A green fixture run can faithfully record a rejected layout; independent visual
review decides whether either accommodation is suitable for further candidate
work. No final integration, smoothness, owner acceptance or release is implied.


## Narrow layout-state supplement

Retain the original command-UI comparison at ad2e4338. Before choosing staging,
measure the actual `.battle` inner scroller (clientHeight, scrollHeight and
scrollTop), then press real Tab keys from the document body until the turn-start
button is reached. Record enabled state and center-point hit testing separately.
Do not activate the button or claim a combat input test.

The test-only Vite transform also exposes the existing App `setPlaying` setter.
From the keyboard-reached command state, display the same descent key and switch
to the real playing-panel layout. Record natural scroll clamping, scene/floor
movement and viewport/UI bounds, then compare an explicit inner-scroll-to-top
accommodation. This is layout-state QA without combat events or FX. It is not a
claim that the production cast path currently scrolls or that its motion is
integrated. No production file, timing, art, or endpoint changes are permitted.


The playing-state supplement repeats the complete500–890ms/10ms bounds sweep
both after natural reflow and after explicit top scrolling, with extra560ms
pitch screenshots. A650ms descent snapshot alone cannot establish the worst
apex/pitch clearance. The real keyboard trial still records focus/enabled/hit
state without activating the combat action.
