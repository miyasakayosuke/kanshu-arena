# Accepted public baseline QA

Reviewed 2026-10-14: live checks approximately 04:16–04:21 UTC; isolated CI artifacts and screenshots reviewed approximately 04:44–04:45 UTC. Status: **bounded baseline browser checks pass, including the new 390×844 narrow-screen check.** No product defect was established in the exercised flows. This is not an all-criteria acceptance or a new release approval; standalone notices delivery remains unverified.

## Identity and deployment evidence

- Public application: https://miyasakayosuke.github.io/kanshu-arena/#home
- Accepted version: 0.20.32
- Accepted commit: `8343d81405b9eb3c59621a4b0ead4052e2d3949e`
- Accepted tree: `0b68d439d1d4eb794df3550a094d7219c8e32b37`
- Latest main workflow observed through the GitHub connector: [Build, Test and Deploy, run 38381205628](https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38381205628), run 81, completed successfully for that exact commit, updated 2026-10-13T10:11:43Z.
- [Deploy job 115241784287](https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38381205628/job/115241784287): every reported step succeeded, including checkout, rights tests, full tests, smoke, build, Pages upload and Pages deploy.
- The job log records checkout of the accepted SHA, `pages_build_version` equal to that SHA, creation of its Pages deployment, and the evaluated environment URL `https://miyasakayosuke.github.io/kanshu-arena/`.
- The same log emits `assets/index-CkAgptcj.js` and `assets/index-B8wiTE4n.css`. Current live DOM script/stylesheet references name exactly those files. Live credits visibly identify v0.20.32.
- Local accepted-build SHA-256 values were rechecked: JS `4b4724323625973db6365a6705226dffec38180a5caacfab1641cb842abe12f1`; CSS `e4331d49be2559136b358b90480828a7ff3df40560c5f3a80c6bda8fe72a96c9`.

This binds the observed live asset identity to the exact successful deployment. It does **not** claim that live asset bytes were downloaded and independently hash-compared.

## Existing full-suite and release checks

No broad suite was rerun: exact-commit CI and preserved release evidence already establish these results.

1. Exact deployment job log: **3,443 tests across 166 files passed** at 2026-10-13T10:11:00Z.
2. Rights self-tests: **15 passed, zero failed**. Build checks report source and dist inventory success; these are inventory checks, not legal clearance.
3. TypeScript and production build completed successfully. The expected JS/CSS filenames above appear in the build output.
4. Current-policy smoke ran **736 matches** and the CI smoke step completed successfully. This is bounded suite/policy evidence, not universal game balance or parity evidence.
5. Locally preserved publisher test/build logs and the release validation record were inspected. The full log's recomputed SHA-256 is `241e819a941289cb2b902c40f3cffd1ed051a940d75118c251c1b00f18cca4e5`, matching the validation record.
6. The locally preserved publication receipt maps the release tree, commit, successful CI and bundle together. Its later acceptance status supersedes the earlier validation record's historical `nativeAcceptance: pending`; that earlier field is not a current failure.
7. Separate locally preserved historical review evidence includes source review, rights/build logs and the final native audit. These are prior review results, not newly executed tests in this pass.

Non-failing build warnings include a minified chunk over 500 kB and npm environment/config notices. They do not establish a runtime/performance pass or failure.

## Current live browser observations

Environment: cloud Chrome, measured CSS viewport **944×606**, ordinary supported page UI. No state injection, forced seed, team edit or deployment action.

### Catalog and keyboard

- Home and catalog loaded. Catalog showed 37/37 monsters.
- Searching `妖狐` reduced the count to 1/37 and showed the matching card. Reset was exercised before leaving the catalog.
- Opening 妖狐 detail focused the close control. Keyboard Right on the appearance tab selected the story tab and displayed its text/source link.
- Escape closed the detail and restored focus to the originating 妖狐 card.

### Play loop

- Standard arena showed the existing five-member party, cost 15/17, ready status and an enabled start control.
- A natural beast-family opponent was drawn; no deterministic seed was selected.
- Manually selected 妖狐's 炎嵐, which advanced command selection to the next ally. Remaining actors used the game's unselected/automatic behavior.
- Animation speed was changed to 2×. Turn execution, changing HP/MP, incapacitated actors and continuing command phases were observed.
- MP recovery example: 妖狐 had 36 MP during turn-one resolution after the 18-MP ability, then 38 at turn-two input. Enemy フェンリル similarly moved from 47 to 49 across that boundary. This is one observed recovery case, not exhaustive cap/death coverage.
- The animation-skip control worked through fresh name-based locators. Two earlier index-based attempts raced a completed animation and returned stale-node errors; these are tool-timing misses, not counted as successful clicks or product defects.
- Battle ended at **4-turn DEFEAT**, automatically returned to the arena, displayed the result and next-battle control, and preserved the party.
- Reload removed the in-memory result and reset the displayed match count; no persistent-history expectation was asserted.

### Preservation and navigation

- Original and final party: 妖狐 / バステト / ドリュアス / バンシー / ガルーダ, in that order.
- Same party appeared after battle, reload, home and team navigation. Team screen showed team 1 selected, cost 15, with teams 2 and 3 empty.
- Browser Back returned team → home; Forward returned home → team. Final state was home with no open game dialog.
- No party slot, preset or rule was edited. No account, purchase, remote-user or repository state was changed.

### Credits and notices

- [Live credits](https://miyasakayosuke.github.io/kanshu-arena/credits.html) loaded and visibly showed v0.20.32, the pre-alpha/provenance caveats, 37 code-authored SVG characters, and the continuing legal-review limitation.
- Expanding the inline notices displayed full entries for React, React DOM, Scheduler, Vite's helper and Rollup's CommonJS helper.
- Clicking the standalone notices link was rejected by the browser security URL policy with an unsupported-protocol message. The link was visible as `https://miyasakayosuke.github.io/kanshu-arena/THIRD_PARTY_NOTICES.txt`; its standalone response/download remains unverified in this pass. No bypass or alternate access route was attempted after the denial.

### Diagnostics

- A screenshot showed the arena at 944×606 with the party and start control rendered. This does not certify every page at all scroll positions.
- A bounded warning/error query filtered for the application origin returned no entries. Unfiltered records contained extension-origin metadata errors, not application-origin errors.

## New exact-source CI viewport evidence

- [Isolated browser workflow run 38512498551](https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38512498551), harness commit `74ca824dcea6a92a6b350743ecfd666dd58c0941`, tested baseline runtime source `8343d81405b9eb3c59621a4b0ead4052e2d3949e`. This is a production build served by Vite preview inside CI, not a deployment or a live-site phone test.
- GitHub artifact `11870786433` is the baseline artifact. Downloaded ZIP SHA-256: `c10e553fcbd4837cd3a7040f51de27084c0e9db575b2d5854be68a419dbd6aac`; the download coordinator verified it against GitHub. The reviewed JSON report SHA-256 is `aabed395eb9b1b2b2811a9fcd6d6e6b7d081704bcbc0f8ffd50c0451bf925ca1`.
- Runtime attachments identify Chromium **141.0.7390.37**, desktop **1440×1000**, phone **390×844**, and the exact baseline source SHA for both. Phone project enables mobile/touch emulation; this is not a physical-phone test.
- Results: **2 expected UI passes, 0 unexpected failures, 0 flaky, 10 intentional skips**, with no report-level errors. The skips cover feature-specific catalog-scroll, awakening-preview and storage-candidate cases; they are not counted as baseline passes.
- The baseline UI assertion checks all 37 catalog cards, catalog-heading focus, Right-arrow story-tab focus/selection, Escape dismissal/focus restoration, initial team, battle start, repeated ordinary turn-start/animation-skip inputs through result, and identical five member IDs/labels after play and reload. It asserts no document horizontal overflow at catalog, team and battle checkpoints. The shared fixture also rejects uncaught page errors.
- For reproducibility the harness replaces `Math.random` with a constant before navigation. Timers, rendering and storage are not mocked in this UI flow. This deterministic fixture must not be described as an unseeded/random encounter or a general balance result. Both screenshots show **9-turn DEFEAT**, distinct from the separately observed live four-turn battle.
- All **10 actual PNGs** were visually inspected: catalog, story detail, team, battle and result for each viewport. At 390×844, catalog forms a readable two-column list; story text wraps inside its dialog; all five team slots remain visible; the battle's HP/MP rows and command buttons fit; result and next-battle controls are visible. Desktop uses a centered three-column catalog and readable dialog/battle layout. No clipping or overlap defect was established in these captured states. Partially visible next catalog rows are normal scrollable continuation, not a claim that every card is simultaneously visible.

The previously open narrow-screen gate is now closed **for this exact-source, one-phone-viewport flow and inspected screenshots**. The separate public deployment binding remains the exact-commit CI/live-asset evidence above. No product changes or deployment occurred as part of this isolated check.

## Remaining limitations

1. Live-site interactive checks remain limited to 944×606. The documented cloud-browser capability inventory exposed no resize/emulation API, and keyboard zoom did not change that viewport. Narrow evidence comes from the isolated exact-source CI run, not that failed zoom attempt. Other phone sizes, short landscape, zoom and physical-device behavior are not newly certified.
2. Historical v0.20.32 acceptance describes 400×606, 361×533, 803×396 and 270×400-at-200%-zoom observations and an independent recorded-evidence audit. That is relevant prior evidence, explicitly attributed to the previous release acceptance and kept separate from the new CI screenshots.
3. Standalone notices delivery is unverified under the supported browser route; inline notices are verified readable. No legal-clearance conclusion follows from either.
4. No exhaustive roster, touch/physical-phone, screen-reader, all-keyboard, hidden-tab, reduced-motion, performance or balance certification. No current suite rerun is implied.

No claim is made that all acceptance criteria pass. Retain the distinctions between live observations, newly inspected exact-source CI results, inherited exact-release evidence and unverified stages.
