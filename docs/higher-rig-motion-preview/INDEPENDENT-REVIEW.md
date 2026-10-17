# Independent review: 1.5× higher-jump correction

## Verdict

**Pass for the bounded temporary-proxy correction and for showing the comparison.** The same model visibly jumps higher, by exactly 1.5× the agreed standing-to-root-apex excursion. The previous load-phase hind-knee/floor intersection is corrected. No blocking regression in the inspected load, push, flight, bite, fore contact, rear contact or recovery was found. This is not final-art, physical-realism, browser, game or release acceptance.

## Frozen identity

- Local candidate frozen at 2026-10-17T00:26:11Z.
- All 95 manifest-listed files independently match their sizes, SHA-256 hashes and recomputed Git blob IDs; they were rechecked after a brief executor transport interruption.
- FREEZE-MANIFEST.json SHA-256: `ab5f562f3a6debca39e6a5ec3c43e5b641fee83c41d6d7c34d307603b0b0003d`.
- ZIP archive SHA-256 `71b48e8dfdcc18c437739038c43ec59f021149346fdcf0d02d63ca37ad8a3362`; all 96 entries match the 95 frozen files plus manifest exactly.
- Corrected full review SHA-256: `67ff64f43bc389644b3bae0206616d18decb85e3d2770b20770cba170995e14f`.
- Normal old/new comparison SHA-256: `712b06fe4ace7beffb749f74b6f61432388356bef95cc9e32afc9c6daec85aec`.
- Independently confirmed remote binding by read-only GitHub API: commit `3f5f401f079c077d17c842f1aef7d0341bd9c522` → root tree `7b8685c8e9594d7c0d002c7d2b820e958fd717c1` → docs tree `b9b4785e2500a6debd62edfb7d6de21f90add775` → higher-rig preview tree `5fe001c4222e17ac7d3e2dbfc08362f664087e82`. All 95 frozen files match remote Git blobs and sizes, as does the 22,451-byte manifest (blob `a8d8e436f8ae7ab6bf54f40da042ea54f53876c4`). All queried trees were untruncated. Remote preservation is verified, not merge/deployment/release. The extra `PRESERVATION-CHECKPOINT.md` is storage bookkeeping, outside the frozen 95-file candidate.
- Baseline is the prior full proxy at commit `5ec50e4d39a3c49ab9a2b17442e7df871e5aedba`; the candidate's synthetic baseline source is byte-identical to its frozen source. All 41 old frozen files remain unchanged; the remote old-preview tree also remains `4ca83c84169f1af9bcd47e477f9d21d7ea864b8e`.
- Original standing image viewed in place only; unchanged SHA-256 `e072a556adb672e192065347486e674d091bb03892decfe0c84625c84ebd4137`. No copying, editing, upload or storage-denial retry was performed. Original creation provenance is still unverified.

## Findings

1. **Height:** standing hip/root y=-70; old apex y=-148 (78-unit rise); corrected apex y=-187 (117-unit rise), at 500 ms in both. Ratio is exactly 1.5. At fixed 142 px nominal reference scale this is 46.15→69.225 px, not a camera zoom or enlarged model. Same-clock decoded comparison makes the difference plainly visible.
2. **Scope and dimensions:** source diff changes root Y only within motion tracks: the 200 ms load key is -55 instead of -47, plus 39 units of extra airborne lift peaking at 500 ms and gone by 800 ms. All other axial tracks, bones, part widths/dimensions, primitive counts, contact rules, panel sizes, camera origins and scales are unchanged.
3. **Ground:** an independent implementation tested every actor primitive at 6,001 quarter-millisecond samples, 282,047 primitive checks. No corrected actor ink is below y=0. The closest non-paw stroke is 0.5197583945 units above floor at 930 ms; paw soles intentionally touch it. The same harness reproduces the old 165.00–240.25 ms error, maximum +6.3939690570 at 200 ms. The correction is also directly visible in actual decoded normal/slow frames.
4. **Contact and framing:** supported toes have zero measured movement; bone-length maximum numerical error is 4.2632564146e-14 units. Load, toe roll, rear push/release, tuck, descent, fore reach/contact/compression, rear contact and standing recovery remain readable. No visible new slip, pop, disappearing limb or panel clipping emerged. No root-apex clipping is present. Fore contacts remain 890/900 ms and rear contacts 970/980 ms.
5. **Retained limits:** far limbs overlap near limbs, particularly at native scale. The jaw overlaps the tucked forepaw region around the major bite and is less readable at 142 px. It still opens to 36° at 760 ms and closes at the 800 ms bite marker, with the pre-existing small 4° reopen near 900 ms. This is one major bite, not exactly one jaw cycle. There is no target, so impact alignment is unproven. Final standing remains translated 35 units left; labeled review resets are not a seamless action loop. These do not obstruct judging the requested higher jump, but are not resolved final-animation qualities.

## Independent verification performed

- Candidate was read-only; all re-rendering and analysis were isolated outside it.
- Read rig, comparison, tests, playback, render/audit code and documentation.
- Independently tested height, all rendered primitive bounds (including conservative triangle miter bounds), invariant dimensions/cameras/support, fixed bones, planted toes and sampled continuity. Also reran the candidate's full geometry and playback tests.
- Rebuilt from copied frozen source. **All 81 regenerated deliverables match frozen bytes**, including HTML, all five MP4s, all frozen render/raster evidence, test reports and deterministic landmark gzip. Fourteen source/documentation copies also match, giving 95/95 total.
- Reproduced the unmasked full-actor overscan raster audit at 1,801 times in both scales: zero pixels below floor or outside panels. Actual minimum ink margins: 71 px enlarged and 58 px native. The old-200-ms positive control correctly detects 343/50 penetrating pixels.
- Fully decoded all five movies: 90 normal, 360 slow, 690 full review, 90 comparison-normal and 168 comparison-review frames. All are 60 fps. Reproduced 1,272 lossless panel-border checks.
- Visually inspected all 90 actual decoded normal frames at native scale, 12 enlarged normal phase/contact frames, 25 enlarged slow phase/contact frames, 21 dense native slow landing frames, 24 same-clock old/new native comparison frames and enlarged load/apex/bite comparison frames. Inspected exact decoded 1500 ms end holds of both review movies.
- Native sheets preserve original panel pixels and were viewed with original-resolution detail. No real-time timed human playback, browser execution, production integration/performance, game regression, original-art animation continuity or owner acceptance is claimed.

The short executor transport outage was recovered. Same-freeze hashes were rechecked, and the previously blocked remaining visual/byte-verification work was completed. No candidate authoring, external write or denied-operation retry was part of this review.
