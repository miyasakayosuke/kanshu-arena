# Compact public balance evidence

Proposal recorded 2026-10-10 UTC. This is local packaging preparation, not a
publication authorization. No existing evidence is removed, replaced, staged or
committed. The public baseline is `bc55e50` (v0.13). Source, active study configs,
and active results remain owned by the study runner.

## What has been checked

- The release checklist requires `npm run rights:test`, `npm run rights:check`,
  `npm test`, and `npm run build`. These checks must still run against the final
  release candidate; an evidence hash or focused packaging test is no substitute.
- No `src/balanceLab*.test.ts` reads the large packed match-result ledgers.
  CLI tests construct bounded temporary reports and injected failure cases.
- `balanceLabAllFamily.test.ts` reads the immutable matrix freeze through
  `readMatrix`. `balanceLabAllFamilyLeaderFollowup.test.ts` reads the leader
  freeze and robustness amendment through `readFollowup`.
  `balanceLabAllFamilyPureConfirmation.test.ts` additionally reads the pure
  confirmation freeze through `readPure`.
- Older family Lab tests validate configs under `configs/balance-lab`.
  `balanceLabSlime.test.ts` also reads every slime freeze and checks retained
  config byte hashes. Keep all these small inputs.
- `scripts/check-rights.mjs` requires `docs/rights/asset-manifest.json`, actual
  source/art/dependency notices, and corresponding dist notices. Its selftests
  copy `docs/rights`, not match ledgers. Removing those required rights records
  is outside this proposal.
- Full-study analyzers/verifiers and `replay-all-family-packed.mjs` DO read
  packed ledgers. They must not silently skip missing data or claim a full
  rerun has passed in a compact checkout. Their full-study mode remains usable
  after deterministic reconstruction or restoration of local evidence.

## Evidence tiers and inclusion manifest

Keep the complete local archive. Build a separate, explicitly selected public
package rather than deleting evidence or changing the Git index.

The compact package must retain:

1. All source/config/seed freezes and all executable study, schedule, analysis,
   observer-definition, verification and reconstruction code. Include the
   lockfile and exact recorded Node version. Include the archived frozen
   engine, families, Lab core and CLI, not just their hashes. Historical
   predecessor and analysis-hardening revisions stay distinguishable.
2. All small audit, plan, method, selection, results, validation, verification,
   and summary records, including all family-wave results. Original all-family
   `initial64`, the empty extension authorization, failed original counter
   gates, null original selections, distribution caveats, and adaptive versus
   independent follow-up disclosures are mandatory. A later successful probe
   cannot replace or relabel the failed original protocol.
3. The bounded all-family analysis records and exact source archives. These
   are far smaller than duplicate per-match ledgers and preserve published
   aggregates and the implementations used to derive them.
4. A machine-readable inventory of every locally retained omitted artifact:
   relative path, byte size, SHA-256, suite, status and planned/executed counts
   when applicable. Preserve complete index/chunk metadata, including hashes
   nested inside packed manifests. Mark currently running studies incomplete;
   never freeze their changing intermediate files as final evidence.
5. A bounded real replay fixture extracted from existing, deliberately selected
   Dryas diagnostic evidence. It includes original suite and match ID, source
   identity, config and schedule binding, exact request, complete expected
   compact result and expected event-trace hash. It is a replay test, not a new
   independent sample or a representative-frequency claim.

Large match-ledger payloads omitted from the public package are under
`docs/{demon,undead,extraordinary}-balance-packed` and
`docs/all-family-{balance,pure-confirmation,leader-followup}-packed`.
This omission must be explicit in the README/manifest. Historical slime packed
data is a 4MB deduplicated archive of 1,305 aggregate records. It is retained in
full so historical summaries remain usable. No generic `*-packed` deletion or
blanket omission is safe. Completed suite indexes and nested chunk-manifest
metadata are retained even where match payloads are omitted; metadata presence
does not establish that the payloads are shipped.

At the initial read-only inventory, the completed original all-family packed
archive contains 4,244 files / 237,875,338 bytes, and pure confirmation contains
780 files / 42,266,384 bytes. Leader-follow-up output is active and its size is
not a final release figure. The game dist itself is not the size problem.

## Reproducibility contract

Hashes identify bytes and detect changes. They do not reconstruct missing
source, establish correctness, or prove that every omitted execution happened.
The compact package therefore needs executable source plus a real expected
fixture and an actual bounded reconstruction test:

1. Verify source-archive, config, fixture and manifest hashes before execution.
2. Extract the frozen archive into a NEW directory. Never replace current
   engine/core/family/CLI files. Use its own exact implementation when importing
   the engine and `runMatch`.
3. Rebuild the full frozen schedule from the retained config and verify its
   canonical schedule hash. Locate the exact fixture match and require exact
   request/metadata equality.
4. Execute only that match with event tracing. Deep-compare every compact
   result field, including the ten unit ledgers, and compare the event-trace
   hash. Verify a fixture trace against the existing full diagnostic trace if
   that original is available locally.
5. Report the number of replays actually executed. A one-match check proves
   this bounded reconstruction only. Full aggregate regeneration remains a
   separate, potentially expensive operation against all frozen schedules.

The study owner reports 132,096 original executions, all rows verified with
120 sampled exact replays, and 24,576 pure-confirmation executions with 60
sampled exact replays. The separate leader study schedules 71,040 executions
and is still running at proposal time. Existing verification records are
historical evidence; packaging does not represent them as freshly rerun.

Existing full source-verified Dryas examples are in
`lab-results/all-family-residual-dryas`. Prefer extracting a compact fixture
from one of these over duplicating their full event trees. The stored selection
rule chooses residual losses deliberately, and that qualification travels with
the fixture. A future expanded fixture set should cover both physical sides,
policy arms and zero/half/full scales using the already recorded sample IDs.

## Narrow implementation proposal

New packaging code is limited to
`scripts/balance-lab/prepare-public-evidence.mjs` and the separate Node test
runner file `scripts/balance-lab/prepare-public-evidence-selftest.mjs`. It must:

- Read study inputs without mutating them; reject source drift before and
  after packaging and replay.
- Require an explicit new local output path and refuse existing destinations.
- Use no network, Git write, upload, deletion or publication operation.
- Fail closed on missing required failures, absent source bytes, config/hash
  drift, path traversal, unexpected active-state changes, or replay mismatch.
- Keep running study outputs out of final claims and identify their status.
- Produce an inclusion/omission manifest, one small replay fixture and a
  deterministic reconstruction report in the new output only.
- Have selftests for corruption, missing required failure records, invalid
  destinations and fixture mismatch; never weaken the existing study tests.

The exact release export remains a parent-owned decision after the leader
study and aggregate release checks complete. Packaging preparation does not
retry or route around the separately blocked publication operation.

## Implemented commands and runtime

The bounded verifier was executed with **Node v24.19.0**, matching the frozen
study. It relies on that runtime's native TypeScript loading for `src/engine.ts`
and `src/families.ts`. It uses only built-in Node modules and requires no
`node_modules`, npm install, network, Git history or access to the original
workspace. Other Node versions have not been validated by this demonstration.
The ordinary game release tests/build still need dependencies from the retained
lockfile and the normal release checklist.

From the original full local evidence workspace:

```sh
node --test scripts/balance-lab/prepare-public-evidence-selftest.mjs
node scripts/balance-lab/prepare-public-evidence.mjs prepare \
  --root . --out /absolute/new/compact-evidence
```

Preparation defaults to refusing incomplete study results. An explicitly
nonfinal review snapshot can be created with `--allow-incomplete`; it excludes
changing leader ledgers, checkpoints, analyses and results. It is marked
`incomplete-preview` and must be regenerated in a fresh output directory after
the study owner confirms final stable evidence. The selftest needs the original
full local workspace, including the prior Dryas diagnostic replay, to construct
its disposable test export; it is not part of Vitest discovery.

From the exported compact tree alone:

```sh
node scripts/balance-lab/prepare-public-evidence.mjs verify \
  --root . --out /absolute/new/reconstruction \
  --manifest-sha256 THE_HASH_PRINTED_BY_PREPARATION
```

Use a new output outside the input tree for either command. Both commands
refuse collisions and unsafe paths. The manifest has bounded hash/size inventory
pages; pinning its hash binds those pages and the shipped source archives,
configs, summaries, original failures and fixture. Every frozen config and the
original-evidence dependencies recorded by follow-up freezes are also checked.
Summaries must bind to the matching source and derived-config freeze.

The first independent compact-only run rebuilt 17 frozen source files and the
exact original counter schedule, then reproduced this real fixture:

- Suite: `all-family-counter-independent-0`
- Match: `counter-1-3__s4236701050__a-left__candidate`
- Result: counter loss; all ten complete unit ledgers compared
- Event-trace SHA-256:
  `ea359ebe2497d85d2b9aef239c07b3781bb191332c15d6909bb23b982adcf970`
- Complete compact-result SHA-256:
  `63715c57c13edee99b30b85ceb7859db89f2b245d0417cc1a3977ffeedf5abc8`

Twenty-nine packaging selftests passed, covering incomplete-study refusal and missing/tampered source,
archive, config, fixture and failed-gate records; exact-result and request
mismatches; original-failure relabeling; hash pinning; unsafe paths/symlinks;
and output collisions. This is a focused packaging result, not an aggregate
game-release pass or a replay of all original executions.

The exporter preserves existing documents unchanged and emits
`EVIDENCE-README.md` plus `evidence-public/link-limitations.json` listing
references that need explanation in a clean release checkout. Paths into
omitted per-match chunks and `lab-results` remain provenance identifiers for
local artifacts. Full study readers/analyzers/verifiers still need complete
packed data. Historical source reconstruction commands can require their named
older checkout; the compact-only proof above covers the all-family fixture,
not every historical family experiment.

## Later controlled release adoption

Study source and release source are separate identities. The default command
remains strict: its input workspace must still contain the exact frozen live
engine/family/core/CLI. A later release may intentionally change production
defaults in a separate checkout without changing the archived study engine.

In that case, the parent prepares an explicit adoption record in the separate
release checkout, and the command is:

```sh
node scripts/balance-lab/prepare-public-evidence.mjs prepare \
  --root /absolute/full-frozen-study \
  --release-root /absolute/separate-release-checkout \
  --adoption-record docs/release-adoption.json \
  --out /absolute/new/adopted-compact-evidence
```

The release root and adoption record are required together. The full study
workspace remains the source of all audits, configs, freezes, archives and
results; it supplies the raw fixture and omitted-artifact inventories. The
separate release checkout should start from the final compact export, then
receive only the intended release edits. Its generated `evidence-public`,
`EVIDENCE-README.md`, `dist`, `node_modules`, Git metadata and local lab outputs
are not treated as proposed release edits. Every other new/changed file must
appear in the adoption record; missing shipped files are rejected.

The new adoption JSON contains these fields:

- `schemaVersion`: `1`
- `kind`: `explicit-release-adoption-v1`
- `reason`: the concrete approved release change
- `studySource`: the exact unmodified source object from the original derived
  config freeze
- `studyArchiveSha256`: the SHA-256 of the frozen-system archive index
- `releaseSource`: a separate object with `nodeVersion`, `files` (the same four
  engine/family/core/CLI paths and their actual release hashes),
  `engineSha256`, `familySha256`, and `labSha256`. The combined Lab hash is
  SHA-256 of core UTF-8 text, one newline, then CLI UTF-8 text.
- `files`: one entry per explicit overlay, with `path`, `beforeSha256`, and
  `afterSha256`. The before hash must match the untouched study input. For a
  new release/test/docs file it must be `null`, and absence is checked. The
  after hash must match the separate release file's actual bytes.

The adoption record itself must be new, must not name itself in `files`, and
must not impersonate a frozen balance-evidence path. Configs, Lab scripts,
balance documents, all-family study records and source archives cannot be
overlaid. All source and release inputs are rechecked before completion. The
result is a new manifest with independently pinned `studySource`,
`releaseSource` and adoption-record SHA-256. Never keep an old manifest after
changing shipped bytes.

The controlled selftest changes only production defaults to zero impact plus
reservation inside a temporary release example, adds a documented new file,
creates a fresh manifest, and reproduces the original residual-loss fixture
using the extracted old engine. It also rejects absent/extra/unlisted release
files, bad before/after hashes, invented absence, relabeled study hashes and
attempted frozen-evidence overlays. No actual production adoption is made by
these tests. Old configs are never replayed using changed live defaults.
