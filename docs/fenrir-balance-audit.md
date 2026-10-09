# Fenrir combat and balance audit

## Reproduce

From the repository root, with Node.js **22.18+ or 24**:

```sh
npm ci
npm test -- --run src/fenrir.test.ts
node scripts/fenrir-balance-audit.mjs
```

The audit uses native TypeScript stripping and no extra package. It rewrites
[`fenrir-balance-audit.json`](./fenrir-balance-audit.json); pass an optional output
path to keep the checked-in evidence unchanged. The JSON includes every seed,
team, opponent-specific summary, side-specific result, and the SHA-256 of the
engine used. The full regression suite is `npm test`; the production check is
`npm run build`.

## Method and limitations

- **10,752 unmodified legal 5v5 battles:** seven candidate teams × six opponents
  × 128 deterministic seeds × both orientations. Both leaders are enabled.
- The allied side uses `autoOrders`; the enemy side retains the existing seeded
  legal-skill variation. Each candidate plays on both sides. Wins below always
  mean the candidate won, whichever side it occupied.
- Costs vary within legal limits. Same-cost Anubis replacements make the most
  direct comparison. The COST17 four-beast composition gives up Naga's poison
  and protection, so it is not a pure measurement of an additional beast.
- The opening-rally ablation disables that passive on **both** sides, including
  the new Fenrir mirror opponent. Persistent leadership stays enabled.
- **This is CPU-policy evidence, not a proof of human balance.** For example,
  the three-beast Fenrir team wins 96.0% as the player and 6.3% as the enemy.
  That large pre-existing policy asymmetry must remain visible when interpreting
  pooled numbers. No arbitrary win-rate threshold passes or fails this audit.
- An additional **6,144 isolated damage trials** use 12 explicit training
  scenarios × 512 seeds. The training targets are labelled fixtures, not legal
  roster units or evidence about match win rates.

## Full-battle results

Each row contains 1,536 games against the same opponent set.

| Candidate, in slot order | Cost | Wins–losses–draws | Win % | Mean turns | Fenrir barrages/game |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fenrir, Fox, Bastet, Garuda, Naga | 15 | 785–751–0 | 51.1 | 4.22 | 2.02 |
| Fox, Fenrir, Bastet, Garuda, Naga | 15 | 754–781–1 | 49.1 | 4.39 | 2.05 |
| Anubis, Fox, Bastet, Garuda, Naga | 15 | 643–891–2 | 41.9 | 5.35 | — |
| Fox, Anubis, Bastet, Garuda, Naga | 15 | 654–881–1 | 42.6 | 5.53 | — |
| Fenrir, Fox, Anubis, Bastet, Garuda | 17 | 763–773–0 | 49.7 | 5.00 | 2.06 |
| Fenrir, Banshee, Ifrit, Garuda, Naga | 14 | 878–654–4 | 57.2 | 3.50 | 1.68 |
| Three-beast Fenrir team, rally disabled | 15 | 766–769–1 | 49.9 | 4.31 | 2.02 |

For the three-beast Fenrir leader team, Fenrir dies in turn one in 5.5% of games,
survives the entire battle in 38.0%, deals 246.1 direct damage per game, and
spends 32.6 MP on average. Its barrage lands 4.92 of five possible hits on
average; early enemy elimination can shorten it. No game in this row hits the
20-turn limit. Other compositions occasionally do, and use the existing
remaining-HP decision rule rather than failing to terminate.

The same-cost Anubis comparison shows a meaningful Fenrir advantage under these
policies. The passive alone accounts for a smaller change in this sample
(51.1% versus 49.9%); composition and the barrage also matter. The mixed
nonfamily team outperforms the four-beast team here, so maximizing family count
is not an automatic optimum. Further human/strategy-policy playtesting would
be needed before drawing stronger balance conclusions.

## Damage, targeting, and counterplay

Means across 512 identical-seed training trials per scenario:

| Attack | Mean total damage | MP | Important tradeoff |
| --- | ---: | ---: | --- |
| Fenrir barrage, base stats / no rally | 100.2 | 13 | Five random hits |
| Fenrir barrage, opening rally | 105.9 | 13 | Average 3.33 distinct enemies out of five |
| Fenrir barrage, leader + opening rally | 113.8 | 13 | Family setup required |
| Fenrir focused bite, opening rally | 76.2 | 10 | All damage goes to the chosen enemy |
| Fenrir basic attack, opening rally | 56.5 | 0 | Resource-free fallback |
| Fox area attack, base stats | 112.4 | 18 | Reaches all five enemies |
| Quetzalcoatl area attack, base stats | 132.3 | 18 | Reaches all five enemies |
| Anubis focused attack, base stats | 88.0 | 10 | Stronger guaranteed focus than Fenrir's bite |

With five enemies, the opening barrage averages only 21.4 damage on any fixed
reference enemy. The supplied target field does not aim it. A repeated target
occurs in 96.5% of the sampled five-hit casts, while the average maximum on one
enemy is 2.32 hits. Against the last survivor all five hits concentrate, making
its late-fight role substantially different from an area attack.

Guard still reduces the first hit **before** being stripped. A single guarded
training target takes 95.1 total damage instead of 105.9; its first hit averages
10.35 rather than 21.16. If all five targets guard, mean total damage falls to
69.6 because each newly hit guard applies once. Rally is removed after a hit,
so a slower affected enemy loses its attack bonus for that later action. Poison
and persistent leader stats are not dispelled. Existing Anubis/Ifrit breakers
still remove guard **before** their own hit.

Fenrir's HP150, lack of priority attacks, and lack of healing remain material
costs. A focused mechanic test shows three real preemptive fox attacks killing
it before it casts or spends MP; a real Troll protection action can preserve
its cast at the cost of the protector's action and 10 MP. This isolated example
uses repeated enemies to isolate focus fire; the match audit above uses only
legal unique-member teams.

## Deterministic contract coverage

`src/fenrir.test.ts` adds 25 tests covering:

- Original IDs 0–11 and saves preserved; ID12 stats, exactly two learned skills,
  legal light-rule team, and universal attack/defend access
- Beast IDs exactly 0, 2, 7, 11, 12; leader and passive eligibility on both sides;
  nonleader Fenrir, duplicate provider nonstacking, fresh retries, and no shared
  roster mutation
- Separate rally 2 → 1 → 0, provider-death persistence, no midbattle refresh,
  turn-one attack, turn-two speed, and fixed order after a midround dispel
- Independent seeded living-target draw per hit, repeated targets, dead-target
  exclusion, retargeting after kills, early finish, random scope, hit indexes,
  malformed-target rejection, and no aiming by a valid enemy target field
- Damage-before-dispel, poison/persistent-stat preservation, existing
  before-hit breakers, and reduced subsequent attacks after rally is stripped
- Exactly four 13-MP barrages from MP60, eight MP remaining, rejected fifth
  cast without payment, and a legal free-attack fallback
- One cast-time MP payment, impacts at 800/980/1160/1340/1520 ms, synchronized
  rally expiration, repeated presentation, immutable initial state, and
  independent `hitTargets`/`targets` snapshots in authoritative history
- 64 additional legal five-versus-five regression games across both
  orientations, with accepted orders, bounded HP/MP, terminal results, and
  playback matching authoritative state after every turn

No implementation files or pre-existing tests were changed by this audit.
