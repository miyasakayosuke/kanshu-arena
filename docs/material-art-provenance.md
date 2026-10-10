# Material-family artwork and choreography provenance

Date: 2026-10-10 UTC. Development wave: v0.13 candidate, after the tested v0.12 dragon baseline. This is a production record, not legal clearance or permission to publish.

## Actual creator and method

The OpenAI coding assistant directly authored the SVG paths, primitives, gradients, palette combinations, portrait crops, and new material-family animation/effect code for this game during this task. No external illustration, reference image, sprite, logo, font, audio, model, traced outline, animation sample, extracted game asset, or copied third-party code was used for these additions. No image-generation tool was invoked. These code-native vectors were written as source and rasterized using already installed system libraries. Existing project timing constants and canvas helpers were reused for integration.

The supplied design brief and `docs/material-family-reference.md` supplied general mythical/folkloric motifs and gameplay roles. They did not license modern character expressions. This task did not retrieve contemporary game/film/comic character images or imitate a particular depicted pose or movement. The source text names below identify the research basis recorded by the reference document; the art task did not copy their translations or illustrations into the game.

Independent creation and a limited visual review cannot prove the absence of all similarity, trademark, or other rights concerns. Exhaustive visual-similarity comparisons, trademark searches, rights-holder review, and professional legal review remain unperformed. Mythical or folkloric subject matter is not a blanket clearance. These limitations remain governed by the rights review ledger and release checklist.

## Files and scope

- `src/materialArt.ts`: five original full-body SVG drawings, square portrait viewboxes reusing each drawing's geometry, local data URLs, and the family registry. No intrinsic animation or external embedded resources.
- `src/MonsterArt.tsx`: adds the material registry to the existing shared registry. Static allied portraits and full figures share source geometry with enemy battlefield sprites.
- `src/battleMotion.ts`: five newly authored samplers, without modifying earlier sampler bodies: Talos weight lift/drop/settle; umbrella tilt/open/drift-back; stepped-wall seat/short shove; tripod short roll/rim-tip; bull brace/low horn thrust.
- `src/BattleStage.tsx`: new material palettes, distinct authored marks and grounded field effects, finite repair-ready lights, truthful repair-dispel labels, and passive repair recipient feedback. Earlier palettes and all seven earlier SVG drawing sources are retained.
- `src/materialArt.test.tsx`, `src/BattleStage.test.tsx`, `src/battleMotion.test.ts`: static source and registry checks, enemy-only sprite loading, signature motion routing, authoritative delayed impacts, 1×/2×/4× timing, reduced motion, repair amounts and recipient counts, dispel/consumption, clear/skip, and prior-family regression coverage.

Art-source SHA-256:

`4d7b55fd429d72a4d427d7a1db1a14ea68fa12aba47c93791e56cf7713ac9462  src/materialArt.ts`

No change was made to `src/fenrirArt.ts`, `src/familyArt.ts`, or `src/dragonArt.ts`. The seven earlier registry sprite widths remain 110, 99, 121, 127, 118, 125, and 116 pixels.

## Five independent constructions

| ID | Creature | General source motif | Authored expression and portrait choice |
| --- | --- | --- | --- |
| 19 | タロス | Bronze guardian in [Apollodorus 1.9.26](https://www.theoi.com/Text/Apollodorus1.html) | Hollow dark-green torso with three visibly separated bronze bands; small offset flat head with a narrow incision; broad split feet; narrow left articulated hand and asymmetric barrel-hammer right forearm. Close upper-body portrait retains the ring construction. No film-style muscular naked bronze statue, stone-face orb, sword/shield/helmet outfit. |
| 20 | 唐傘おばけ | Umbrella apparitions documented by [Nichibunken's historical catalogue](https://www.nichibun.ac.jp/YoukaiGazouCard/U426_nichibunken_0452_0001_0007.html) | Unequal indigo paper panels, cream repair patches, visible ribs, two tiny stitched eye creases, and a green crooked suspended handle. No tongue, foot, mouth, arms or humanoid body. The whole umbrella remains in the square portrait because its outline is the identifier. The chosen two-crease face is an original treatment, not a claim of a canonical folklore form. |
| 21 | ぬりかべ | Intangible obstruction in the [Nichibunken folklore record 2180774](https://www.nichibun.ac.jp/cgi-bin/YoukaiDB3/youkai_card.cgi?ID=2180774) | Three unequal stepped stone/screen planes with staggered corners, bright ledges, visibly deep green edges and a few hovering fragments. No eyes, mouth, arms or legs. A wide portrait preserves all three planes. The physical construction is explicitly an invented visualization; the cited folklore does not specify a stone body. |
| 22 | 巡る三脚鼎 | Self-moving wheeled tripods in [Iliad 18](https://www.perseus.tufts.edu/hopper/text?doc=Perseus:abo:tlg,0012,001:18) | Shallow copper bowl with pale ceramic interior, two loop handles, three separate struts ending in exactly three visible green wheels, and three still steam curls. No head/face or robot humanoid. The whole vessel remains visible in the portrait. The descriptive name and healer function are game inventions. |
| 23 | 青銅の牡牛 | Bronze/fire-breathing bulls in [Argonautica 3](https://www.theoi.com/Text/ApolloniusRhodius3.html) | Low quadruped with four distinct legs, broad shoulder, short hinged muzzle, outward-flared pale horns, staggered bronze cast plates, green oxidized shoulder/hooves and plaited tail. Head-and-shoulder crop emphasizes horns and muzzle. This single game creature does not claim the source's two bulls form a game tag team. No fire-element or burn mechanic is implied. |

Talos, tripod, and bull have deliberately different silhouette, construction, stance, head treatment, limb count, and motion. Shared bronze colors do not make them the same geometry with palette swaps. The umbrella avoids the familiar combined one-eye, long-red-tongue, single-leg configuration; the wall avoids a flat rectangular smiling body with limbs.

## Actual raster inspection

Already installed librsvg and Cairo rendered the SVG strings through a temporary Python ctypes harness; Pillow composited the contact sheet. The SVG strings were materialized directly from the TypeScript exports. Neither these system tools nor the resulting QA rasters are added as runtime dependencies or game assets. No browser was launched for this vector inspection. The previously blocked local Chromium socket route was not retried. In-game cloud-browser QA is a separate parent-owned check and is not claimed by this report.

All 20 output rasters were nonempty and individually visible on the inspected contact sheet:

- Full figures: 280 × 210
- Portraits: 140 × 140
- Battlefield widths: 112, 116, 124, 115, 127 pixels respectively, at 3:4 height ratio (the harness rounds raster height down to an integer)
- Dock portraits: 48 × 48

Full-body alpha bounds, measured in the 280 × 210 source frame:

| ID | Bounds (left, top, right, bottom) |
| --- | --- |
| 19 | (36, 18, 237, 206) |
| 20 | (25, 13, 253, 200) |
| 21 | (28, 25, 256, 204) |
| 22 | (21, 18, 259, 205) |
| 23 | (12, 39, 263, 204) |

Every full figure fits inside its frame. Full figures retain transparent corners. Talos and bull intentionally crop portions of shoulders/body at the portrait edges; the broad umbrella, wall, and tripod portraits retain whole silhouettes at a smaller facial/object scale. At 48 pixels the five identifiers remain distinguishable: stacked rings, peaked paper fan/curled handle, three stepped planes, bowl/three wheels, and horned short muzzle. The full and battlefield renders make the tripod's three wheels, bull's four legs, wall's face-free layered edges, and Talos's ring gaps visible. This inspection compared the five newly authored game designs with each other; it did not perform an exhaustive comparison with modern third-party depictions.

Local inspection evidence: `/tmp/material-art-qa/contact.png`, plus each ID's `full.svg`, `portrait.svg`, and four size-labelled PNG files in that directory. These temporary files are inspection evidence, not release payload or a public URL.

## Authoritative presentation contract

- Registry IDs 19–23 select their own motion independently from existing wolf, nature, or dragon choreography. Guard/protect/heal/cleanse use the same material character's support variant when provided.
- `actionAge` holds preparation at 799 ms until an actual damage, heal, guard, cleanse, or break impact is observed. Talos's drop and wall's shove begin at the observed hit. Damage amounts always come from events.
- Talos's ground pulse is low and shared across an all-target attack; it is absent before impact. Umbrella effects are a sewn paper fan and fine stitches; wall effects are three staggered ledges; tripod effects are a shallow rim, three wheel dots and thin steam; bull effects are two horn hooks and short hoof tracks. These are directly authored canvas paths, not motion samples.
- `Unit.repairReady === true` alone enables three quiet lights in the living Talos torso. Undefined, consumed/dispelled false, and dead states have no lights. Current HP or turn number never reconstructs readiness.
- The authoritative engine `kind:'passive'`, `effect:'material-repair'` event is bookkeeping and produces no invented attack or hit. The playback layer provides a presentation-only retained cast with `passive:'material-repair'`, `effect:'heal'`, exact targets, and name `炉心の修復`. This is a finite end-turn repair cue, not an extra selected command.
- Actual `heal` events with `effect:'material-repair'` supply every repair number and target. The cast caption reports `生存物質 · N体修復`; it does not imply every unit of another family is repaired. Simultaneous heals are announced as simultaneous recovery, not as a damage impact. Broken readiness is labelled `修復待ち解除` only for a real break event with that removed field. Consumption/expiry is quiet.
- No resurrection, HP-zero recovery, damage explosion, poison cleansing, MP restoration, speed gain, or attack gain is added by presentation code.
- Only enemy units are drawn in the battlefield. Allied origins/targets stay below its roster, using a lower-edge accent when useful; allied portraits remain static. No new sprite is drawn for a party member.
- Reduced motion removes material body travel, bobbing, squash, tilt, camera motion and expanding marks. Static material accents, scope, repair counts, exact numbers, accessible announcements and fades remain. Clear/skip removes pending visual effects without mutating combat state.

## Verification and remaining work

- TypeScript `npx tsc --noEmit`: passed after integration.
- Focused artwork/earlier-family regression, motion and battlefield suites: 113 tests passed (five files) at completion of this work. A later integrated release may contain additional tests.
- All source SVGs were rasterized and the full contact sheet was actually inspected as described above.
- Parent release work owns final `rights:test`, `rights:check`, full-suite/build checks, final manifest hashes, and real in-game browser verification against the final integrated worktree.
- No publish, deployment, rights-holder contact, paid service, new software installation, or license choice was performed by this art task.
