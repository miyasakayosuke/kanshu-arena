# v0.20.31 — Action-time player auto, bounded CPU guard correction

Status: prepared candidate; final gates and native acceptance are recorded separately. This is not a universal AI-strength, difficulty or optimal-play claim.

## User-requested scope

Player auto no longer fixes its skill/target during command entry. The engine keeps AUTO intent until the actor can act, then uses the real HP, MP, living original slots, poison and finite allowances after preceding actions. Confirmed manual commands retain their prior timing, costs, targeting and failure/fallback behavior. The UI shows おまかせ・行動時に判断, without a promised skill or recipient. Rendering does not run the decision policy.

An initial stronger scorer and a symmetric action-time CPU variant changed the beginner experience substantially. They were rejected. The subsequently approved scope improves player auto while retaining the established CPU policy/difficulty as closely as possible, correcting only its exhausted guard fixation. Opponents still choose before the turn, with their prior seeded learned-skill variation and support/core policies. Only a legal candidate pool consisting entirely of learned guards gains the free basic attack; guard stays eligible only with actual defensive utility. Empty offensive pools already had a free-attack fallback. Healthy CPU pools are not broadly reweighted.

## Priority and truthful history

Priority checkpoints descend through existing native bands. Each player-auto actor receives one fixed speed and one initiative draw. At a checkpoint it evaluates current public state: a slower selected skill means waiting without storing that skill/target; a skill whose band has arrived or passed executes now. An earlier skill may be used late, but never moves the actor back to an elapsed band. There is at most one action, no reroll and no hidden enemy-command inspection. Manual and fixed CPU actions retain their ordinary queue slots.

A completed automatic player decision records both its native priority and actual execution band. A player defeated before deciding has an undecided AUTO record, not an invented healing or attacking plan. CPU history explicitly labels its pre-turn instruction. Playback consumes the engine events and does not reconsider commands while animating. Existing seed recurrence, damage rules, resource costs, turn limit, roster/skill numbers and save format are unchanged; changed automatic choices can intentionally change later random-stream use and battle outcomes.

## Bounded heuristic

The shipping player policy retains established support preferences, evaluated only for the current actor rather than reserving imaginary future ally actions. It uses actual current guard, current poison, finite support legality and remaining match horizon. It preserves full original-roster mechanics such as Fenrir's starting-family hit bonus. Defending/protecting is valued only against living opponents still to act, with no guard/ward stacking, interception or poison-reduction claim; deliberate self-defense can remain useful. It does not solve the game or predict concealed orders.

The broad tactical scorer and the prior CPU-action-time variants remain explicit headless comparison arms, not selectable game modes or the shipping default. Lab reports name the distinct player/CPU policies; symmetric gameplay is not claimed. A clearly marked explicit-snapshot control preserves manual MP-drain/fallback corruption tests separately from automatic reconsideration.

## Evidence and unchanged controls

- Exact base: v0.20.30 commit `02033f38523840df3b7b776673502370bc759ed0`, tree `fc4a6b7a1bc38747621a75d96a071b6f246d42a6`.
- Portable test-only copies of the prior engine/families retain exact SHA-256 provenance under `tests/reference-v02030`. Historical outcome hashes/archives are not rewritten to manufacture parity. Those tests are labeled historical.
- Fully explicit commands on both sides: 144 complete games / 1,032 turns match complete state, events, history, logs and seed. An independent broader probe matches 1,449 rounds. This is manual-mechanics parity, not all-auto outcome parity.
- Independent held-state CPU comparison: 2,525 archived states / 6,650 enemy orders. All 300 healthy opening rounds remain byte-identical with concrete allied commands. The changed later choices are confined to the guard-only pool correction.
- Fixed starter seed: all three openings retain all five allies after turn1 and win. Intentional player-auto timing changes wins from 8/8/6 turns to 7/6/6. Survival/victory assertions are not relaxed.
- Current 180-game starter panel: 154/180 (85.56%) finish within 3–7 turns, mean5.67, zero first-turn allied wipes. The existing85% pacing threshold is retained as a live regression gate. Prior default panel was132/180 and mean6.69.
- Exhausted36-case cohort: guard casts818→2, longest guard streak20→1, 1,561 basic attacks and maximum12 turns. Useful defense is not blanket-disabled. Broader exhausted stress tests do not establish that all legal matches avoid turn20 judging.
- Mixed full-MP108-case cohort: physical allied/enemy wins90/18 versus92/16 previously, mean6.40 versus8.16 turns. Paired initial seeds are not identical action rolls after policies diverge. These are bounded legal-team simulations, not a population balance or enjoyment study.

Full current-policy736-match smoke checks accounting/reproducibility for its current baseline/candidate identity arms. It is deliberately not historical736-match parity. All rejected comparison arms and their results are retained in the evaluation packet. Native UI/actual interactions, phone/zoom wrapping and real-user feel remain separate publisher/user checks.
