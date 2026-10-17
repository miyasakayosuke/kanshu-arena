# Builder verification: one higher-jump correction

## Outcome

One coherent local mechanics candidate is complete for independent review. The
existing hip/root anchor rises **117 rather than 78 units: exactly 1.5×**. Standing
Y=-70, old apex Y=-148, new apex Y=-187, apex time=500 ms. Dimensions, bones,
contact targets/times, camera and scale are unchanged. Full 0–1500 ms progression
and 800 ms bite marker are retained. No original-art copying, editing or upload,
repository mutation, browser/server execution, game integration or release occurred.

The only authored motion-track change is root Y: load key 200 ms changes -47→-55,
plus a smooth 39-unit airborne lift at apex returning to zero by 800 ms. The
original 41-file frozen package was rehashed and remains unchanged. The synthetic
baseline source in the comparison is byte-identical to the existing frozen source.

## Verified results

- 6,001 geometry samples at 0.25 ms: pass.
- All primitive dimensions/counts and bone lengths invariant; max bone error
  4.263256414560601e-14 units.
- Supported-toe movement: 0 units. Minimum IK extension slack: 6.550224487274846 units.
- Whole-actor ink below ground: 0 units. Contact soles intentionally touch ground.
- Worst upper-leg bottom: y=-0.5197583944546338 at 930 ms, near hind leg, above floor.
- Old load error reproduced: y=+6.393969056951072 at 200 ms.
- 1,801 timestamps in each of two scales, actual unmasked overscan alpha pixels:
  zero below-ground pixels and zero outside-panel pixels.
- Old 200 ms positive control: 343 ground-penetrating pixels at enlarged scale,
  50 at native scale, detected by the same renderer/audit.
- Minimum actual full-ink panel margins: 71 px enlarged / 58 px native.
- All five movies fully decoded: 90 normal, 360 slow, 690 review,
  90 comparison-normal and 168 comparison-review frames. All are 60 fps.
- 1,272 actual lossless panel-border pixel checks: pass.
- Normal/slow timing, pause, seek, endpoint stop, replay and inline JS syntax: pass.
- Builder visually inspected the actual apex/load comparison images and full
  native phase sheet. Independent review of decoded motion is a separate gate.

Fontconfig emitted non-writable-cache warnings during rendering. System fonts
rendered in the inspected output; rendering and verification completed successfully.

## Limits retained

The rig remains schematic rather than final Fenrir art. Four limb chains persist,
but far limbs and jaw can overlap at small native scale. The pre-existing small
4° jaw reopen near 900 ms remains; this is one major bite, not exactly one jaw
open-close cycle. There is no target/impact alignment proof or physical simulation.
The recovery is translated 35 units left; preview repetitions reset explicitly.
No timed human playback, browser/game verification, performance, original-art
identity, final-animation approval, release or owner acceptance is claimed.

The candidate is frozen before independent review. Any remaining concerns are for
judgment, not an unapproved further correction or design iteration.
