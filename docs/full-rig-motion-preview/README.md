# Moonlit Bite: full-action motion proxy

This is **one temporary wireframe-like mechanics proposal**, covering the complete
**0–1500 ms** action. It is not final Fenrir artwork, an original-art animation,
game integration, browser capture, a release candidate, or owner approval.

Review this motion together with the **unchanged original standing image**, supplied
separately. No original pixels are embedded in this package. The synthetic rig is
not a tracing or a claim that the original character's proportions/identity have
already been matched. Finished face, fur, cuffs and chain work is deliberately absent.

## Start here

- `evidence/full-motion-review-60fps.mp4`: two normal-speed passes and one 0.25× pass,
  with labeled start/end holds. Both the enlarged and 142 px reference-scale views
  remain visible throughout. Total: 690 frames, 11.5 seconds at 60 fps.
- `evidence/normal-1500ms-60fps.mp4`: exactly 90 frames, 1.5 seconds at 60 fps.
- `evidence/slow-6000ms-60fps.mp4`: exactly 360 frames, 6 seconds at 60 fps.
- `evidence/native-142px-sequence.png`: paused phase/contact views at fixed native
  reference scale. Inspect at 100% pixels, not fit-to-window.
- `evidence/enlarged-420px-sequence.png`: larger phase views with bone/joint markers.
- `evidence/paused-800ms.png`: full-size bite-time view.
- `index.html`: self-contained normal/slow/pause/seek/restart preview. The playback
  state logic and inline JavaScript syntax were tested; the HTML was **not executed
  in a browser**. It keeps a 1280 px-wide stage instead of responsively shrinking it.

The 142/420 px labels refer to the same fixed 240-unit nominal rig reference width,
not to each frame's projected silhouette width. The body naturally projects to a
different screen width when it rotates. There is no per-pose fitting or animated
scale, camera tracking, crossfade, sprite substitution, or opacity concealment.

## Choreography and contact mechanics

The sequence covers standing, load, push, takeoff, flight/tuck, descent, bite,
forepaw reach, fore contact, compression, rear landing and standing recovery.

- 0–100 ms: standing hold.
- 100–220 ms: load, with toes fixed in world space; front toe-pivot release.
- 220–360 ms: push on rear support, with finite toe roll.
- 360 ms: final rear toe release; 500 ms: root apex.
- 560–800 ms: descent and jaw opening, closing exactly at the 800 ms bite marker.
- 800–890 ms: forepaw reach; near fore contact at 890 ms, far fore at 900 ms.
- 890–930 ms: compression on fixed fore toes.
- 970/980 ms: near/far rear contacts, followed by recovery.
- 1380–1500 ms: final standing hold. It is exactly the proxy's initial pose,
  translated 35 rig units left, with the landing toes still planted.

Each supported toe is a fixed world-space target. A rigid paw pivots around that toe
before release. Two-bone inverse kinematics resolves each limb without stretching,
clamping an unreachable target, or changing bone lengths. Airborne toe targets are
relative to their attached shoulder/hip, with finite, smooth release and landing
blends. Near and far limbs are separate connected chains with slight contact offsets.
The root and axial joints use shape-preserving tracks; they do not override support.

All masses, neck, jaw, limbs, paws and tail segments keep their dimensions. This is a
kinematic mechanics proposal, not a physically simulated animal or proof of natural
weight/force. The exact historical source translation is **not** reused over the full
sequence: the root is newly authored to make the full set of contact constraints
reachable. Existing timing markers (1500 ms duration / 800 ms bite / power 55 / MP 10)
are metadata only; production gameplay was not run or changed.

## Evidence and limits

`tests.json` checks 6,001 timestamps at 0.25 ms spacing, including fixed bone lengths,
zero supported-toe motion, reachable IK targets, no paw-ground penetration, finite
phase/contact transitions, fixed-camera ink margins, and exact proxy standing return.
`playback-tests.json` covers normal/slow timing, pause, seek, endpoint stop and replay.
`render-verification.json` records full decoding/frame counts for all three movies
and actual lossless rendered panel-border checks for every unique movie frame.

These checks do not substitute for the independent visual verdict. Browser behavior,
actual timed human playback, original-art continuity, final character identity,
production performance, game regressions, adoption and release are not established.
No implementation or design iteration after independent review is included in this
one experiment. The earlier 360–660 ms pilot is frozen and was not modified.

The first render completed without geometry or framing correction. Fontconfig cache
warnings occurred, but the system fonts rendered and all pipeline stages completed.

## Reproduce

Use existing Node.js, Python (with Pillow), system librsvg/Cairo and ffmpeg/ffprobe:

```sh
node source/test-rig.mjs
node source/build-evidence.mjs
python source/render-evidence.py
python source/verify-render.py
```

No network, package installation, browser or local server is needed. This package's
source files are self-contained and do not import the historical timing file.
Intermediate frame SVGs/PNGs and ordered hardlinks are regenerable local scratch,
not part of the lean frozen archive. The dense 1 ms landmark output is retained in
deterministic gzip form, with both raw and compressed hashes in the manifest.

## References

- [Historical full-action choreography](https://github.com/miyasakayosuke/kanshu-arena/blob/62fb3a46c05427445922e8e7205c81d8dfd8390b/docs/fenrir-acting-bite/high-leap-timing.mjs)
- [Earlier frozen 300 ms rig experiment](https://github.com/miyasakayosuke/kanshu-arena/tree/40b374c1a1e0e43001b632f72468cd96f8aa07f9/docs/fixed-rig-transition-pilot)
- Original standing reference: SHA-256
  `e072a556adb672e192065347486e674d091bb03892decfe0c84625c84ebd4137`;
  Git blob `31516b206f4796c8bf8848eacc46186c2e43ea42`. It was inspected read-only and
  remains an existing separately supplied image, not a new upload or edited asset.
