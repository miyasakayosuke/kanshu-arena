# Catalog result position candidate

Base: v0.20.32 public release source. Unpublished; no version bump, deployment, character art, awakening, engine, balance, or persistence changes.

## User-visible correction

Changing search, sort, family, skill, leader-effect or cost criteria starts the resulting list at its first card. This applies to the shared catalog and replacement-candidate list. Previously a prior scroll offset survived those changes, so newly sorted/filter-matched cards could begin offscreen.

Opening/closing the filter controls does not reset the list. Visiting another tab and returning retains the browsing position. Opening/closing monster details and reading the previous/next monster do not change it. Input focus is not moved during search.

## Implementation

`RosterBrowser.tsx` compares the six result-selection fields in a layout effect, resets the list and remembered position only after those fields change, and deliberately excludes the disclosure state. The initial key is seeded from current props so the existing mount-time restoration survives.

## Verification

- Before correction: 8 of 10 new regression cases failed; preservation cases passed.
- After correction: all 10 new cases passed.
- Focused catalog navigation, catalog browsing and team-builder suite: 80 tests passed.
- Rights self-tests, source inventory, TypeScript/Vite build and dist notice checks passed.
- Full suite: 167 files / 3,453 tests passed.
- Visual QA could not run. Shell Chromium was blocked on socket creation. The supported CUA cloud browser was available, but opening the Vite candidate at `http://127.0.0.1:5185/kanshu-arena/#catalog` returned `net::ERR_CONNECTION_REFUSED`; a separate shell request also could not connect despite the server process remaining active. No screenshots or visual acceptance claimed.

Before publication, perform real-browser acceptance: scroll catalog, change each filter/sort, check first card; open/close details; leave/return and Back/Forward; repeat on short-phone and desktop viewports. The existing catalog navigation integration tests already cover Back/Forward position preservation.
