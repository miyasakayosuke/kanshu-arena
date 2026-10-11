# Extraordinary Lab: a useful response does not make every mixed recommendation viable

Date: 2026-10-10 UTC. The production Janus engine and roster were not tuned. This is a completed bounded measurement and resource/replay audit, **not balance clearance or release permission**. The previously cancelled publication remains separately blocked. Human enjoyment, optimal play and metagame equilibrium are not established here.

## Main findings, including weak recommendations

The initial panel has 512 baseline matchups per target: 16 frozen seeds, both physical assignments, 11 exact-C17 anchors and five lower-budget anchors. Score means wins plus half draws divided by games.

| Frozen target | Cost | All listed opponents | Exact-C17 opponents (352 games) | Lower-budget opponents (160 games) |
|---|---:|---:|---:|---:|
| Initial C17 | 17 | 3.52% | 5.11% | 0.00% |
| Healer C16 | 16 | 27.93% | 26.70% | 30.63% |
| Adverse poison C15 | 15 | 47.46% | 46.02% | 50.63% |
| Ward C16 | 16 | 3.52% | 5.11% | 0.00% |

- Main [36,12,2,30,26] and ward [36,14,10,20,35] remain **unresolved weak recommendations**: 5.11% against the exact-C17 anchors, with no wins against any lower-budget anchor in this panel. These unfavorable cells were not replaced or hidden.
- Main, healer and ward targets all score 0% against both known nature+28 C17 shells and old pure nature C15. The adverse triple-poison C15 [36,4,3,10,30] scores 9.38% / 6.25% against those nature+28 shells and 25.00% against pure nature. The poison-system problem was not claimed solved by one response.
- The separate 25-opponent exact-C17 broad panel has 400 baseline matchups per target. The original main scores **12.00%**, while the separately pre-frozen five-family [36,12,4,20,26] scores **59.75%**. This replaces Bastet's kit with Banshee poison and Kobold's kit with Karakasa cleanse, among other roster effects. Four and five tags grant exactly the same single allowance. The difference cannot be called a fifth-family response upgrade.
- The same-member nonleader control still receives its allowance. The three-tag lineup receives none, yet scores 50% in the substitution panel because its whole composition is different. These results expose composition and production-policy interactions, not innate Janus superiority or monotonic family-count strength.

[Summary index](extraordinary-balance-summary.json) · [Frozen input hashes](extraordinary-balance-freeze.json) · [Every ledger and replay verification](extraordinary-balance-verification.json)

## Explicit enabled/off controls and opportunity cost

Enabled reconstructs exactly the stock units, behavior and per-unit metrics for every paired match. Its trace hash can differ from the empty-overrides baseline because the isolated Lab intentionally labels its initial log; this is not a gameplay difference. Off only removes the initial shared response allowance. Core 36 keeps its fixed public-state policy branch, with normal attacks available. Both sides receive the same override; no new target policy is substituted.

Each below has 256 baseline and 256 off-candidate matchups, the same first eight seeds and all 16 listed opponents. These aggregates retain their unequal target/opponent budgets and are **not pooled equal-budget evidence**.

| Target | Stock | Response off | Off minus stock | Approximate seed-clustered 95% interval |
|---|---:|---:|---:|---:|
| Initial C17 | 3.91% | 1.56% | -2.34 points | -4.26 to -0.42 points |
| Healer C16 | 26.17% | 24.61% | -1.56 points | -5.04 to 1.91 points |
| Adverse poison C15 | 50.00% | 41.02% | -8.98 points | -11.92 to -6.05 points |
| Ward C16 | 6.25% | 2.34% | -3.91 points | -6.15 to -1.66 points |

Against only the exact-C17 anchors, off-minus-stock changes are −3.41, −0.57, −10.80 and −5.68 points respectively. The overall listed-panel allowance benefit is 4.20 points; small eight-seed intervals describe this selected panel, not a population guarantee. Using the allowance can be locally useful while the overall recommendation remains poor. Common initial seeds do not preserve per-action RNG draws after the decisions diverge.

The fixed 300-game-per-target exact-C17 substitution panel uses six shared seeds, both sides and the same 25 opponents:

| Target | Score | Difference from original main |
|---|---:|---:|
| Original Janus main | 11.00% | 0.00 points |
| janus-nonleader | 10.33% | -0.67 points |
| janus-three-c17 | 50.00% | 39.00 points |
| janus-five-c17 | 60.00% | 49.00 points |
| replace36-with14 | 0.33% | -10.67 points |
| replace36-with15 | 7.00% | -4.00 points |
| replace36-with19 | 6.33% | -4.67 points |
| replace36-with28 | 26.00% | 15.00 points |
| replace36-with29 | 6.67% | -4.33 points |
| replace36-with32 | 6.00% | -5.00 points |

C5 brute 28 replacing 36 improves this shell by 15.00 points (approximate fixed-panel seed-clustered interval +5.57 to +24.43). Other C5 replacements do not fix it; their scores span 0.33–7.00%. This establishes an opportunity cost for Janus **within this frozen shell/policy/opponent panel**, including different stats, leader, skills and family distribution. It does not isolate one skill, prove all Janus teams inferior, or distinguish optimal sequencing from limitations of production autoOrders. Five-tag and three-tag whole-team changes are even more confounded. [All paired comparisons and limits](extraordinary-balance-substitution-comparisons.json).

No parameter was tuned toward 50%, no initial member was swapped after results, and no extra broad sweep was performed. Systemic poison tests are reserved for the separate frozen all-family study.

## Actual response use and finite resources

Initial stock panel means per match. Applications are actual accepted casts/impacts, not merely skill ownership.

| Metric | Main C17 | Healer C16 | Poison C15 | Ward C16 |
|---|---:|---:|---:|---:|
| Selections | 0.742 | 0.637 | 0.729 | 0.695 |
| Cleanse casts | 0.170 | 0.053 | 0.068 | 0.430 |
| Guard casts | 0.504 | 0.582 | 0.654 | 0.227 |
| Withheld turns while ready | 1.842 | 2.098 | 1.855 | 1.777 |
| Selected response cancelled before cast | 0.068 | 0.002 | 0.006 | 0.039 |
| Core dies with unused allowance | 0.322 | 0.311 | 0.246 | 0.336 |
| Current poison ticks removed | 1.547 | 0.391 | 0.537 | 4.115 |
| Nominal future poison represented | 18.746 | 4.424 | 6.037 | 50.842 |
| First later reapplications after actual clear | 0.539 | 0.119 | 0.137 | 1.285 |
| Newly guarded direct-hit interactions | 5.254 | 4.625 | 4.936 | 2.352 |
| Local exact same-impact HP saved | 71.490 | 62.055 | 78.855 | 32.697 |
| Guard stripped recipients | 0.066 | 0.066 | 0.074 | 0.051 |
| Guard casts with no attributable hit | 0.000 | 0.041 | 0.088 | 0.000 |
| Core MP remaining at terminal state | 20.324 | 19.348 | 18.313 | 19.945 |
| Core dead with positive MP / 512 games | 500 | 413 | 344 | 502 |

The initial panel has zero no-effect-at-action-time cancellations and zero response drain fallbacks; this absence was retained. Dedicated explicitly synthetic fixtures validate both, including preserved payment/use, original queue position and both physical sides. Rejected same-policy orders are fatal Lab failures with the complete attempted orders/events/snapshots saved; successful scheduled runs therefore have zero rejected selections. Non-effect cancellation is distinct from dying before the selected action or having no remaining enemy when the slot arrives.

Janus starts 58 MP, pays 24 MP once for either response, and could afford at most three further 10 MP strikes from the remaining 34 MP absent previous spending. Choosing the response replaces one ordinary action; it is not free damage prevention. Remaining MP and deaths with unused resources must not be interpreted as proof of optimal or wasteful play without the actual timing.

Four distinct starting assigned tags, including Janus itself, in five slots cannot coexist with another three-member same-family core threshold. Existing nature ward can still support a two-nature mixed party where its own contract permits. Janus is extraordinary rather than slime, and naturally receives no slime-supply MP. Injected resource-rescue/defensive fixtures are regression tests, **not legal balance evidence**. No response heals HP, revives, creates MP, grants poison immunity, or resets on a later KO/revive-like injection.

### Measurement definitions that matter

- **Cleared ticks** are current poison on living own recipients immediately before the absolute poison 0 impacts. Already-clean recipients have no fabricated benefit.
- **Nominal poison potential** is removed ticks × floor(recipient maximum HP × 6%). It is not prevented future HP. Subsequent death, other cleanse, healing and reapplication can change all future outcomes. The observer counts the first later poison application after each actual clear, including later turns; it does not claim how much future poison damage that application causes.
- **Guard local HP saved** reconstructs the same actual hit twice: original captured cast basis plus any actual cashout addition, the same queue-derived RNG stream and roll, current other ward/strip state, floor, minimum damage and actual pre-hit HP clipping, with and without guard. Only a newly guarded response recipient is credited until strip, expiry or another guard application; already-guarded targets do not get an extra layer. This conservative attribution can omit value shared with a later guard. It is not a full alternate-battle simulation.
- A guard hit count can save zero HP because stronger ward or HP clipping already determines the result. Separate synthetic tests prove this with 80% ward and 1 HP clipping. Never double observed clipped HP or equate counts to prevention.
- **Guard no-hit cast** means no attributable protected hit; it does not always mean no enemy attack. The explicitly selected wasted-guard trace below uses the stricter condition of zero enemy direct hits at all after the cast that turn.
- Low observed poison HP can itself be caused by forcing a cleanse action instead of useful healing. A low-damage cleanse is not automatically waste. Janus's own pure cleanse restores zero HP, and its consumed action/MP must remain visible.

## Verified compact decision examples

[Indexed examples](extraordinary-balance-decision-examples.json) are post-outcome illustrations selected by stated conditions from the frozen schedule, not additional independent samples. Every example has a verified full-match trace hash, source/config identity and exact CLI replay command.

1. [Useful clear and later poison](extraordinary-balance-decision-1.json): turn 2 removes 12 current ticks, nominal 144 potential HP. Three later reapplications show that clearing is not immunity.
2. [Useful guard](extraordinary-balance-decision-2.json): turn 3 saves 31 local same-impact HP, while normal strip removes guard from three recipients. Benefits and counters coexist.
3. [Genuinely wasted guard](extraordinary-balance-decision-3.json): healer C16 versus guard/heal C14, turn 4, pays 24 MP and one action; zero enemy direct hits follow before expiry. Local prevention is 0 even though the battle is later won.
4. [Stripped guard](extraordinary-balance-decision-4.json): the same useful-guard match exposes the three precise strip boundaries; it is deliberately not counted as a separate independent example.
5. [Action and MP opportunity cost](extraordinary-balance-decision-5.json): an affordable 10 MP normal hit is available when the 24 MP response is chosen; the guarded interactions save 295 local HP and later turns contain free actions. The ordinary attack basis is shown as an available alternative, not as damage guaranteed in a diverged battle.

The strong guard example does not rescue weak aggregate results. The wasted example does not establish that every guard should be disabled.

## Frozen scope, source and reproduction

| Suite | Scheduled games including both variants, side swaps and mirrors |
|---|---:|
| Initial,16 seeds | 5,376 |
| Explicit stock-enabled,8 seeds | 2,688 |
| Response-off,8 seeds | 2,688 |
| Exact-C17 broad,8 seeds | 2,464 |
| Exact-C17 substitutions,6 seeds | 6,840 |
| **Total** | **20,056** |

Broad opponents are 11 fixed exact-C17 anchors plus 14 seeded coherent old 36 teams (support/poison ownership strata for each of seven families). Full legal C17 core-led, at-least-three-family sets were enumerated then shuffled with the frozen seed; two distinct strata selected per family. This is bounded diagnostic coverage, not uniform metagame sampling. Both original nature+28 shells, strong material, MP pressure, slime, poison and cleanse controls remain in their declared cohorts. Original lower-budget anchors are reported separately.

Stock physical-left mirror scores: initial 52.03%, enabled/off-baseline 56.25%, broad 50.23%, substitutions 47.14%; off-candidate 55.94%. Small mirror panels fluctuate. Swapped team-A mirror score is 50% by construction and is not evidence of fairness. All identity baselines and repeated explicit-enabled controls count in the scheduled 20,056, but are not independent samples.

- Engine SHA256: 65a9f6fb4cb1fa04d6af0d0258bf0bfd77d82f983951751eccb09e95d2bd265b
- Families SHA256: 9843608be0d2bb3385ad989898e29bb016ba25d314030768e66449072a57a516
- Lab core SHA256: 410e2efb9233590586c4ae4983672289d6dcfa8c18f4408b784cb865536c6b99
- CLI SHA256: e2300a9097d18ad75f45f1c5e54e192a19f03e62f8f5c98d07e16fe62d357711
- Combined Lab fingerprint: b9f9094dab621ba4f9f8bcccaa9bb3bba6449fdb184ac736893f53784a5a1e4e

Complete [pre-extension source](extraordinary-balance-source/extraordinary-pre-extension-index.json) was archived before editing cumulative Lab. Complete [frozen study source](extraordinary-balance-source/extraordinary-study-v1-index.json) was archived before simulations and remains byte-identical to current source. Archives include engine, families, core and CLI. Historical undead/demon archives and results were not overwritten.

The [verification record](extraordinary-balance-verification.json) checks **20,056 unique scheduled outcomes, 200,560 complete unit ledgers, 309 gzip/base64 chunks, maximum 62,919 bytes**. Every chunk has compressed/uncompressed/archive hashes and round-trip checks. Full events are regenerated rather than duplicated. Compact per-target/scenario summaries and every scheduled outcome/trace hash/resource ledger are retained, including all losses.

Reconstruct and replay an example without using a later changed engine:

node scripts/balance-lab/reconstruct-extraordinary-source.mjs docs/extraordinary-balance-source/extraordinary-study-v1-index.json /tmp/extraordinary-study-source
node scripts/balance-lab/replay-extraordinary-packed.mjs extraordinary-initial f2-o13__s1494441061__a-left__baseline /tmp/extraordinary-wasted-guard.json /tmp/extraordinary-study-source

The ordinary CLI blocks mismatched engine, families, Lab or config and verifies the full trace hash. Verification completed 20 current CLI replays covering every suite/variant/orientation and 4 historical archived undead/demon replays covering both sides.

Final targeted current-engine/playback plus all predecessor Lab tests: **718 tests in 26 files, all passed**. Own-worktree smoke completed terminally: **736 games, zero identity outcome changes**. TypeScript no-emit also passed before the final aggregate handoff. Parent owns full aggregate, rights/build, UI/live QA and release decisions. No gameplay/UI/art/rights/README/roadmap/release record was changed by this Lab task; nothing was staged, committed or published.
