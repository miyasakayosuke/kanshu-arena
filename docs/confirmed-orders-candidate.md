# Confirmed-order poison planning implementation

Date: 2026-10-12 UTC. Reviewed implementation integrated into the v0.20.3 release candidate. This note preserves the prepublication regression evidence; final release checks and subsequent deployment acceptance are recorded separately in docs/rights/releases/2026-10-12-v0.20.3.md.

Baseline: public v0.20.2 commit `c7699ca6006f9b20dc5063b3390d787fbb9611ed`, tree `67abe562f464620d23abefe7058af09fd59d09cf`. The separate checkout's initial tree is an exact import; the source release checkout's HEAD is older than its published staged tree and was not used as the baseline.

## Reproduced defect

With allies `[14,3,6,9,10]`, enemies `[29,1,8,30,31]`, seed 42, and leaders enabled:

- Confirm 烏天狗's 毒霧 while leaving the others automatic. The old completion performs two non-stacking poison casts, spending MP16 on both 烏天狗 and ドリュアス.
- Replace ドリュアス's automatic poison with a normal attack. The old completion still reserves the discarded poison and chooses no poison elsewhere.
- The old tactics preview and individual automatic command used the same context-free plan.

Two engine tests and one UI test were added first and all failed against the public baseline. The failures were extra poison (`a3,a1`), missing poison (`[]`), and two poison entries in the preview.

## Bounded change

`completeOrders` preserves confirmed commands and fills remaining commands using the existing planner. Confirmed poison reservations are rebuilt on each call from living, currently affordable own casters and valid target sides. Later party slots are considered before automatic choices. Single-target reservations require a confirmed living target. Invalid or unaffordable explicit commands retain existing resolver rejection behavior, but reserve nothing.

The helper is used by individual automatic selection, tactics preview, manual start, deadline completion and engine fallback. Individual automatic selection excludes the actor's previous command so it can be replaced. Previously committed automatic commands remain fixed. Deliberately committed double poison remains legal and spends MP as before.

Only poison reservation behavior changes. Existing heal/cleanse/protect/response bookkeeping is preserved, including its historical limitations when those support commands are manually overridden. The `reservePoison:false` comparison arm retains its exact historical context-free plan-plus-overrides behavior. All-auto and enemy CPU policies, scoring, battle seed/RNG, rules, skills, stats, art, motion, labels, saves and dependencies are unchanged. No enemy orders, future survival, cleanse/cashout or borrowed MP are forecast.

## Verification

- 33 new focused tests pass: 20 engine and 13 command UI tests.
- Coverage includes later-slot poison, replaced/cancelled/reset input, unfinished targets, invalid/dead/unaffordable actors, exact single targets, duplicate-key precedence, explicit double poison, comparison controls, input purity, winner state, support coordination, preview/individual/manual/timeout agreement, skipped playback and deadline/repeated-click races.
- Independent review identified a support-bookkeeping regression in the first implementation. It was corrected, with dedicated heal/cleanse/protect regressions. Re-review found no remaining engine blocker.
- Independent exact-baseline comparison passed 250 matches / 1,799 turns for both-side automatic planning and full result state/events for empty fallback and UI-style complete auto input. A further 1,000 randomized non-poison partial-command states matched historical behavior without mutation.
- Final aggregate checks pass: 2,352 tests across 103 files, 14 rights-checker self-tests, source and built-notice inventory checks, TypeScript and production build. The existing bundle-size advisory remains.
- The 736-match smoke report is exactly equal to the public v0.20.2 report after removing only source commit and engine SHA-256 metadata. Both 1,014-battle frozen default and legacy parity suites pass, alongside earlier historical parity fixtures.
- Existing deadline, skip, navigation, immediate/edited-party same-condition rematch and all three saved-team tests pass in that aggregate run. Detailed logs and parity results are retained with the separate candidate verification evidence.
- The isolated implementation review did not perform rendered-browser or public-deployment verification. Final v0.20.3 release checks and postdeployment acceptance are separate; DOM and engine checks do not claim real-device performance, improved win rates or player comprehension.

## Origin and rights review

The helper, tests and this note were written directly for this project with AI assistance, using its existing code and the reproduced defect. No external code, descriptions, illustrations, music, fonts, animation samples, archived pages or extracted game materials were imported. Third-party notices, license text, roster/art provenance and dependency versions are unchanged. The change is recorded in `docs/rights/asset-manifest.json` under `effects-ui-text`.

Automated rights inventory checks do not resolve copyright, expression similarity, trademark, patent, ownership or professional-review questions. Existing review-ledger items remain open. No expert/rightsholder contact, legal agreement, fee or project-wide reuse license is part of this implementation. Publication to the existing game repository is handled by the separately authorized v0.20.3 release workflow; this is not authority to contact or share materials with outside reviewers.
