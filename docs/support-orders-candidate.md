# Confirmed support reservation correction

Date: 2026-10-12 UTC. Reviewed implementation integrated into the v0.20.4 release candidate. This note preserves the isolated implementation evidence; final release checks and deployment acceptance are recorded separately in docs/rights/releases/2026-10-12-v0.20.4.md.

Baseline: public v0.20.3 commit `b59ba99f847c89050bcc13a2c6ce859f0e7aff09`, tree `6dba00c1e480d2a8a7303bd01d75d622943defa6`. The separate checkout was imported from that exact staged public tree, not the older HEAD of the release directory. Baseline engine SHA-256: `59f857c47a84ea2ee4c9d636691b18279a596dc3722f59e8e534507eb02db59d`. Candidate engine SHA-256: `1f6cf122daf5fe3010ac97e73a7a09eb7bcee2fab033d670db49e7e170557489`.

## Reproduced defect

The planner recorded its automatic support suggestion, then returned an overriding confirmed command. A confirmed attack could therefore leave a healing, cleansing, protection or party-response reservation for an action that would never occur. Later automatic allies skipped available support.

With allies `[2,20,0,6,11]`, enemies `[29,1,8,30,31]`, seed 42, leaders enabled, and 妖狐 at HP1/168 with poison3:

- Confirm バステト's basic attack on e0 and leave 唐傘おばけ automatic.
- With every enemy defending, the public baseline chooses 唐傘おばけ's attack. 妖狐 dies from the turn-end poison.
- This candidate chooses its ordinary cleanse instead. 妖狐 survives at HP31 with no poison, matching the manually confirmed cleanse control's full event sequence.

Other unchanged-roster fixtures show replacement healing at HP145 instead of HP80, protection at HP56 instead of HP12, and two available cleansers no longer suppressed by a discarded party cleanse. HP/status setup and explicit enemy commands isolate the defect; these are engine fixtures, not claims about naturally reached matches or live-browser play.

## Bounded implementation

At each existing party slot, a confirmed command is now processed before automatic selection and returned as the same unchanged object. Only its actual currently usable support contributes reservations:

- Heal: add its power to the exact living same-side target's existing planned healing.
- Cleanse: reserve that target's poison removal and add its healing.
- Protect: reserve that exact living target's protection.
- Response cleanse/guard: validate current eligibility, remaining shared allowance, MP and any explicit target side; reserve the corresponding effect for living friends. Response cleanse adds no healing.
- Invalid, unavailable, wrong-side or unknown-target commands reserve nothing. Missing/dead single-support targets also reserve nothing; execution retains its existing fallback behavior rather than the planner predicting it.
- Non-support commands contribute no discarded support suggestion. First duplicate-key precedence and fixed-command identity are preserved.

Automatic support thresholds, scoring, party order, poison reservation prepass, action execution, enemy variation, RNG, stats, skills, art, effects, runtime labels, dependencies and saves are unchanged. `reservePoison:false` retains its historical context-free plan-plus-overrides behavior.

## Intentionally deferred timing problem

This does not pre-reserve later-slot fixed support or globally remove duplicate heals, cleanses or protection. With allies `[3,2,0,6,11]`, a2 at HP60, confirmed バステト healing, and マモン attacking a2 with skill1 while other enemies defend, ドリュアス's earlier fast heal remains necessary. Both heals leave a2 at HP102; suppressing the fast heal kills it before バステト acts. The candidate preserves the baseline's complete result for this counterfixture.

Later-slot support duplication needs a separately bounded, timing-aware decision. This correction only removes phantom reservations and records the actual fixed command at its existing slot.

## Verification

- Red-first engine evidence: 12 failures and 8 passes before implementation. Failures include lethal cleansing, healing, protection, overridden response, actual target selection, invalid commands and rebuilding reservations.
- Initial three UI regressions failed before implementation. The final 13-test UI suite was also rerun against a separate unmodified baseline-engine copy: 11 fail and 2 pass there.
- Final focused command coverage: 80 tests across four files. New tests add 34 engine cases and 13 UI cases. Earlier poison-only expectations that explicitly preserved the support bug were updated to require the correct next support target.
- Final aggregate: 2,399 tests across 105 files pass. Includes poison controls and frozen historical/default parity, deadline/focus/repeated-click races, playback skip, navigation, rematches and all saved-team slots.
- Fourteen rights-checker self-tests pass. Source inventory, TypeScript, production build and built-notice checks pass. The existing large-bundle advisory remains.
- Independent review found no blocker. Exact-baseline comparison passed 12,000 randomized snapshots and 2,625 complete battles, comparing full objects with no normalization, including both-side automatic plans, state, events, orders, history, logs and RNG. `reservePoison:false` mixed fixed-order controls are included. All 115 independent edge probes pass.
- The 736-match smoke report equals the baseline after excluding only source commit/hash metadata and the two reproduction command strings whose output directories differ. No gameplay/result fields were normalized.
- The isolated patch was apply-checked against the exact baseline tree. Its review did not publish or deploy; publication is handled by the separately authorized v0.20.4 release workflow.

These are implementation-stage engine and DOM checks. Rendered-browser and public-deployment acceptance were not performed at that stage; they are separate release checks. No claim is made about improved win rates, player comprehension, device performance or new gameplay balance.

## Origin and rights scope

Implementation, tests and this note were written directly for this project with AI assistance using the existing source and reproduced defect. No external code, articles, illustrations, music, fonts, animation samples, archived content or extracted game materials were imported. There are no art, dependency, license-text or public-asset changes. The change is recorded under `effects-ui-text` in the rights inventory.

Automated inventory checks do not settle copyright, expression similarity, trademark, patent, ownership or professional-review questions. Existing review items remain open. No expert/rightsholder contact, outside material sharing, new agreement, fee or project-wide license is included.
