# v0.20.12 myth-player terminal focus repair

2026-10-12 UTC. Exact base: public v0.20.11 commit `30807c382d3f162772862ee1edc82e5e0a03de0f`, tree `20a753b4d51e3ec4b7ccec29d8d18bb6be57f1cc`. Exported from that tree, not the checkout's older import HEAD. The isolated candidate was reviewed without a version bump or publication; this release assigns v0.20.12 and records final checks in release-validation-v02012.json.

## Reproduction and scope

At 400×606 / 360×533 in the publisher's real Chromium session: home → Fenrir details → 小さな物語 → 一時停止 → Tab → click 結末へ. The newly disabled button loses native focus to BODY at time 9000. Escape then reaches App's window fallback and dismisses the story and its enclosing details together. Natural completion while 結末へ holds keyboard focus reproduces the same loss. Existing ordinary-close paths were separately verified by the publisher.

Only the myth player changes at runtime. A capture-phase native window listener lets the active non-inert portal own Escape/Tab even when the target is BODY or window, before the enclosing profile/page fallback. It leaves already-handled and unrelated keys alone, yields when this portal is inert, and is removed on close. Explicit Tab retains ordinary focus scrolling so offscreen controls can be reached.

A layout effect repairs lost/disabled focus to the fixed Close button only when ended/reduced-motion/still control state changes. It does not poll, schedule work, steal valid focus or refocus on animation frames. This covers ending, both terminal still buttons, and replacement of playback controls on a motion-preference change. Inert/scroll restoration remains in layout cleanup. Trigger focus returns in passive cleanup after React's commit selection restoration, and only if the original trigger remains connected; simultaneous parent unmount still restores the outer opener.

No App fallback, timeline/sampling/scene geometry, styling, text labels, art, engine, AI, stats, skills, RNG, battle behavior, saves, packages, version or third-party notices change. The implementation, tests and this note are project-authored with AI assistance. No external code or creative assets were imported; existing independent ownership/similarity/legal review remains open.

## Validation

- Focused suite: 47 tests across the real player and App integration pass.
- Tests explicitly blur a focused control during the same React disabled-attribute mutation, before layout effects. Because happy-dom refuses blur after a button becomes disabled, the shim blurs immediately before setting that attribute. This establishes the observed BODY state rather than assuming happy-dom automatically behaves like Chromium.
- Coverage includes skip, natural completion, first/last reduced-motion stills, focus retained on disabled controls, motion-setting control removal, valid-focus preservation, BODY/Window Escape and forward/reverse Tab, competing inert players, repeated reopening, listener cleanup, source disclosure, all eight scenes, navigation unmount and both return-focus layers.
- App's prior tests treating window Escape as intentional simultaneous dismissal now require one layer per Escape. Explicit history navigation retains separate simultaneous-unmount coverage. The new home regression also verifies scroll/inert release, return focus, current route and saved-party identity.
- Red-baseline check: these exact 47 focused tests on the unmodified exported public tree produce 11 expected failures / 36 passes. All 47 pass on this candidate. The losses are observed in the test shim before repair; they are not inferred from the final focused element.
- Final full suite: 2,770 tests across 134 files pass. All 15 rights self-tests, source inventory/notice check, TypeScript, production build and built notice check pass. The pre-existing large-chunk warning remains (main chunk approximately 704 kB); no performance claim is made.
- Independent review reports 71 relevant tests plus four additional lifecycle/StrictMode checks passing against the frozen runtime-source hash. The additional checks cover listener freshness/disposal and BODY/window return focus. No source changes followed that review.
- The only modified runtime file is `src/components/MythVignette.tsx` (SHA-256 `3ab2bb95a326c79d22844e7d11d7201445da1fdf3b5a9e4f0099d2f589f29ab4`). Scene, art, engine, save-related code, packages and notices remain byte-identical to the exact base.

## Remaining browser gate

Automated DOM tests do not establish native mobile focus/layout behavior. Known-blocked local Chromium, socket, localhost and file-preview routes were not retried. The publisher must repeat paused skip, natural completion with terminal focus, first/last reduced-motion stepping, BODY fallback Tab/Escape and both return-focus layers on the actual deployed candidate, including the original 400×606 and 360×533 paths. Publication, live CI/Pages, credits and notices verification remain separate. Rights checks verify inventory/notice consistency and are not legal clearance.
