# Family-trial picker candidate provenance and verification

Date: 2026-10-11 UTC. This is a component-only candidate, not a deployment or release approval.

## Baseline and owned files

- Frozen baseline tree: `d974e21da54d5d2c5eb12977e5fa1578a923bd0c` (v0.18.6).
- Isolated-copy baseline commit: `ba81e0af735fe658c9efeafb8c91831956e2dec1`.
- Added files: `src/FamilyTrialPicker.tsx`, `src/familyTrialPicker.css`, `src/FamilyTrialPicker.test.tsx`, and this document.
- No existing source, engine, AI, balance/stat values, timing, artwork, version, dependency, manifest, saved-slot code, or publication setting is changed by this patch.

## Origin and expression

The picker component, layout/CSS, keyboard handling, and short navigation/disclosure text were newly written with AI assistance for the request to make family parties easy to try. They were not copied from external games, websites, or libraries. No new dependency, font, audio, image, icon, or character artwork was introduced.

The component receives the party names, teams, and strategy notes from its caller. Tests derive their fixtures from the existing `recommendedTeams` in `src/strategy.ts`. Family labels come from existing `FAMILY_DEFINITIONS`; monster names and COST values come from the existing engine. The first member's existing `MonsterArt` portrait is reused without modifying the portrait, SVG data, pose, color, or character definition. Existing third-party notices remain unchanged. This provenance description does not establish legal clearance, choose a license, or resolve pre-existing rights questions.

The parent integrator owns the shared manifest and release record. This component-only patch deliberately leaves those files untouched under the assigned ownership boundary; the integrator should record these UI/copy additions in the aggregate release inventory before publication.

## Interaction contract

`FamilyTrialPicker` takes readonly `presets`, `rule`, `onChoose`, and `onClose`. Its exported `FamilyTrialPickerPreset` type is structurally compatible with the separately implemented `FamilyTrialPreset`, so integration does not require a runtime or type import from an unfinished sibling module. Pass the full eight presets: seven pure parties and the separate Janus mixed option.

Opening, scrolling, focusing, clicking card text/art, Escape, Close, Cancel, and backdrop dismissal do not mutate the active team, saved slots, practice state, encounter, or battle. Only an apply button invokes `onChoose` once with the exact supplied preset. The App integration must then copy the selected team, retain light rules for COST15 nature, explicitly switch to standard when needed, end same-condition practice, close the picker, and navigate to the reception screen (受付). The actual opponent is drawn only at battle start; standard draws among seven pure families, while nature is the only pure-five light opponent. It must not start battle until the ordinary reception start button is activated. The picker states these effects before selection and explicitly names standard COST17 switching in both the visible apply text and accessible label for over-budget light choices.

On mount, focus enters the close button. Tab boundaries wrap within the dialog, focus attempts outside it return to Close, Escape dismisses, and cleanup restores the prior connected element and body scroll style. The dialog header remains outside its bounded scrolling region; card text wraps and all buttons have a minimum 44px height. No automatic scroll or focus causes a choice.

## Verification

- Focused component suite: 23 tests passed. Includes seven-pure/one-mixed separation; all five member names and leader order; original portrait URLs; costs and notes; the actual DOM `aria-label` attributes for all eight apply buttons; explicit COST17/light behavior; single-shot callbacks; untouched saved data; all dismissal routes; focus entry/trap/restore; Strict Mode effect replay; and narrow/short CSS structure contracts.
- The earlier full standalone suite passed 93 files / 2,161 tests with the first 14 picker tests. Rights self-tests, rights checks and production build passed then. Subsequent coverage expansion and wording corrections are verified separately; exact final command outputs and counts are delivered in the standalone verification record (final full suite: 2,170 tests / 93 files). Merged verification is recorded in the release validation document.
- This is standalone-compatible with the frozen baseline. TypeScript resolves the component without the sibling family-trial module. Because the frozen App does not yet import it, a standalone production bundle is not proof of App integration; the parent must repeat aggregate verification after integrating the component and transitions.
- Browser-rendered layout, real accessibility-tree names, and actual narrow-screen clipping remain unverified. The documented cloud CUA browser returned `net::ERR_CONNECTION_REFUSED` for the executor's loopback preview at `http://127.0.0.1:4187/kanshu-arena/`. No additional hosting route, external publication, or shell-driven browser was used. Happy DOM cannot establish actual pixels or native browser Tab behavior.

## Remaining integration QA

After integration, verify both home and lobby entry points, no state change from opening/dismissal, all eight apply transitions, preservation of the three numbered saved slots, nature staying in light, explicit standard switching for COST17 presets, practice termination only on apply, and no battle before the reception start. In the authorized rendered preview, inspect width 320px and short portrait/landscape heights, top Close visibility after scrolling, last mixed card/Cancel reachability, real accessible names, keyboard focus restoration, and touch/pointer usability. No claim of deployed behavior is made here.
