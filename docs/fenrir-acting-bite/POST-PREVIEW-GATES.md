# Remaining gates after the rough high-leap preview

Current visual checkpoint:5a4f5fd8. The full1500ms action and one controlled
extension-to-tuck bridge are useful rough studies. Freeze additional artwork
while owner feedback is pending; no final visual or release acceptance is implied.

## Visual work still open

- Partial rather than deep backward load; flat rear support lacks a toe roll.
- Large260ms extension and remaining400/460ms head/forepaw articulation steps;
  abrupt560ms pitch and a long held descending pose.
- More forceful connected jaw impact at800ms, continuous landing weight acceptance,
  smaller930 head countermotion and970–1020 rebound step.
- Other paws relocating during return, face/fur/tail/chain-detail consistency,
  minor precontact/contact toe penetration and transparent source-edge cleanup.
- Tiny front-left source crop; preserve the proved vertical staging rule without
  broad layout redesign. Do not shrink the character to hide bounds failures.

## Runtime and UI gates still open

Current actual-App fixture is a layout study with manual pose time and a playing-
layout setter. It does not execute the real combat playback. The isolated older
controller checks do not close lifecycle gates for this new full-action renderer.

Source inspection identifies an adapter risk: BattleStage applies generic action
travel/lift/tilt/scale before the Fenrir draw. Adding the whole-body sprite path
there unchanged would double-transform it. A candidate-only hook must explicitly
account for that while preserving reactions/defeat and every unrelated action.

Next coordinated bounded non-art diagnostic (no additional artwork):
1. Keep accepted-main App/BattleStage/navigation/style/formation source hash-locked;
   use only an isolated Vite/test adapter, not production adoption.
2. Drive the real existing 月下の一咬 cast/age and authoritative event timeline,
   with an actual browser control activation. Bind only Fenrir and this skill.
3. Verify oneMP10 debit at cast start, one impact at800 logical milliseconds and
   the1500ms action span; speed2x must scale elapsed time without duplicating hits.
4. Exercise actual Skip/clear, reduced motion, consecutive casts, delayed/failed
   assets and defeat interruption. An ended/cancelled cast must not reappear when
   assets resolve. The exact original is the safe fallback.
5. Reserve only required headroom, settle playing layout, reveal the arena once
   before the action clock, then freeze floor/size/layout. Preserve user scrolling.
   Check the short-portrait Skip visibility/focus/activation tradeoff explicitly.
6. Start with desktop and short portrait, then the front/rear/light/dark matrix.
   Retain real browser frames and event/DOM evidence for independent review.

The current art stays fixed throughout this diagnostic. A fixture pass is not
permission to deploy it or to mark the visual gates complete.

## Packaging and release

After visual direction and continuity are accepted, prepare bounded runtime-size
assets while retaining full originals/provenance. Verify decoded dimensions,
transparency, preload behavior and memory/load budgets. Independent rendered
review and explicit owner adoption are still required. Only the designated
publisher may integrate a reviewed rollback-safe release; main remains unchanged.

## First lifecycle experiment: concrete implementation contract

This is an opt-in Vite entry, not an import into the production app. Engine,
playback and battleMotion are additionally hash-locked. The only gameplay setup
is an initial legal team and seed. All five legal basic-attack orders, turn start,
speed, Skip and leave-dialog choices are entered with actual keyboard controls.
The CPU chooses the bite using the unchanged engine: front seed0 and rear seed1.
The rear seed also produces a second real bite on turn2 in the same mounted battle.

The existing execute result is the full-state oracle. Every natural/Skip finish
must equal it including RNG seed, event history, statuses, HP and next-turn MP.
The observed cast costs10MP and the existing timeline places its one hit at800
and its command end at1500. A full five-versus-five turn is much longer than1500.

A cancellable presentation await settles the playing layout and conditionally
reveals the arena before the existing timeline starts. Skip/discard/new match/
unmount invalidate preparation. No gameplay results or enemy orders are edited.
A read-only observer records cues and the actual BattleStage actionAge; that age
waits at799 until the authoritative impact is observed. The candidate is eligible
through1500 independently of the generic attacker's1350 rest boundary.

The test renderer explicitly substitutes the selected exact original for neutral,
reduced and candidate-asset fallback. This changes the diagnostic neutral from the
current production vector rig. If even the original source is unavailable, the
ordinary rig/image/emoji path remains. Other Fenrir skills retain ordinary motion.
Only this exact bite isolates generic travel/lift/tilt/scale and camera/effect
movement that would otherwise double-transform the whole-body drawing.

Asset readiness is passive and latched once per cast event. A late cache cannot
start a completed or skipped cast; a new cast can use it. Separate pure adapter
checks cover a dead-actor interruption and reused-event retirement. This synthetic
boundary test must not be described as a natural simultaneous in-combat defeat.
The first browser matrix includes real normal/2x/reduced casts, pre/post-hit Skip,
a preparation-Skip race, delayed-cache repeat casts, candidate/all-source failure,
Continue in the leave dialog and confirmed discard. Failure modes use explicit Playwright request aborts for the candidate images,
including the original in the all-source case, and exercise real decode rejection.
The ordinary rig/image/emoji draw is observed separately when every candidate
source fails. This is controlled fault injection, not an observed network outage.
Keyboard focus and Enter verify handlers; Tab traversal and pointer hitability
are not asserted by this first lifecycle matrix.

Stop at the first actual browser result and independent lifecycle review. Keep
visual quality, short-screen control tradeoffs and deployment acceptance separate.

The browser matrix uses Playwright controlled Date/timers/rAF, not manual sprite
time. It verifies real App scheduling and rendering deterministically, not
real-time scheduling jitter or performance. Pre-hit Skip releases its pending
asset request gate only after cancellation; confirmed leave is observed beyond
the former full-turn finish deadline.
