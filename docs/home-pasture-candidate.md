# v0.20.11 selected-party pasture home implementation

Baseline: published v0.20.10 commit `6852230e96184577f5d30cfe8e840ac2824d8115`, tree `9b79a301732ad817a8dce598949acf78e9e8b7ce`. The local release checkout has an older HEAD; this candidate was exported from the verified public tree, not from that HEAD.

## Scope

- Replace the home's hero copy and portrait summary with the selected workshop party's existing full-body art on an original, bright ranch/pasture SVG.
- Reuse only the pure presentation geometry of the enemy formation: alternating front/back slots with the existing full-body dimensions and foot anchors. Never mount `BattleStage`, create a battle, choose an opponent or run a combat/motion timer for the home.
- Read the existing `team` prop directly. Replacements, leader reordering, persisted workshop reloads, saved-party calls and rematch rebuilds remain authoritative. Incomplete teams show only their actual identities and empty slots.
- Preserve existing details actions through five independent 44×44 name targets above the art, avoiding transparent foreground bodies intercepting rear names. Preserve credit access. The footer becomes ホーム・図鑑・編成・闘技場.
- Remove the redundant ArenaLobby intro, preserving a programmatically focusable accessible heading and all pool/rule/practice restrictions, readiness, actions and expandable rules.

## Art provenance and limits

`src/pastureScene.ts` contains newly authored SVG paths, colors and scenery: rolling hills, orchard trees, ranch buildings, split-rail fences, a pond and soft foreground grass. No source images, fonts, screenshots, traced geometry, external media or reference-game text/code were imported. Existing creature art is unchanged. New scenery was actually rasterized together with the current creature SVGs and reviewed visually, including all 37 identities and large-body mixtures. Native font rasterization is an inspection aid only; no font files are distributed.

This is an original-authoring record, not legal clearance, a rights-ownership determination or a claim of non-infringement. Existing project rights-review questions remain open.

## Verification

Focused tests cover current-party identity/order, full-body sources, update/empty states, all 37 bodies in all five positions, read-only detail focus, no home battle/RNG/timer side effects, replacements, leader changes, saved-party loads, reload, Back/Forward and an edited rematch preserving enemy/seed. The scene fills the usable home height; creature proportions remain width-driven, with a modest 12% front / 19% rear enlargement and inset centers. Rear/front feet use 49%/68% of the scene height, spreading the rows on tall phones, with a cropped scenery background rather than stretched bodies. CSS contracts cover 326×432, 400×606, 720×900, 802×394, 802×360 and 540×320, with minimum-height/safe-area cases.

Native Canvas previews use the new background and exact creature source SVGs with the exported component geometry. They are art review evidence, not browser screenshots or a browser-layout claim. Local browser/localhost routes previously failed in this environment and were not retried. Actual mobile geometry, DOM hit-target stacking, scroll, browser font rendering and live details/navigation are explicit post-deployment publisher checks.

Engine, roster data, skill/balance, RNG, family presets, save schema, all eight myth scenes, existing creature art/rigs, third-party notices and legal credit content are byte-identical to the public baseline.

Independent review identified visible rear-head clipping below the initial landscape test height. The final landscape scene minimum is 262px (260px content), retaining all bodies even at 802×360 and with a nonzero bottom safe area. Extra regression cases include the wider content box possible at 500–599px viewports.
