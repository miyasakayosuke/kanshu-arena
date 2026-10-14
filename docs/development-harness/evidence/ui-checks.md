# v0.20.34 implementation evidence: catalog scroll and awakening calculator

Recorded 2026-10-14 UTC. This report supports the two implementation submissions.
Independent formal acceptance, screenshot review and production publication are
separate decisions; none is asserted by this report.

## Exact candidate and evidence identity

- Candidate: [14134f351d8eca79714199e1f2b34dc76e826a4e](https://github.com/miyasakayosuke/kanshu-arena/commit/14134f351d8eca79714199e1f2b34dc76e826a4e)
- Tree: `29303d2da574719a58001fa9d1a08cbe9b8b3670`
- Candidate branch: `candidate/readonly-ui-v034`
- Accepted parent: `8343d81405b9eb3c59621a4b0ead4052e2d3949e`
- Browser harness: [2c7b195442be1d3940f505477b68a59462e46712](https://github.com/miyasakayosuke/kanshu-arena/commit/2c7b195442be1d3940f505477b68a59462e46712)
- Exact combined browser run: [38514539330](https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38514539330)
- Run artifact: `11871355231`, containing the combined browser report and screenshots.
- Artifact archive SHA-256: `c75db4cb4549b12021fe327919a8ac27334808c6235abe3b3e777b5ccde708ff`
- Reviewed `results.json` SHA-256: `db2037ec44f74892f591c5d0c271ca52aa3be8941f52fe3092da8dba05d43f35`

The exact combined commit was tested, rather than inferring success from its two
separate feature candidates. The new QA branch is `candidate/browser-qa-v034`;
the earlier four-candidate QA branch/run remains unchanged. The QA workflow has
read-only contents permission and no deployment, OIDC or secrets use.

## Scope and implementation

The candidate contains 22 changed paths: the already-tested catalog/calculator
sources and tests, reconciled provenance, version 0.20.34 package/lock metadata,
credits display, README and release evidence documents. It takes neither the
rejected v0.20.33 artwork nor the isolated IndexedDB-driver candidate.

`App.tsx`, battle engine, team-save implementation, existing deployment workflow,
full third-party notices and dependency graph remain unchanged. The package lock
changes only version metadata. Twenty-one existing art/rig/motion source files
were byte-compared with the accepted parent and matched.

A static traversal from the app entry reaches only `AwakeningPreview.tsx`,
`domain.ts` and `preview.css` within awakening code. The existing domain/storage
adapter/fake tests are retained as isolated source, but no storage adapter, fake or
IndexedDB backend is imported into the running app. There is no inventory, reward,
material consumption, persisted progression or combat-stat integration.

### Catalog implementation

`RosterBrowser.tsx` uses the six result-selection fields (search, role, sort,
leader effect, family and cost) to detect a new result set. A layout effect resets
the rendered list and remembered scroll offset only when that key changes.
Disclosure changes are excluded, and initial mounting preserves existing route-
return restoration. Added regression tests cover changed-result resets and
preservation cases without moving input focus.

### Awakening calculator implementation

The monster-details abilities tab contains an initially collapsed local calculator
with stage 0/4/99 shortcuts, one-step controls and a native range slider. HP and
attack use rates 95/98/100 at stages 0/4/99, linear interpolation, and rounded
current-value × rate ÷ 95. Stage zero preserves the existing value. MP and speed
are unchanged; defense is not introduced. Next integer changes are explained.
The UI labels all values as hypothetical and before leader effects, resets for a
new monster or close/reopen, and is excluded from enemy battle inspection.

## Completed local checks on the frozen combined source

| Check | Result |
| --- | --- |
| Rights self-tests | 15 passed, 0 failed |
| Source rights inventory | Passed |
| Full Vitest suite | 170 files, 3,587 tests passed, 0 failed |
| TypeScript + production Vite build | Passed; existing chunk-size warning only |
| Built credits/notices inventory | Passed |
| Balance lab smoke | 736 matches completed |

The smoke suite reported 48.08% before and 48.08% after, a 0.00 percentage-point
paired aggregate change. This is a policy/suite-specific observation, not a claim
of exhaustive balance validation. No new dependency or gameplay change was made.

## Completed exact combined browser checks

Playwright **1.56.1**, actual Chromium **141.0.7390.37**. Desktop **1440×1000**;
phone **390×844**, touch/mobile emulation. Test execution began at
**2026-10-14 05:03:19.354 UTC** and reported a duration of approximately **13.1 s**.
The candidate was built and served as a production bundle through loopback Vite
preview in the same CI job.

**6 passed, 6 expected skips, 0 failures, 0 flaky tests and 0 retries.** The six
passes are the following three test cases at each viewport. All six skipped cases
are storage-driver-only tests, deliberately outside this candidate's scope. The
fail-closed coverage guard was rerun against the downloaded report and confirmed
the exact count and desktop/phone split; runner error arrays were empty.

1. **Shared catalog/detail/team/play loop:** 37 cards; catalog-heading focus;
   detail keyboard tab navigation; Escape and opener-focus restoration; team and
   battle views; document horizontal-overflow checks; complete deterministic
   battle and return to team. Exact lineup IDs/order/labels were unchanged before
   battle, after return, and after reload: **0, 2, 3, 4, 6** (妖狐, バステト,
   ドリュアス, バンシー, ガルーダ). No uncaught startup/page errors occurred.
2. **Catalog-specific browser behavior:** actual nonzero scroll; route-return
   position retention; sort change resets to zero; disclosure toggle retains
   scroll; family filtering resets to zero and gives five dragon results; empty
   search; reset returns 37 results/default order while keeping the disclosure
   open. Unit tests cover the other result-key criteria as well.
3. **Actual awakening calculator:** closed/default zero; stage 0/4/99 values
   independently checked against the specified rates; step limits and native
   slider keyboard use; hypothetical and MP/speed/defense labels; unchanged base
   stats; control dimensions and horizontal bounds; reset on next monster and
   reopen. Storage mutation-call logs remained empty, local/session bytes and
   catalog contents were unchanged. This tests the calculator, not the older
   reading-art preview.

Screenshots were captured for catalog, detail, team, battle, result, catalog reset,
and calculator stages 0/4/99 at both viewports. **Independent visual review is
separate and pending in this implementation report.** Automated screenshot capture
is not itself a judgment of artwork or visual quality.

## Remaining limits and acceptance boundary

- This is implementation evidence for the catalog and read-only calculator tasks;
  it does not accept those tasks, other awakening tasks or a production release.
- Formal independent review and the exact combined screenshot review must be
  recorded separately. Main/deployment changes were not performed by the builder.
- Browser coverage is Chromium at the two stated sizes, not physical devices,
  WebKit/Firefox, arbitrary screen sizes or comprehensive accessibility testing.
- No progression persistence, migration of real user saves, economy, acquisition,
  inventory, rewards, or battle-stat activation has been implemented or approved.
- The prior separate storage-driver tests do not make this candidate a storage
  integration. Quota, crash durability, lifecycle and historical-save compatibility
  gates remain outside this read-only release.
- Source and dist rights checks validate recorded inventories and notice content;
  they do not establish legal clearance. No new license was selected for original
  project work, and no external artwork/source excerpts were introduced.

This curated report includes only project evidence and sanitized runtime findings.
Raw automatic Git author metadata, credentials and private filesystem paths are
intentionally excluded.
