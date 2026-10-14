# Independent review: awakening progression v0.20.35

Date: 2026-10-14 UTC.
Decision: **ACCEPT** the bounded technical integration below. No outstanding
blocking finding remains in the reviewed candidate. This is not a deployment
record or final whole-game acceptance.

## Exact candidate and assignment

- Application commit: `0961f09d8081c357c08388ee807f4385835a8f47`.
- Tree: `c43d07a6748e9a6e18803df476b74cc33d29c488`.
- Reviewed task: `awakening-integration`; independent reviewer assignment
  `awakening-reviewer`, role `review`, generation 3.
- The active assignment, submitted candidate and required evidence were freshly
  read from ledger revision 37 at commit
  `c5bac4c4a0b7abcec108bb4ff2ea53c550cc4086`. The current ledger branch still
  pointed to that commit; the assignment was unexpired at review time.
- Independently fetched the application commit and complete recursive GitHub
  tree, then hashed all 1,371 remote blobs against the reviewed source twice:
  zero mismatches, including the final check immediately before this decision.

## Findings and resolution

The review identified three lifecycle defects before freeze. All are corrected
in the accepted commit and have regression coverage:

1. A delayed battle start could revive after navigation away and back. Monotonic
   navigation and workshop revisions now invalidate that old start intent;
   the committed but cancelled start is abandoned without reward.
2. Interrupted-battle confirmation could retarget a newer battle after refresh.
   It now captures the exact token and sequence, and refresh clears confirmation.
3. A local completion could remain permanently blocked after another tab advanced
   beyond its retained receipt. A demonstrably superseded local lifecycle is now
   retired, with fresh state and an explicit no-added-reward explanation.

The first and third defects were independently reproduced against application/
session code before correction. The corrected paths were rechecked; the second
fix was also exercised with a newer cross-tab sequence and refresh. No source,
ledger, branch or deployment was changed by this reviewer.

## Scope reviewed

- Completed battles grant one common material; victory adds four. Each ten
  cumulative wins banks a nonexpiring choice of ten species materials. Every
  awakening step through 99 costs ten, using species material first. Abandonment
  grants zero; roster selection and browsing grant nothing.
- Existing stage-zero stats remain the baseline. HP/ATK follow the approved
  95/98/100 ratios at stages 0/4/99, rounded before leader effects. Enemy stats,
  MP, speed, existing manual/automatic play, turn-two MP recovery and roster/art
  remain outside the progression change.
- Exact-token transactions protect spending, selection claims and stale quotes.
  The actual engine terminal result is captured before visual playback. Failed
  settlement remains retryable; duplicate receipts cannot grant twice.
- Corrupt or incompatible data is retained and blocked. Reloaded unfinished
  battles require explicit no-reward discard. Progression storage is separate
  from team persistence, with no silent reset or backup rollback.

## Verification and evidence

- Independent focused execution: six files / 173 tests passed; an additional
  frozen-source run of application awakening/navigation and session tests passed
  three files / 41 tests.
- Reviewed final full-suite output: 173 files / 3,641 tests passed. Rights
  self-tests: 15 passed. Rights inventory, production TypeScript/Vite build and
  distribution-notice inventory passed. These are technical/inventory checks,
  not legal clearance.
- [Immutable check record](https://github.com/miyasakayosuke/kanshu-arena/blob/1ee9ddc1f1fbe1228d40e04e7f67ddfc689e6a7b/docs/development-harness/evidence/awakening-v035-checks.md).
- Independently verified [browser run 38538256187](https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38538256187)
  completed successfully at QA commit `8fb49478c7d93275cead5f98425ba20d86622d23`.
  Parsed the downloaded raw Playwright report: 30 passes, exactly 15 desktop and
  15 phone cases; no skipped, failed, flaky, retried or runner-error results.
- Artifact ZIP SHA-256:
  `95922618b2c5eeadb80049a1b884cebb76425e304d28bd0521101ce53c24a103`.
  Raw results JSON SHA-256:
  `ec1c996f77a1c34934e2ab8a39da46b7c2b1865f8b26517ed273547f072aae23`.
- Runtime evidence identifies Chromium 141.0.7390.37, the exact application SHA,
  desktop 1440x1000 and phone 390x844. Reviewed the browser QA report and actual
  desktop/phone upgrade-confirmation image pixels; costs, stat changes and
  confirm/cancel controls are legible and within bounds.

## Bounded limits

The actual production-UI battle ended in defeat at both viewports, awarding
exactly one common material and preserving exact bytes across reload. Real UI
victory and tenth-win acquisition were not executed: win/duplicate settlement
and selection behavior have native-IndexedDB fixture/domain coverage, and
selection/cap UI tests use synthetic progress. Unit tests are not browser passes.

Coverage does not establish Firefox/WebKit or physical-device behavior,
comprehensive accessibility, server anti-cheat, browser-eviction protection or
OS/process-crash durability. The earlier failed browser run remains recorded as
a synthetic-team fixture defect; the successful retry changed those fixture
values only, with application source and preservation assertions unchanged.
Deployment identity and live game/credits/notices verification remain separate
post-publication requirements. No new artwork or legal clearance is accepted here.
