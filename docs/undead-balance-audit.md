# Undead Lab: poison cashout has a measurable cost, not a balance clearance

Date: 2026-10-10 UTC. Production engine and roster were not tuned by this Lab work. Publication remains separately blocked; nothing here authorizes a release. These are bounded measurements of the existing production CPU policy, not human fairness, enjoyment, optimal play or a metagame equilibrium.

## Main findings

- Pure undead C17 `[32,4,33,34,35]` scores **37.08%** across the initial 15 anchors. Declared mixed C15 `[32,4,35,3,10]` scores **46.35%**. Those mixed-budget aggregates are descriptive only: against the 10 exact-C17 anchors the scores are **35.63% / 36.72%**; against five lower-budget anchors **40.00% / 65.63%**. Each initial target has 480 baseline matchups, using 16 frozen seeds and both physical assignments. Score is wins plus half draws divided by games, not win rate.
- Both initial targets score **0% against both strong nature+28 C17 variants**. Against old pure nature `[14,3,6,9,10]`, pure undead scores 0% and mixed undead 6.25%. No adverse opponent, seed, outcome or trace hash was removed.
- In the separate 28-opponent exact-C17 panel, pure undead scores **59.15%** and the preserved triple-poison C17 shell `[32,4,33,3,10]` **80.58%**, 448 baseline matchups each. Changing the comparison pool substantially changes the headline rate. This is not evidence that every undead construction is either uniformly weak or uniformly dominant.
- In the explicit shared-eight-seed ablations, pure undead remains **37.08%** enabled, bonus-off and full-off. Mixed C15 scores **46.46% enabled → 48.13% bonus-off → 48.96% full-off**. The full-off candidate consumes zero ticks and adds zero cashout damage in every saved game. It retains the paid ordinary hit, all other poison abilities, and core32's production public-state decision policy. The aggregate full-off paired change is +1.25 percentage points, approximate seed-clustered 95% interval −1.94 to +4.44 points; bonus-off is +0.83 points, interval −3.87 to +5.53. These small panels do not establish a general benefit from disabling the feature.
- Known dominant nature poison remains a separate system-level problem reserved for the final intentional balance wave. Prior cohorts reached roughly **95–99%**, retained in the [demon audit](demon-balance-audit.md) and earlier evidence. In this new exact-C17 panel the unchanged two nature+28 controls score **90.77% / 94.35%**. Different pools are not interchangeable. Replacing28 with32 reduces them to **63.99% / 71.73%**; this is a whole-unit substitution, not isolated cashout causality.

[Compact summary and paired comparisons](undead-balance-summary.json) · [Frozen inputs, roles, seeds and hashes](undead-balance-freeze.json) · [Complete verification](undead-balance-verification.json)

## What actually happened at impact

Initial panel, per game, stock baseline. These counts concern actual casts and impacts, not merely selected orders.

| Metric | Pure C17 | Mixed C15 |
|---|---:|---:|
| Cashout selections | 1.615 | 1.608 |
| Actual cashout-capable casts | 1.469 | 1.440 |
| MP paid for those casts | 26.438 | 25.913 |
| Zero-poison cashout impacts | 0.496 | 0.148 |
| Actual poison ticks consumed | 2.642 | 3.540 |
| Unmitigated addition to hit basis | 58.117 | 77.871 |
| Addition after protection, before roll/floor/clipping | 55.678 | 74.566 |
| Actual added HP damage, same target/roll/protection | 38.267 | 29.083 |
| Nominal future poison represented by consumed ticks | 30.790 | 41.700 |
| Lethal cashout hits | 0.592 | 1.133 |
| Lethal hits needing the addition under that same roll | 0.298 | 1.046 |
| Cashout kills before target's queue slot began | 0.058 | 0.329 |
| Later same-turn poison applications after cashout | 0 | 0.115 |
| Core MP remaining at terminal state | 20.500 | 19.525 |
| Core death with positive MP | 75.42% | 64.58% |
| Mean kill turn, conditional on a cashout kill | 2.327 | 2.384 |

[Pure details](undead-balance-summary-runs/undead-initial-pureundead.json) · [Mixed details](undead-balance-summary-runs/undead-initial-mixedundead.json)

Selections and casts count the marked paid skill even under a base-zero/full-off control. Cashout events count only a positive effective coefficient; a zero-poison impact still emits one event with zero consumption/addition. Later poison applications are reconstructed from ordered target events after that impact, not inferred from skill ownership or total poisonApplications.

“Actual added HP damage” subtracts the HP-clipped damage of the same actual hit without the addition, using the exact same target HP, protection, random roll and floor. It is a local arithmetic attribution, not a rerun of the battle without cashout. Future decisions, targets and RNG streams may diverge under an ablation.

“Nominal future poison” is consumed ticks × floor(target maximum HP × 6%). It is not guaranteed future damage and must not be subtracted from actual damage as if both quantities were realized: the target might die, be cleansed, or be poisoned again. Overkill consumption can have zero marginal HP damage, while its nominal future ticks were already unrealizable because the ordinary strike kills. The report preserves both numbers without inventing net benefit.

The C17 triple-poison shell has 0.252 later poison applications after cashout per game in the broad panel. This observer count includes zero-tick exchanges and counts the first later poison event for that target in the same turn; it is not a count of effective refreshes or future damage. Its slow Naga can apply new paid poison after the core consumes existing poison. That adverse interaction is deliberately retained. Neither the Lab nor the report pretends the old ticks survive consumption.

Core32 starts with62MP and pays18 for the exchange, allowing at most three cashout-capable casts; ordinary MP10 strikes compete for the same budget. Initial observed maximum was two, not three. All scheduled core32 records respect the finite limit. A five-slot team cannot simultaneously qualify three undead and three slimes; base-only32 may coexist with a slime-supply core in other legal teams, but only slime members receive that supply and core32 never does. No HP or MP recovery is credited to cashout.

## Legal replacements and team cost

The exact-C17 replacement panel has 336 baseline matchups per focal team: six shared seeds, both sides, the same 28 opponents. These are changes to whole kits, leaders and sometimes family thresholds; they do not isolate the passive bonus.

| Same-cost focal team | Score |
|---|---:|
| Pure undead control | 59.82% |
| Same members, Banshee leader and core nonleader | 40.18% |
| Brute28 replaces core32 | 58.04% |
| Demon29 replaces core32 | 37.50% |
| Cleaner20 replaces healer35 | 67.41% |
| Selkie7 replaces breaker33 | 34.82% |
| C17 triple-poison eligible shell | 81.25% |
| Selkie7 replaces33, leaving only two undead | 59.52% |

The core-nonleader still receives its opening bonus. Its different result is not evidence that the bonus requires leadership: Banshee's attack leader replaces the core's undead HP leader. The C17 threshold-loss comparison also exchanges a breaker for a healer/cleanser, so its −21.73 point result cannot be attributed entirely to losing eight damage per poison tick.

Old-family substitutions likewise vary: material's strong shell scores64.29%, new breaker33 forSelkie7 reaches73.21%; pure material55.65%, new shield34 variant50.00%, healer35 variant33.93%. Nature-new-healer reaches79.46% versus its Dryas control90.77%. The original material repair, slime supply, dragon charge and demon pressure contracts remain intact.

The lower-budget panel is separate: 80 matchups per C15 target against five lower-budget anchors. Initial mixed C15 scores62.50%; replacing35 with cleaner20, losing the undead threshold, scores76.25%; replacing core32 with brute28 scores80.00%. Losing eligibility is not automatically a net loss after a useful whole-unit replacement. These values are not pooled into exact-C17 summaries.

Every paired replacement and its seed-clustered interval is in [the summary](undead-balance-summary.json). Fixed six/eight-seed intervals are diagnostics, with correlated matchups and deliberately selected controls, not broad population guarantees.

## Frozen scope and physical-side diagnostics

The [generator](../scripts/balance-lab/freeze-undead-configs.mjs) wrote eight immutable configs before study outcomes:

| Suite | Scheduled games, all controls included |
|---|---:|
| Initial,16 seeds | 3,008 |
| Explicit enabled,8 seeds | 1,504 |
| Bonus-off,8 shared seeds | 1,504 |
| Full-off,8 shared seeds | 1,504 |
| Exact-C17 broad | 2,752 |
| Exact-C17 substitutions | 6,240 |
| Old-core/new-unit contributions | 7,632 |
| Lower-budget panel | 736 |
| Total | **24,880** |

Counts include both baseline and candidate, both physical orientations and every listed team's mirrors. Repeated identity baselines remain in the denominator of executed work; they are not independent new observations. Eighteen coherent exact-C17 old-roster controls use three frozen skill-ownership strata for each of six families. New undead IDs are excluded from that opponent pool. Ownership is not proof a skill was selected or executed. Enumeration/shuffling is bounded and is not an optimization sweep or a uniform metagame claim.

A single seed42 pure-versus-pure-nature instrumentation probe was seen before final freeze and is disclosed in the freeze manifest. It was a loss with an overkill cashout, not used to choose any member or seed. Before the study, the parent restored the explicit demon-core exclusion in the default-CPU variety branch. Both-side explicit Lab behavior was unchanged; the repaired engine hash is recorded below.

Production autoOrders is called explicitly for each side using only public current state. Ablations preserve the core32 policy but its effective cashout utility changes, so chosen skills/targets and later random streams can diverge. Swapped team-A mirror score is50% by construction and supplies no side-quality evidence. Actual physical-allies mirror score varies from39.69% to54.23% across these small frozen cohorts. That observed side-assignment sensitivity is retained, not described as fairness or tuned away.

## Strict isolated observer and failure evidence

The Lab accepts only `undeadCashout: { enabled?, base?, bonus? }` with boolean enabled and integer base/bonus0–30. Family eligibility is derived from the patched original starting roster, requires core32 plus at least three total undead, is independent of leader position and does not disappear when allies die. A skill-level field is accepted only on a paid ordinary single hit: no area/random hit, fixed damage, guard-breaking, MP damage, finisher, or support effect. Unknown fields, malformed values and unsupported combinations fail before a scheduled game runs.

Base0 or an absent skill field disables both addition and consumption, even when a stale bonus exists. Bonus0 keeps base14 and consumption. Full-off makes each marked skill's base0 and removes the eligible unit bonus. Effective per-tick addition is capped30.

For each actual cashout the observer:

1. Reads the actual living impact target's current poison after prior poison, cleanse, defeat/retarget and protection events; requires integer consumed0–3 and exact bounded coefficient/addition.
2. Requires one paid cast/debit, one matching single consumption and immediate direct hit, with no second cast or HP/MP recovery.
3. Reconstructs every direct-damage RNG draw from the accepted original action queue, including barrage targeting draws. Verifies cashout's exact roll, guard/ward mitigation, floor and HP clipping.
4. Requires lethal damage's immediate matching defeat/reset event. This last observer-only check is current-v2 hardening; study-v1 is preserved exactly.
5. Checks immutable bonus, poison state and complete per-unit HP/MP conservation. Existing pressure/fallback, supply, repair and charge checks remain in force.
6. Distinguishes before-hit cleanse, later Naga reapplication, target changes and MP-drain basic fallback. The fallback retains its original queue slot, pays no abandoned MP18 cost and leaves the target's poison for normal end-of-turn ticking.

Malformed and partial-failure tests retain initial state, active attempt, accepted orders, full failing events, last valid state, RNG and bonus snapshots. CLI replay rejects changed engine/family/Lab/config hashes, trace hashes and modified failure requests. Failure fixtures include missing/duplicated/misordered consumption, wrong ticks/coefficient/addition, hidden HP/MP gains, lethal evidence corruption and wrong fallback casts.

Terminal validation: **627 tests in22 files pass**, including all predecessor Lab contracts plus undead engine/playback and four explicit observer timing fixtures. Current-worktree smoke: **736 games**, zero identity changes. An earlier study-v1 smoke also ran736 games; both are validation overhead, separate from the24,880 scheduled study outcomes. [Validation record](undead-balance-validation.json) · [Test log](undead-balance-tests.txt) · [Smoke log](undead-balance-smoke.txt)

## Hash-verified illustrations

These were chosen after outcomes to show real mechanisms, not as a representative sample. Each file contains a source-linked match/trace hash, exact request, one complete illustrative turn, its event hash, impact arithmetic and full-battle replay command. Full event trees for every match are regenerated from archived source rather than copied repeatedly.

- [Worthwhile left-side kill](undead-balance-decision-1.json): target105HP, three consumed ticks, roll1.05; ordinary same-roll hit67, actual hit105, added38 makes that hit lethal. The target had already acted, so this example is not a preemptive kill.
- [Right-side counterpart](undead-balance-decision-2.json): the same local arithmetic is verified on the physical right.
- [Zero-poison waste](undead-balance-decision-3.json): target has0 ticks at impact; MP18 cast does58 damage and adds0.
- [Overkill](undead-balance-decision-4.json): target16HP, two ticks consumed; ordinary same-roll damage already clips to16, marginal added damage0.
- [Lost future-poison opportunity](undead-balance-decision-5.json): guarded target94HP, two ticks worth nominal30; direct hit51 leaves43, while actual addition contributes21. Whether the unconsumed ticks would really occur is not asserted.
- [Slow Naga after consumption](undead-balance-decision-6.json): two ticks consumed, target survives56HP, then Naga's separate paid action reapplies poison. This is preserved as an exploit candidate for the later system-balance wave.

[Illustration index with exact raw hashes](undead-balance-decision-examples.json)

## Compact complete evidence and reconstruction

- [Initial resource templates](undead-balance-initial-resources/index.json) give the exact initial HP/MP, maxima and optional support fields for every frozen team/variant, with source and raw-file hashes. All248,800 compact outcome ledgers were additionally checked against these templates for both HP and MP conservation; no battle turns were rerun for that check.
- [Packed outcomes/ledgers](undead-balance-packed/) retain **every scheduled outcome, trace hash and full ten-unit resource ledger**, plus source/config/schedule/summary records. No losing or adverse output was dropped. Each lossless gzip-base64 chunk is at most65,000 bytes and records both exact decompressed-byte and gzip-byte hashes; the index also hashes the complete wrapper bytes and original raw report. The maximum observed evidence chunk is63,151 bytes.
- [Before-Lab source](undead-balance-source/undead-before-lab.json) was saved before modifying the predecessor Lab: exact engine, families, core and CLI;63,071 bytes total. Existing demon source/evidence archives remain untouched.
- [Study-v1 source index](undead-balance-source/undead-study-v1-index.json) reconstructs the exact source that generated all24,880 study reports. Engine SHA256: `3522c3dddad392e8947ec85821e039dabf6ce1369778017545e7661d1b8bc84d`.
- [Current-v2 source index](undead-balance-source/undead-current-v2-index.json) includes only the additional mandatory lethal/defeat observer invariant. No simulation outcome, metric formula, engine value, AI policy or config changed. The original reports were retained rather than silently relabelled.
- [Verification](undead-balance-verification.json) checks all248,800 unit ledgers, all scheduled IDs, frozen input hashes, every packed record/hash and32 real archived-source CLI replays on both sides and both variants. The same32 complete traces and unit ledgers also match under the hardened current observer. This is selected hardened replay coverage, not a claim that all24,880 games were rerun under v2.
- [Source reconstruction verification](undead-balance-source-verification.json) verifies the before/study/current source snapshots and a genuine historical demon-full-off CLI replay using its old source. Thus prior demon evidence remains executable after the new Lab imports and fields.

Example, run from the repository root with Node22.18+ or24; destination must not already exist:

```sh
node scripts/balance-lab/reconstruct-undead-source.mjs docs/undead-balance-source/undead-study-v1-index.json /tmp/undead-study-source
node scripts/balance-lab/read-undead-packed.mjs undead-initial
node scripts/balance-lab/replay-undead-packed.mjs undead-initial f1-o1__s2887046071__a-right__baseline /tmp/undead-replay.json /tmp/undead-study-source
```

The archived CLI verifies exact engine/family/Lab/config fingerprints and full trace hash before reporting success. Current CLI intentionally rejects the older Lab fingerprint; use the archived study source for its stored reports. Source archives contain project source only, not dependencies or third-party research/art. Rights checks remain an inventory safeguard, not legal clearance.

## Decision

Retain the implementation's current14+8 starting values for the continuing all-family development wave; this report does not propose numerical tuning or a pass/fail threshold. It establishes a bounded, replayable starting point with concrete poison opportunity costs, finite MP, legal substitutions and adverse slow-Naga interactions. Keep the strong nature/poison problem visible for the planned final intentional system-balance pass. Publication and any broader product decision remain separate.
