# Team slot focus visibility correction

Base: public v0.20.13 commit `2fc2d47c9f11c331d57809992f16b96a191d8825`, exact tree `f762d7929ff6ac63f6d003f03bacf71c8e619b2d`.

## Observed issue

Native 320×432 acceptance found that cancelling a picker restored focus to the expected third slot, but the slot's rectangle at y242.7–346.7 remained behind the fixed arena action bar. The slot center hit the bar's paragraph instead of the slot. Focus correctness alone did not establish visibility.

## Narrow correction

The existing `useLayoutEffect` still restores focus only after React removes the overview's `hidden` attribute. It now immediately calls a small helper that measures the focused slot, the actual `.screenAction` and `.mainNav` rectangles and `visualViewport` (with window-height fallback).

For a slot that fits, the page scrolls only enough to put the full card inside the uncovered vertical band with up to 12px clearance. For extreme zoom/short landscape where the entire card cannot fit, its center is placed in the unobscured band. If another tab shrinks the team while a later slot is being edited, restoration clamps to the first usable empty slot rather than a newly disabled button. Hidden/disconnected/zero-layout elements and non-overlapping docks are ignored. No timer, animation, resize listener or retained callback is added. Candidate-list scroll is never changed by the correction.

This uses measured dock geometry rather than a hard-coded footer height, so wrapping text, safe-area height, browser zoom and a shifted visual viewport are handled by the same path. App passes its existing details-open state into the editor so a pending return cannot steal focus from an open profile or nested movie after a remote team update; restoration resumes when the profile closes. No combat, persistence, team selection, navigation or home-animation behavior changes.

## Verification scope

Geometry tests cover the reported phone coordinates, short landscape, a 200%-zoom-sized usable band, visual-viewport offsets, already-visible and above-viewport cards, oversized cards and horizontal non-overlap. App regressions verify Cancel, Escape, confirm, remove, reorder and leader changes: the overview must be visible before page scrolling; focus remains on the restored slot; candidate-list position is untouched. Profile dismissal and navigation do not cause the hidden overview to scroll.

The release owner performs native center-hit checks on the actual integrated build. The implementation environment's established local-browser restriction was not retried or bypassed. The reviewed correction is integrated into v0.20.14. Final versioned checks and postdeployment native acceptance are recorded separately.

## Release integration

The release source preserves the reviewed runtime correction exactly. See docs/release-validation-v02014.json and docs/rights/releases/2026-10-12-v0.20.14.md. Source/DOM geometry checks do not replace the pending native hit-test acceptance after deployment.
