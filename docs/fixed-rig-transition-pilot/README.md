# Moonlit Bite: one fixed-rig mechanics pilot

This is a **temporary schematic method comparison**, not a replacement character
design, original-art before/after, finished animation, browser recording or game
integration. It covers exactly **360–660ms (300ms)** of the existing action.
The original artwork and production game files were not loaded, modified or used
as pixels in this pilot. No image generator or external upload service was used.

## What to inspect

- `evidence/comparison-60fps.mp4`: two normal-speed passes followed by one 0.25×
  pass, with explicitly labeled start/end holds. Both sides are shown together.
- `evidence/normal-300ms-60fps.mp4`: exactly 18 decoded frames at 60fps, 0.300s.
- `evidence/slow-1200ms-60fps.mp4`: exactly 72 decoded frames, 1.200s.
- `evidence/native-130px-boundaries.png` and `native-142px-boundaries.png`:
  stopped comparisons at 360, 399, 400, 459, 460, 559, 560 and 660ms.
- `evidence/enlarged-420px-sequence.png`: larger skeletal views.
- `evidence/paused-360ms.png`, `paused-430ms.png`, `paused-510ms.png`, and
  `paused-660ms.png`: full-size paused comparisons.
- `index.html`: self-contained offline playback/seek preview. Its JavaScript was
  generated from the same model, but the page has **not** been browser-executed.

The PNGs preserve their stated reference scale only when viewed at 100% pixels.
In a responsive image viewer or HTML preview the complete display may be scaled.

## Controlled comparison

A holds the same temporary rig at its four key poses using the frozen exposure
boundaries: 400ms, 460ms and 560ms. B continuously articulates that same rig using
monotonic cubic joint interpolation through 360, 430, 510 and 660ms. No angle
overshoots its neighbouring keys. No body morph, per-pose size fit, crossfade,
opacity concealment or sprite substitution is used.

Both sides share:

- The identical fixed-length skeleton and fixed torso, head, muzzle and paw sizes.
- Four separate connected limbs and a fixed-length three-segment tail.
- Exactly the frozen source-origin translation over 360–660ms.
- Identical start/end **proxy** poses and constant scale/camera per panel.

The 130/142/420px labels refer to a fixed 240-unit nominal proxy reference scale,
not a fitted silhouette width or a proven anatomical match to the original art.
Projected screen bounds naturally change as fixed-size segments rotate.
The source's 800ms impact and 1500ms action duration are unchanged and outside
the pilot playback. The 0.300s clip samples [360,660); the exact 660ms endpoint is
shown in the paused evidence and the labeled end hold of the comparison movie.

## Evidence and limits

`evidence/tests.json` records nine focused checks, including 1,201 timestamp
samples for bone invariance, exact source root trajectory and no angle overshoot.
`evidence/render-verification.json` records 12,010 actual stroked-ink bounds,
a conservative velocity-bound margin check between samples, and full video
decoding/frame-count checks. These are not a whole-game regression pass.

The first capture clipped some feet/tail. That failed capture is retained in
`evidence/retained-initial-layout/`. Capture-only corrections enlarged the fixed
viewport and moved the fixed camera origin equally on both sides; no geometry,
joint pose, root timing or scale was changed. See `evidence/FRAMING.md`.

The model is intentionally schematic and has no finished face/fur/chain work.
Jaw impact, weight-bearing toe roll, landing, release/gameplay behaviour,
original-art continuity at either boundary, browser behaviour and production
quality are **not established**. An independent visual verdict is required before
owner evaluation. No further authoring, adoption, release or deployment is implied.

## Reproduce locally

Use existing Node.js, Python 3, system librsvg/Cairo, and ffmpeg/ffprobe:

```sh
node source/test-rig.mjs
node source/build-evidence.mjs
python source/render-evidence.py
python source/verify-render.py
```

No package installation, network, local server or browser is needed for these
checks. Fontconfig cache-write warnings occurred in this environment, but fonts
were rendered and the pipeline completed. Nothing attempts to change its security
settings or work around browser restrictions.

## Source

Frozen reference: `miyasakayosuke/kanshu-arena` at
`62fb3a46c05427445922e8e7205c81d8dfd8390b`, especially
`docs/fenrir-acting-bite/high-leap-timing.mjs`, `EXTENSION-TUCK-PLAN.md` and
`CURRENT-STATUS.md`. The local `reference/` copies are retained for reproducibility.
The synthetic pose coordinates were authored for this test, not traced from the
artwork. `asset-manifest.json` describes the new files and their origins.
