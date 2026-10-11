# Slime v0.14 balance audit

Status: adopted bounded playtest candidate E/60, core24 COST4 and brute28 COST5, supply8. Pure is usable in these CPU tests, but nature/poison dominance remains a known balance defect. This is not final all-family quality. The all-family milestone requires a same-budget matrix and an intentional system-balance wave. No human fairness, optimal-play, or rights-clearance claim. Every initial, failed-balance and exploratory outcome is retained.


## Adopted candidate and held-out final source

- Production HP for24–28:235/160/250/195/220; core fixed attack128; brute area60, MP20; core COST4/brute COST5; supply8. Pure remains C17 and provisional remains C16. Old IDs0–23 are unchanged.
- The cost-split source tested67,888 scheduled games before adoption and is byte-identical to final production. Seven fresh eight-seed suites add29,728 games, without choosing another balance target after seeing those outcomes. The final total is308,672 scheduled games across34 reports, including repeated baselines and mirrors. These are not308,672 independent tests of fairness.
- Retained35 opponents and the newly sampled24 coherent opponents are separate populations. Four maximum-MP compositions overlap. Never combine their rates into a misleading independent-population estimate.

| Final focal | Cost | Earlier final-source retained35 / new24 | Fresh held-out retained35 / new24 |
|---|---:|---:|---:|
| pureslime | 17 | 36.88% / 50.00% | 36.61% (205W/0D/560) / 45.57% (175W/0D/384) |
| provisional | 16 | 67.10% / 70.18% | 65.00% (363W/2D/560) / 69.66% (267W/1D/384) |
| c17-fist | 17 | 73.48% / 77.99% | 70.36% (394W/0D/560) / 78.39% (301W/0D/384) |
| strong-poison | 17 | 80.31% / 79.75% | 81.79% (458W/0D/560) / 80.73% (310W/0D/384) |
| strong-area | 17 | 81.52% / 81.77% | 82.68% (463W/0D/560) / 82.29% (316W/0D/384) |

The earlier pure50.00% on the new pool was not a fairness target; the fresh score45.57% illustrates seed variation. Strong mixes remain strong. Pure has conspicuous nature counterplay:

| Fresh new-pool family | Pure score | Provisional score | Strong poison | Strong area |
|---|---:|---:|---:|---:|
| beast | 56.25% | 87.50% | 79.17% | 91.67% |
| nature | 10.42% | 42.71% | 69.79% | 69.79% |
| dragon | 56.25% | 71.35% | 87.50% | 83.33% |
| material | 59.38% | 77.08% | 86.46% | 84.38% |

### Actual final resource use

| Fresh pool / target | Supply casts / selections | Turns | Initial / spent / generated MP | Remaining on survivors / defeated |
|---|---:|---:|---:|---:|
| identity / pureslime | 64.46% / 76.79% | 6.61 | 288.00 / 193.99 / 15.46 | 7.38 / 102.09 |
| identity / provisional | 60.18% / 68.04% | 5.47 | 299.00 / 200.72 / 8.86 | 14.33 / 92.81 |
| newpool / pureslime | 63.80% / 75.52% | 6.76 | 288.00 / 208.58 / 16.27 | 9.08 / 86.61 |
| newpool / provisional | 64.58% / 74.74% | 5.46 | 299.00 / 210.65 / 9.85 | 20.37 / 77.83 |

Generation is finite and reached in real production-AI games. Remaining MP on dead units cannot be spent. Supply can be tactically harmful when it replaces a more immediately useful action; a nonzero cast frequency is not proof of positive value. Exact final trace replay distinguishes the reasons: pure560 games had361consumptions,65selected-then-defeated,4battle-ended-before-cast,41never-funded-before-defeat,83funded-but-protect-preempted-until-defeat, and6preempted survivors. Provisional560 had337consumptions,22selected-then-defeated,22battle-ended-before-cast,42never-funded-before-defeat,80preempted-until-defeat, and57preempted survivors. None were unclassified.

| Final supply setting (same fresh37 opponents) | Pure score | Provisional score | Pure cast rate / generated / wasted MP |
|---|---:|---:|---:|
| supply-enabled | 40.54% | 64.78% | 59.97% / 15.11 / 0.00 |
| supply-disabled | 39.53% | 67.15% | 0.00% / 0.00 / 0.00 |
| supply-zero | 39.53% | 67.15% | 0.00% / 0.00 / 0.00 |
| supply8 | 40.54% | 64.78% | 59.97% / 15.11 / 0.00 |
| supply12 | 42.40% | 64.95% | 61.15% / 22.76 / 0.14 |

### Cost correction and existing nature dominance

E/64 to E/60 isolated four points of brute area power. Under the oldC5/C4 split, pure fell39.19→35.98%, provisional67.86→65.24%, C17fist74.28→71.37% on the same37 opponents. Strong poison82.43→78.72% and strong area83.11→81.08% used their own same twelve-seed controls. The old-core nature shell [14,3,9,10,28] stayed99.75% even at60 power. Weakening the now-usable pure roster did not solve that shell.

The final C4/C5 price split makes that exact nature shell and all six previously tested old-core+28 compositions C18. Their full historical results remain archived and labeled prior-budget evidence. Two previous coherent opponent sets also became C18 and are explicitly listed in slime-balance-budget-freeze.json. A3,360-pair equality check verifies retained same-composition combat metrics are unchanged by pricing (trace hashes include cost snapshots). No existing unit was retagged or nerfed.

Exact oldC4 substitutions on the SAME original37 opponents demonstrate both pre-existing dominance and additional new-brute gain:

| Shell replacement | Original opponents | E-valued opponents |
|---|---:|---:|
| nature-old-c4-0 | 95.69% | 93.41% |
| nature-old-c4-5 | 94.97% | 94.38% |
| nature-old-c4-7 | 86.15% | 84.46% |
| nature-old-c4-11 | 82.09% | 81.00% |
| nature-old-c4-12 | 96.62% | 95.61% |
| nature-old-c4-23 | 87.50% | 87.33% |
| nature-old-pure | 94.05% | 91.60% |

The prior new28 shell99.75% exceeds even the strongest matched old replacement95.61% under E opponents, a real additional gain atop an already dominant shell. Old nature pure is C15; it is shown explicitly, not presented as an exactC17 team.

Legal final-budget nature+brute results remain a release risk, not an omitted outlier:

| Legal C17 nature+28 | Score | W / D / games |
|---|---:|---:|
| nature-brute-dryas [14,3,6,10,28] | 96.68% | 855 / 7 / 888 |
| nature-brute-tengu [14,6,9,10,28] | 98.70% | 874 / 5 / 888 |
| nature-brute-healers [14,28,6,10,18] | 81.19% | 719 / 4 / 888 |
| nature-brute-poison-cleanse [14,28,3,6,20] | 81.53% | 724 / 0 / 888 |
| nature-brute-strip [14,28,6,8,10] | 92.85% | 822 / 5 / 888 |
| nature-brute-area [14,28,6,10,21] | 92.57% | 822 / 0 / 888 |
| nature-brute-priority [14,28,9,10,25] | 93.30% | 827 / 3 / 888 |
| nature-brute-duration [14,28,3,10,20] | 90.09% | 798 / 4 / 888 |

These use13curated+24new coherent opponents,12seeds, both sides. The eight targets were frozen from the28 legal core14+28C17/at-least-three-nature sets: two direct legal substitutions plus six role strata. The97–99% leaders are known imbalance. They cannot be compared numerically with old controls on a different pool as if the pool were matched.

The newly legal cheap-core/no-brute pool has168exactC17 eligible member sets. Six frozen role strata score13.06–54.28%; no stronger new cheap-core loophole was observed. On an exactly matched retained35-opponent pool, nature+core24 scores84.17% with no supply, while oldC4 replacement12 scores95.83%, old0/5 score93.99%/94.29%, and old pureC15 scores92.68%. This is bounded evidence, not an exhaustive optimization of every new legal team.

### Specific counters, not only aggregates

| Final fresh focal/pool | Lowest three opponent scores | Highest three opponent scores |
|---|---|---|
| pureslime/identity | area 0.00% (0W/0D/16); coherent-beast-area 0.00% (0W/0D/16); coherent-dragon-poison-cleanse 0.00% (0W/0D/16) | coherent-material-duration 100.00% (16W/0D/16); coherent-material-priority 100.00% (16W/0D/16); mixed-duration 100.00% (16W/0D/16) |
| strong-poison/identity | coherent-dragon-poison-cleanse 0.00% (0W/0D/16); fullnature 0.00% (0W/0D/16); priority 25.00% (4W/0D/16) | coherent-nature-healers 100.00% (16W/0D/16); mixed-duration 100.00% (16W/0D/16); poison-cleanse 100.00% (16W/0D/16) |
| strong-area/identity | coherent-beast-area 12.50% (2W/0D/16); fullnature 12.50% (2W/0D/16); mp-pressure 18.75% (3W/0D/16) | priority 100.00% (16W/0D/16); purematerial 100.00% (16W/0D/16); strip 100.00% (16W/0D/16) |
| pureslime/newpool | budget-beast-poison-cleanse 0.00% (0W/0D/16); budget-dragon-poison-cleanse 0.00% (0W/0D/16); budget-dragon-priority 0.00% (0W/0D/16) | budget-dragon-healers 100.00% (16W/0D/16); budget-material-duration 100.00% (16W/0D/16); budget-material-priority 100.00% (16W/0D/16) |
| strong-poison/newpool | budget-nature-priority 0.00% (0W/0D/16); budget-nature-area 18.75% (3W/0D/16); budget-beast-poison-cleanse 25.00% (4W/0D/16) | budget-nature-healers 100.00% (16W/0D/16); budget-nature-poison-cleanse 100.00% (16W/0D/16); budget-nature-strip 100.00% (16W/0D/16) |
| strong-area/newpool | budget-nature-area 0.00% (0W/0D/16); budget-dragon-priority 12.50% (2W/0D/16); budget-material-poison-cleanse 43.75% (7W/0D/16) | budget-material-healers 100.00% (16W/0D/16); budget-material-priority 100.00% (16W/0D/16); budget-nature-healers 100.00% (16W/0D/16) |

The strongest legal nature+brute [14,6,9,10,28] still wins19/24 against its lowest-scoring opponent budget-nature-area,21/24 against pure nature, and19/24 with5draws against budget-dragon-priority. These are observed losses, not dependable counters. The other leading nature+brute [14,3,6,10,28] loses9/24 to budget-nature-area and6/24 to budget-material-poison-cleanse. All per-opponent rows remain in the archive, including ties beyond the displayed three examples. The next all-family milestone needs a same-budget matrix and a deliberate system-balance pass on nature/poison, then fresh validation. This playtest result is not sufficient to mark that milestone balanced.

## Method and frozen coverage

- Both sides use shipping autoOrders and advanceWithEvents, unchanged RNG and 20-turn cap. Every configured match has fixed seeds, both physical orientations, baseline/candidate pairs, and same-team mirrors. Draws score half; they are not wins.
- Initial freeze: 70,784 scheduled matches across nine runs. Thirteen curated opponents retain original beast [12,0,2,11,13], nature [14,3,6,9,10] with triple poison, dragon [15,5,16,17,18], material [19,20,21,22,23], six prior tactical controls, and known strong/counter mixed teams. No weak random pool substitutes for these controls.
- Exact C17 coherent member-set pools are fully enumerated for core-leader/at least-three-family teams: beast615, nature444, dragon422, material422, slime432. Six distinct sets per family are selected by frozen healer, poison+cleanse, noncore strip, area, priority, and maximum-MP strata. Ownership is not execution. Opponents exclude only slime core24 and may contain other new slime members; the slime pool allows the full roster. Matches sample these pools; they do not cover every combination or leader order.
- Broad coverage keeps24 coherent old-family opponents plus16 separately reported legal rank-walk samples and all13 curated opponents. The supplementary sample is neither uniform nor assured strong. Eleven other frozen mixed slime targets are retained, including weak results. Configs, canonical/file hashes, complete rosters, pool hashes and selection methods are in slime-balance-freeze.json.
- A–D are post-baseline diagnostics, frozen separately before their own outcomes (28,928 matches): A HP220/150/235/182/205; B A+corefixed128; C A+supply12; D originalHP+corefixed128. Other stats/MP/skills unchanged. Pure/provisional face the same13curated+24coherent teams with16 paired seeds.
- E is a further post-diagnostic freeze: HP235/160/250/195/220, corefixed128, brute area64 withMP20 unchanged, supply8; amount16 is a separate comparison. The entire initial mixed cohort and six explicitly listed old-core+28 mixes are retained. These are outcome-informed experiments, not a preregistered random validation population.
- Candidate patches apply roster-wide, including opponents with slime companions. Resource-generation causal effects cannot be inferred from multi-stat replacements. Repeated baseline controls and mirrors are not independent additional evidence.
- The executor clock was approximately nine hours ahead of the authoritative UTC clock. Freeze files preserve raw executor timestamps and warn about the skew; freeze-before-run ordering and refusal to redraw are the relevant evidence.

## Lab contracts

overrides.slimeSupply accepts only enabled:boolean and amount:integer0..30. Fixed starting eligibility is recomputed after isolated family patches. Only core24 receives optional supplyReady; false after consumption/defeat differs from absence. Break events may not remove it. Untuned amount remains absent from snapshots; explicit zero remains zero. A leader stat of mp changes both maximum and initial MP for matching family only. Old leader secondary constraints remain atk/speed.

restoreMp skill validation requires ally-wide, zero MP cost and stock descriptive power; simulation amount is changed only through slimeSupply.amount. Supply remains a normal chosen learned action, not a passive or heal. Actual casts, selections and abandoned selections are separate. Each cast must consume readiness exactly once before an exact living same-side slime recipient set receives gain events. Amount/absoluteMP, full-MP clipping, maximum MP, missing/duplicate recipients, wrong side/family, revival, re-enabling, dispel, malformed state and event/state mismatch are checked. Every unit must satisfy initialMP + generatedMP − spentMP = finalMP. MP debit events must match an actual paid cast. Supply itself spends zero MP but one action.

Potential supply = amount × living recipients at the actual cast. Wasted = potential − actual gain due to full-MP clipping; neither allocates hypothetical value to dead recipients or unused allowances. Generated MP never counts as healing or a negative debit. Initial/max/peak MP and paid cast expenditure are recorded separately. CLI replay checks engine/families/Lab/config SHA-256 plus complete trace hash.

## Initial result, including failures

| Focal team | W / D / games | Score | Actual supply rate | Mean turns |
|---|---:|---:|---:|---:|
| pureslime | 8 / 0 / 832 | 0.96% | 22.24% | 4.02 |
| provisional | 162 / 0 / 832 | 19.47% | 37.26% | 4.49 |
| twoslime | 68 / 0 / 832 | 8.17% | 0.00% | 4.85 |
| core-replaced | 0 / 0 / 832 | 0.00% | 0.00% | 4.24 |
| core-nonleader | 6 / 0 / 832 | 0.72% | 34.50% | 4.17 |

Pure C17 is initially severely weak. The provisional C16 [24,25,28,2,10] is not endorsed from this result. Replacing the core also changes leader, stats and skills, so its0wins is not a supply-only experiment. The speed-leader version retains eligibility but is not stronger.

| Initial broad partition | Pure score | Provisional score | Games per target |
|---|---:|---:|---:|
| curated | 0.00% | 17.79% | 416 |
| coherent | 2.99% | 27.34% | 768 |
| supplementary | 17.58% | 40.04% | 512 |
| coherent-beast | 0.00% | 16.15% | 192 |
| coherent-nature | 0.00% | 13.54% | 192 |
| coherent-dragon | 1.04% | 35.94% | 192 |
| coherent-material | 10.94% | 43.75% | 192 |

These broad games use a different frozen seed set from the32-seed initial curated run. The stronger supplementary-random score does not override the coherent-family losses.

## Supply ablations

| Amount / enabled state | Pure score | Provisional score | Pure actual supply | Provisional actual supply |
|---|---:|---:|---:|---:|
| supply-enabled | 0.96% | 19.47% | 22.24% | 37.26% |
| supply-disabled | 0.24% | 19.89% | 0.00% | 0.00% |
| supply-zero | 0.24% | 19.89% | 0.00% | 0.00% |
| supply8 | 0.96% | 19.47% | 22.24% | 37.26% |
| supply12 | 0.48% | 19.83% | 25.24% | 38.46% |

Each focal entry has832games. Disabled and zero have identical gameplay projections across2,624candidate games including mirrors, with zero ledger errors; allowance state/events and eligibility metrics intentionally differ. Explicit enabled/default8 preserve every result metric; identity preserves full trace hashes. Zero amount is never chosen by this production AI. Supply12 alone does not solve the family weakness; using an action can reduce a mixed team’s score.

## Post-baseline sensitivities

| Candidate | Pure score (curated / coherent) | Provisional score (curated / coherent) | Pure turns | Pure spent / generated / remaining MP |
|---|---:|---:|---:|---:|
| A HP | 11.49% (8.65% / 13.02%) | 41.93% (32.69% / 46.94%) | 5.69 | 172.02 / 8.89 / 124.87 |
| B HP+128 | 14.53% (9.86% / 17.06%) | 46.45% (39.42% / 50.26%) | 5.82 | 174.24 / 9.61 / 123.37 |
| C HP+12MP | 12.84% (9.62% / 14.58%) | 42.53% (33.89% / 47.20%) | 5.68 | 173.81 / 13.63 / 127.82 |
| D 128 only | 4.65% (1.92% / 6.12%) | 30.15% (26.92% / 31.90%) | 4.49 | 147.13 / 4.62 / 145.49 |
| E supply8 | 39.19% (29.09% / 44.66%) | 67.86% (62.38% / 70.83%) | 6.56 | 195.38 / 15.39 / 108.01 |
| E supply16 | 40.96% (30.77% / 46.48%) | 67.36% (62.14% / 70.18%) | 6.54 | 201.38 / 30.70 / 117.31 |

A–D and each E pure/provisional row use1,184focal games (416curated,768coherent). These are bounded diagnostics, not optimization to a50%target. Detailed per-opponent losses, actual opponent skill execution, unit contributions, seed-paired uncertainty intervals, and resource ledgers remain in the split JSON evidence.

## What stopped supply

Original pure832games:185consumed,334died without ever reaching the exact funding threshold,146reached it but higher-priority protect choices preempted supply until defeat,167selected supply then died before executing. Original provisional832:310consumed,361never-funded-and-died,95preempted-and-died,6preempted-but-survived,55selected-then-died,5selected-but-battle-ended. These reasons come from exact trace-hash-verified decision-time replays; “never selected” was not used as a proxy for “never eligible.”

The initial pure team starts288MP, spends134.02 and generates4.41MP/game, leaving158.39MP. Of that,158.33is on defeated units and only0.06on survivors. This is principally a survival/action-delivery issue in the observed policy, not an empty resource budget. Individual survivor and defeated-unit ledgers, plus A–E decision counts, are saved separately. Protect can preempt funding even when the threshold was reached; no AI priority changes were made.

## Mixed-team risks and counterplay

| Frozen original mixed target | Initial score | E score |
|---|---:|---:|
| mixed-shield | 4.84% | 19.37% |
| mixed-healer | 3.83% | 14.75% |
| c17-fist | 27.03% | 74.89% |
| c17-shield | 13.51% | 33.67% |
| c17-healer | 13.06% | 36.82% |
| coherent-slime-healers | 5.07% | 14.19% |
| coherent-slime-poison-cleanse | 38.01% | 82.43% |
| coherent-slime-strip | 5.41% | 6.19% |
| coherent-slime-area | 30.18% | 83.11% |
| coherent-slime-priority | 0.34% | 3.38% |
| coherent-slime-duration | 2.70% | 9.80% |

Every original mixed target is retained; the initial highest sampled mix [24,6,9,27,28] is reported alongside very weak healer/priority/duration samples. Strong old material [19,20,23,7,10] and prior hard counters remain explicit opponents. Six additional E old-core+28 targets include repair-eligible material shield/healer versions and an exact bull replacement that loses material eligibility; these must not be conflated.

## Reproduction, failures and limitations

- Run: node scripts/balance-lab/cli.mjs run --config configs/balance-lab/slime-final-identity.json --out lab-results/your-new-run. Other final runs use the corresponding frozen config. Historical configs require the reconstructed historical engine and an absolute config path. Never overwrite a prior result to hide an unsuccessful candidate.
- CLI replay: use the exact source/config hashes and a match ID from the report or compact decision examples. scripts/balance-lab/verify-slime.mjs invokes real CLI replay on both orientations and verifies ledgers/control equality. Historical source can be rebuilt into a new directory using node scripts/balance-lab/reconstruct-slime-source.mjs lab-results/slime-initial-source. The bounded source-reconstruction manifest verifies all bytes against initial/final engine, family and Lab hashes; no production file is changed. Run historical configs with that reconstructed CLI, final/budget configs with the final CLI. Mismatched source is refused.
- The final lossless aggregate archive uses indexed JSON chunks under65,000bytes in docs/slime-balance-packed. node scripts/balance-lab/read-slime-packed.mjs RECORD_FILENAME reconstructs any logical former fragment and verifies hashes. The packer verifies every reconstructed pretty-JSON byte before replacing only its own superseded generated fragments. Decision evidence remains in docs/slime-balance-decisions. Full local raw reports/replays are ignored run artifacts, not enormous checked-in JSON files. Compact indexes preserve raw hashes, source hashes, all teams/seeds/schedules, all aggregated outcomes and per-opponent results; they are aggregate evidence, not lossless copies of every event.
- Preserved development failures: the first freeze attempt hit the64-character scenario-ID boundary before any suite ran, then changed only scenario identifiers without redrawing teams/seeds; an old MP-leader-invalid test was updated because MP is now supported; an over70KB summary write was split by cohort rather than dropping data. No engine balance-failure run has been discarded.
- Synthetic failure tests cover illegal/repeated credit, missing/duplicate gain/spend/cast, altered absolute MP, wrong phase/side/recipient, hidden MP changes, nondispellability and re-enabling. CLI injected failures preserve partial ready/tuned snapshots and reproduce exactly; altered or forged envelopes are rejected. Contract fixtures with boosted survival are not used as balance-frequency evidence.
- Targeted Lab plus slime historical tests passed:391 tests in15files; the216 historical material-era battles remain byte-identical in all states/events/orders/RNG. Final-source lab:smoke passed736games, with zero changed outcomes and zero paired metric deltas. The two interrupted attempts and successful authorized recovery are recorded in slime-balance-validation.json; earlier smoke is historical evidence only. Final release-wide checks remain the parent’s responsibility.
- Results reflect fixed CPU heuristics, not human enjoyment, optimal targeting, or optimal counterplay. Paired confidence intervals quantify seed variation on fixed opponents, not a population-wide fairness claim. No exact50%target, unexplored team, or universal-family-strength claim is inferred.

## Source and evidence index

- slime-supply-disabled: 5248matches; evidence slime-balance-packed/chunk-057.json (logical record slime-stage1-supply-disabled-index.json); configSHA 936e741ec50d5ce801002900b6a2424306b6697e9a1949ddecc88e3253992172
- slime-supply-zero: 5248matches; evidence slime-balance-packed/chunk-057.json (logical record slime-stage1-supply-zero-index.json); configSHA 269a0ce4fe245ad4842b90352ff23fbed8907a39994138e4ddd62a5158569975
- slime-broad: 10304matches; evidence slime-balance-packed/chunk-054.json (logical record slime-stage1-broad-index.json); configSHA e825eaecdae77456a2bc4c4b60abe0f8038764c9a1849663975d4d0ab98a3a4c
- slime-mixed-a: 12720matches; evidence slime-balance-packed/chunk-056.json (logical record slime-stage1-mixed-a-index.json); configSHA d0e1c3f7fdce741778440c28d4acf84fd200cc874943ac488e2120486faa231e
- slime-supply8: 5248matches; evidence slime-balance-packed/chunk-057.json (logical record slime-stage1-supply8-index.json); configSHA d9de35966d487232cce488297c2b4494fe6494447cbcd19ff2ade3baee962a57
- slime-supply-enabled: 5248matches; evidence slime-balance-packed/chunk-057.json (logical record slime-stage1-supply-enabled-index.json); configSHA 9029338a2d16b1388845fba8b5b55dddf7f698434a463e5504ab3313e364a713
- slime-supply12: 5248matches; evidence slime-balance-packed/chunk-057.json (logical record slime-stage1-supply12-index.json); configSHA 61437cc5bfd8f07a4ad6c7dc40e099b2465c5369a4b037ce7ab4184f4eb498b0
- slime-sensitivity-hp-supply12: 7232matches; evidence slime-balance-packed/chunk-053.json (logical record slime-sensitivity-hp-supply12-index.json); configSHA 86c18b4309ee1875f98c160a04a25b12f2dc937160c0b44c28167d6cc83f18f5
- slime-mixed-b: 10896matches; evidence slime-balance-packed/chunk-057.json (logical record slime-stage1-mixed-b-index.json); configSHA ac74936331ceb5a5a634b40998f788bad6d872ad03a66f8c27bcdce3e3412175
- slime-sensitivity-attack: 7232matches; evidence slime-balance-packed/chunk-051.json (logical record slime-sensitivity-attack-index.json); configSHA 77a7d7e3a44f456274d308bf8587cdb592403e539f0304b9f511817f9602c827
- slime-identity: 10624matches; evidence slime-balance-packed/chunk-055.json (logical record slime-stage1-identity-index.json); configSHA 32d9a6a057585372a5199abfb542dcdc0fbeab37f7c4ea422eac710dbacf19dc
- slime-sensitivity-hp: 7232matches; evidence slime-balance-packed/chunk-053.json (logical record slime-sensitivity-hp-index.json); configSHA 4f1ff527bc5f6198c70fc0076dbc99180994bbb3f6b652a487e59837f3dbbde3
- slime-sensitivity-hp-attack: 7232matches; evidence slime-balance-packed/chunk-052.json (logical record slime-sensitivity-hp-attack-index.json); configSHA e35aa9bad37ac269395dbf2054d612f06cedcb74bd90f09f8e489233082842a6
- slime-durable8: 9664matches; evidence slime-balance-packed/chunk-044.json (logical record slime-durable8-index.json); configSHA ae5086ae97a287dd430088bcb636b075424da151cf0663097181b2182fef785b
- slime-durable16: 9664matches; evidence slime-balance-packed/chunk-038.json (logical record slime-durable16-index.json); configSHA 59ffde20df9d38ca0da531bbc766fbd06d30a00e64349b5bda393d65fcc2b041
- slime-durable-oldcores: 16960matches; evidence slime-balance-packed/chunk-036.json (logical record slime-durable-oldcores-index.json); configSHA 3d2e3cbec407c55ab50ef19f47e1b73e0dce905ae882ba7d0716b101087600a7
- slime-durable-mixed-a: 12720matches; evidence slime-balance-packed/chunk-032.json (logical record slime-durable-mixed-a-index.json); configSHA 7ad240b4dafa876e9835e694d9d5f0709a5e80ab0feceaae623c6a9fe9a8207b
- slime-durable-mixed-b: 10896matches; evidence slime-balance-packed/chunk-035.json (logical record slime-durable-mixed-b-index.json); configSHA 326e48e0f382d80450be47d63e97150f8e1ce4a0f1852533afd0e5bda17fdba8
- slime-durable60: 9664matches; evidence slime-balance-packed/chunk-039.json (logical record slime-durable60-index.json); configSHA 84d7474fe5965b5382a4196668efb40537266069d5e53789f882f73e8949a1f9
- slime-durable60-oldcores: 16960matches; evidence slime-balance-packed/chunk-040.json (logical record slime-durable60-oldcores-index.json); configSHA 2978b95b100dfc25c88610e8e6212537b5d950cce5a4a72cb662cdbaef5fc608
- slime-nature-old-controls: 19392matches; evidence slime-balance-packed/chunk-048.json (logical record slime-nature-old-controls-index.json); configSHA fac4344c3a5cf6fdb8cd6418566d04ebe2c05aa338e8684894131642e3d4feec
- slime-durable60-strong: 5424matches; evidence slime-balance-packed/chunk-043.json (logical record slime-durable60-strong-index.json); configSHA 73ad4f6a211944594efb669665ddec1edc19e80e86aab41dbe6c83b3eca7aea8
- slime-budget-nature-controls: 15504matches; evidence slime-balance-packed/chunk-028.json (logical record slime-budget-nature-controls-index.json); configSHA 3e7b8bc5206b283498959cb6a20c46c273010923fbe993dfd20952eda4cd18f2
- slime-budget-previous: 13760matches; evidence slime-balance-packed/chunk-029.json (logical record slime-budget-previous-index.json); configSHA 74c5c4e5e52f3f9013e1affdd10df0d0380ce40a1c3d7b890da8f8e457228ef0
- slime-budget-cheap-core: 12720matches; evidence slime-balance-packed/chunk-026.json (logical record slime-budget-cheap-core-index.json); configSHA a19a00cb62d7e0d26a92b78913c770354746c8c9b159bc6e027f4cf5cb17d300
- slime-budget-nature-brute: 16368matches; evidence slime-balance-packed/chunk-027.json (logical record slime-budget-nature-brute-index.json); configSHA 915b68a7aa69c95688220cc0d388dce8e726e3dbe2aa713035eaf00ccfe09808
- slime-budget-previous-newpool: 9536matches; evidence slime-balance-packed/chunk-029.json (logical record slime-budget-previous-newpool-index.json); configSHA 5f052ab695ab52ec647d261f7f67b76d61ad83fa797cbde91f1ca4f9b1eaa839
- slime-final-identity: 6880matches; evidence slime-balance-packed/chunk-045.json (logical record slime-final-identity-index.json); configSHA ec663eb5b65c4c4163f6f39164802e03ca0067769f5abb4602ae5f612766e494
- slime-final-supply-enabled: 3616matches; evidence slime-balance-packed/chunk-046.json (logical record slime-final-supply-enabled-index.json); configSHA a15225ade84ba3af155ed9ef1e543bc1ee20e08a7b46e340c865814849797a8a
- slime-final-newpool: 4768matches; evidence slime-balance-packed/chunk-045.json (logical record slime-final-newpool-index.json); configSHA cb856e02a5a8079f8759703b858c08ff3deed61840aa04f1deed45240c38aeaf
- slime-final-supply-disabled: 3616matches; evidence slime-balance-packed/chunk-046.json (logical record slime-final-supply-disabled-index.json); configSHA 75939d6a217ddffd32f6788f3528c3cb768544a7fbd685b6a6021e2073fb6e22
- slime-final-supply-zero: 3616matches; evidence slime-balance-packed/chunk-046.json (logical record slime-final-supply-zero-index.json); configSHA b1620b57b9e506a6c3924d6109e3727ae8c4913fb629eeab9501c2c3471937de
- slime-final-supply8: 3616matches; evidence slime-balance-packed/chunk-048.json (logical record slime-final-supply8-index.json); configSHA f644f620440beedea73c3521e60ba5dcab94ab9e4bd2d0d6ba32ef25117f0d81
- slime-final-supply12: 3616matches; evidence slime-balance-packed/chunk-047.json (logical record slime-final-supply12-index.json); configSHA f3cd4097a794a3865cc42bed246763bf9112bff1dcd4049cbaf62d19693f6665

Initial engineSHA: b8342172b842c728ee5dd7abff6b7753dcbff4e05563e518432e3134c0eeff24
FamiliesSHA: cc8ffa4e5503f843c8d4de20c29401a25c6f5f08ce63db41d7e5a4655369c343
LabSHA: 404e23301dc0998204f1c134f9b1a7afc54979c48cb61abb8a1e8ea2ff50a98e
Source commit metadata: bc55e50efff7e20be997aa683be95b2b40e88cf9; dirty working-tree hashes are authoritative.

Final engineSHA: c655ababab9f34c112465c2a2fe2d712ce76824fe746ab98f4b4a5f375eedabc
Validation: slime-balance-validation.json; CLI replay/ledger verification: slime-balance-verification.json; cost-only check: slime-balance-cost-verification.json; historical source patch: slime-balance-source-reconstruction.json.
