# Monster-details dismissal implementation

Date: 2026-10-12 UTC. Reviewed implementation integrated into the v0.20.5 release candidate. This note retains the isolated implementation evidence. Final release checks and subsequent rendered acceptance are recorded separately in docs/rights/releases/2026-10-12-v0.20.5.md.

## Exact baseline

- Public release: v0.20.4, commit `0e8c2dd53b84942458522230b3432abda8931eec`.
- Exact baseline source tree: `c5e45086fb32d14e8fa9b344e97b1c3d9f53feb2`.
- The source was exported from that verified tree, not the release checkout's older imported HEAD. The isolated import commit is `5244217868ec29bb8d955c7d2fb29ea189b52f7e` and has the exact same tree.

## Reproduced defects and bounded changes

Public-browser testing at 400×606 CSS pixels (native 500-pixel width at 125% zoom) and native 802×394 landscape found that the absolute-positioned × scrolled offscreen with the profile. Midway down, the return button was also below the fold. Separately, one Escape closed the profile and underlying catalog; × preserved the catalog. Both defects were reproduced before this patch.

The profile now has a compact non-scrolling header containing the existing name/detail label and a 44×44 close button. Only `.profileBody` scrolls. The existing art, heading, role, leader explanation, family details, skill descriptions, disclosure, statistics/lore and return button are preserved inside it. The modal retains its ordinary maximum size, bounded additionally by the overlay's viewport padding; the header does not consume the full artwork height on short screens. Other modals retain their existing layout.

The profile consumes Escape at its dialog boundary before page listeners run. App's window fallback respects already handled events and, when a profile is open, claims that Escape and closes only the profile. The existing leave-confirmation priority remains ahead of this fallback. The catalog/editor's existing guard then leaves its search, filters, list, candidate, scroll and focus context intact. A later separate Escape may close that catalog/editor as before.

No battle engine, AI, stats, skills, family/rule definitions, art, animation, save schema, dependency, notice or public visibility changes. No external code/media, rights contact, legal acceptance or fee.

## Tests and evidence boundaries

Seventeen new regression cases were added before implementation. The unchanged baseline failed 14 of them; the existing close-button/backdrop/preview behavior already passed. After implementation, all 47 focused profile/layout/App dismissal tests pass. The CSS test normalizes happy-dom's unitless zero; this does not alter the layout requirement.

Coverage includes five viewport CSS cascades (400×606, 802×394, 326×432, 500×758, 720×900); header/body structure and unchanged art size; focus trap traversal with an expanded/collapsed disclosure; Escape from the close control, summary and return button; event cancellation/bubbling; native window fallback; ignored already-handled events; three repeated catalog openings for each dismissal path; search, family filter, sort, open filter disclosure, element identity and scroll-value preservation; replacement preview retention; focus return without scrolling; body overflow restoration; and ordinary target-selection cancellation.

CSS/DOM tests are not browser geometry proof. Rendered local checks, if available, are recorded separately; post-publication actual browser acceptance remains a separate release gate. Public acceptance should repeat the portrait/landscape cases, read midway and at the end with the disclosure open, resize across orientations, verify × and all content remain reachable, cycle Tab/Shift+Tab, and verify one Escape restores the intact catalog while a second deliberately closes it. Route interruption, family-picker and leave-confirmation tests must continue to pass.

Final aggregate checks: 2,416 tests across 107 files pass; 14 rights self-tests pass; source and distribution rights-inventory checks, TypeScript and production build pass. There is no separate lint script in this repository. The rights checks are inventory/notice checks, not legal clearance.

Independent review reran 158 focused tests covering details, layout, App dismissal, navigation, family picker, TeamBuilder and leader comparison. Local rendered QA could not be completed: installed Chromium was blocked by process-socket permissions, including the supported execution escalation; the separate cloud browser could not reach the local Vite server (`ERR_CONNECTION_REFUSED`). No screenshot is presented as proof of the candidate's rendered layout. The preserved screenshots show only the baseline defects. Public-browser validation remains required after any authorized publication.

The external candidate evidence bundle records the exact final candidate tree, patch SHA-256, full-suite/build/rights logs and independent review. The isolated review did not publish. Authorized publication uses the existing repository in a separate release workflow; this document does not imply live acceptance, rights clearance, human-playtesting completion or all-device acceptance.
