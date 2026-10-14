# Formal awakening-preview review

Decision: **APPROVED: YES** for all three awakening-preview criteria on exact candidate `14134f351d8eca79714199e1f2b34dc76e826a4e`.

Reviewed 2026-10-14 UTC under schema 3, task `awakening-preview`, worker `combined-ui-review-one`, generation `3`. Assignment checkpoint: revision `21`, ledger commit `32adb909c5a5b944393e2d323ea666673faabde2`; expiry 2026-10-14 05:48:24 UTC. Catalog review had already closed before this assignment began.

This decision covers the read-only calculator task only. It does not authorize gameplay progression, economy/acquisition quantities, inventory/reward integration, storage migration, main merge, deployment, or legal clearance. The coordinator owns the guarded approval transition and subsequent release/acceptance gates. This reviewer changed no product source or remote state.

## Immutable evidence

All three published reports were fetched at commit `6a1bd283bbd10b5ee0abf92cb04ef50690c5a373` and independently confirmed byte-identical to the reviewed local evidence:

- Implementation: https://github.com/miyasakayosuke/kanshu-arena/blob/6a1bd283bbd10b5ee0abf92cb04ef50690c5a373/docs/development-harness/evidence/ui-checks.md
- Source: https://github.com/miyasakayosuke/kanshu-arena/blob/6a1bd283bbd10b5ee0abf92cb04ef50690c5a373/docs/development-harness/evidence/ui-source-review.md
- Browser: https://github.com/miyasakayosuke/kanshu-arena/blob/6a1bd283bbd10b5ee0abf92cb04ef50690c5a373/docs/development-harness/evidence/ui-browser-review.md

Fresh combined run: https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38514539330
Harness: `2c7b195442be1d3940f505477b68a59462e46712`.
Application: `14134f351d8eca79714199e1f2b34dc76e826a4e`.
Artifact ZIP SHA256: `c75db4cb4549b12021fe327919a8ac27334808c6235abe3b3e777b5ccde708ff`.
Results JSON SHA256: `db2037ec44f74892f591c5d0c271ca52aa3be8941f52fe3092da8dba05d43f35`.
Screenshot inventory SHA256: `78286b7cf096a6361d58b8f7937d8f442430b36def30adb400833a5c5a035c82`.

Metadata and runtime attachments bind Chromium `141.0.7390.37`, desktop `1440x1000` and touch/mobile emulation `390x844`. The independent result guard confirms six passes, six intentional storage skips, zero unexpected/flaky cases. All 18 original screenshot PNGs were opened directly. Prior separate-candidate runs are supplementary only.

## 1. Preview has no save, combat or progression side effects: PASS

The independently inspected runtime route is MonsterDetails to AwakeningPreview to pure domain derivation/next-change helpers and scoped CSS. Calculator stage state is local React state; derivation copies the base record. The domain module has no persistence imports or initialization side effects. Storage adapter, fake storage and IndexedDB driver are not reachable from this component. No acquisition, material consumption, reward grant, persisted progression or battle stat activation is introduced. The calculator is explicitly excluded from battle-context inspection.

The remote/local product comparison covers all 22 changed files plus five protected files. App, engine, team save, deployment workflow, third-party notices and dependencies are unchanged. All 27 previously fetched files were rechecked byte-identical during this assignment. The rejected artwork revision is outside the candidate delta.

The independently rerun 179-test focused suite includes the calculator's all-roster endpoint, no-storage/roster-mutation, bounds, reset and battle-exclusion tests. Earlier independent StrictMode and integer-oracle review is reused for its additional coverage. In the fresh combined browser run, repeated calculator controls leave base display and catalog text unchanged, log no local/session Storage mutation calls, preserve stored bytes, and reset correctly between monsters and close/reopen. These dynamic observations complement source reachability; they do not alone prove every browser persistence API is unused.

## 2. Comparison labels and narrow viewport behavior are reviewed: PASS

All six calculator screenshots were directly inspected: stages 0, 4 and 99 on both desktop and phone. Trial-only ownership/save/combat wording is visible and clear. Each result is explicitly a hypothetical value before leader effects. Stage/slider/preset states and selected outlines match. Visible HP/attack values are 150/47, 155/48 and 158/49 for stages 0/4/99 respectively; endpoint disabling and maximum-stage wording are correct.

Phone controls and result rows fit within the modal width without horizontal overlap. Browser assertions independently verify at least 44-pixel button/input dimensions, horizontal bounds, Home/End/ArrowRight behavior, +/-1 limits, unchanged MP/speed and defense-not-introduced labels. Source and reviewed tests preserve stage-zero current stats, use the approved 95/98/100 rates with linear interpolation/nearest rounding, and explain integer plateaus and next actual changes rather than promising every stage increases a stat.

The screenshots deliberately show the modal scrolled to its result: some upper base-stat labels and later explanatory prose are outside the captured body. Lower prose, disclosure-at-rest and every scroll position are not separately pixel-reviewed. This does not invalidate the visible comparison, assertions or reviewed source, but limits the visual claim.

## 3. Independent evidence covers existing accepted behavior: PASS

The independently inspected product scope excludes combat/team-save/dependency changes. The combined production build's shared browser cases pass catalog entry, detail keyboard tab navigation/selection, Escape/focus restoration, team view, battle start, complete deterministic battle loop, return and reload at both sizes. Exact five-slot IDs/order/labels remain `[0,2,3,4,6]` after play and reload. Catalog reset and route-position retention also pass in this combined source.

All shared catalog/detail/team/battle/result screenshots were opened directly and showed readable controls and expected layouts without a new blocking captured defect. Both result images show a nine-turn defeat, demonstrating completion rather than a balance claim. The focused independent test rerun passed 179 tests; inspected frozen-source implementation logs report all 3,587 tests in 170 files, rights tests/inventory, build and 736-match balance smoke with a 0.00 percentage-point aggregate change. Those full checks were not redundantly rerun by this reviewer because source remained unchanged.

## Limits and final boundary

The six storage skips remain skips, not evidence of gameplay storage integration. No historical-save migration, quota/crash durability, physical-device behavior, WebKit/Firefox, arbitrary viewport, exhaustive art/roster, comprehensive accessibility or animation-performance claim is made. The combined feature cases run in separate contexts within the same exact build, not every possible mixed interaction sequence. No blocker was found within the task's read-only source, exercised behavior and captured visual scope.

The working slash-containing evidence branch is `harness-public-v3/arena`; its root path is `docs/development-harness/evidence/...`. Prior apparent 404s resulted from an incorrectly split ref/path, and explicit-ref verification succeeded. This report uses immutable URLs to avoid that ambiguity.
