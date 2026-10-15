# Actual browser diagnostic review and placement correction

Status: **rough pilot; visual acceptance and game integration remain unmet**.

## Retained baseline

- Exact source: `b0b697ed1469928267d45a6b6ecd970dd5fef208`.
- Actual Chromium run: https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38701756188
- All job steps completed successfully, 2026-10-15 07:57:47 UTC.
- Artifact ID: `11956608251`; name `fenrir-bite-review-b0b697ed1469928267d45a6b6ecd970dd5fef208`.
- Archive: 12,500,547 bytes; SHA-256 `7788badcca42ea72ce3855940fc3f62506222900270d3da7e24a36ca526d37bc`.
- Artifact expiry: 2026-10-22 07:57:40 UTC.
- Downloaded archive digest matched. The exact normal video and controller checks
  are retained in `evidence/b0b697ed/`, independently of artifact expiration.
- Normal video SHA-256: `98881e338296f8d2a7befab009abdf6c86a9c116b388b900fb226ec6f659ccfe`.

## Independent rendered review

The reviewer inspected all 32 desktop/mobile, light/dark key screenshots including
labelled 130/142 CSS px panels, enlarged keys, failed/late-load images and sampled
24 normal, 24 double-speed and 13 reduced video frames. This was actual browser
output, not the earlier Canvas2D-only montage. Continuous live playback was not
watched, and smoothness was not established.

Attack stages were readable in all four contexts. No obvious clipping, matte or
extra limbs were found in the sampled output. Reduced-motion and failed/late-load
captures retained the original. Independent neutral/settled enlarged-panel
comparisons were pixel-exact in all four contexts. The jaw sequence was coherent.

Unresolved defects:

1. Support toes extend below the floor guide, especially the drive rear foot.
2. Contact-to-recovery and recovery-to-original switches have position and shape
   pops. The recovery image is fixed during its hold, not continuously sliding.
   The original slide wording was corrected after quantitative frame comparison.
3. The older open/bite images do not retain the clearer open broken-chain tip.
4. Middle-pose face/body proportions differ from the original; contact compression
   and return transitions are missing. Static keys do not prove smooth movement.

The clip is useful to show as a clearly labelled rough keypose diagnostic. It does
not pass the original acceptance or release criteria.

## Narrow same-art registration correction

`placement.mjs` retains the exact previous registration as `BASELINE` and defines
measured source-pixel support landmarks. `?anchors=baseline` is the unchanged
placement comparison; the default uses support registration. No artwork, scale,
exposure timing, whole-body shape, original placement, airborne open/bite placement
or alpha values change. There is no interpolation or crossfade.

The foreground foretoe landmarks for preload, contact and recovery are aligned
to the original foreground foretoe world position. The drive rear support toe is
aligned vertically to that same ground height while keeping its lateral staging.
Landmarks use the opaque source toe outline (alpha over 200); their last ten-row
median x and bottom y were inspected against the source paws. These are support
registration aids, not automatic anatomical proof.

The next browser run captures before/after boundary pairs at 1039/1040 and
1349/1350 ms and a synchronized side-by-side video, baseline on the left. The
source-coordinate checks are not visual acceptance. Shape/identity changes can
remain after anchor alignment and require a fresh independent rendered check.
No extra drawings are generated for this correction.

## Registered placement: actual result

Exact source `d155e88bf5d05dd4784955d085c2d40fc8d46bf0` completed Chromium
run https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38704319417 .
Artifact `11957932101`, 18,451,818 bytes, SHA-256
`346570d23944579b8bcc7e25e12033054c9fef62bdba271fe56a48bdeb1a7b9e`
was downloaded and verified. Artifact expiry: 2026-10-22 08:19:50 UTC.
Exact normal, side-by-side before/after video and checks are retained in
`evidence/d155e88b/`.

Independent rendered comparison found a real improvement: drive support toes no
longer penetrate the guide, and the near foretoe stays essentially at the same
world ground position across contact/recovery and recovery/original boundaries.
The remaining changes are head/chest/hindquarters/tail shape and far-foot placement.
Recovery is a fixed hold. Keep this registration; further whole-sprite nudges
would sacrifice the planted toe without supplying missing transitional drawings.
The result remains a rough diagnostic, not smooth-motion acceptance.

## Bounded continuity and stronger-acting pass

Requirement clarification: connect the liked rough direction and exaggerate the
monster's physical action. No skill balance, timing, identity or acceptance gate
changes. The exact prompt and planned stopping point are in CONTINUITY-PROMPT.md.

One four-pose study was generated. Independent static review retained only the
lower pair as candidate recovery/head-turn bridges. They add useful orientation
and chest-height progression, but the near-original drawing is still wider and
less upright than the real original, so an endpoint shape pop may remain. The
upper pair has nearly identical all-four-foot crouched silhouettes and does not
establish distinctly deeper anticipation and heavy impact compression. These
upper poses are saved as failed-purpose evidence and are not used in playback.
Four limbs, cuffs and open broken chain tips were readable in this small study.

The new diagnostic adds only the two candidate recovery drawings, preserves the
exact original endpoint and the existing good bite, and uses a rigid airborne
lunge/recoil path. Grounded poses keep their registered support points. The stage
is wider with the same origin in both comparison variants to leave room for the
lunge; this is not a camera move or a body deformation. Impact remains 800 ms and
total remains 1500 ms. Contact occurs only after the recoil returns to its ground
anchor. `?motion=registered` retains the previous key schedule for comparison.

The bounded pass stops at an actual rendered before/after comparison. Stronger
anticipation/heavy landing, old attack chain topology, exact middle-pose identity,
missing in-betweens and a possible endpoint pop remain explicit review gates.
No claim of smoothness or integrated game behavior follows from passing tests.

## Bounded continuity result: not adopted

Exact source `0476082ce93b9fd2bf5237356c976265082dadfc` completed Chromium
run https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38707017345
at 2026-10-15 08:43:23 UTC. Artifact `11958764029` was downloaded and verified:
21,107,684 bytes, SHA-256
`12e4b778b65411c10e56fe82cd08736c052c98a74b3713d4286ce76b295b34a8`.
Expiry: 2026-10-22 08:43:17 UTC. Exact normal, before/after video and browser checks
are retained in `evidence/0476082c/`.

Despite passing technical checks, the independent rendered assessment found no
net continuity improvement. The lower drawings improve head-turn ordering but
shrink apparent body height/size, followed by a taller pop into the real original.
The airborne forward movement is clearer, but returning the held bite image
backward reads as a boomerang-like glide. These are real visual regressions.
The previous registered key phase is retained as the default control; the failed
comparison remains explicitly selectable as `?motion=continuity` for diagnosis.

The reviewer recommends a bounded repair of one or two full-height return poses
derived from the exact original, prioritizing near-original first. Canvas height
alone is not acceptance: head/body proportions, physical scale, planted near
foretoe, weight-bearing joints and progressive turn must match. Do not warp or
rescale the shallow-grid drawings to disguise the mismatch. Do not replace the
backward glide with an instantaneous offset reset at contact. Use the previous
registered airborne phase as the next control; a forward-displaced landing would
need a genuine recoil/back-step drawing sequence. No further artwork is adopted
by this record, and the original visual/release gates remain open.
