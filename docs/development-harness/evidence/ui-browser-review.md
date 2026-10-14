# Combined v0.20.34 browser evidence review

Technical result: PASS for the exercised catalog-result reset and read-only awakening calculator criteria on the exact combined candidate. No blocking source or captured-layout issue found. This report is technical evidence, not formal schema-3 approval, merge/deployment authorization, product acceptance, or legal clearance.

## Exact identity

- Application commit: `14134f351d8eca79714199e1f2b34dc76e826a4e`.
- QA harness commit: `2c7b195442be1d3940f505477b68a59462e46712`.
- Run: https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38514539330
- Supplied GitHub artifact ID: `11871355231`.
- ZIP SHA256 independently recomputed: `c75db4cb4549b12021fe327919a8ac27334808c6235abe3b3e777b5ccde708ff`.
- results.json SHA256: `db2037ec44f74892f591c5d0c271ca52aa3be8941f52fe3092da8dba05d43f35`.
- Actual browser: Chromium `141.0.7390.37`.
- Desktop: `1440x1000`; emulated touch/mobile: `390x844`.
- Browser report start: `2026-10-14T05:03:19.354Z`.

The report metadata binds the exact harness commit, application commit, combined tag and run URL. Runtime identity attachments agree on browser version, candidate, source, project and viewport for all six passed cases. The unchanged fail-closed validator was run independently on this report: twelve discovered cases, six passes, six intended storage skips, zero unexpected or flaky cases. No storage skip is counted as a pass.

Remote compare independently confirms the published harness is exactly one commit/seven paths beyond approved baseline `74ca824dcea6a92a6b350743ecfd666dd58c0941`. All seven changed remote files byte-match the frozen reviewed inputs; the additionally fetched deployment workflow matches the accepted protected blob. The published workflow has no unreviewed expansion.

## Catalog result-position criterion

PASS. At both sizes, the browser assertions establish nonzero real list scroll, retention through Home/catalog navigation, reset after sort and family selection, disclosure-only retention, empty search followed by reset to 37 cards/default order, retained disclosure state, and scrollTop zero after reset.

Both catalog and reset screenshots were opened directly. Phone search/sort/filter controls fit the width, role chips wrap, and count reads 37/37. Cards form two columns on phone and three in the centered desktop layout. The reset captures show the open disclosure, default controls and first catalog cards. Names and family labels are readable in the visible rows, with no horizontal overlap. Lower cards are clipped by the intended list viewport; last-card reachability was not visually inspected.

## Read-only awakening calculator criterion

PASS. All six actual stage images were opened directly: stages 0, 4 and 99 at both viewports. Visible stage indicators, slider, presets, selected outlines, disabled endpoint controls and HP/attack rows agree with the reviewed arithmetic:

- Stage 0: HP 150, attack 47, zero increases.
- Stage 4: HP 155, attack 48, increases 5 and 1.
- Stage 99: HP 158, attack 49, increases 8 and 2; maximum-stage wording visible.

The trial-only ownership/save/combat disclaimer is clearly displayed. Controls and result rows remain inside the modal width. The browser assertions additionally establish keyboard Home/End/ArrowRight, bounded +/-1 controls, unchanged base display, unchanged MP/speed explanation, zero observed local/session Storage mutation calls and unchanged stored bytes during the exercised calculator interactions, reset on next-monster and close/reopen, unchanged returned catalog text, and at least 44-pixel control dimensions.

The stage screenshots intentionally follow result.scrollIntoViewIfNeeded: upper base-stat labels are partly outside the visible modal body, and lower explanatory prose is not fully captured. This is a limitation of the captured state, not evidence that content is missing. Disclosure-at-rest, lower prose, every scroll position and all 37 monsters were not independently inspected as pixels.

## Shared combined-runtime regression evidence

PASS. The exact combined application also passes catalog entry, keyboard detail-tab focus/selection, Escape dismissal/focus restoration, team view, battle start, deterministic complete battle loop, return to team and reload. Both attached lineup records retain IDs `[0,2,3,4,6]` in the same five slots after play and reload.

All ten shared screenshots were opened directly: catalog, detail-story, team, battle and result at each viewport. Visible detail text and keyboard-focus outline are legible. Team, initial battle and result states show the five-member lineup and relevant controls without horizontal truncation. Both result captures show a nine-turn defeat. This establishes completion of the exercised loop, not a gameplay-balance or win-rate claim.

## Screenshot inventory and limits

All 18 original PNGs were directly opened as pixels. `COMBINED-SCREENSHOT-SHA256SUMS` records their paths and hashes relative to the extracted artifact root. Attachment/report copies are not counted again. No prior separate-candidate image substitutes for this review.

The combined run covers both feature suites and shared regression flow in the same exact build, but each test has its own browser context; it does not exercise every possible interleaving of filters, calculator activity and combat in one session. Source inspection found independent local state and no cross-feature mutation route. Persistence observations cover localStorage/sessionStorage for these interactions, not every browser API or private React/module object. Storage-only tests were intentionally not rerun, and no acquisition/economy/combat integration is implied.

No WebKit/Firefox, physical-device touch, small/landscape viewport, animation smoothness, comprehensive accessibility, exhaustive artwork/roster review, quota/crash durability, or production deployment verification is claimed. Formal task-specific schema-3 review claims and coordinator acceptance remain separate gates.
