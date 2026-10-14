# Awakening progression trial, v0.20.35

## Approved quantities

The provisional economy version is `trial-flat-ten-v1`: completion grants one
common material, a win grants four extra, each ten cumulative wins banks one
nonexpiring choice of ten species materials, and every stage costs ten through
99. Species materials are used before common materials. No daily resets, login
streaks, paid currency, duplicate acquisition or roster-selection grants exist.
The older `proposedTrialRules` factory remains a test fixture, never production.

Ordinary completed losses and draws grant one. Abandonment grants zero. Fast
losses can therefore earn common materials but cannot advance win-based choices.
No undisclosed duration penalty or cap is added. At a 50% win rate, ten matches
average 30 common plus five selected-species materials: focusing one species
requires about 12 matches for stage 4 and 283 matches for stage 99 in expectation.
This is a quantity estimate, not a measured play-time or guarantee. Later tuning
must use a new rule version and an explicit preserving migration.

## Combat and UI

The current roster is the stage-zero baseline. HP/ATK grow by the existing
95/98/100 ratio at stages 0/4/99, rounded before existing leader effects.
MP, speed, skills, action-time/manual behavior, and turn-two MP recovery are
unchanged. Enemies keep baseline stats; the global 37-entry roster is never
modified. The session freezes both sides, seed, owned levels and rule version.
The separate owned-growth panel shows current and next pre-leader stats and
explicitly warns about rounded plateaus before material consumption.
The catalog calculator stays hypothetical, read-only, and based on stage zero.

## Persistence and interruption

The exact previously reviewed native IndexedDB driver is reused from candidate
`2b6de6bdad0b25f22de387559a70f4f9da3babb0`. One dedicated database,
`kanshu-awakening-v1`, holds an atomic head/backup record. No team-save bytes are
imported, altered or deleted by progression. No historical battle rewards are
invented. Corrupt, future-version or incompatible-economy data is retained and
blocked. The UI offers retry, not silent reset or automatic backup rollback.

Begin commits the exact engine starting snapshot before activating combat.
Reward settlement consumes the terminal result from `advanceWithEvents`, before
presentation playback. A failed settlement remains retryable in the live tab;
leaving final playback cannot turn an earned win into abandonment. A committed
receipt replays without a second grant. Spending uses exact snapshot tokens and
expected levels; stale operations require review rather than silent retries.

After reload, an unfinished battle is not resumed or auto-abandoned. The user
must explicitly end it without rewards, with a warning about another tab.
An interrupted page/process before terminal settlement commits may lose that
uncommitted result; this local trial does not promise server-authoritative
recovery, anti-cheat, cloud synchronization or protection from browser eviction.
Storage-disabled play remains available at stage zero without retroactive rewards.

## Verification

Source tests cover the approved quantities, actual engine completion, atomic
spending, duplicate/stale operations, failures, reload and unchanged teams.
Release requires the full rights/test/build suite, exact-candidate independent
review and real-browser QA. Those results belong to release evidence, not this
specification. No new artwork, packages, services, credentials or license are added.
