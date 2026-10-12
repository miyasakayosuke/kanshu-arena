# Mixed original-roster artwork provenance

Date: 2026-10-11 (UTC). Source baseline supplied for this assignment: `83109c7b`.

This record describes direct creation and the checks actually performed by the artwork author. It is not a license grant, a declaration of non-infringement, or professional legal clearance. Integration, release checks, rendered review, and the rights inventory remain the responsibility of the coordinating release task.

## Direct creation statement

The OpenAI coding assistant wrote the SVG geometry, gradients, palettes, layering, and portrait crop coordinates directly as TypeScript source for this project in this assignment. No image-generation model was used. No downloaded or attached image, sprite, modern illustration, reference photograph, tracing, extracted asset, font, logo, audio, animation, or third-party vector path was used to construct these four drawings.

The author read this repository's `AGENTS.md`, `docs/rights/release-checklist.md`, the existing `src/dragonArt.ts` and `src/familyArt.ts` source, and `docs/dragon-art-provenance.md`. The existing art modules supplied the project's SVG/data-URL interface, common full-body frame, static portrait approach, and code formatting. Their character paths were not copied or transformed into these additions. Reusing the small SVG wrapper/data-URL/registry pattern is recorded as reuse of existing project implementation, not a newly obtained third-party asset.

The assignment supplied the existing names and IDs, broad creature categories, a requirement for distinct silhouettes and anatomical construction, and a particular warning to distinguish the troll from DQ troll expression. Those constraints guided the new composition. No browser or external image search was used by this artwork author. No contemporary artist's style or a specific modern character depiction was requested or imitated. The existing creature labels serve as design prompts; this document does not assert historical accuracy or that every visual detail derives from a traditional source.

## Asset inventory and intended use

All new distributable source from this assignment is in `src/mixedOriginalArt.ts`:

- ID 1, トロル: `TROLL_ARTWORK` with prefix `mx-tr-`
- ID 4, バンシー: `BANSHEE_ARTWORK` with prefix `mx-ba-`
- ID 5, ケツァルコアトル: `QUETZALCOATL_ARTWORK` with prefix `mx-qu-`
- ID 8, イフリート: `IFRIT_ARTWORK` with prefix `mx-if-`

The exported `MIXED_ORIGINAL_ART` entries provide `full`, `portrait`, `artUrl`, `portraitUrl`, and `spriteWidth`. Each full SVG is 280 × 210 with viewBox `0 0 280 210`. Each portrait is 140 × 140 and embeds the exact same artwork string, using only a different square viewBox. Surroundings are transparent except for a translucent grounding shadow and creature-specific small wisps or embers. There is no background card, SVG text, embedded bitmap, external URL, executable script, or intrinsic animation.

These assets are intended to replace the visual presentation of these existing IDs in the project's roster, detail view, and battlefield through the existing art registry. This assignment changes no creature name, stat, family, skill, battle behavior, integration file, or motion logic. No permission for reuse outside the project, no public license for the project's own artwork, and no release/deployment authorization is established here.

## Individual design decisions

### ID 1: トロル

- An angular, stone-bodied giant with elongated forearms and shins, a narrow waist, a hunched stone-shelf shoulder, broad flat fingers, and an asymmetrical planted stance.
- Slate blue/gray skin, small moss patches, an ochre diagonal work wrap, and segmented feet. A narrow, long face has amber eyes and a closed mouth beneath a low broken-stone crest.
- No club or other weapon, prominent tusks, large exposed belly, flesh-colored muzzle, animal-skin costume, or exaggerated open mouth is included. These are deliberate choices responding to the brief's DQ troll similarity concern, rather than evidence of a comparison against all DQ artwork.
- Portrait viewBox: `74 6 139 139`. Intended battlefield width: 109 pixels. Authored path count: 44.

### ID 4: バンシー

- A hovering, narrow figure with an ivory teardrop face, two dark asymmetric looping veil/hair masses, an open reaching hand, and a second hand held beside the face.
- Desaturated indigo/blue-green folds end in separate curling mist ribbons rather than feet. Small rose-lilac tear marks and a tiny open mouth distinguish the lamenting face.
- The gesture, specific folds, hair loops, clasp, and colors are invented for this game. No traditional or modern costume is represented as an exact source.
- Portrait viewBox: `79 7 120 120`. Intended battlefield width: 115 pixels. Authored path count: 38.

### ID 5: ケツァルコアトル

- A limbless, gold/olive serpent with an open low coil, visible segmented pale belly, two unequal feather fans, and three long curling tail plumes.
- Teal/emerald feathers, a soft coral crest, a narrow snout, and pale amber eyes create a distinct color and silhouette combination. Short overlapping feathers mark the neck and coil.
- The broad feathered-serpent motif is the prompt's starting point. The drawing does not reproduce a specific archaeological representation, sculpture, religious image, modern game design, headdress, jewelry set, insignia, or glyph. This statement records creation practice and does not decide cultural-context or rights questions.
- Portrait viewBox: `43 5 151 151`. Intended battlefield width: 124 pixels. Authored path count: 50.

### ID 8: イフリート

- An upright fire spirit with a faceted dark basalt torso, a split lantern-like face, one open hand presenting a small ember, and one lower clenched stone hand.
- A crooked flame vortex replaces legs. An asymmetric swept flame crown surrounds the head; warm fissures continue through torso and hands.
- The palette combines plum/charcoal stone with orange, coral, and pale gold fire. There are no horns, wings, sword, crown jewelry, or copied armor components. The specific basalt anatomy and gestures are game-specific inventions.
- Portrait viewBox: `87 3 116 116`. Intended battlefield width: 112 pixels. Authored path count: 41.

## Checks performed by the asset author

- Parsed all four artwork strings as XML under an SVG root using Python's standard-library XML parser.
- Counted 44, 38, 50, and 41 actual path elements respectively, exceeding the requested 20 purposeful paths per creature. The counts do not include gradient definitions, ellipses, or comments.
- Checked that each artwork's IDs are unique, all `url(#...)` references resolve to IDs in that same artwork, and creature prefixes differ across all four assets.
- Checked for forbidden image/text/font/script/animation/foreign-object elements and link attributes; none were present.
- Confirmed source construction reuses the same artwork string for each full-body and portrait pair.
- Transpiled this single TypeScript module with the installed TypeScript compiler API: zero diagnostics. Imported the transpiled module and verified all four full-body/portrait dimensions, exact shared geometry after removing the opening root element, and both data-URL decoding round trips for each creature.
- A repository TypeScript no-emit check terminated with exit code 137 and no compiler diagnostic. A passing project type check is not claimed. The coordinating task must rerun it against the final integrated tree.

This author did not use a browser and has not yet claimed rendered pixel inspection at 48 pixels or battlefield size. The coordinating task is handling actual rendering, visual crop/frame checks, background transparency review, and any required revisions. Source validation is not visual validation. The full release checks (`rights:test`, `rights:check`, `test`, and `build`) must be run against the final integrated tree after the source and provenance have been entered into the rights inventory.

## Unresolved rights and review work

- Record this source and its actual origin, scope, and remaining questions in `docs/rights/asset-manifest.json`. This worker was limited to the art source and this provenance file, so it did not edit the manifest or review ledger.
- Render and inspect every full body and portrait at source size, actual battlefield width, and 48 × 48. Verify readable eyes and silhouette, intended portrait cropping, unclipped full-body edges, and transparent surroundings. Record actual results in the final release evidence.
- Complete the coordinating task's targeted visual-similarity review, especially the troll concern. No side-by-side reference comparison or exhaustive search is claimed here. Any reference pictures reviewed later must be recorded as review references and kept separate from assets used for creation.
- Creature names, potential trademarks, cultural or religious context, modern interpretations, and the overall combination of game presentation and mechanics remain within the project's ongoing review scope. Keeping an existing name or using a mythological motif is not clearance.
- The brief's prior DQMSL/DQ concerns are not erased by this new artwork. Direct path creation alone cannot establish that all rights risks are absent. Existing research materials and prior release history remain subject to their own records.
- No rightsholder was contacted, permission obtained, legal terms accepted, fee incurred, or independent professional legal opinion obtained by this assignment.

The project's own code/art licensing remains unchanged and unresolved where already pending. Third-party notices for unrelated software do not license these drawings.


## Integration static-render addendum (2026-10-11 UTC)

Source SHA-256 reviewed: `8132168f662feddb101d5138afcaf263e56d032b036d65479e45e6ca7a9240a0`. The integration task rendered all body and portrait SVGs through Inkscape and inspected the 12 new creatures on light/dark backgrounds at full size, 48px portrait size, and reduced battle-like size. A separate reviewer inspected those raster sheets and the all-37 sheet. No concrete unknown embedded image/logo/collage, missing body, or palette-only duplicate was identified in that limited pass. This does not establish the nearest modern comparator for every creature, prove independent rights, or constitute legal clearance. The drawing-pass limitations above remain a historical record. Actual browser animation, target/hit/defeat states, and in-game CSS size are deferred to postdeployment verification.

Evidence: [dark sheet](visual-review/v020-original12-dark.png), [light sheet](visual-review/v020-original12-light.png), [all 37](visual-review/v020-all37-contact.png).
