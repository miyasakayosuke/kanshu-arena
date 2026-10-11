# Demon family: bounded balance and MP-pressure audit

Date:2026-10-10 UTC. Playtest evidence, not a fairness certification. No production stats, skills or AI were tuned by this study.

## Main findings

- Initial pure C17 score is28.85% (120/416); mixed C15 is42.31% (176/416). Both lose every game against pure nature and almost every game against the known nature+brute28 shells. The C15 mixed result is not a same-budget pure comparison.
- The overall retained opponent pool gives pure 43.90% and eligible mixed 55.95%; these totals include lower-budget curated anchors. Against strictly C17 coherent opponents, the scores are 51.88% and 61.56%; against the separate strictly C17 mixed sample, 54.69% and 52.34%. Opponent composition strongly changes the result. There was no tuning to 50%.
- MP pressure is not a demonstrated strength under the current production policy. Disabling it improves both initial focal teams in the paired8-seed control. The weaker HP hit,16MP cost and one action are real opportunity costs. This supports investigating skill valuation, not raising resource loss blindly.
- Old nature+brute28 remains95.63–96.04% against this broader fixed pool, consistent with the earlier97–99% warning on its earlier pool. These dominant mixes are retained explicitly; new demon units did not cause that pre-existing dominance.
- A core29→brute28 replacement raises the pure shell46.14→70.22% in same-seed substitution tests. The new core is not mandatory for the strongest observed version of that shell. Replacement changes leader/stats/skills, so this is not a causal MP-only estimate.

## Frozen scope and fairness controls

- 26,920 scheduled games across9 frozen configs, plus2,624 invariant-hardening reruns and736 smoke games. Baseline/identity duplicates and mirrors are controls, not independent evidence.
- Initial:13 fixed anchors,16 seeds, both physical orientations. Five old pure families, two known dominant nature+28 shells, two strong slime mixes, guard/heal, poison/cleanse, cheap/priority pressure, and strong material. Team IDs and roles are in demon-balance-freeze.json.
- Broad:20 exact-C17 coherent opponents, four ownership strata for each old family (support, poison, breaker, cheap);8 separately reported exact-C17 rank-walk mixed opponents; the13 anchors remain. Complete eligible coherent pools were counted and hashed before outcomes, but only selected teams were battled. Member-set sampling is not uniform or optimal play.
- Seven new substitutions and five exact old/leader controls retain the same41 opponents, six seeds and both orientations. The exact-control supplement was frozen after seeing initial anchor results but before reading broad/substitution results. No teams or seeds were redrawn.
- Production autoOrders is called explicitly for both sides; no hidden future enemy orders or future-MP borrowing. Core29 retains the same all-target traversal even with mpDamage0/absent. MP utility adapts to effective mechanics, so subsequent skill/target choices and RNG draws can diverge.
- All patches are isolated and roster-wide on both sides. Starting demon membership is recomputed after family overrides; once enabled the bonus persists through ally defeats and dispels.

## Initial opponents, including adverse results

| Opponent | Pure C17 score | Mixed C15 score | Games each |
| --- | ---: | ---: | ---: |
| fullbeast | 68.75% | 87.50% | 32 |
| fullnature | 0.00% | 0.00% | 32 |
| puredragon | 50.00% | 62.50% | 32 |
| purematerial | 46.88% | 18.75% | 32 |
| pureslime | 87.50% | 84.38% | 32 |
| nature-brute-dryas | 6.25% | 0.00% | 32 |
| nature-brute-tengu | 0.00% | 0.00% | 32 |
| strong-poison | 18.75% | 40.63% | 32 |
| strong-area | 43.75% | 12.50% | 32 |
| guard-heal | 0.00% | 90.63% | 32 |
| poison-cleanse | 31.25% | 81.25% | 32 |
| priority | 18.75% | 37.50% | 32 |
| material-strong | 3.13% | 34.38% | 32 |

## MP-only controls

| Control | Pure score | Mixed score | Pure / mixed actual MP loss per game |
| --- | ---: | ---: | ---: |
| enabled | 30.77% | 43.75% | 10.48 / 12.60 |
| full-off | 34.13% | 50.48% | 0.00 / 0.00 |
| bonus-off | 32.69% | 50.00% | 2.05 / 1.96 |
| zero-base | 34.13% | 50.48% | 0.00 / 0.00 |

Each row has208games per focal team, sharing the same8 seeds. Their enabled reference is30.77% pure and43.75% mixed, not the16-seed initial headline. Full-off zeros every MP-marked base and removes the bonus; bonus-only-off retains base6. Explicit zero-base leaves the fixed bonus field present but causes no loss. Full-off and zero-base gameplay metrics agree across656candidate matches, including mirrors; optional-state traces intentionally differ.

## What the resource action actually did

| Initial metric per game | Pure | Mixed |
| --- | ---: | ---: |
| MP-attack selections | 1.46 | 1.66 |
| HP-attack selections by core | 2.12 | 1.99 |
| MP-attack actual casts | 1.26 | 1.50 |
| MP-attack own expenditure | 20.15 | 24.04 |
| Actual enemy MP loss | 10.21 | 12.20 |
| Surviving-target nominal MP budget | 12.28 | 14.16 |
| Guard/ward/floor mitigation | 0.64 | 1.18 |
| Empty/low-MP clipping waste | 1.44 | 0.78 |
| Zero-loss events | 0.03 | 0.00 |
| HP kills with no MP-loss event | 0.03 | 0.09 |

An opponent fallback occurred in36.30% of pure matches and42.79% of mixed matches. This is distinct from the focal team's own fallback count. A fallback is one free basic at the originally accepted queue position; it does not remove the action.
The core's mean MP before a pressure cast is36.53/38.18; target MP before→after actual loss is16.27→7.95 pure and18.93→10.31 mixed. These are conditional event means, not starting budgets.
Core29 starts with 64 MP and a claw costs 16 MP: at most four claws, with at most 40 nominal enemy MP removed when all four targets survive unmitigated. Current slime supply cannot restore MP to demon-family Mammon/core29. Observed maxima were3/3. No self-gain exists. Three demons plus three slimes cannot fit in five slots. A team with two demons, including core29, and three slimes can enable slime supply, but only its living slime members receive that supply; Mammon/core29 never receives it. In that lineup, the claw has base 6 only, without the three-demon bonus.
The core dies with MP remaining in81.73%/63.46% of initial matches. Its mean final MP is19.64/16.65. This is not simply universal MP exhaustion.

## Broad retained pool and strictly C17 partitions

| Focal | Curated score | Coherent exact-C17 score | Mixed exact-C17 score | Total score |
| --- | ---: | ---: | ---: | ---: |
| puredemon | 25.00% | 51.88% | 54.69% | 43.90% |
| c17-mixed | 49.52% | 61.56% | 52.34% | 55.95% |

Most adverse retained broad matchups for puredemon:
- fullnature [14,3,6,9,10]: 0.00% (0/16 wins).
- nature-brute-dryas [14,3,6,10,28]: 0.00% (0/16 wins).
- nature-brute-tengu [14,6,9,10,28]: 0.00% (0/16 wins).
- strong-poison [24,6,9,27,28]: 0.00% (0/16 wins).
- guard-heal [1,2,7,10,6]: 0.00% (0/16 wins).
- material-strong [19,20,23,7,10]: 0.00% (0/16 wins).

Most adverse retained broad matchups for c17-mixed:
- fullnature [14,3,6,9,10]: 0.00% (0/16 wins).
- nature-brute-dryas [14,3,6,10,28]: 0.00% (0/16 wins).
- nature-brute-tengu [14,6,9,10,28]: 0.00% (0/16 wins).
- coherent-nature-support [14,0,6,9,22]: 0.00% (0/16 wins).
- coherent-nature-breaker [14,3,5,10,22]: 0.00% (0/16 wins).
- coherent-nature-cheap [14,0,6,9,27]: 0.00% (0/16 wins).

Each focal has 208 curated, 320 coherent and 128 supplementary mixed games. Curated anchors span C14, C15 and C17; only the coherent and supplementary mixed partitions are strictly C17. Overall totals include those lower-budget anchors and must not be presented as equal-budget results or a universal family rating.

## Same-seed substitutions and old-unit contribution

| Change | Old score | New score | Paired difference |
| --- | ---: | ---: | ---: |
| core-nonleader | 46.14% | 42.68% | -3.46% points |
| breaker-substitute | 46.14% | 49.39% | 3.25% points |
| bonus-threshold-lost | 51.42% | 57.32% | 5.89% points |
| core-replaced | 46.14% | 70.22% | 24.09% points |
| nature-newcore | 95.63% | 73.17% | -22.46% points |
| nature-newbreaker | 96.04% | 93.50% | -2.54% points |
| material-newcleanser | 71.14% | 76.63% | 5.49% points |

Every row uses492seed/orientation/opponent pairs. Approximate seed-clustered95% intervals are retained in demon-balance-summary.json. Changing leader, membership, stats and skills is a whole-team comparison; only the explicit base/bonus controls isolate those MP parameters.
The nature-newbreaker shell remains93.50%, but its matched old Garuda6 version is96.04%. The cheap new breaker does not explain the shell’s dominance. Empusa31 raises the observed material shell71.14→76.63%, a useful targeted playtest signal rather than evidence that the whole demon family dominates.

## Contracts, failures and reproducibility

- Skill.mpDamage accepts integer0..30 only on a paid plain single-target hit. Unit.mpDamageBonus is an optional immutable starting core29 field, separately tunable0..30. Absent and explicit0 are preserved in successful and partial-failure snapshots. Full-off disables both layers; old-family opening effects and supply behavior remain intact.
- MP loss must immediately follow a surviving HP hit, match guard/ward scaling, use exact absolute target MP, remain on an opposing living target, and never carry HP/status payloads. Source actual loss equals target received loss. Every unit obeys initialMP + generatedMP − spentMP − enemyLoss = finalMP.
- The Lab reconstructs the original accepted queue using priority, opening speed and tie draws, checks exact explicit production orders, and rejects duplicate casts, forged/missing fallbacks, altered priorities, wrong basic skill, paid fallback debit, hidden MP changes and missing/duplicate resource events.
- Production fixtures cover survivor/kill/guard/ward, zero/absent fields, no self-gain, one basic fallback, same queue slot, free attacks, no hidden future orders, rejected orders not borrowing later supply, valid accepted orders rescued by earlier supply, and the four-claw finite budget. These boosted survival fixtures are contract checks, not balance-frequency evidence.
- A synthetic failure exposed an extra HP field being accepted on resource-loss. A strict event-field whitelist fixed it. The initial source and all initial results remain archived; the unchanged2,624games were rerun on the hardened source with identical outcomes, metrics and trace hashes.
- The first packer attempt exceeded its index size after producing many temporary fragments. It was replaced with lossless gzip/base64 JSON chunks; only that attempt’s superseded generated fragments were removed after preserving the raw report. No failed or unfavorable battle outcome was discarded.
- The first aggregate test invocation ran concurrently with simulations and hit two5-second timeout-only failures (529passed). A bounded serial rerun with30-second timeout passed all531tests in18files. No production behavior was changed to satisfy the tests.
- Verification: 269,200 per-unit ledgers,60 real current CLI replays,4 exact historical initial/final slime CLI replays, and736smoke games with zero identity deltas. Source/config/trace hashes are enforced. Final release-wide build/rights checks and publication remain the parent’s responsibility.

## Evidence and reproduction

- Lossless compact evidence: docs/demon-balance-packed,231 JSON files, largest64540bytes; all are≤65,000bytes. It retains every scheduled match outcome, trace hash and full unit accounting, plus configurations and all scenario/target aggregates. Full event trees remain reproducible rather than duplicated in every archive record.
- Read a logical record: node scripts/balance-lab/read-demon-packed.mjs demon-initial demon-initial/target/puredemon. Every stored and decompressed byte hash is checked.
- Run a frozen suite: node scripts/balance-lab/cli.mjs run --config configs/balance-lab/demon-broad.json --out lab-results/new-demon-broad. Replay with that CLI's documented replay command; never bypass hash mismatch.
- Exact source archive: node scripts/balance-lab/reconstruct-demon-source.mjs docs/demon-balance-source/demon-final-lab.json NEW_DIRECTORY. Earlier initial Lab source is demon-initial-v1.json. Final slime source is slime-final.json; --slime-initial reconstructs and verifies the original historical slime source using its preserved patch manifest. No production file is overwritten.
- Six hash-verified illustrative decision traces are indexed by demon-balance-decision-examples.json: zero-loss casts, forced basic fallbacks and paired pressure-on losses/off wins, on both physical orientations. Their selection is outcome-informed and illustrative, not frequency evidence.
- Reproduction index: demon-balance-freeze.json, demon-balance-control-freeze.json, demon-balance-summary.json, demon-balance-verification.json, demon-balance-archive-verification.json. The matching source hash for every suite is in its archive index.

Engine SHA-256: 569499504424a217da53a88496fbe7f9f74ccd1bbe5574ec97f4decab9754222
Families SHA-256: cc8ffa4e5503f843c8d4de20c29401a25c6f5f08ce63db41d7e5a4655369c343
Final Lab SHA-256: ff577f9013c449ffb4629d3aa3ffa997b7db9d30af48a1f543f5160ce32e32b4

## Scope limits

These are fixed CPU-policy measurements, not optimal human targeting, user enjoyment, or proof of competitive fairness. Ownership strata do not guarantee execution. Opponent pools, handfuls of seeds, overlapping teams and evidence-informed anchors constrain generalization. Preserve the adverse observations and address the known nature/poison+brute dominance in the planned all-family systemic balance wave.
