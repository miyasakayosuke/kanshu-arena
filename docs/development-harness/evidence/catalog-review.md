# Formal catalog-filter-scroll review

Decision: **APPROVED: YES** for the three catalog task criteria on candidate `14134f351d8eca79714199e1f2b34dc76e826a4e`.

Review date: 2026-10-14 UTC.
Schema: 3. Task: `catalog-filter-scroll`.
Assigned reviewer: `combined-ui-review-one`, generation `3`.
Assignment checkpoint: revision `19`, commit `adc19309c4afcf8b96859a9f27f54b9f29c4fe60`; assignment expiry 2026-10-14 05:42:41 UTC.

This decision approves the catalog implementation criteria only. It does not approve the separately assigned awakening-preview task, product acceptance, main merge, deployment, or legal clearance. The coordinator owns the guarded state transition and release gates; this reviewer made no state mutation.

## Evidence binding

Implementation evidence was successfully fetched from this exact checkpoint URL:
https://github.com/miyasakayosuke/kanshu-arena/blob/adc19309c4afcf8b96859a9f27f54b9f29c4fe60/docs/development-harness/evidence/ui-checks.md

Product source is the exact previously reviewed immutable candidate, and all 27 previously fetched changed/protected local files were rechecked unchanged during this assignment. The independent source review confirmed the 22-path combined product scope, no rejected artwork, unchanged combat/team-save/deploy/notices/dependencies and matching inventory.

Fresh combined browser evidence:
- Run: https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38514539330
- QA commit: `2c7b195442be1d3940f505477b68a59462e46712`.
- Source: `14134f351d8eca79714199e1f2b34dc76e826a4e`.
- Artifact ZIP SHA256: `c75db4cb4549b12021fe327919a8ac27334808c6235abe3b3e777b5ccde708ff`.
- results.json SHA256: `db2037ec44f74892f591c5d0c271ca52aa3be8941f52fe3092da8dba05d43f35`.
- Runtime: Chromium `141.0.7390.37`, desktop `1440x1000`, emulated touch/mobile `390x844`.
- Result: six passes, six expected storage skips, zero unexpected/flaky cases. Exact metadata, runtime attachments and result guard independently verified.

All 18 original PNGs were directly reviewed, including catalog/reset, detail/team/battle/result and the combined calculator stages. Screenshot inventory SHA256: `78286b7cf096a6361d58b8f7937d8f442430b36def30adb400833a5c5a035c82`. No separate-candidate screenshot substituted for combined evidence.

## Criteria

### 1. Changed filters show first result without stale scroll: PASS

The inspected result key includes search, role, sort, leader effect, family and cost. Its layout effect resets the actual list and remembered position only after a changed key. Independently rerun result-position tests cover all six fields, repeated searches, reset/empty search recovery, replacement-candidate lists, no focus movement and no reset for disclosure-only or unchanged values. Fresh browser assertions establish real nonzero scroll, sort/family reset to zero, empty search/reset and restored 37-card default results at both viewports. Direct reset pixels show the first cards and default controls without horizontal overlap.

### 2. Existing detail dismissal and scroll restoration still pass: PASS

Mount restoration/unmount capture and detail focus/dismissal code remain unchanged. The independently rerun focused suite passed 179 tests across five files, including all ten result-position and 35 MonsterDetails tests. It covers remembered-position capture and actual unmount/remount. The fresh browser run verifies Home/catalog position retention, detail tab keyboard focus/selection, Escape dismissal and opener-focus restoration at both sizes. Shared play-loop checks also retain the same five-member lineup through return and reload. Prior independent owner-isolation tests are supplementary evidence, not a substitute for the fresh combined run.

### 3. Narrow viewport and keyboard QA recorded: PASS

Exact phone 390x844 touch/mobile and desktop 1440x1000 execution and identity attachments are recorded. All meaningful screenshots were opened, not merely generated. Phone filter chips wrap, selects fit, card columns and names remain legible, and detail controls/focus outline are visible. Executed keyboard tab selection, Escape dismissal and focus return pass. No horizontal truncation or new blocking captured-layout issue was found.

## Evidence-link verification

The actual branch is `harness-public-v3/arena`, with `docs/development-harness/evidence/ui-checks.md` at repository root. An initial lookup incorrectly split that slash-containing branch into ref `harness-public-v3` and path prefix `arena/`, producing a 404. Explicit-ref verification using the complete branch name succeeds, returns the stored display URL, and matches the implementation evidence blob `f2910a6e9cd097e927e8af5cb9cf33587876b450`. This was lookup/parser ambiguity, not a missing branch or broken stored evidence link. The immutable checkpoint URL above remains the precise binding for this review; new records can use immutable URLs to avoid ambiguity.

## Limits

No physical-device, WebKit/Firefox, arbitrary viewport, comprehensive accessibility, animation-performance or exhaustive roster/artwork review is claimed. Lower list rows are naturally clipped by the scroll viewport; last-card reachability was not visually inspected. Source and tests support behavior beyond the captured still images, but not all possible user interleavings. The full 3,587-test suite/build/lab results are inspected implementation evidence, while this reviewer independently reran the 179 focused tests, guard tests and QA rights checks. No rerun was necessary because the exact product source remained unchanged.
