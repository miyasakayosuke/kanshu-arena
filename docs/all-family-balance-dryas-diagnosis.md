# Residual Dryas counterplay diagnosis

The original zero-impact, independent-policy counter panel still fails the required two-counter gate against Dryas. Material wins 64.84%, while demon dual-cleanse wins 55.47%; Janus wins 18.75%. These are the fixed initial 64 seeds, both physical orientations (128 games per counter). This diagnosis uses retained outcomes and four exact source-verified replays; it changes no gate or study input.

## Whole fixed counter panels

All resource numbers below are means per game. Direct HP includes the poison initial hit where enabled. Tick HP is received by the named side, once after all queued actions and before repair. Cleanses can provide useful HP healing even if poison has already been removed.

| Scale | Counter | Counter score | Turns | Counter / Dryas direct HP | Counter / Dryas poison direct HP | Counter / Dryas tick HP received | Counter / Dryas effective healing | Counter / Dryas overheal |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | material-strong | 0.00% | 3.73 | 660.09 / 1078.15 | 126.75 / 473.26 | 117.41 / 144.98 | 164.55 / 87.77 | 0.00 / 0.00 |
| 1 | demon-dual-cleanse | 0.00% | 3.01 | 555.30 / 924.12 | 0.00 / 478.26 | 90.50 / 0.00 | 65.62 / 36.95 | 0.00 / 45.16 |
| 0.5 | material-strong | 25.00% | 7.03 | 854.66 / 1078.68 | 54.37 / 157.25 | 178.62 / 142.11 | 256.08 / 115.70 | 0.00 / 0.00 |
| 0.5 | demon-dual-cleanse | 52.34% | 5.99 | 961.96 / 892.63 | 0.00 / 334.13 | 174.00 / 0.00 | 225.08 / 45.47 | 0.00 / 45.86 |
| 0 | material-strong | 64.84% | 7.97 | 963.80 / 997.68 | 0.00 / 0.00 | 176.95 / 131.97 | 258.89 / 68.95 | 0.00 / 0.00 |
| 0 | demon-dual-cleanse | 55.47% | 9.81 | 1101.03 / 970.26 | 0.00 / 0.00 | 158.65 / 0.00 | 287.23 / 119.77 | 0.19 / 45.86 |

## Zero-impact resource accounting

| Counter | Side | Poison casts / applications | Executed cleanse casts / MP | Cleanse healing / overheal | Guard HP prevented | MP spent | Deaths before turn action | Cashout / Janus response casts |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| material-strong | counter | 1.00 / 5.00 | 3.84 / 43.02 | 126.76 / 0.00 | 16.26 | 206.44 | 1.38 | 0.00 / 0.00 |
| material-strong | dryas | 2.77 / 12.23 | 0.00 / 0.00 | 0.00 / 0.00 | 5.84 | 206.05 | 1.02 | 0.00 / 0.00 |
| demon-dual-cleanse | counter | 0.00 / 0.00 | 5.38 / 64.59 | 188.39 / 0.01 | 0.00 | 238.39 | 1.52 | 0.00 / 0.00 |
| demon-dual-cleanse | dryas | 2.90 / 13.20 | 0.00 / 0.00 | 0.00 / 0.00 | 23.37 | 210.12 | 2.09 | 0.00 / 0.00 |

The zero rule removes every direct poison HP hit, but does not remove actual poison ticks or brute area damage. Against demon dual-cleanse, Dryas-side healing averages 119.77 HP with 45.86 overheal. Against material, its healing is 68.95 HP with zero overheal. Counter cleansing remains useful: demon cleanses heal 188.39 HP per game while spending 64.59 MP; calling all those actions wasted would be false. Deaths before a queued action are per-turn cancellations, not necessarily first-turn deaths. Neither fixed counter matchup has cashout or Janus response casts.

## Deliberately selected paired loss cases

Selection was the first frozen seed with a zero-impact counter loss in the a-left orientation for each fixed counter. Each was paired with its scale-1 result at the identical seed and orientation. These cases explain possible failure sequences; the complete 128-game panels above estimate frequency.

| Counter | Seed | Scale | Turns | Counter guard prevention | Dryas ward prevention | Brute actual direct HP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| material-strong | 2596169515 | 1 | 4 | 66 | 50 | 378 |
| material-strong | 2596169515 | 0 | 10 | 13 | 36 | 570 |
| demon-dual-cleanse | 4236701050 | 1 | 3 | 0 | 9 | 343 |
| demon-dual-cleanse | 4236701050 | 0 | 7 | 0 | 20 | 352 |

Ward values are reconstructed only for these four traces, using the same impact, roll, defense state, floor and HP clipping. Whole-panel ward prevention was not observed. Ward and guard are separate local marginal counterfactuals; they need not add to removing both. Actual guard reconstruction agrees with the frozen observer in all four traces.

### Demon trace: initiative and useful but late MP pressure

At zero impact, turn 2 begins with Kobold (speed 86) hitting brute from 104 to 54 HP. Dryas (67) then kills Kobold. The speed-61 tie resolves Selkie, brute, then Mammon. Brute gets its second area cast for 159 actual HP (39/38/43/39); Mammon then kills it from 54 HP. Selkie’s cleanse intended for the dead Kobold retargets Bastet. Bastet’s own cleanse subsequently lands on its already-cleansed self, but still heals 35 HP. Selkie remains poisoned and Dryas kills it before its turn-3 cleanse.

The complete zero-impact demon panel has brute die on turn 2 in all 128 games. In 64 games it casts once (20 MP), and the counter wins 51/64; in the other 64 it casts twice (40 MP), and the counter wins 20/64. Each branch contains 32 games per physical orientation. At half impact the corresponding win counts are 64/64 and 3/64. This is an observed association conditional on action count, not an isolated causal intervention.

Mammon does execute useful MP denial later: turn 3 drains Genbu 22→12, removing its 22-MP area and 20-MP heal from affordability and forcing a heal fallback; turn 4 drains Naga 20→10, forcing its 16-MP poison fallback. Dryas has already healed the 1-HP Genbu by 65 that turn. Across the zero panel, 216 pressure casts have 2,160 nominal MP loss but only 1,800 actual (65 mitigated and 295 clipped). Actual targets receive Genbu 1,472; Dryas 68; Naga 260; brute 0.

Independent read-only score reconstruction from these trace states explains targeting: on turns 1–2 pressure against brute scores 80.42 versus 83.14 for ordinary HP attack, with no affordability-crossing bonus. Turn 3 pressure on Genbu scores 91.09, and turn 4 pressure on Naga scores 85.75. It is inaccurate to say that MP denial never executes; its automatic utility becomes competitive after the early brute area window.

### Material trace: remaining damage over a longer fight

The same seed grows from four turns at scale 1 to ten turns at scale 0. Brute’s actual direct damage rises from 378 to 570 across its area, single and basic attacks because the lower initial damage changes survival and action opportunities. At zero, Genbu contributes 269 direct HP, Dryas 74, and Naga 114; Talos on the counter side contributes 518. This is a local example of nonmonotonic damage totals after a direct-poison reduction, not proof that zero impact is generally worse. The complete material panel improves from 0% at scale 1 to 64.84% at scale 0.

## Interpretation and reproducibility

Residual failure combines remaining poison ticks, brute’s area tempo, tied initiative, cleanse retargeting, healing and finite MP. These traces do not identify a single universally sufficient tuning change. The parent separately froze a leader-choice diagnostic; its results must remain separate from the failed original protocol. A static same-roster Kobold leadership change would raise Mammon 61→63 but leave it slower than Dryas 67, lose 54 total starting demon HP and alter slot/RNG assignment. Static reasoning is not a measured matchup outcome.

Machine-readable resource aggregates, trace hashes and bounded detailed records: `docs/all-family-balance-dryas-diagnosis.json` and `docs/all-family-balance-diagnosis/`. Full replay files are listed in the JSON and can be recreated with `scripts/balance-lab/replay-all-family-packed.mjs`. Selection is recorded in `docs/all-family-balance-dryas-trace-selection.json`. Complete unit ledgers preserve conditional timing denominators; no-death values remain null.

Measurement wording: legacy `cashoutLaterReapplications` counts same-turn reapplication including zero-tick cashout; actual positive-consumption cross-turn reapplication is `poisonReapplicationsAfterCashout`. The frozen CLI’s “zero-poison waste” label means zero added poison contribution, not a wholly useless base attack. No frozen source was changed for these wording clarifications.
