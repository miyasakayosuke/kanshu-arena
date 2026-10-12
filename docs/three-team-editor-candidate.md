# Three-team editor implementation

Base: public v0.20.12 commit `5c7103585b9fba301059e6813e9f3542b5f32c5b`, exact tree `5890b0e123210fa758ea7fad9b769f6cef80588b`.

## Interface

- Three visible team choices, each with its own five ordered slots and rule.
- Confirmed member changes, reordering, removals and rule changes save automatically. Empty/incomplete and temporarily over-budget light-rule teams are valid editable drafts; the unchanged battle gate still requires five unique valid IDs within the selected rule budget.
- The ordinary editor shows the selected five, cost and leader. Detailed family effects and rules are closed disclosures. Promotional callouts, arrival cards, example stacks and separate manual save/call controls are removed.
- Opening a slot hides the overview and reveals the focused picker. Search, sort, filters, details, candidate confirmation, leader comparison, adjacent reorder and removal remain available. Cancel/Escape never commit the candidate. Focus returns only after the overview is visible again.

## Storage and migration

The new `kanshu-team-workshop-v2` value owns three editable teams, their selected index, a temporary draft and an optional original migration draft. The existing legacy three-slot key is left untouched. Existing current-party compatibility keys continue to reflect the active party.

1. A party matching an old saved slot selects that index.
2. An unmatched active party goes into the first unused slot without moving other saved IDs.
3. If three old saved slots are all occupied, the distinct active party remains active as a visibly labeled temporary draft. No saved slot is overwritten. Team tabs explicitly switch; a visible return action resumes that working draft. A separate disclosure retains the original migration draft.
4. Moving a temporary draft into an occupied team requires the named in-app replace/cancel confirmation. Empty slots accept it directly.
5. Trial presets use the temporary draft and preserve all three teams.
6. Valid v2 teams are salvaged individually if another v2 slot is malformed. Blocked reads fall back safely. Failed writes show an explicit warning and retain edits in this tab across app navigation; a real browser reload cannot guarantee those failed writes.
7. Valid cross-tab events synchronize only persisted state. They cannot replace session-only edits after save failure. Events during a battle are deferred so the current battle/retry retains its party; after leaving the battle the latest stored state is read. A remote rule change invalidates incompatible same-condition practice.

HomeScreen still receives the same active `team` and `rule` props. The arena start uses that same selected team. No combat, roster statistics, family eligibility, art or battle motion source is changed.

## Verification

Focused model and DOM tests cover three independent teams, empty/incomplete drafts, selection/reload, the legacy fourth-party collision, cancel/confirm overwrite, original and working draft recovery, quota failure, malformed storage, focus-restoration ordering, cross-tab failure protection, deferred battle updates, and selected-team-to-home/battle wiring. Prior family, leader, navigation and battle regression tests were updated only where old manual-save/promotional UI contracts changed.

Independent reviewer identified and requested fixes for hidden-element focus restoration, whole-book recovery from one corrupt slot, and loss of unsaved session edits on a storage event. Those paths now have explicit regression tests.

Browser/viewport screenshots are not available in this implementation environment because the established local-browser route is blocked. No alternate browser bypass was attempted. The publisher must inspect actual 320/390px and desktop layouts, native keyboard focus, repeated picker flows, and original/live save migration before acceptance.

The reviewed editor implementation is integrated with home idle animation in v0.20.13. Standalone candidate results below remain distinct from the combined release gates and postdeployment native acceptance.

## v0.20.13 integration

Combined with the separately reviewed editor/home change against exact public v0.20.12. Final versioned aggregate checks are recorded in docs/release-validation-v02013.json and docs/rights/releases/2026-10-12-v0.20.13.md. Native browser acceptance is performed after authorized deployment; the standalone raster/DOM checks above are not device acceptance.
