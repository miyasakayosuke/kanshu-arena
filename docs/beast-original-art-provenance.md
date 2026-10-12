# Beast roster drawing process and provenance

Date: 2026-10-11 (UTC)

Scope: `src/beastOriginalArt.ts`, existing roster IDs 0 妖狐, 2 バステト, 7 セルキー, and 11 アヌビス. Names, IDs, statistics, gameplay, and integrations were not changed by this work. This is a source/provenance record, not legal clearance or a license grant.

## Actual creation process

- The assistant directly authored all SVG path coordinates, fills, gradients, strokes, and assembly code in a text patch for this project on the date above. The finished source is code-native vector artwork, not a downloaded, traced, raster-generated, or vectorized image.
- The only project files consulted for this drawing pass were `AGENTS.md`, `docs/rights/release-checklist.md`, `src/dragonArt.ts`, and `src/familyArt.ts`. Existing drawing modules were read for the SVG dimensions, export/data-URL conventions, shared-geometry portrait approach, and application-level visual weight. No creature paths were copied from those modules. The small SVG serialization/data-URL helper pattern follows those existing project modules.
- No browser, image search, modern illustration, game screenshot, museum image, reference image, model, icon library, font, or external source was used or embedded in this drawing pass. No specific artist or modern game's style was requested or used as a drawing target. The working brief supplied the four existing names and requested original, identifiable creatures.
- General background motifs were recalled without consulting source text or images: a fox with multiple tails; Bastet associated with a feline form; selkie associated with a seal and sealskin; Anubis associated with a jackal form and Egyptian funerary imagery. These recalled broad motifs are context for the designs, not a claim that every portrayal, name, or combination is free of rights.
- Each creature has its own gradient prefix (`by-`, `bb-`, `bs-`, `ba-`). The full-body SVG is 280 × 210 with viewBox `0 0 280 210`. Each 140 × 140 portrait uses a square, head-focused viewBox over the exact same artwork string as its full body. No separate portrait geometry was introduced.
- Surroundings remain transparent except for a small translucent grounding shadow. No embedded image, text/font, script, animation, external asset, trademark, copied description, or source-game insignia was added.

## Design decisions

| Existing ID/name | New silhouette and pose | Palette and authored details |
| --- | --- | --- |
| 0 妖狐 | Low, narrow fox stance; three long tails with separate vertical, diagonal, and horizontal directions; long near foreleg; large pointed ears and a small muzzle. | Wine/russet body, pale lilac/cream tails, jade throat bell. Tail interiors, cheek planes, toe divisions, eyebrows, and cord are individual hand-authored shapes. |
| 2 バステト | Upright seated feline with broad haunches, paired narrow forepaws, low enclosing oval tail, a lifted paw, and two tall triangular ears. | Desaturated deep teal, warm copper, rose hip wrap. Asymmetric leaf-like collar, open copper rattle, iris slits, ear interiors, cuffs, and cloth folds are directly authored. |
| 7 セルキー | Rounded seal head and long buoyant body; near flipper swept forward; two distinct hind flippers; an open doubled pelt collar rather than a human body. | Blue-grey pelt, pearl belly/muzzle, coral clasp, sea-green kelp. Whiskers, pelt edge, flipper rays, spotted body marks, and kelp leaves are independently drawn shapes. |
| 11 アヌビス | Slender walking jackal figure, very long unequal upright ears, horizontal tapered muzzle, bent forward leg, balancing narrow tail, and an offset open three-pronged rod. | Plum/charcoal, ivory linen, muted brass, restrained terracotta. Separate linen panels, geometric cuff bands, broad angular collar, rod highlights, and muzzle/cheek planes are directly authored. |

The open rattle, jade bell, and three-pronged rod are simple newly composed geometric props, not traced historical artifacts or reproductions of another game's equipment. The art does not claim historical, cultural, or religious accuracy.

## Validation and outstanding review

- Source validation on 2026-10-11: all four extracted artwork strings parse as SVG XML; the four drawings contain respectively 41, 43, 36, and 46 path elements; every gradient reference resolves to a unique ID within its artwork; no image, text, script, animation, or foreign-object elements were found. The exported roster keys are exactly 0, 2, 7, and 11. `git diff --check` reported no whitespace errors for the assigned paths. These are structural checks, not rendered visual inspection or a rights opinion.
- This author's handoff leaves render/contact-sheet inspection and final in-game inspection to the integrating parent task, as specified in the work assignment. The parent must record the actual render result rather than interpreting this source note as evidence that visual review already occurred.
- Required integration work remains: register these files and their actual origin in `docs/rights/asset-manifest.json`; perform the repository's required rights checks, tests, build, and release review; inspect full and portrait outputs at 48 px and approximately 100 px; and retain the resulting evidence.
- No targeted visual-similarity search, trademark/name search, specialist cultural review, or professional legal review was performed in this drawing pass. Common folklore associations, direct code authorship, absence of downloaded art, and passing automated checks do not establish non-infringement or exclusive ownership.
- The availability, protectability, and appropriate license for AI-assisted project art remain unresolved unless separately decided by the owner with applicable advice. No license was selected or expanded here. Project notices for third-party software do not license this art.
- Specific name use, overall character-expression similarity, and release-market implications remain review questions under `docs/rights/release-checklist.md`. Any newly identified concrete similarity or insufficient permission should be investigated before release rather than marked cleared by this note.


## Integration static-render addendum (2026-10-11 UTC)

Source SHA-256 reviewed: `810d4f37b20a3525ea4dcfa49611a91e7e95a5ca443e697c7d5a155441548a68`. The integration task rendered all body and portrait SVGs through Inkscape and inspected the 12 new creatures on light/dark backgrounds at full size, 48px portrait size, and reduced battle-like size. A separate reviewer inspected those raster sheets and the all-37 sheet. No concrete unknown embedded image/logo/collage, missing body, or palette-only duplicate was identified in that limited pass. This does not establish the nearest modern comparator for every creature, prove independent rights, or constitute legal clearance. The drawing-pass limitations above remain a historical record. Actual browser animation, target/hit/defeat states, and in-game CSS size are deferred to postdeployment verification.

Evidence: [dark sheet](visual-review/v020-original12-dark.png), [light sheet](visual-review/v020-original12-light.png), [all 37](visual-review/v020-all37-contact.png).
