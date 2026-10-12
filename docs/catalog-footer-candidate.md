# Catalog footer integration — v0.20.8

Date: 2026-10-12 UTC. Reviewed candidate integrated into v0.20.8. This record covers implementation and prepublication checks; actual public-browser acceptance is recorded separately.

## Exact base

- Public commit: `42a87128a7d79bf6b68121fc675fefcd9f756691`
- Exported source tree: `81e5f2511b3fec31bf15d9906190c7405b953182`
- The isolated checkout was created by archiving that exact tree. The publisher's older local HEAD was not used as a source.

## Change

- Four footer destinations in order: ホーム・編成・図鑑・闘技場.
- `#catalog` opens the existing 37-monster roster directly as its own read-only screen, with an active-page marker and a focused heading for keyboard users.
- Shared `RosterBrowser` owns the single filter/search/sort/card implementation used by both the team editor and catalog. The catalog has no team replacement callback, save controls, or battle-start control.
- The team editor's existing catalog link goes to the same first-class route. The home screen keeps its already simplified layout, without a duplicate catalog gate.
- Search, all filters, sort order, filter disclosure and list position survive ordinary route changes and Back/Forward during this app session. A browser reload recognizes the route; transient filters intentionally use the existing session behavior rather than introducing a new save schema.
- Existing MonsterDetails owns its fixed close header, detail-body scroll, focus return, background, and Escape handling. A second Escape does not dismiss the durable catalog screen.
- During battle, the existing battle-only navigation stays unchanged. A catalog hash/history attempt uses the same leave-confirmation mechanism, preserving planning commands or playback when canceled and clearing old timers only on confirmed departure.
- Four footer targets and catalog buttons are at least 44px in each relevant dimension. Catalog bottom content reserves the safe-area inset.

## Preservation

Engine, strategy, family rules, 37-monster lore, all art and the articulated Yoko files, battle playback, saved-team schemas, dependencies, and public notices must match the exact base. No other experimental candidates are included.

## Verification

- Existing team, navigation, queued-history and detail-dismissal regressions are retained. New coverage checks catalog entry/reload, active navigation, repeated clicks, read-only browsing, all filter/sort/disclosure/list-state restoration, details/history departure, planning versus playback leave confirmation, and CSS contracts across narrow, compact and landscape dimensions.
- Final checks passed: 2,535 tests across 115 test files; TypeScript and production build; 15/15 rights self-tests; source and dist rights inventory checks; whitespace validation. The reviewed candidate preserved all 30 protected files byte-for-byte. Release preparation retains 28 of those exact bytes and changes only root version fields in package.json and package-lock.json; dependency selections are unchanged. The build retains its existing non-blocking large-chunk warning.
- Independent source review reported no blocking findings. Its small-target observation was corrected with catalog-scoped 44px overrides and tests.
- No local rendered-browser pass is claimed: Chromium fails during startup with `process_singleton_posix.cc:297 socket() failed: Operation not permitted (1)`. The app never rendered in that attempt. Vite served the candidate successfully on a loopback address. Real mobile/landscape geometry, native keyboard activation and touch behavior remain publisher acceptance checks through the supported browser route.
- Rights inventory checks are not legal clearance. No external contact, fee, new legal agreement, privacy setting, or license selection is part of this change.
