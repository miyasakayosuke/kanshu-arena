# Nature roster artwork: creation record and unresolved review

Creation date: 2026-10-11 (UTC).

## Scope and actual process

This record covers `src/natureOriginalArt.ts`, including full-body drawings and portraits for the existing IDs 3 ドリュアス, 6 ガルーダ, 9 烏天狗, and 10 ナーガ. Existing creature names, descriptions, combat statistics, and gameplay were outside this drawing task and were not changed in this file.

An OpenAI assistant authored the SVG coordinates, shapes, gradients, colours, layering, and crop choices directly as new TypeScript string literals for this project. No image-generation model, raster source, vector tracing, downloaded artwork, clip art, modern game sprite, screenshot, font glyph, logo, animation, script, or external image resource was used in making these drawings. The source uses SVG paths and elementary shapes. A portrait is a square viewBox crop of the exact same artwork string used for its full-body image, rather than an independently drawn face.

The assistant read the project's `AGENTS.md`, `docs/rights/release-checklist.md`, and the existing `src/dragonArt.ts` and `src/familyArt.ts` code to match output dimensions, registry properties, data-URL encoding, line-weight conventions, and shared portrait geometry. Those project files were implementation/format references. The new creature path geometry was directly authored for this task; no path blocks were copied from them. No browser was used, and no external visual reference was opened during this creation pass. General prior knowledge of plant spirits, eagle-like mythic birds, crow tengu, and hooded serpents informed the broad subject categories. This statement describes the actual process; it is not proof of originality, exclusivity, legal protection, or non-infringement.

## Deliberate character distinctions

- ID 3, ドリュアス: an uneven leafy crown above a hollow-wood face; forked twig fingers, articulated trunk grain, split root feet, and a small seed in one hand. Pale sage, olive, bark, and muted plum eyes. The silhouette is vertically branching, not winged.
- ID 6, ガルーダ: exceptionally wide outstretched wings with separately authored russet primary feathers, ivory coverts, a swept gold crest, white eagle-like head, low bronze belt, and spread landing talons. This is a broad, horizontal gold/russet bird shape. It is a fantasy interpretation, not a claim of an authentic or canonical religious depiction.
- ID 9, 烏天狗: a leaning crow with a long low dark beak, a small ochre cap, sage mountain cloak, short coral scarf, a single high folded/open wing, bent legs, and a separate five-leaf wind fan. The upright midnight-and-sage wedge contrasts deliberately with Garuda's broad open span and ivory face. Clothing and cap are simplified original fantasy design choices, not a copied costume from a specific modern work.
- ID 10, ナーガ: a hooded indigo serpent with asymmetric coil and raised tail hook, seven-panel coral hood, narrow arms around a pale pearl, a restrained gold collar, and small rounded serpent face. The hood and pearl establish a distinct portrait silhouette. It is a fantasy interpretation, not an assertion of religious or historical authenticity.

The wings, leaves, hood panels, facial features, fingers, scutes, clothing folds, and root forms are separately shaped elements rather than superficial detail added to a reused creature outline. All four use transparent surroundings with only a soft contact shadow. Each full SVG has width 280, height 210, and viewBox `0 0 280 210`; each portrait is 140 square. Gradient identifiers use creature-specific `no-dy-`, `no-ga-`, `no-ct-`, and `no-ng-` prefixes.

## Validation ownership

The drawing module exports `NATURE_ORIGINAL_ART` with `full`, `portrait`, `artUrl`, `portraitUrl`, and `spriteWidth` for all four IDs. Registry integration, artwork inventory updates in `docs/rights/asset-manifest.json`, rendered contact-sheet review at portrait size 48px and battle size around 100px, whole-roster visual comparison, all repository tests/build checks, and any deployment are owned by the integrating task. They must not be inferred complete from this creation record. Findings from actual rendering should be added below or recorded in the parent release evidence.

## Remaining rights and review questions

- No license is selected or granted for this project's own new artwork by this record. Existing third-party software licenses do not license these drawings.
- Mythic names and general motifs alone do not establish that a particular modern expression is safe to reuse. This pass did not copy a known specific expression, but no exhaustive search for coincidental similarity, trademark conflict, or independently existing character designs has been performed.
- Overall comparison of silhouette, face, colour arrangement, costume, equipment, poses, and presentation against potentially relevant modern works remains a human/release review question. Renaming or redrawing is not treated as automatic clearance.
- AI-assisted authorship, protectability, cultural context, territory-specific legal questions, and suitability for the owner's eventual publication and commercial use have not been professionally reviewed.
- This creation task did not contact rightsholders or counsel, accept legal terms, acquire a license, or authorize release. Any unresolved substantive concern should be handled under the existing release checklist and review ledger before release.

## Drawing-pass validation

Performed on 2026-10-11 (UTC):

- Parsed each of the four assembled SVG bodies with Python's XML parser successfully.
- Counted 40 path elements for Dryas, 39 for Garuda, 44 for crow tengu, and 37 for naga. These counts describe structure, not a guarantee of visual quality.
- Confirmed unique per-drawing gradient identifiers and that every `url(#...)` reference resolves within the same drawing.
- Confirmed absence of SVG image, text, script, animation, foreignObject, and use elements; no external media was included.
- Confirmed all four registry entries use the shared `character` wrapper, with 280×210 full bodies and 140×140 portraits from the same artwork strings.
- Transpiled `src/natureOriginalArt.ts` using the repository's installed TypeScript package with no diagnostics.

Rendered contact-sheet/size review, whole-roster comparison, full repository tests, rights inventory integration, and release review remain with the integrating task. No visual or legal clearance is asserted by these structural checks.


## Integration static-render addendum (2026-10-11 UTC)

Source SHA-256 reviewed: `4fe33500cec0c40630267c1fc355e26b4afc6cc8c3425a6b759cad1c2f853337`. The integration task rendered all body and portrait SVGs through Inkscape and inspected the 12 new creatures on light/dark backgrounds at full size, 48px portrait size, and reduced battle-like size. A separate reviewer inspected those raster sheets and the all-37 sheet. No concrete unknown embedded image/logo/collage, missing body, or palette-only duplicate was identified in that limited pass. This does not establish the nearest modern comparator for every creature, prove independent rights, or constitute legal clearance. The drawing-pass limitations above remain a historical record. Actual browser animation, target/hit/defeat states, and in-game CSS size are deferred to postdeployment verification.

Evidence: [dark sheet](visual-review/v020-original12-dark.png), [light sheet](visual-review/v020-original12-light.png), [all 37](visual-review/v020-all37-contact.png).

Integration adjusted Garuda’s native sprite width from128 to127 pixels to fit the existing maximum-width convention; SVG geometry and portrait crop were unchanged.
