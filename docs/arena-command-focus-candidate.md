# Arena command focus and home cleanup integration record

Date: 2026-10-12 UTC. Base: v0.20.8 commit `e64abcfc251ef5c599f4dbb11d1fdafd482a45e7`, frozen tree `7851e8f405fec1131e299a555d3075636572424a`.

Integrated in v0.20.9 alongside the separately reviewed Fenrir rig and layered formation. The candidate validation numbers and preservation hashes below describe this UI-only component before integration; final combined checks are recorded in `release-validation-v0209.json`.

## Requested changes

- Remove the arena's `全員おまかせ` UI button. This was the whole-party command-reset button. Per-monster `おまかせ`, manual start with incomplete orders, the 30-second deadline, and engine automatic completion remain available.
- After the final living ally's order is fully committed, move keyboard focus to `この指示でターン開始`. Choosing a targeted skill alone does not count: its target must be committed. This also works with individual auto, non-party input order, defeated final slots, and edits after all orders have been chosen.
- Remove only the home `系統パーティを試す` shortcut and its empty wrapper/unused prop. The arena's family picker, all seven presets, saved slots, team information, and the four-destination footer remain.

## Implementation

A commit-scoped focus request is consumed by a layout effect after the command UI updates. It is rejected during pending targets, playback, expired deadlines, a finished/absent battle, navigation confirmation, monster details, tactics or the log. Suppressed requests are consumed rather than deferred until an overlay closes. Focus does not execute a turn. `preventScroll` plus instant nearest-edge scrolling avoids centering or smooth layout jumps, and a visible focus outline identifies the next action. Repeated Enter/Space keydowns on the start button are prevented so a held key does not start the turn after focus moves; a new deliberate activation retains the existing synchronous single-execution lock.

No engine, AI, abilities, stats, RNG, saved-data schema, battle stage, artwork, animation, dependencies, notices or external data were changed. All new implementation and tests were written directly for this project. No outside code, prose, media, fonts, or reference screenshots were imported.

## Test migration

Tests that explicitly clicked the removed whole-party reset now exercise supported alternatives: cancel a pending target, replace an individual order, or verify the normal next-turn reset. Their engine/order-completion assertions remain specific. Historical full-auto engine tests were not changed, and no broad snapshots or gameplay expectations were updated.

The added `App.commandFocus.test.tsx` covers five basic attacks; all-target, enemy-target and ally-target specials; defend; individual auto; out-of-order entry; living-only completion; replacement; cancellation; deadline and late-click races; modal priority; repeated activation keys; no implicit execution; and the next-turn reset. Home tests assert shortcut absence and the arena picker’s preserved use, cancellation and saved-slot behavior.

## Verification limits and release gate

Automated test results and source preservation hashes are in `docs/arena-command-focus-validation.json`. A local Chromium smoke launch failed before rendering with `process_singleton_posix.cc: socket() failed: Operation not permitted`. No rendered-browser pass, mobile-device pass, or OS-level repeated-key pass is claimed. No security settings or permissions were changed to bypass the restriction.

Before final acceptance of the combined release, use its supported browser to check:

1. At 400×606, 802×394, a short portrait viewport, and desktop size, the all-team auto button is absent while individual auto and speed remain reachable.
2. Finish the last living ally's target using both the command target row and battlefield targets. Focus and the visible outline move to turn start; the battlefield does not move unnecessarily and a turn does not begin by itself.
3. Hold Enter through final-command activation. Repeated keydowns do not start the turn; releasing and deliberately activating turn start does so exactly once. Repeat with Space, then touch input including a rapid double-tap to check for click-through after any scroll.
4. Editing a completed order restores normal target selection, cancellation does not trigger a turn or delayed focus, and re-committing moves focus back to turn start.
5. The home shortcut is absent without an empty action card. The arena family picker, catalog and footer still function. The existing combined-release navigation/modal/timeout checks remain required.

This component was not published independently; it is included in the v0.20.9 combined release. Rights inventory checks are not legal clearance; existing professional-review, ownership, expression-similarity, trademark and patent questions remain open.
