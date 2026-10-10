# v0.12 dragon artwork and choreography provenance

Date: 2026-10-10 (UTC). Working release: v0.12. This records creation and inspection evidence; it is not a license grant or a legal clearance opinion.

## Direct creation statement

The SVG paths, primitive shapes, gradients, crop choices, palette combinations, and new dragon motion/effect code were independently authored for this game by the OpenAI coding assistant during the assigned v0.12 development task. No external illustration, reference image, downloaded sprite, logo, font, audio, model, animation sample, traced outline, extracted game asset, or copied third-party code was used to produce these additions. No image-generation model was invoked for these code-native SVG assets. They were written directly as source, then rasterized and inspected. Existing project canvas helpers and timing constants were reused to integrate the independently authored dragon choreography.

The assigned brief supplied creature names, general mythical motifs, gameplay roles, and requested colors. These do not provide permission to reuse anyone's modern expression. This task did not retrieve or imitate a contemporary game depiction, motion sequence, coat of arms, logo, or sculpture. Independent creation and this limited visual review do not establish the absence of all possible similarity or naming/trademark concerns. Those remain subject to the project's rights review ledger and release checklist.

## Source inventory

- `src/dragonArt.ts`: four full-body SVG drawings, four portraits reusing the same geometry, inline data URLs, and the `DRAGON_ART` family registry.
- `src/MonsterArt.tsx`: shared `CHARACTER_ART` registry serves static party portraits, profile art, and battlefield image loading. No intrinsic animation is included in a portrait or SVG.
- `src/battleMotion.ts`: original Vritra coil/compression–exhale–settle, Amphisbaena alternating-end twist, Lindwurm low brace/bite, and Zilant light wing-rise samplers.
- `src/BattleStage.tsx`: original full-width Vritra breath fan, copper storm seams, distinct opposite-end strike accents, and live storm-chamber highlights. Dynamic motion and charge lights are confined to battlefield enemies; allied portraits remain static and allied actors stay below the battlefield.
- `src/dragonArt.test.tsx`, `src/battleMotion.test.ts`, and `src/BattleStage.test.tsx`: source/render-contract, static-icon, scope, timing, metadata, and reduced-motion regression coverage.

Final art-source SHA-256:

`3f67ba964b985f85e7aaa13f5542b3d61af15bc0cdd4911764bbee348276fe6f  src/dragonArt.ts`

The Fenrir and existing family drawing source files were not edited. Their full-body dimensions, portrait URLs, and choreography remain covered by existing tests; their registry sprite widths remain 110, 99, and 121 respectively.

## Individual design decisions

| ID | Creature | Independently authored visual expression | Portrait decision |
| --- | --- | --- | --- |
| 15 | ヴリトラ | Large asymmetric double coil; deep indigo body, flat copper scutes, blunt wedge muzzle, swept horns, articulated pale throat; five dark polygonal storm chambers instead of limbs or wings | Head, throat, and chambers in a close square crop |
| 16 | リンドヴルム | Low green/ochre wingless wyrm; exactly two braced legs; large protective brow and tail hooked around the sheltered body; low dorsal plates | Close view of brow, neck, and near-leg armor |
| 17 | アンフィスバエナ | One continuous folded U-body with a head at either end; purple broad head with branching brow and copper eye; silver narrow head with swept cheek fan and teal eye | Deliberately wider crop keeps both opposite ends visible rather than hiding one head |
| 18 | ジラント | Slender teal/cream dragon; tall narrow wing and wider lower fan, curled tail, small suspended feet, fine horn-antennae; a water droplet held in cupped forelimbs | Head, water droplet, and wing root in a close square crop |

The Zilant design has no crown, lettering, heraldic shield, or black/red/gold coat-of-arms treatment. Its water-helper role and teal/cream expression are game-specific choices. Lindwurm's two-legged form is a chosen interpretation, not a claim that all traditional depictions share it. Amphisbaena's two heads occupy opposite body ends. Vritra's visible storm charging is a game mechanic, not a statement that the mythical source contains that mechanic.

## Actual raster inspection

The authored full-body and portrait SVG strings were materialized from the TypeScript exports and rasterized with already installed system librsvg and Cairo, through a temporary Python ctypes harness. Pillow composited a contact sheet for visual inspection; no raster outputs or system rendering libraries are distributed by this change. Local headless Chromium was attempted but could not create its process socket in this execution environment, so no browser-raster verification is claimed by this document.

Each creature was rendered and visually inspected at:

- 280 × 210 full-body source size
- 140 × 140 portrait size
- Actual battlefield source widths: Vritra 127, Lindwurm 118, Amphisbaena 125, Zilant 116 pixels, with a 3:4 height ratio (the temporary raster harness rounds down to whole pixels)
- 48 × 48 portrait size

The transparent full-body pixel bounds were respectively `(23,15)–(263,203)`, `(13,34)–(262,204)`, `(10,16)–(271,203)`, and `(23,18)–(261,202)`. This confirms all full-body edges fit inside the 280 × 210 art frame. All 16 raster outputs were nonempty. All images retained transparent corners and no opaque background card.

Visual inspection found readable and materially different silhouettes at full and battlefield sizes: stacked coil, horizontal two-legged wyrm, opposite-ended U-serpent, and narrow winged helper. The two Amphisbaena faces remain visible at 48 pixels, at a smaller facial scale than the other three close-cropped portraits. The chamber accents, two leg count, purple/silver ends, and carried water droplet were visible in the larger renders. Portrait cropping intentionally cuts the lower body or far wing/tail where appropriate. No artwork was downloaded or introduced as a rendering reference.

## Authoritative motion and charge contract

- The exact finisher name `渇天の息`, with all-target cast scope, selects the Vritra choreography.
- `BattleEvent.dragonChargeSpent?: number` on the retained cast is the sole source of burst scaling. The engine always supplies it for a current finisher, including zero. It is clamped to 0–5 for presentation. Older casts without it use the uncharged visual scale and do not invent a spent-charge label. No charge counter is exposed for a core whose starting formation did not enable the mechanic.
- `Unit.dragonCharge` is used only for idle live chamber lights on monster ID 15 when the field is present. During a finisher, held breath lights use the captured cast metadata and switch off at impact. Post-consumption unit state never reconstructs the finisher's strength.
- The body compresses during windup and waits if the authoritative impact is delayed. The stationary breath fan begins only at the observed hit. Every target's hit cue and number occurs together; the subsequent sweep is decorative, not damage ordering. Incoming breath terminates at the lower battlefield edge, where allied icons remain outside the canvas roster.
- Amphisbaena uses cast `hitTargets` and observed `hitIndex`, alternating purple and silver ends. It does not use Fenrir's pounce sampler.
- Reduced motion removes dragon body travel, bobbing, squash, tilt, camera movement, and travelling breath/strokes. It retains static coverage bands, per-target hit accents, clear scope/charge labels, damage numbers, and accessible hit announcements.
- `charge`, `resource`, `expire`, and `phase` bookkeeping events produce no fake hit particles. Only a real break event may display `竜気解除`.

## Verification record

- Focused art, existing-family regression, motion, and battlefield tests: 91 passing when completed; see the final task report for any later added tests.
- TypeScript check and complete release aggregate checks must be recorded against the final integrated worktree by the release owner.
- This document does not claim publication, deployment, external rights-holder permission, exhaustive image similarity search, professional legal review, or new third-party license clearance.
