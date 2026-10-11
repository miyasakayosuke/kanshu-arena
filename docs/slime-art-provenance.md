# Slime-family artwork and choreography provenance

Date: 2026-10-10 UTC. Development wave: v0.14 candidate after the frozen v0.13 material worktree. This records creation and limited inspection; it is not legal clearance, an authorization to publish, or an exhaustive similarity search.

## Actual creator, sources, and method

The OpenAI coding assistant directly authored the five SVG drawings, path coordinates, gradient definitions, color combinations, facial treatments, portrait crops, five motion samplers, and new fluid/resource canvas marks during this task. They are code-native vectors. No image-generation tool was invoked. No external illustration, sprite sheet, model, animation sample, screenshot, traced outline, logo, font, music, sound, or extracted game asset was used. No third-party code was copied into these additions. Integration reuses this project's existing event types, timing constants, canvas helpers, and shared character registry.

The precise design input was the owner's supplied five-entity brief and `docs/slime-family-reference.md`, sections 5–7: an asymmetric side-open liquid arch, a long ribbon runner, a pleated membrane shield, a branching bubble healer, and a low six-lobed pressure striker. The names, settings, bodies, faces and motions are inventions for this game. There is no claimed mythical, folkloric, historical or canonical creature source for any of the five. General physical forms (surface tension, folds, liquid filaments, branching membranes, bubbles and kneaded dough) supplied the conceptual vocabulary; no specific photographed object or artist's depiction supplied a traced or reproduced shape.

The design reference discusses DQMSL mechanics. It did not supply visual assets or permission to reuse concrete expression. This art task did not retrieve, embed, trace or imitate DQ character illustrations, depictions of Metal Goddess, or images from the cited strategy sources. The output intentionally avoids the combined classic blue pointed droplet body, round paired white eyes and large red smiling mouth, crowns and metallic humanoid ornament. This intent and a limited visual review are not proof that every possible similarity has been eliminated.

## New authored expression

| ID | Name | Silhouette, palette, face and motion |
| --- | --- | --- |
| 24 | うつろ泉 | A single thick, asymmetrical mauve-and-ivory arch opens to the right over a broad negative space. A small uneven-eyed face occupies the lower-left liquid bulge. The top arch has no head. The low base extends right without closing the opening. No stacked Talos rings, mechanical band body, Vritra coils, limbs, crown or central floating orb. It gathers gently, then unfolds up and sideways at the observed impact. |
| 25 | ひも雫 | One long coral, peach and muted wine-colored ribbon with an open rising bend, visibly flat return strip, and flattened lenticular leading end. One oval eye and one narrow crease make an asymmetric alert face. It contracts lengthwise and snaps forward in a short ribbon-whip motion. No pointed droplet crown, circular snake coil or wolf jump. |
| 26 | ひだまもり | A broad sage, cream and green-gray flexible membrane with irregular soft top and bottom edges, neighboring vertical pleats and unequal depth. Two short offset eyes sit across separate folds, with a tiny vertical mouth below. It compresses sideways and opens once into a planted wide shield. No stone blocks, rigid rectangle, umbrella handle or paper ribs. |
| 27 | あわ枝 | A pearl-pink dendritic fluid trunk has seven distinct terminal bubbles at unequal heights and two loose tiny bubbles. The eyes and smile sit on the lower trunk below the junction. Its inner branching seams and soft base use rose and muted plum. It compresses through the trunk and pulses outward into its branches. No animal head, humanoid limbs, tree bark, antlers or healing staff. |
| 28 | ねりこぶし | Exactly six uneven pressure lobes radiate around one low ochre, clay and plum body. The vertically compressed, weight-bearing footprint, shallow kneaded dimples and compact determined face read as a squat pressure striker. It kneads inward and delivers one short radial thrust. No glove, separate human arm, bronze armor, horns or horn-first bull charge. |

The full-body drawings and square portraits contain exactly the same internal geometry. All portraits preserve the whole identifying silhouette rather than replacing it with unrelated face art. The long runner therefore occupies a shallow central band of its square crop; its full body is intentionally not stretched to fill a square. Every party portrait and card image is static: no SVG animation, CSS motion, external resource, embedded image, embedded font, script or text glyph is contained in the asset. Battlefield sprites are drawn only for enemies.

## Files and source hashes

New artwork is in `src/slimeArt.ts`; `src/MonsterArt.tsx` adds its registry to the earlier registry. `src/battleMotion.ts` adds five new samplers and classifies `restoreMp` as support. Earlier sampler bodies remain unchanged. `src/BattleStage.tsx` routes the new bodies, effects and authoritative MP feedback. New tests are in `src/slimeArt.test.tsx`, with added cases in the existing motion and battlefield suites.

SHA-256 at this art handoff:

- `src/slimeArt.ts`: `f71e174731a4ce8cc4cc26d5a286cc7d0f751441361bfa0acfd6c8a6b6bd9e26`
- `src/MonsterArt.tsx`: `d14d9a1c15c3117bf9e5c955fc9ca14c5d1646d9365b98b66de697940565389c`
- `src/battleMotion.ts`: `cfb64eaa12d22d033b1ddf444878075b4b9fdf6a81a1a7382585d9941f1a3f4f`
- `src/BattleStage.tsx`: `7068d494fc29e85dbef16af4df8951b3f7d57ac53547bf459ccfe6f6167f0147`

The twelve earlier SVG drawings are unchanged: `src/fenrirArt.ts`, `src/familyArt.ts`, `src/dragonArt.ts` and `src/materialArt.ts` match their frozen staged source bytes. Their existing sprite widths remain 110, 99, 121, 127, 118, 125, 116, 112, 116, 124, 115 and 127 pixels, in ID order 12–23.

## Actual 20-view raster inspection

The actual SVG export strings were transpiled with the already-installed TypeScript compiler into a temporary module and written to temporary SVG files. The already-installed librsvg and Cairo libraries rasterized them through a Python ctypes harness. Pillow composed a contact sheet. This used the established prior-art inspection workflow, without launching a browser. The blocked local Chromium socket route was not retried and no alternate host was used. No raster or inspection library was added as a game asset or runtime dependency.

All twenty images were actually inspected after the final geometry/crop adjustment:

- Five full bodies at 280 × 210
- Five square portraits at 140 × 140
- Five battlefield figures at widths 119, 126, 119, 114 and 127, respectively, with 3:4-height ratio rounded down for the raster height
- Five dock portraits at 48 × 48

The inspected full-body alpha bounds (left, top, right, bottom) were:

| ID | Bounds |
| --- | --- |
| 24 | (39, 20, 242, 204) |
| 25 | (14, 75, 258, 191) |
| 26 | (37, 39, 250, 201) |
| 27 | (39, 16, 243, 203) |
| 28 | (29, 75, 254, 201) |

All full figures fit their frame with transparent corners. Final adjustments recentered the ribbon and membrane portraits vertically and compressed the six-lobed body into its lower, broader footprint. The inspected 48-pixel portraits retain five different identifiers: side-open arch, narrow ribbon, pleated plane, branching bubble tree, and low radial lobes. The arch's low-bulge face and open right side are visible. Full and battlefield-sized views preserve the seven main bubble nodes and six pressure lobes. Faces remain intentionally small on the membrane and branching figure; no separate enlarged face was substituted in the icons.

This review compared the newly authored five designs with each other, the written brief and the prior project silhouettes. It did not perform an exhaustive search or side-by-side survey of third-party character designs. Temporary evidence is `/tmp/slime-art-qa/contact.png`, ten `*-full.svg` / `*-portrait.svg` files and twenty size-labeled PNGs in that directory. Those files are local inspection evidence, not distributed assets or public links. Actual in-game browser verification remains part of the parent integration/release check and is not claimed here.

## Authoritative event and accessibility contract

- The core's MP supply is an actual selected `cast` with `effect:'restoreMp'` and `scope:'all'`, consuming its ordinary action. It is not a passive repair, free follow-up, HP heal or automatic round regeneration. The caption says `生存粘体 · N体へMP補給` using the retained authoritative target list.
- `kind:'supply'`, `effect:'slime-supply-spend'` is quiet bookkeeping. It does not release target marks, print a gain or end the preparation. A living core displays one small reserve light only when `Unit.supplyReady === true`; false, undefined and dead states display no light. HP, MP and turn number never reconstruct the allowance. Ordinary dispels do not remove it, and no invented supply-dispel label is added.
- Actual `kind:'resource-gain'`, `effect:'slime-supply'` events supply each exact capped `amount` and absolute MP. They trigger the observed impact, and the battlefield prints `MP +N`, including `MP +0` for an individually full recipient when that event is present. HP healing retains its separate `+N` form. Supply uses a pair of small reserve-capsule marks, not HP crosses, damage explosions or the material repair motif.
- The stage's health bars continue to read HP only. The resource-gain event has no HP field and does not trigger damage recoil or shake. Accessibility feedback says `MP +N` / `同時MP補給`, never `回復` or `ダメージ` for these gains. Allied gains stay off the enemy-only canvas but remain accessible through the announcement and existing dock integration.
- New body samplers use the established 800 ms source impact. `actionAge` holds at 799 ms until a real matching event arrives; no slow frame can prematurely release the supply, jet, fold, branch or thrust. All five use their own new sampler, not a recolored wolf, dragon or material motion.
- `押し流し` is an aimed narrow water jet released at the real single-target hit. It does not use the Vritra breath fan or an all-target field. The player's actual damage comes only from engine events; the visual never promises the fixed basis is the final mitigated damage.
- Support variants do not lunge or move the camera. Reduced motion removes new body travel, bobbing, stretching, tilting, camera motion, traveling jet/ribbon and expanding marks. Static signatures, fades, target scope, actual amounts and accessible announcements remain.
- 1×, 2× and 4× presentation uses the same source timeline; selected MP supply waits for the real gains at each rate. Clear/skip discards its cast/marks/numbers. Previously observed gain objects are not replayed on a later array rerender.

## Verification and remaining work

At this art handoff, the six focused art, earlier-family, motion and battlefield test files passed: 137 tests. `npx tsc --noEmit` also passed after integration. All final twenty rasters were rendered and visually inspected as described above. The review has not claimed live browser QA, CI, deployment or rights clearance.

Parent integration owns the final rights manifest registration/hashes, rights checker/self-tests, complete test suite/build, versioning, CI, live browser checks and release decisions. No publish, commit, staging, paid service, new installation, rights-holder contact, legal agreement, or license choice was performed by this art task. Trademark/name checks, exhaustive similarity review, rights-holder review and professional legal review remain unperformed; independent creation does not eliminate those open questions.
