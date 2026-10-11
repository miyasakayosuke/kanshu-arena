# Undead-family artwork provenance

Date: 2026-10-10 UTC. Art work began on material-baseline commit `bc55e50efff7e20be997aa683be95b2b40e88cf9`, alongside the parent-owned undead integration. This document records actual creation and limited verification. It is not legal clearance, a license grant, a release approval, or proof that the figures have been registered in a deployed game.

## Actual creation statement

The OpenAI coding assistant directly constructed the new paths, primitives, gradients, palette combinations, facial expressions, poses, and portrait crops in `src/undeadArt.ts` for this game during this task. All four figure bodies are new constructions. The project's existing static SVG/data-URL interface and illustration language were followed for compatibility; no earlier character's body geometry was copied or recolored to make these figures.

No image-generation tool was used. No external illustration, traced outline, downloaded asset, extracted sprite, model, modern logo or costume reference, font, audio, motion sample, or copied third-party code was used in these additions. No source illustration or page scan was opened. The historical motifs came from the supplied `docs/undead-family-reference.md` and the art brief. This art task did not independently recheck the historical editions or reproduce source prose. DQMSL discussion in the family reference is gameplay research, not permission or an instruction to use its character imagery; no DQMSL image, equipment, costume, animation, or drawing was used as a visual reference.

The task owns only:

- `src/undeadArt.ts`: four static full figures, shared-path portrait crops, deterministic SVG data URLs, and `UNDEAD_ART`.
- `src/undeadArt.test.tsx`: self-containment, structure, determinism, distinctness, compatibility, and registration-safe merge tests.
- `docs/undead-art-provenance.md`: this record.

Registration, family membership, game text, statistics, effects, motion, rights inventory, release packaging, and publication are outside this art task. The game's undead family is a gameplay grouping; the drawing and grouping make no claim that these traditions share a religious origin, belief system, or moral classification.

SHA-256 evidence:

- `src/undeadArt.ts`: `d5d1be973278fe2df6a80b2b88a74a738224fa02bf0279c0952de0dde05bec3e`
- `src/undeadArt.test.tsx`: `3f4d448e40fbd5893744469d9d6974d6a0312da2240a2d52d853292261c1d7d3`
- Final raster contact sheet: `95512db690dc67b6588d11232ebc169eb8a0a70844b438518d6ca0103d04d0c7`

## Supplied historical motifs versus new expression

The textual sources below are identified in the supplied family research. They establish the research trail, not rights in a modern depiction or translation. Findings are deliberately limited to the motifs reported there.

| ID / figure | Supplied textual motif and source | Independently authored visual expression |
| --- | --- | --- |
| 32 ドラウグル / Draugr | A dead inhabitant encountered in a burial mound and grappled with in [Magnússon and Morris's *The Story of Grettir the Strong*, preface dated 1869](https://www.gutenberg.org/cache/epub/12747/pg12747-images.html). | A very broad brown body with planted stone-colored feet and hands, one shallow flat stone on the left shoulder, diagonal cream burial cloth, a large front knot, ragged earth-colored hair, a solid olive-grey face, and narrow quiet eyes. The specific anatomy, wrapping, stone shape, colors, face, and pose are inventions. No horned helmet, crown, glowing blue armor, shield, or scythe. The cloth is not a historical reconstruction. |
| 33 首なしの馭者 / Headless Driver | Headless people, horses, and coaches appear in the Dullahan/death-coach section of [Croker's *Fairy Legends and Traditions of the South of Ireland*, 1844 edition](https://www.gutenberg.org/cache/epub/39752/pg39752-images.html). | A tall split-tail plum cloth driving coat, open angular collar with an uninterrupted dark void, slim looping reins, pale cuffs, short boots, and a warm polygonal face-lantern carried by a handle. The lantern is an abstract head-sign, not a graphic anatomical head. The collar/lantern pairing stays visible together in the portrait. No armored sword-and-shield knight, horse, wheeled coach, skull pile, or modern costume was used. Changing the name alone is not treated as sufficient differentiation. |
| 34 キョンシー / Jiangshi | The family research cites hanging hair and barefoot hopping in Yuan Mei's [*Zi Bu Yu*, volume 8, 批僵屍頰](https://zh.wikisource.org/wiki/%E5%AD%90%E4%B8%8D%E8%AA%9E/%E5%8D%B78), and a separate moving-corpse episode in [Pu Songling, Giles translation, 1880, story 106](https://www.gutenberg.org/files/43628/43628-h/43628-h.htm). | A short square mint/teal folded-cloth body, unequal bracket-shaped sleeves, one raised palm and one lower open hand, two small bare feet above the shadow, loose blue-grey hair, an ash-colored face, and a plain overlapping cloth neck fold. Face, costume, folds, palette, silhouette, and asymmetric pose are invented. No forehead paper, official robe/hat combination, film costume, vampire teeth, or copied ritual symbol. This does not claim there is one historically correct Jiangshi costume. |
| 35 ヴェータラ / Vetala | A corpse-animating spirit, Baital, hangs upside down from a tree in [Burton's *Vikram and the Vampire*, 1870 edition](https://www.gutenberg.org/cache/epub/48511/pg48511-images.html). The family research notes that this is an adaptation rather than a word-for-word source translation. | An openly inverted, narrow lilac branch-body with two hooked feet above its abdomen, a short broken suspension branch, a large muted-coral cloth knot, bent thread-like arms, an upside-down pale face, and hair hanging down. Sparse mint thread curves and stitch strokes are invented support-role decoration. There is no healer staff, religious emblem, floating coin, pouch, broad cape, bronze leg, flower, vessel, bubble, or water body. The source does not establish healing/cleansing powers; any such mechanics belong to this game. |

The four silhouettes are independent: low and broad; tall with a missing head and offset lantern; squat and square with unequal raised sleeves; and suspended with the head beneath thin jointed limbs. The warm brown, plum/amber, cool teal/ash, and lilac/coral combinations remain different at game sizes. No character is a palette replacement of another.

## Static API and portrait contract

- `UNDEAD_ART` has exactly IDs 32–35. Every entry structurally satisfies `{artUrl: string, portraitUrl: string, spriteWidth: number}` and additionally exposes `full` and `portrait` SVG strings for verification, matching the sibling art modules' inspection convention.
- Full figures have a 280 × 210 frame. Portraits have 140 × 140 output dimensions and square crop viewboxes. Full and portrait SVG interiors are byte-identical; only outer dimensions and viewbox differ.
- All four are ordinary static image assets. There are no animation nodes, timers, motion classes, gameplay counters, state-specific expressions, or embedded effects. Allied dock images can stay still. Enemy motion and event timing are separate parent-owned integration work.
- Exclusive gradient namespaces are `ud-`, `uh-`, `uj-`, and `uv-`, with three local gradients per figure. Only `svg`, `defs`, `linearGradient`, `stop`, `path`, and `ellipse` elements are used. There are no scripts, event handlers, external references, images, font/text nodes, styles, filters, foreign objects, or external use elements.

| ID | Portrait viewbox | Enemy width | Full-frame alpha bounds (left, top, right, bottom) |
| --- | --- | --- | --- |
| 32 | `83 15 113 113` | 120 px | `(24, 18, 250, 203)` |
| 33 | `86 17 160 160` | 116 px | `(33, 21, 234, 203)` |
| 34 | `89 20 106 106` | 116 px | `(18, 23, 252, 202)` |
| 35 | `75 53 152 152` | 112 px | `(71, 5, 213, 202)` |

Draugr and Jiangshi portraits emphasize their faces and chest construction. The coach driver's wider portrait intentionally keeps the empty collar and carried face-lantern in one composition. Vetala's portrait preserves the inverted torso/knot/arms/head relationship rather than rotating the face upright.

## Actual raster review: 20 useful views

The new TypeScript module was transpiled with the project's installed TypeScript, and its actual exported full/portrait strings were materialized under `/tmp/undead-art-qa`. All eight SVG documents passed Python's XML parser. The already installed librsvg and Cairo libraries rasterized the SVGs through a temporary QA harness adapted from the project's earlier artwork check; Pillow assembled the contact sheet. No rendering library or font was added to runtime dependencies or bundled as a game asset. No browser was launched for this static raster check.

Each figure was inspected in five views:

1. Full source-size figure, 280 × 210, on a light background.
2. Portrait, 140 × 140, on a light background.
3. Enemy image at its actual declared width and 3:4 height on a light background.
4. Dock portrait, 48 × 48, on a dark background.
5. Enemy image at the same declared width on a dark background.

All 20 PNGs had nonempty alpha bounds. Every full figure fits within its SVG frame and has transparent corners. The full-frame bounds are recorded above. Actual output pixels were opened and inspected, not inferred from source syntax or a successful test.

The first render had a close Vetala crop, `97 91 110 110`, which cut the knot and left distracting clipped hand fragments. After inspecting that sheet, the portrait was widened to `75 53 152 152` and all 20 views were regenerated and inspected. The final portrait retains the thin bent arms, complete large knot, and upside-down face as a coherent small silhouette. At 48 px its face is smaller than Draugr's, but the inverted knot/body relationship remains the main identifier. The coach driver's collar void and amber lantern remain distinguishable at 48 px; their individual fine linework is necessarily reduced. The 112–120 px enemy images preserve all four primary silhouette differences.

The actual sibling demon contact sheet was also opened for comparison. Vetala has a narrow inverted branch structure and lower face, unlike Mammon's upright broad hood/palms/pouch and Empusa's lateral flowing mantle with a single bronze leg. Banshee remains the existing device-rendered `👻` fallback in the inspected baseline, rather than a local SVG. No Banshee font glyph or bitmap was extracted; the new inverted branch-body is not based on it. This is a limited local comparison, not an exhaustive search of modern depictions.

Temporary QA evidence, not release payload:

- Final contact sheet: `/tmp/undead-art-qa/contact.png` (1400 × 620).
- First inspected sheet before the Vetala crop adjustment: `/tmp/undead-art-qa/contact-v1.png`.
- Source SVGs: `/tmp/undead-art-qa/{32,33,34,35}-{full,portrait}.svg`.
- Per-ID PNG naming: `ID-0-280.png`, `ID-1-140.png`, `ID-2-WIDTH.png`, `ID-3-48.png`, `ID-4-WIDTH.png` in the same temporary directory.
- Raster dimensions and bounds: `/tmp/undead-art-qa/raster-report.json`.
- QA harness and transpiled inspection module: `/tmp/undead-art-qa/render.py` and `/tmp/undead-art-qa/undeadArt.mjs`.

## Verification and remaining work

- `npm test -- --run src/undeadArt.test.tsx src/dragonArt.test.tsx src/materialArt.test.tsx`: 33 tests passed across three files, including all 16 new undead-art tests, after the final portrait adjustment.
- `npx tsc --noEmit`: passed after the final portrait adjustment.
- XML parsing and librsvg rasterization succeeded for all eight final exported SVGs and all 20 raster variants.
- The static image tests exercise the compatibility contract without requiring parent registration. The registry can merge while preserving every earlier entry; existing artwork is not mutated.
- Full repository tests, `rights:test`, `rights:check`, and production build are parent-owned post-integration checks and were not run by this art task. The new art must be entered in the actual rights inventory before release. This task did not change inventory, review-ledger, license, or notice files.
- In-game layout and motion review remain necessary after registration and battle integration. Static raster review does not establish correct motion timing or game behavior.

The creation statement, hashes, local comparisons, and mechanical checks do not prove the absence of similarity to every existing depiction, establish copyright ownership, clear trademarks, or replace legal review. Modern editions, translations, annotations, and artwork have separate rights. Any concrete similarity concern discovered later remains open under the release checklist. No original-content license was selected. No staging, commit, push, publication, purchase, external legal contact, or rights-holder contact was performed by this art task.
