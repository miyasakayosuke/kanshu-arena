# Art-first catalog and eight optional myth scenes: v0.20.10 integration

Base: exact published v0.20.9 commit `b8477a7b06053248adf702a5ab0081f1fd8d27af`, tree `7365df70612a45382edd828a564f8459fde0212c`.

The reviewed art-first candidate and the eight reviewed scene modules are combined on this base for v0.20.10. The canonical v0.20.9 Fenrir art, rig and rights record remain unchanged. This supersedes the art-first-only document's movie-exclusion boundary; no ownership, rarity, currency, stat or battle changes are introduced.

## Parent integration

- The original full-art profile renders a single labelled movie trigger for the eight actual scene IDs. Other 29 monsters have no unavailable or fake movie controls.
- The player and deterministic scene renderer are dynamically imported only when an applicable profile is open. Initial catalog browsing does not request the player. Loading and retry status stay within the profile; no scene automatically opens.
- Dismissal while importing abandons the result. A failed import can be retried. The focused retry control stays in place, guarded with `aria-disabled` while pending. Only its owned focus transfers to the loaded trigger; ordinary loading and a reader who moved elsewhere are not refocused.
- Both catalog-card and movie-trigger activation explicitly focus their actual buttons before opening. This avoids relying on browser-specific click-to-focus behavior.
- Movie close returns to the trigger while the profile stays open and body scrolling stays locked. Closing the entire profile cancels the timeline, releases movie inert state before parent focus restoration, and returns to the original catalog card. Route departure removes both overlays without leaving inert or a running frame loop.
- Existing profile descriptions, origin links, filters, history, list position, party data and four footer destinations are preserved. No new visible section heading is added to the catalog or profile.

## Reviewed module deltas

The scene renderer remains byte-identical to its independent rendered review: SHA-256 `e9a83ceed24a4e8daf040b87e7b48a15a4f8aaeb30938dea38e8959afeb0aaa5`.

Two small reviewed integration corrections alter supplied module hashes: the play button explicitly focuses itself before opening, and the existing roster spelling ドラウグル replaces the shortened ドラウグ in its new movie UI name/description. No scene geometry, narrative beat, duration or motion changes. Updated actual hashes are recorded in the asset manifest.

The original scene author and reviewer inspected real rendered SVG frames for all eight scenes. The integration implementer inspected their final contact sheet. Those frames are not browser recordings. Continuous on-device animation, browser performance and responsive UI geometry need separate live acceptance.

## Tests and remaining acceptance

New parent-route tests cover all eight opt-in scenes, all 29 other monsters, nested close/focus, pointer activation without implicit focus, simultaneous parent/movie unmount, Back/Forward departure, reduced-motion stills, preserved filters/scroll/save data and Tab containment. Separate loader tests cover no initial non-core import, pending, failure/retry, focused deferred retry, no focus stealing, stale completion, and changing profile identity. The ID24 lore focus test now expects the real movie trigger before the reading disclosure.

Final release tests, rights selftests/source check, TypeScript/Vite build, dist-rights check and mechanical smoke parity are recorded in release-validation-v02010.json. Real browser review must still check the first visible full-art row, 200% text, safe-area/footer avoidance, touch behavior, optional movie playback/replay/close, reduced motion and bundle-load recovery. No policy-blocked local Chromium, localhost or file-URL route was retried. Only the designated publisher may deploy the final reviewed release.
