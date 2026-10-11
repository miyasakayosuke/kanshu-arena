# Demon-family artwork provenance

Date: 2026-10-10 UTC. Prepared on material baseline `bc55e50efff7e20be997aa683be95b2b40e88cf9`, for later integration after the slime wave. This records actual creation and limited checks. It is not legal clearance, a release approval, or evidence that the new characters are already registered in the game.

## Actual creation and scope

The OpenAI coding assistant directly constructed all new paths, primitives, gradients, palette combinations, poses, expressions, and portrait crops in `src/demonArt.ts` during this task. No image-generation tool was used. No contemporary character images were retrieved or referenced. No external illustration, downloaded asset, traced outline, sprite, model, logo, font, audio, motion sample, or copied third-party code was used. The existing project's static SVG export shape was followed for compatibility; new character geometry was authored directly rather than derived from an existing drawing.

The supplied brief, `docs/demon-family-reference.md`, and the textual sources below informed broad literary/folkloric motifs. Source text was read for those motifs, not copied into game prose. No source illustrations or page scans were opened. A modern edition, translation, annotation, or depiction has its own rights; linking one does not grant permission to reproduce it. DQMSL research in the family reference document supplied gameplay context only. No DQMSL character image, costume, pose, animation, or other concrete expression was used as an art reference.

Files owned by this art task:

- `src/demonArt.ts`: static source geometry, data URLs, close face-oriented portrait crops, and a three-entry export registry.
- `src/demonArt.test.tsx`: URL, geometry, determinism, namespace, static-image contract, and earlier-art compatibility tests.
- `docs/demon-art-provenance.md`: this record.

No other repository file was changed by this art task. Existing Troll and Ifrit assets remain unchanged. Registration, roster statistics and skills, battle movement/effects, rights inventory, packaging, and publication are parent-owned work. The `demon` family is a game-specific combat classification, not a claim that Troll, Ifrit, Mammon, Kobold, and Empusa share a religious origin or theological classification.

Art-source SHA-256:

`b75e87fa248de36e505513199d172a320a20ee3e4d57c234122623e34b59e421  src/demonArt.ts`

Test-source SHA-256:

`2a7c9a4357bc21f7f6608494effac1cbceb8b70a2e6e594e8d31d1a5bcf17b45  src/demonArt.test.tsx`

## Source motifs versus invented expression

| ID / intended role | Textual basis checked | Newly authored visual expression |
| --- | --- | --- |
| 29 マモン / Mammon, C5 targeted MP-pressure core | [University of Toronto, Milton's *Paradise Lost*, Book I](https://rpo.library.utoronto.ca/content/paradise-lost-book-i), lines 678 onward and the note to 678: wealth is personified and Milton treats Mammon as a fallen spirit. This does not establish an originally biblical horned deity. | An asymmetrically draped teal resource broker, warm narrow mask, short crooked hood, long cream lining, open palms, three unmarked floating tokens, and one plum pouch offset to the right. Watchful eyes and a small sideways smile were invented. No horns, animal muzzle, wings, currency logo, religious emblem, or mechanical torso rings. Tokens are decorative finite objects, not a live MP counter or a promise of MP absorption/restoration. |
| 30 コボルト / Kobold, C2 fast before-hit breaker | [Grimm, *Deutsche Sagen*, volume I, story 71, 1816](https://de.wikisource.org/wiki/Der_Kobold_(Br%C3%BCder_Grimm)): a domestic spirit associated with household work, help, and mischief. This design selects the household tradition rather than requiring a mining costume. A modern canine or reptilian RPG form is not treated as universal folklore. | A tiny soot-colored spirit in a patched green work coat, flat folded cap, two short boots, one comically long sweeping sleeve, and a blunt bent wooden latch-lifter. Cheerful closed eyes contrast with the two other faces. No dog ears, reptile scales, tail, animal muzzle, pointed gnome hat, weapon blade, or copied modern costume. All specific color, cloth, cap, tool, and facial choices are inventions. |
| 31 エンプーサ / Empusa, C4 attacker with a small cleanse option | [Aristophanes, *Frogs*, university-hosted text](https://web.viu.ca/johnstoi/aristophanes/frogs.htm), the encounter around source lines 285–295: a changing apparition and one bronze leg. Descriptions of the other leg and associations vary across sources. The modern translation was consulted only for facts and was not reproduced. | A tall tilted apparition with an airy manta-like cloth silhouette, pale mint upper mantle, violet underside, swept hood, small ivory face, one bent bronze leg and unshod foot, and a lower contour dissolving into invented mist. The side points are cloth, not anatomical wings. The mist replaces the other visible lower contour as an artistic decision, not a claim that the historical text specifies a mist leg. The face, costume, palette, stance, and cleanse role are inventions. No actual transformation, charm, flight, or vampiric mechanic is claimed by this drawing. |

Each full figure is an independent construction, not a recolor. Mammon's compact vertical body ends in broad open palms and a hanging pouch; Kobold has a low, squat center and long left sleeve balanced by a right tool; Empusa has a light, broad diagonal mantle above a single slim bronze leg. Shared soft shading and colored outlines preserve the game's existing illustration language without using an earlier creature's silhouette.

## Static presentation contract

- `DEMON_ART` exports exactly IDs 29, 30, and 31. Each entry has `full`, `portrait`, `artUrl`, `portraitUrl`, and `spriteWidth`.
- The full frame is 280 × 210. Portraits are 140 × 140 SVGs with square viewboxes. Their interior SVG markup is byte-equivalent to the full drawing; only the outer dimensions and viewbox change.
- Mammon: portrait `78 14 113 113`, enemy width 116. Kobold: portrait `65 42 136 136`, enemy width 110. Empusa: portrait `95 12 99 99`, enemy width 119.
- Crops intentionally favor readable faces and upper garments. They cut off portions of the body and hands. Empusa's bronze leg is a full-figure/battlefield identifier, not visible in the close face portrait.
- Gradient IDs use the exclusive prefixes `dm-`, `dk-`, and `de-`. SVGs contain no embedded scripts, event handlers, external URLs, fonts, images, filters, animation nodes, or external use references. Data URLs are deterministic local encodings.
- There is no intrinsic movement, state counter, hit feedback, or gameplay effect in the source. Allied dock portraits remain suitable for static rendering. Parent-owned battle integration must preserve existing enemy-only motion rules and authoritative gameplay events.

## Actual raster inspection: 12 variants

The exported SVG strings were materialized from the TypeScript module and rasterized through the already installed librsvg and Cairo system libraries, using the project's earlier temporary QA harness. Pillow arranged the generated rasters into a contact sheet. The harness, raster files, and its system libraries are not added as game assets or runtime dependencies. No browser was launched, and the previously blocked local Chromium/socket route was not retried.

All 12 output PNGs were nonempty, and actual rendered pixels were inspected together on the contact sheet:

| ID | Full figure | Portrait | Enemy battlefield | Dock portrait | Full-frame alpha bounds (left, top, right, bottom) |
| --- | --- | --- | --- | --- | --- |
| 29 | 280 × 210 | 140 × 140 | 116 × 87 | 48 × 48 | (29, 17, 243, 204) |
| 30 | 280 × 210 | 140 × 140 | 110 × 82 | 48 × 48 | (24, 46, 244, 202) |
| 31 | 280 × 210 | 140 × 140 | 119 × 89 | 48 × 48 | (33, 15, 246, 204) |

The battlefield height is the integer-truncated 3:4 aspect ratio. Every full figure fits within its frame and retains transparent corners. At the inspected battlefield sizes, Mammon's open hands and pouch, Kobold's cap/sleeve/tool, and Empusa's mantle plus bronze leg remain distinguishable. The 48 px close portraits retain readable, different expressions: watchful narrow eyes, smiling closed eyes, and slanted half-lidded eyes. The parent also inspected the contact sheet and independently confirmed the distinct silhouettes, 48 px faces, and visible bronze leg before integration.

Inspection evidence is temporary local QA output, not release payload:

- Contact sheet: `/tmp/demon-art-qa/contact.png`
- Mammon: `/tmp/demon-art-qa/29-0-280.png`, `29-1-140.png`, `29-2-116.png`, `29-3-48.png`
- Kobold: `/tmp/demon-art-qa/30-0-280.png`, `30-1-140.png`, `30-2-110.png`, `30-3-48.png`
- Empusa: `/tmp/demon-art-qa/31-0-280.png`, `31-1-140.png`, `31-2-119.png`, `31-3-48.png`
- Each ID's materialized `full.svg` and `portrait.svg`, the transpiled `demonArt.mjs`, and the rasterization harness are in the same temporary directory.

## Verification and unresolved limits

- Focused new/earlier SVG suites: 27 tests passed across three files, including 10 new demon-art tests.
- `npx tsc --noEmit`: passed.
- `npm test`: all 968 tests passed across 43 files on this material-baseline worktree with the unregistered art additions.
- `npm run rights:test`: 3 of 14 tests passed; 11 were blocked by the newly added, not-yet-inventoried `src/demonArt.ts`. This is not a clean rights-test result.
- `npm run rights:check`: failed with `New inline artwork/font/audio/canvas source needs provenance: src/demonArt.ts`.
- `npm run build`: stopped at that same required inventory gate, before its TypeScript/Vite build stages. The separate TypeScript check passed, but no production build is claimed. Parent must add the actual art origin/hash to the rights inventory and rerun all release checks after integration.
- The static HTML compatibility test deliberately exercises the existing image contract without claiming `MonsterArt` already selects IDs 29–31. It remains compatible with later parent registration.
- All 12 raster variants were actually inspected as described above. Live in-game art/motion review is still required after integration.
- The source inventory must be updated by the parent before release. No rights inventory file was changed here.

Independent creation, a source hash, and inspection of these three designs cannot prove absence of similarity to every existing depiction. This task compared the new designs with one another and the local illustration style; it did not undertake exhaustive modern-character visual comparisons, trademark searches, rights-holder review, or professional legal review. Mythological names and old literary motifs do not automatically clear a new expression, title, or commercial use. Any concrete similarity concern discovered later remains open under the release checklist and rights review ledger.

No staging, commit, push, publication, purchase, license selection, or external rights-holder/legal contact was performed by this art task.
