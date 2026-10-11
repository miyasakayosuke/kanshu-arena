# Lost queued action: isolated presentation candidate

Date: 2026-10-11 UTC. Not a release or publication claim.

## Exact base and scope

- Copied unchanged from `kanshu-arena-v0185-release`; the copied staged Git tree is `a516a3f300c2a4475740dbaf756df79b89e77d92`.
- Parent-supplied public v0.18.5 commit: `3724cd36134ed4982f7ca62318fc74573744fff5`. The supplied local snapshot has no original Git HEAD; the isolated baseline commit is `b9c29ff1467dc3129e6597dbfff84d33915621b7`, with exactly the source tree above. It is a local snapshot identity, not the public commit.
- Only result insight selection/validation, tests, and this candidate's provenance change. The existing `BattleResult` evidence expansion and buttons need no production component change.
- Engine, AI, stats, roster, skills, family rules, timing, animation/art, CSS, saves, dependencies, package version, release manifests and historical balance evidence remain unchanged.

## Observation and evidence

The generalized `lost-action` observation replaces `missed-heal`. Existing accepted allied healing cases remain covered; attacks, delayed attacks, zero-heal cleanse, MP supply and both Janus responses now qualify too. This is an intentional shift from the old enemy-inclusive heal observation to one prioritized ALLY queued-action observation. Enemy and ally aggregate observations retain their prior ordering in the remaining two slots. No more than three rows are returned.

Example, derived from the test's authoritative records:

> TURN 2：味方1 バステトは「清めの鈴」の発動前に戦闘不能。それまでの発動記録：1回。

Selection is deterministic: earliest qualifying recorded turn, then original accepted-order index. Side and slot labels distinguish mirror names. The count is actual earlier cast events, including normal attacks and guards, once per complete queued action. Multi-hit damage events and automatic material repair are not actions. Expandable evidence contains the earlier accepted orders, before-action / cast / action-end indexes, and the lost action's accepted order, defeat, before-action and action-end indexes.

This describes a recorded unexecuted command. It does not claim that the lost action caused the defeat, would have succeeded otherwise, or identifies a winning move. It does not infer intent or count actions from final HP, remaining allowances, unused skills, roster roles or text logs.

## Conservative evidence limits

The new row requires contiguous ordered history starting at turn 1 and ending at `state.turn - 1`, readable orders/events, unique accepted orders and matching complete queue phases, and exactly one authoritative cast when an action phase is present. The selected ally must have a recorded defeat before its skipped queue slot, with no cast by that actor anywhere in the lost turn. Presentation-created passive casts cannot supply evidence.

Malformed, incomplete, duplicate, out-of-order or truncated histories omit this observation. An absent earlier command, an earlier defeat, or an earlier accepted action with no cast also omits the row. The latter can conservatively hide a real later loss after an earlier legitimate support cancellation; it is preferable to turning incomplete evidence into a purported complete lifetime action count. Existing aggregate observations can still use readable available records.

No finite history format can detect every arbitrary removal followed by coordinated rewriting of all supporting fields. This feature consumes resolver history; it is not an authenticity/signature mechanism.

## Verification and remaining checks

- Resolver-generated multi-turn fixtures cover positive and zero-heal cleanse, attack, basic attack, guard, finite supply, both Janus responses, multi-hit plus passive repair, mirror labels and deterministic selection.
- Three competing family aggregates cannot crowd out the lost-action row.
- Negative fixtures cover rejected commands, prior/final missing history, malformed/gapped/duplicate phases and records, missing/duplicate/passive casts, successful cast then turn-end poison defeat, MP fallback cast, and defeated targets with surviving actors.
- DOM integration expands and collapses the exact indexed evidence from both turns, exercises all four result/log/retry buttons, and preserves the same-seed/random-allocation warning. Existing App play-loop tests cover actual rematch reset and skip/natural-playback equivalence.
- Final focused/full tests, rights self-tests/source/dist checks and TypeScript/build results are supplied separately with the exact candidate patch identity. The parent owns unchanged smoke comparison and actual cloud-browser QA.
- No human-comprehension playtest was performed. A later bounded human check must establish whether readers identify the lost action and earlier casts without treating this observation as a winning prescription.

## Provenance and unchanged research boundaries

The implementation and brief new count wording are newly authored AI-assisted project code/text. Only this project's supplied source and gap report were consulted; no third-party code, artwork, media, font, explanatory prose or animation sample was imported. The narrow change is recorded in `docs/rights/asset-manifest.json`. Automated rights inventory checks do not establish legal clearance; existing professional-review and similarity questions remain open.

The original mixed-counter protocol and both-policy leader screen remain failed. Later pure material/demon confirmation and Janus recommendation comparison remain separate findings. Five Janus tags still grant the same single response as four. This candidate runs no new balance sweep and makes no balance, fairness or fun claim.
