# Independent review: Moonlit Bite fixed-rig pilot

Reviewed: 2026-10-16 UTC.

## Verdict

**Pass for owner evaluation as one bounded, mechanics-only experiment.** The continuous version visibly replaces the held control's articulation jumps with progressive motion while preserving fixed part dimensions and connected limbs. No blocking visual defect was found within this 360–660 ms schematic comparison.

**This is not acceptance of original-art animation, character identity, the full action, browser/game behavior, production integration, adoption, or release.** The remotely preserved package is also not fully self-contained for test reproduction; the missing files are identified below.

## Exact subject

- Repository: `miyasakayosuke/kanshu-arena`.
- Reviewed candidate commit: [`40b374c1a1e0e43001b632f72468cd96f8aa07f9`](https://github.com/miyasakayosuke/kanshu-arena/commit/40b374c1a1e0e43001b632f72468cd96f8aa07f9).
- Candidate directory: `docs/fixed-rig-transition-pilot/`.
- Local frozen package: `FREEZE-MANIFEST.json`, timestamp `2026-10-16T23:49:00Z`, containing 31 file entries.
- Existing timing reference: commit `62fb3a46c05427445922e8e7205c81d8dfd8390b`.
- Main comparison movie SHA-256: `0965fc7ce6727a08a37dbdebcd163758ec90b42cf44c5915c5387581ad9f0079`.
- Main comparison movie Git blob: `1472b70b7d0e5e6ceb2d53fcad4e4f24a755fac1`.

The complete local 31-file package passed byte-count and SHA-256 verification. An independent recursive-tree read of the exact candidate commit was not truncated. All 29 preserved manifest entries plus the freeze manifest itself matched independently calculated local Git blob hashes, with no mismatch. The only missing manifest entries were the two listed under remote limitations. The commit's changed-file list is confined to the candidate directory, not the original artwork or production game files.

## Visual evidence actually inspected

The review did not rely on passing tests alone:

- Inspected actual rendered 130 px and 142 px boundary PNGs, the enlarged 420 px sequence, and full paused comparisons.
- Fully decoded all three MP4s: 324 comparison frames, 18 normal frames, and 72 slow frames, without a decode failure.
- Visually inspected all 18 normal and all 72 slow decoded frames in temporal order, plus a decoded comparison end-hold frame. This was a decoded-frame review, not browser playback or a claim of timed human motion playback.
- Checked the 399/400, 459/460, and 559/560 ms paired stills, not just the four key poses.

B's torso, neck, head, four legs, paws, and tail remain attached. The larger view makes the articulated construction clear; overlapping limbs at the tuck do not become detached fragments. B rotates and folds progressively while A visibly jumps at its exposure changes. Head, torso, and paw dimensions do not reset between poses. Projected silhouette width changes with rotation, as expected; it is not being fitted independently to each frame.

Neither variant is cropped in the final reviewed framing. The camera origin and scale are fixed within each panel and identical between A and B. Their shared root translation is motion of the model, not camera tracking. Labels clearly identify a same-rig held-versus-continuous comparison and disclaim original-art/game/browser capture. Normal and slow sections and start/end holds are visibly labeled.

The 130/142/420 px values are fixed nominal reference scales, not promises of exact silhouette width or proof of anatomical correspondence with the original character. Viewers must use 100% pixel display to preserve the stated image scale.

## Source and numerical checks

Reviewed `rig.mjs`, the evidence-generation/rendering scripts, `test-rig.mjs`, and `verify-render.py`. There is no `verify-capture.mjs` in this candidate.

The implementation uses forward kinematics, constant bone lengths, fixed body-part shapes, and one shared set of poses. A holds those poses at 400/460/560 ms boundaries; B uses monotonic cubic joint angles through 360/430/510/660 ms. Both share identical proxy endpoints and the frozen root path. No animated scale, morph, crossfade, opacity concealment, or sprite replacement was found. The framing-only patch changes viewport/origin/layout, not pose geometry or timing.

Independent local reruns passed all nine focused rig checks:

- Bone invariance over 1,201 timestamps in each variant: maximum length error `2.84e-14` rig units.
- Root trajectory equality at all three scales: zero measured error.
- Continuous quarter-millisecond landmark steps, local angle-range limits, internal-knot angular-velocity continuity, exact proxy endpoints, constant scale/no fades, and input guards passed.
- The held control has large discontinuities at the three exposure boundaries; B's corresponding 0.001 ms differences remain below 0.0015 rig units.

The rendered-ink verification passed 12,010 samples across both variants and all five panel configurations at 0.25 ms spacing. The tightest margin was 8.6646 px, exceeding the stated conservative 2.6099 px between-sample displacement bound plus numerical allowance. The enlarged panel's minimum margin was 10.875 px.

All movies are 1280×1050 at 60 fps: comparison 324 frames/5.4 seconds, normal 18 frames/0.3 seconds, slow 72 frames/1.2 seconds. The standalone moving clips sample `[360,660)`; exact 660 ms is supplied by paused evidence and the comparison end hold. Lossy-codec frame-hash differences during holds are not evidence of additional distinct poses.

A separate scratch rebuild using the frozen source reproduced all 31 manifest hashes unchanged, including the delivered PNGs and MP4s. Candidate files were not modified. Fontconfig cache warnings did not prevent rendering. This local reproducibility result does not imply the incomplete remote directory can run every check by itself.

## Remote preservation limitations

At the reviewed commit, these frozen local entries are absent:

1. `reference/high-leap-timing.mjs`. Consequently `node source/test-rig.mjs` cannot run from the committed candidate directory alone because its import target is absent. The original timing source remains at the [frozen existing source path](https://github.com/miyasakayosuke/kanshu-arena/blob/62fb3a46c05427445922e8e7205c81d8dfd8390b/docs/fenrir-acting-bite/high-leap-timing.mjs). The reported local copy differs only by an additional trailing blank line. This storage omission does not mean the original choreography was edited.
2. `evidence/native-130px-boundaries.png`. Its frozen local pixels were inspected and reproduced, but that still sheet is not remotely preserved. The committed comparison movie still includes its 130 px panels; the 142 px boundary sheet and enlarged evidence are preserved.

`REMOTE-PRESERVATION.md` explicitly records these omissions and the incomplete standalone reproduction. It also clarifies that the remotely retained initial-layout evidence comprises the normal clip, one paused PNG, and initial rig source, plus the framing patch. Additional initial comparison/enlarged outputs mentioned in `FRAMING.md` are local only. The initial capture is not the final reviewed presentation.

These are archive/reproducibility limitations, not evidence that the reviewed continuous mechanics failed. The remote package must not be presented as a complete self-contained reproduction bundle.

## What remains unestablished

The placeholder is intentionally schematic. This review does not establish original face/fur/chain identity, continuity with original artwork at 360 or 660 ms, weight-bearing toe roll, jaw-impact force, landing/return quality, or the complete 1,500 ms action. Takeoff/load and landing from the older full-action study are separate and were not integrated into this pilot. No browser execution, game regression suite, gameplay acceptance, or production release check was performed.

**Recommended interpretation:** a useful, owner-showable demonstration that a shared fixed rig can remove the chosen held-pose discontinuities without resizing or disconnecting the body. Stop at evaluation of this one experiment; this report does not authorize another design iteration or integration.
