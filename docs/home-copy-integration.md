# v0.20.11 pasture home + quiet tab UI integration

Baseline: exact public v0.20.10 commit `6852230e96184577f5d30cfe8e840ac2824d8115`, source tree `9b79a301732ad817a8dce598949acf78e9e8b7ce`.

Inputs:
- Home/pasture patch SHA-256 `ceb48b4f985dfd0d0e4c2f2631ec20d0ddde97370289574026bccd932f5b6dba`, tree `7bf5b170b2d21451b602bd2988225b2d600cc338`.
- Tab-copy patch SHA-256 `e054e1b39d0db9daa5fe2084e5385946af29662b01265d7c8c449f4de4eff064`, tree `52184242ec8e35ac5dfc0cdb0dc667eb1cf595a9`.

The copy patch applied cleanly to the home candidate except that its rights manifest was deliberately merged by asset ID: preserve the new pasture asset and home change record; add the copy patch's two file-inventory entries and its separate change record. App changes have nonoverlapping hunks: copy cleanup removes the decorative shared header but retains the battle Home action; home changes only the footer order. HomeScreen owns the home replacement and the coordinated ArenaLobby accessible heading change. No gameplay resolution was necessary.

The original copy candidate used a v0.20.10 credits marker; package, lockfile, manifest release metadata and the marker are now assigned v0.20.11. The version regression test checks agreement.

See `home-pasture-candidate.md` and `tab-copy-cleanup.md` for scope, provenance and verification limits. Release publication, exact commit/deployment confirmation, final live mobile acceptance and credit/notice URL checks remain the sole publisher's responsibility. The final v0.20.11 release also incorporates the independently reviewed compact-details candidate; no new character/skill changes are included. See release-validation-v02011.json for final combined gates.

Root visual review then requested a stronger tall-phone composition. The final integration enlarges front/rear bodies by 12%/19%, insets all five centers, uses 49%/68% scene-height row anchors and crops the scenery upward. This presentation-only refinement has an additional exhaustive all-37, five-slot, five-viewport body/44px-target containment and non-overlap test. Initial input patch hashes above identify the original submitted inputs, not the final integrated patch.

The first combined full regression run identified 11 old DOM-selector expectations in three tests (home portrait grid and former lobby heading wrapper). Expectations now assert the new full-body pasture and the retained accessible/focusable lobby heading; none of these fixes change gameplay or weaken the underlying state/focus checks.

Independent review found a short-landscape rear-head clipping edge at 802×360. The corrected 262px landscape minimum and expanded geometry/CSS regression cases are included in the final frozen source; ordinary 802×394 composition is unchanged.

Final combined review found a pointer-focus edge: a browser that does not focus a clicked name could restore the previous footer/body after closing details. Home triggers now explicitly focus themselves before opening, matching the existing catalog pattern. Three combined regressions cover home → groups → movie → nested Escape/focus, the no-pre-focus pointer path, and stylesheet isolation.
