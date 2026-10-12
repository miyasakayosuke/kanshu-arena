# Art-first catalog implementation record

## Scope

Base: public v0.20.8 commit `e64abcfc251ef5c599f4dbb11d1fdafd482a45e7`, exact tree `7851e8f405fec1131e299a555d3075636572424a`. This was the isolated art-first component baseline. The component is integrated on public v0.20.9 for the combined v0.20.10 release; final checks are in release-validation-v02010.json.

- Catalog opens directly into search, sort and a collapsed filter/count row. Its screen-reader heading remains focusable; redundant visual game branding, title and explanatory copy are absent in this route.
- A two-column mobile gallery shows the existing full-body art, name and family. Each entire tile opens details. At wider widths the grid adds columns. ID numbers are decorative catalog order, never rarity.
- Family-tinted scenes use newly authored CSS gradients, an arch and a shadow. Existing character geometry remains unchanged. No copyrighted third-party card art, frame, icon, font or motion is reused.
- Advanced capabilities remain: search, skill role, leader stat, family, cost, sorting and reset. Applied filters remain visible while collapsed. The bounded gallery restores its prior scroll position and existing history state.
- Details use a much larger uncropped body, with close outside the sole detail scroller. The original source-linked lore, abilities, stats and keyboard/focus dismissal behavior remain available, with 13–15px reader typography instead of the former 10–11px rules. Failed images show a readable fallback; names and detail actions remain available.
- Editor candidates retain their compact portrait/stats/comparison design. No engine, stats, battle balance, saved-party schema, footer destinations or artwork registry changes. The catalog alone reserves the footer’s actual in-flow height, with a recovery page scroller for extreme short/text-scaled viewports.
- All 37 characters remain available. There is no fake ownership, drop rate, rarity/power tier, paid pack, currency or collection progress. The original art-first component had no movie button. In the combined v0.20.10 release, eight reviewed, opt-in myth scenes are connected through MythVignetteEntry inside .profileHeading; the other 29 monsters have no unavailable controls.

## Research applied, without copying expression

Official promotional collection art and frames of the official 13.5-second Pocket immersive sample were inspected by the research reviewer. These are development/promotion samples, not a full inspection of the live app. The transferable observations are large art, a simple browse-to-detail flow, and optional context beyond the initial artwork. No sample media are distributed here.

- https://www.pokemontcgpocket.com/ja/howtoplay/collection/
- https://www.pokemontcgpocket.com/ja/about/

Four Apple Design Award winners were considered as examples, not a universal best-game ranking. Official gameplay images were inspected. Railbound supports removing nonessential UI; Afterplace one-thumb immediacy; stitch. accessibility choices; MARVEL SNAP character-specific motion rather than its screen density. Those are design inferences applied independently to this game's needs.

- https://developer.apple.com/design/awards/2023/
- https://developer.apple.com/news/?id=0x08hncy
- https://developer.apple.com/news/?id=3exkgv43
- https://developer.apple.com/news/?id=mc4d1ufa
- https://developer.apple.com/news/?id=sosm2p7q
- https://developer.apple.com/videos/play/meet-with-apple/243/

The existing original art and all outstanding provenance/similarity questions stay under the existing rights ledger. Design inspiration and passed inventory checks are not legal clearance.

## Verification boundary

New tests cover all 37 body-art URLs and full clickable tiles, collapsed first-use filters, applied-filter summaries, zero-results reset, every monster's detail/focus restoration, party immutability and editor separation. CSS contracts are tested in both stylesheet orders at 320×432, 390×844, 400×606, 802×394 and 650×900; these inspect the cascade, not rendered geometry. Existing catalog history, filter, scroll and dismissal regressions remain relevant.

Local Chromium sockets and cloud-localhost preview access were previously denied; they were not retried. The original component review used an exact React server-rendered, CSS- and asset-inlined HTML snapshot; it was not treated as a screenshot. Real browser checks must establish the first visible full-art row, 200% text behavior, safe-area/footer avoidance, long-name wrapping and touch scrolling, then verify the final integrated release. No final visual quality claim is based on happy-dom.
