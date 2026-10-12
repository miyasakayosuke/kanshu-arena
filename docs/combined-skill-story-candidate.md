# v0.20.15 Skill effect and story on the same page

2026-10-12. Base: public v0.20.14 commit `29f06a843f032cb5cb61bbb5572b146969a9c7ec`, exact tree `6ea74bac10a47934ad324f1597c86fab10ad9b14`.

## Requested change

Selecting a skill now shows its complete mechanical effect, followed immediately by its existing story in the same reading. There is no skill-specific next/previous page and no separate story page. A named story group keeps the relationship accessible without adding another visible heading. The four profile tabs, skill selection buttons, and ability-rule pagination are retained.

The skill reader uses compact 12px panel padding, 14px body text with a 1.65 line height, and a subtle separator before the story. No text is shortened, clipped, replaced with an ellipsis, or reduced to tiny type. The existing local vertical scroll fallback remains for long combined text, very short viewports, and enlarged text; Close and the four tabs remain outside that reader. Native no-scroll fit is not inferred from DOM tests.

## Preserved behavior and content

- All 37 profiles and 106 original effect/story pairs, including complete mechanical details.
- Monster origin, flavour, source links, artwork, manual movie entry and nested-dialog behavior.
- Main tab keyboard controls and focus trap; skill selection resets local fallback scroll and preserves focus on the selected button.
- Ability page boundaries and page selection, Escape dismissal, body scroll lock and opener restoration.
- Engine, ability values, battle rules, saved teams, team editor, home screen, dependencies and shipped notices.

Runtime changes are limited to `src/MonsterDetails.tsx` and `src/monsterDetails.css`. The existing text providers are byte-identical to the base. No role-marketing summaries were added.

## Verification and limits

The profile-focused suite covers every monster and every skill in live DOM traversal and server-rendered markup, requiring the exact full effect before its matching story and no skill pager. Selection and repeated-selection checks cover focus, pressed state, group changes and local scroll reset. CSS cascade checks cover all three stylesheet orders, including 360×533, 400×606, narrow/short viewports and zoom-sized widths. These checks verify declarations and DOM structure, not browser geometry.

The reviewed candidate is integrated as v0.20.15. Final release checks are recorded in `release-validation-v02015.json`. An independent reviewer checks the final runtime diff and additional keyboard/CSS probes. Inventory checks are not a legal opinion.

Reviewed candidate checks: 2,819 tests across 139 files passed. Three test-only non-null annotations were included in the final full rerun. All 155 affected tests also passed. TypeScript, production build, source/dist notice checks and 15 rights self-tests passed. Independent review passed 81 probes/tests and found no remaining functional blocker. The ordinary large-bundle advisory remains. The 736-match smoke comparison and exact source/patch fingerprints accompany the frozen handoff.

The previously unavailable local Chromium, localhost and file browser routes were not retried. The sole release publisher performs authorized deployment and native phone acceptance, including longest combined skills, all four tabs, ability paging, manual movie dismissal, short-height/zoom scrolling and visible Close controls. The versioned release undergoes a fresh aggregate check before publication. Native acceptance is performed only after the exact release is deployed, and is not claimed by this prepublication record.
