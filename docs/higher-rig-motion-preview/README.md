# Moonlit Bite: 1.5× higher-jump correction proxy

One bounded correction of the frozen full-action mechanics proposal, not finished
Fenrir artwork, game integration, browser capture, a release or owner acceptance.
The **unchanged original standing image remains separate**. No original raster
pixels were copied, edited, embedded or uploaded for this correction.

## Start here

- `evidence/comparison-review-60fps.mp4`: old versus corrected, same clock, fixed
  camera and fixed 420/142 px scale; one normal-speed action with labeled start/end
  holds. 168 frames / 2.8 seconds. The old side deliberately retains its known
  load-phase knee/ground intersection.
- `evidence/comparison-normal-1500ms-60fps.mp4`: exact 90-frame / 1.5-second
  old-versus-corrected normal-speed comparison, without holds.
- `evidence/full-motion-review-60fps.mp4`: corrected motion, two normal-speed
  passes and one 0.25× pass with labeled holds. 690 frames / 11.5 seconds.
- `evidence/normal-1500ms-60fps.mp4` and `evidence/slow-6000ms-60fps.mp4`:
  corrected motion only, 90 and 360 frames respectively, both at 60 fps.
- `evidence/native-142px-sequence.png` and `evidence/enlarged-420px-sequence.png`:
  fixed-scale paused phase/contact views. View native images at 100% pixels.
- `evidence/comparison-200ms.png` and `evidence/comparison-500ms.png`:
  load correction and exact apex comparison.
- `index.html`: self-contained normal/slow/pause/seek/restart preview. Its state
  logic and inline JavaScript syntax were tested; **no browser was executed**.

## Exact height metric and bounded correction

The metric is the existing hip/root torso anchor, measured vertically from its
original standing position. Screen Y increases downward.

| Quantity | Old frozen proxy | Corrected proxy |
| --- | ---: | ---: |
| Standing root Y | -70 | -70 |
| Root apex Y at 500 ms | -148 | -187 |
| Rise from original standing anchor | 78 units | 117 units |
| Rise ratio | 1.0× | **1.5×** |
| Rise at fixed native nominal scale | 46.15 px | 69.225 px |
| Rise at fixed enlarged nominal scale | 136.5 px | 204.75 px |

The only authored motion-track change is root Y:

1. Load key at 200 ms changes from -47 to -55. This shallower compression prevents
   the complete 17-unit-wide hind upper-leg stroke from passing through the floor.
2. A smooth additive lift is zero at 360 ms, 39 units at 500 ms, and zero again at
   800 ms. It raises the airborne arc without moving the takeoff/bite/landing times.

All non-Y axial tracks, body/part dimensions, bone lengths, paw targets, contact
rules, camera origins, panel sizes and display scales remain exactly unchanged.
No animated scaling, camera zoom, per-pose fitting, crossfade, masking, opacity
concealment, limb disappearance or original-image replacement is used.

The 142/420 px labels refer to the same fixed 240-unit nominal rig width, not each
frame's changing projected silhouette width. The comparison preserves those exact
scales and the old panel camera geometry for both candidates.

## Complete action, unchanged timings

- 0–100 ms standing; 100–220 ms load; 220–360 ms rear push and toe roll.
- Final rear toe release at 360 ms; root apex at 500 ms.
- Flight/tuck, then descent; major jaw opening peaks at 760 ms and closes at the
  **800 ms bite marker**. The pre-existing small 4° reopen at 900 ms remains.
- Near/far fore contacts at 890/900 ms, compression at 930 ms.
- Near/far rear contacts at 970/980 ms, then recovery.
- Exact final proxy standing pose at 1500 ms, translated 35 units left from start.
  This is not a seamless positional loop; review repetitions have explicit resets.
- Power 55 / MP 10 remain metadata only. No gameplay code was changed or executed.

Every supported toe remains fixed in world space. Four connected limb chains use
stretch-free two-bone IK; planted paw toe rolls and finite airborne/landing blends
are retained. Original skeletal proportions and fixed part geometry are unchanged.

## Verification

`evidence/tests.json` samples 6,001 timestamps at 0.25 ms spacing and verifies:

- Exact 78→117 rise, apex timing and unchanged start/end positions.
- Fixed bones, part dimensions, cameras, contact rules and other axial tracks.
- Zero supported-toe movement, valid unclamped IK reach, finite phase transitions.
- **Every full actor primitive against ground**, including all upper/lower leg
  strokes, paws, torso, head, jaw, tail and markers, not merely the foot centerline.
- Conservative stroked-ink panel bounds and exact standing recovery.

`evidence/pixel-audit.json` independently checks actual unmasked full-actor alpha
pixels at **1,801 timestamps in both fixed scales**: every integer ms 0–1500 plus
all distinct normal/slow movie times. Actors are rendered onto a 64 px overscan
canvas without a panel clip, background, ground cover, labels or contact markers.
It checks pixels below ground and outside the actual panel, and records true ink
margins. The old 200 ms knee intersection is a positive control that must fail the
same ground test. Selected unmasked PNGs are retained, including contact phases.

`evidence/render-verification.json` fully decodes all five movies and checks their
frame counts, frame rate, dimensions, hashes and rendered panel-border pixels.
`evidence/playback-tests.json` checks timing, pause, seek, exact stop and restart.

These are sampled kinematic/raster checks, not a proof of continuous-time physical
simulation, anatomical self-collision, realistic weight, target impact or original
character identity. Small native-scale far-leg/jaw overlaps remain schematic. There
is no target to establish bite impact alignment. No timed human playback, browser
behavior, game regression, production performance, final-art or release acceptance
is claimed. Independent review happens after this single candidate is frozen;
there is no post-review design iteration in this package.

## Reproduce offline

Preinstalled Node.js, Python with Pillow, system librsvg/Cairo and ffmpeg/ffprobe:

```sh
node source/test-rig.mjs
node source/build-evidence.mjs
node source/build-pixel-audit.mjs
python source/audit-pixels.py
python source/render-evidence.py
python source/verify-render.py
```

No network, package installation, browser, local server or original image is needed.
The unchanged synthetic `source/baseline-rig.mjs` reproduces the old comparison.
Generated per-frame intermediates and the large pixel-audit input are excluded from
the lean frozen archive; scripts regenerate them. Landmark data is deterministic gzip.

## Baseline identity

Frozen baseline commit:
[5ec50e4d39a3c49ab9a2b17442e7df871e5aedba](https://github.com/miyasakayosuke/kanshu-arena/tree/5ec50e4d39a3c49ab9a2b17442e7df871e5aedba/docs/full-rig-motion-preview).
Its original package remains unchanged. Original reference SHA-256:
`e072a556adb672e192065347486e674d091bb03892decfe0c84625c84ebd4137`.
The separate original image was inspected read-only, not duplicated.
