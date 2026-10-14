# Fenrir original-texture motion candidate

Isolated review candidate based on the accepted v0.20.34 code baseline. It is not imported by the game and does not adopt or deploy replacement art.

Open index.html through an ordinary static HTTP server. It shows one enlarged specimen and the same motion at the current game's front-row scale: 240 units in a 720-wide battlefield, approximately 130 CSS pixels in a 390-pixel-wide view. Pause, scrub and original-pose comparison are available. Reduced-motion preference starts paused.

## Artwork and limits

original.png is the existing user-selected project reference, retained byte-for-byte (1312 × 1199 RGBA). Its SHA-256 is e072a556adb672e192065347486e674d091bb03892decfe0c84625c84ebd4137. The project previously presented it as a proposed Fenrir illustration; the original creation tool/provenance has not been independently reverified in this pass. No new license, authorship or legal clearance is asserted.

The new work is independently written procedural WebGL mesh motion over that unchanged texture. No new raster generation, repainting, third-party animation, music, font, model, paid service or external asset URL is used. The prior Firefly example was inspected as a motion reference only; its bytes are not included here and its morphing chain/foreleg are not adopted.

The six-second cycle loads the shoulders, flexes the upper forelegs around fixed toe contacts, braces and recovers. Face/ear geometry and the lower chain use rigid transforms; the torso, mane and joint transitions deform smoothly. This is a 2D mesh candidate, not true skeletal reconstruction or a new 3D turn. It cannot reveal missing mouth or occluded anatomy. Original edge colors and silhouette are retained. Quality still requires actual rendered review and explicit owner visual approval.

## Verification

Run node --test docs/fenrir-motion-preview/rig-checks.mjs for loop, reduced-motion, planted-paw, face/chain-distance and mesh-orientation checks. These numeric checks do not substitute for visual review. The isolated Actions workflow runs existing aggregate game checks, actual Chromium capture at 24 frames per second, desktop/mobile checks and an MP4. It has contents:read and never deploys or modifies a branch.

Game engine, save logic, production character registry and existing art selection remain unchanged. The approved awakening integration is separate and is not merged here.
