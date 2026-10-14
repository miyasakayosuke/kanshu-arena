# Catalog and awakening preview: CI evidence review

Technical result: both candidates PASS the exercised browser checks and the limited screenshot review described below. This is evidence review only, not formal harness approval, merge/release authorization, product acceptance, or legal clearance.

## Exact evidence binding

Run: https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38512498551
Harness commit: `74ca824dcea6a92a6b350743ecfd666dd58c0941`
Browser: Chromium `141.0.7390.37`
Viewports: desktop `1440×1000`; emulated touch/mobile `390×844`.

Catalog source: `e91dbdb5376a44c8a851a76b0bf70251882fff62`
Catalog ZIP SHA256: `cc83adced1145f799d80a1b8e5cfa57f50c20290932f8c26d96e206023e34dbe`
Catalog results.json SHA256: `a49cbd6e0c6e0c5818828ac39b8c5bab6df2b7ce1a0fc4f72b9a834ef9c3dff0`

Awakening preview source: `da7954108e36b69955c730eafc7bd7782be809e1`
Preview ZIP SHA256: `112c3409230aa1d77067f67182f3536a711e81cfd1b71fd366cd29f6d6072bd7`
Preview results.json SHA256: `877b50a5103e719e0173d1e0e1fcf86e12f122b8d2a2a38b2d83a875ec986345`

ZIP hashes were independently recomputed against the supplied GitHub artifact digests. Both JSON reports bind the exact harness commit/run and application source. Runtime identity attachments on every passed case independently report browser version, source SHA, project and viewport. Both reports pass the exact coverage validator: 12 cases, 4 passed, 8 intended skips, zero unexpected failures or flaky cases. The skipped cases target other matrix candidates; they are not passes.

## Catalog candidate

PASS for the tested scroll/reset behavior and captured visual states.

- On phone, search/sort, filter disclosure and count are readable and fit the width. Cards form two columns with distinct art and readable names/families. Desktop uses three columns in the centered application width.
- The reset screenshot shows the disclosure still open, default filter controls, restored 37/37 count and first catalog cards. Controls wrap within the phone width without overlap.
- Detail-story text, header, navigation and visible keyboard-focus outline are readable at both sizes.
- Team, initial battle and result screens show the full five-member lineup, controls and outcome without horizontal truncation. Both result frames show the same nine-turn defeat. This is evidence of a completed loop, not a balance or win-rate claim.
- The passing browser cases establish nonzero list scrolling, navigation scroll retention, sort/family resets, empty search/reset, detail keyboard/focus behavior, and exact lineup retention through the play loop and reload.

Limits: the screenshots show only the visible subset of 37 cards and selected UI states. List clipping at the lower scroll boundary is expected scroll-container behavior; last-item reachability was not visually inspected. Dynamic scroll behavior is supported by assertions, not video. No exhaustive roster/art, animation, accessibility, or physical-device review is claimed.

## Awakening preview candidate

PASS for the exercised hypothetical calculator and captured stage layouts.

- All six stage screenshots were opened: stages 0, 4 and 99 at phone and desktop sizes.
- The calculator clearly labels itself as a trial that does not affect ownership, saves or combat. Stage indicator, slider, preset buttons, selected state and result rows are visible and readable without horizontal overlap.
- Pixel-visible values match the independent calculation: stage 0 HP150 / attack47; stage 4 HP155 / attack48; stage 99 HP158 / attack49. Maximum-stage wording is visible at 99. Minus-one is disabled at zero and plus-one at 99.
- The passing browser case additionally establishes bounded step and native keyboard controls, unchanged base stat displays, MP/speed explanation, no local/session storage mutation calls or byte changes during the exercised interactions, next-monster and reopen reset, and minimum 44-pixel control dimensions.
- Shared catalog, team, detail, battle and results captures were also assessed. Six preview PNGs are byte-identical to directly viewed catalog counterparts; the four differing shared PNGs were opened separately.

Limits: the stage screenshots intentionally follow result.scrollIntoViewIfNeeded and show a scrolled modal. The base-stat labels near the top are outside/partly above the visible body, and later explanatory prose below the result is not fully captured. This is not evidence of missing content, but the lower explanation, disclosure-at-rest and every scroll position have not received pixel review. The storage assertion covers localStorage/sessionStorage in these interactions, not every persistence API. The test does not inspect private React/module state or prove all engine invariants.

## Screenshot inventory and scope

`VISUAL_SCREENSHOT_SHA256SUMS` binds all 28 original PNG filenames to SHA256 values, relative to each downloaded artifact root. Twenty-two images were directly opened as pixels; six duplicate preview images were verified byte-identical to directly viewed catalog images. Generated HTML report duplicates were not counted again.

Catalog screenshot families (phone and desktop):
- `ui-catalog-navigation-deta-3d946-team-and-complete-play-loop-{project}/catalog.png`
- same directory: `detail-story.png`, `team.png`, `battle.png`, `result.png`
- `ui-catalog-result-changes--19c46-l-and-navigation-retains-it-{project}/catalog-reset.png`

Preview screenshot families (phone and desktop):
- the five shared play-loop filenames above
- `ui-awakening-calculator-is-a6a88-between-monsters-and-reopen-{project}/awakening-stage-{0,4,99}.png`

No source or remote state was changed by this evidence review. Only this review report and screenshot hash inventory were created. Headless Chromium screenshots do not establish WebKit/Firefox behavior, hardware touch usability, small/landscape screens, animation smoothness, measured performance, comprehensive accessibility, or final release readiness.
