# Moonlit Bite: offscreen-leap temporary comparison

One bounded temporary-model composition: jump completely above the top of a fixed
battle viewport, remain out briefly, return from above, bite a marked practice
target while descending, and land/recover. This is not a movie cutaway, final art,
game integration, production UI, browser verification, release or owner acceptance.

## Watch

- `evidence/full-motion-review-60fps.mp4`: two normal-speed passes and one 0.25×
  pass, with labeled holds. 678 frames / 11.3 seconds at 60 fps.
- `evidence/comparison-review-60fps.mp4`: previous frozen 1.5× jump versus new
  offscreen leap, same clock/camera/model size, with start/end holds. 168 frames /
  2.8 seconds. A shared dummy and battle backdrop are added to the comparison
  presentation; the previous motion source is byte-identical and untouched.
- `evidence/normal-1500ms-60fps.mp4`: exact 90-frame, 1.5-second moving action.
- `evidence/slow-6000ms-60fps.mp4`: exact 360-frame, 6-second 0.25× action.
- `index.html`: self-contained play/pause/seek/restart preview. Its controller and
  inline syntax were tested, but no browser was executed.

Movies contain an enlarged 420 px nominal-scale view and an unscaled 142 px
nominal-scale view. These refer to the fixed 240-unit nominal rig width, not each
pose's silhouette width. The viewport sizes/origins/scales are identical to the
previous frozen proxy. Because the two viewports have different world-space top
edges, their exit/return times differ; neither camera moves or zooms.

## What changed

The original 1.5× rise is retained underneath an added vertical root track. The
extra lift is zero through 420 ms, reaches 260 units at 480 ms, stays at 260 until
600 ms, and smoothly returns to zero by 800 ms. It begins after all release
blends. The same continuous skeleton persists while outside the viewport: it is
not hidden by opacity, teleported, swapped, stretched, resized or faded.

The root apex remains at 500 ms: previous y=-187, new y=-447, standing y=-70.
Forepaws tuck 28 units farther behind the mouth during the bite approach, blended
back into the unchanged landing targets. This separates jaw/target contact from
paw contact without changing any bone lengths, body sizes or support times.
All non-Y axial tracks, including head and jaw, are unchanged.

The stationary dummy's solid head is centered at (-165.781865, -31.708685), the
midpoint of the muzzle and lower-jaw-tip closure locus at 800 ms. Its visible
crosshair remains in the battle frame. A brief ring from 800–870 ms marks the
bite; it does not hide or replace the actor. The dummy is a training target,
not an enemy animation or a physical collision simulation.

## Timings and measured evidence

- Load 100–220 ms, rear push/toe roll through 360 ms, final rear release 360 ms.
- Native viewport: geometry fully above approximately 465.5–614.75 ms; actual
  unmasked raster samples fully above 466–615 ms, about 149 ms. The model crosses
  back through the top and is fully visible again around 686.75 ms.
- Enlarged viewport: geometry fully above approximately 453.75–662 ms; raster
  samples 454–662 ms, about 208 ms. Fully visible again around 724.25 ms.
- Major jaw opening remains 36° at 760 ms and closes at **800 ms**. Muzzle and
  lower jaw tip each lie 2.6926 units from the target center, inside its radius 7.
  Root, muzzle and jaw tip are still moving downward at the bite.
- Solid target head versus all paw capsules, including stroke: minimum clearance
  1.87945 units across the action and 11.81576 units during 760–820 ms. The latter
  is 6.99 px at native scale and 20.68 px enlarged.
- Fore contacts remain 890/900 ms, compression 930 ms, rear contacts 970/980 ms.
- Recovery reaches the original standing pose translated 35 units left by
  1500 ms. Review repetitions reset explicitly rather than forming a seamless loop.
- Power 55 and MP 10 remain metadata only; no gameplay code was changed.

## Verification and decoded views

`evidence/tests.json` covers 6,001 times at 0.25 ms: invariant bone lengths and
primitive dimensions/counts, reachable IK, fixed supported toes, whole actor
ink above ground, side/bottom bounds, continuous phase transitions, intentional
offscreen duration, downward bite alignment, paw/target separation and recovery.
Maximum bone error is 4.26e-14 units; supported-toe movement and below-ground ink
are zero. Minimum side/bottom panel margin is 58 px.

`evidence/pixel-audit.json` checks actual full-actor alpha ink at 1,801 timestamps
in each scale, including every movie timestamp and integer millisecond. It uses
an unmasked overscan canvas tall enough to retain the whole offscreen actor,
without background, viewport clip, ground cover, dummy or labels. There are zero
pixels below ground or beyond the side/bottom viewport edges. Top clipping is
allowed only during the flight interval. Four unmasked PNGs are retained.

`evidence/render-verification.json` fully decodes all four movies (1,296 total
frames), checks 60 fps/dimensions/counts, records hashes, and verifies 1,272
lossless panel-border instances. The retained decoded sheets contain actual
movie pixels, never a replacement still render, and never resize panel pixels:

- `decoded-normal-native-all.png`: all 90 normal frames at native size.
- `decoded-normal-enlarged-phases.png`: 24 normal phase/contact frames.
- `decoded-slow-enlarged-phases.png`: 28 slow exit/return/bite/landing frames.
- `decoded-comparison-native.png`: 11 same-clock comparison times, previous
  above/new below, including exact 1500 ms end hold.

These are sampled kinematic/raster checks, not continuous-time physics, anatomical
self-collision, enemy reaction, production performance or real-time human playback
validation. Far limbs remain schematic and can overlap each other. The existing
small 4° jaw reopening around 900 ms remains: one major bite, not exactly one jaw
open-close cycle. The dummy's support arm is not collision-simulated. Original
art identity/continuity is not assessed. Browser, runtime and release are untested.

## Reproduce offline

Preinstalled Node.js, Python/Pillow, system librsvg/Cairo and ffmpeg/ffprobe suffice:

```sh
node source/test-rig.mjs
node source/build-evidence.mjs
python source/audit-pixels.py
python source/render-evidence.py
python source/verify-render.py
```

No network, installation, browser, server or original image is needed. Per-frame
SVG/PNG, decoded frames, ordered encoder inputs and the large raster-audit input
are regenerable intermediates excluded from the frozen package. Four videos and
ten selected PNGs are retained. The manifest records every packaged file's size,
SHA-256 and Git blob ID. The ZIP adds the manifest itself.

## Preserved baseline and original art

Baseline commit `3f5f401f079c077d17c842f1aef7d0341bd9c522`.
The prior 95 manifest-listed local files were
rehashed after generation and are unchanged. `source/baseline-rig.mjs` is an exact
copy of that frozen synthetic rig source (SHA-256
`91c28a97a909fdf719ccc848b8068ade27e8ea842ea9a43d659bfa86a8dcd318`).

No original reference image is included, copied, edited, uploaded or used as a
rendering input. The original image's creation provenance remains unverified.
Only the previously authored synthetic geometry is reused. This candidate is
frozen before independent review; no design iteration after that freeze is included.
