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

## Original-derived return repair: static checkpoint

The failed comparison and default-control restoration are retained at
`9be9929ec9d608d47005ec8ce1a4972710016fe2`; its CI 38708845551 completed
successfully. This does not convert the visual failure into acceptance.

Two single-character full-height drawings were created from the exact original,
with the reviewed late-return drawing as the only additional halfway reference.
Exact prompts and pre-generation criteria are in RETURN-REPAIR-PROMPT.md.
Independent static review found substantially closer original-sized skull,
paws, chest mass, tail and cuff treatment than in the grid poses. The progression
halfway (lower/left-facing), near (raised/more frontal), exact original is worth
actual browser comparison. Four limbs and open chain terminal remain readable;
small link/cuff details differ, so the outputs are not exact original endpoints.

Both new drawings use the original's fixed 1/1312 source-pixel physical scale,
not a canvas fit or a continuously changing scale. Foretoe source landmarks are
halfway (339, 1183); near (307, 1216); original (304.5, 1179), registered to one world point.
This only locks that near toe. The far forepaw and rear-foot positions, the large
halfway-to-near head lift/turn, and remaining face/chain identity differences still
need actual playback review. Do not claim that all feet stay planted based on this
single landmark.

`?motion=return` adds only these two keys to the previous registered control.
All frames through the low recovery and the entire airborne phase remain unchanged;
there is no forward/backward whole-sprite travel in this comparison. The failed
lunge variant remains opt-in evidence. Impact 800 ms and total 1500 ms remain fixed.
CI compares early control canvases pixel-for-pixel and captures new return
boundaries 1129/1130, 1239/1240, 1379/1380 plus normal/2x/reduced videos and actual
130/142 px desktop/mobile light/dark panels. Actual review is pending at this source
checkpoint. No further generation is planned before that bounded comparison.


## Original-derived return result: retain as a rough improvement

Exact source `45133cebd538e57b863bb76676c9d8f049d27a4f` completed actual
Chromium run https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38710675023.
Artifact `11960871640` was downloaded and SHA-256 verified: 23,682,326 bytes,
`dc1d5112300820f82671cf9a14bf446e4d7929f5731c2afb39590e1c8a54550a`.
The source artifact expires 2026-10-22 09:13:12 UTC. Normal, double-speed,
reduced-motion and registered-control/current side-by-side videos, browser checks
and their exact provenance are retained in `evidence/45133ceb/`.

Independent review inspected decoded normal/comparison and double-speed frames,
all 40 desktop/mobile light/dark captures at native 130/142 px and enlarged size,
and reduced-motion samples. It found a net rough improvement: adult body
proportions hold better through the rise, and the near-to-original change at
1380 ms is now a small face/tail/detail change rather than the previous large
height jump. The backward airborne glide is absent. No clipping, extra limb,
ghost or new seam was observed. The foreground toe stays visually planted.
The independent reviewer pixel-compared all 12 neutral/settled canvases: exact.
Reduced-motion samples hold the original. These endpoint checks do not establish
identity in every intermediate pose. Review used actual decoded video samples
and screenshots, not a claim of continuous live playback or smoothness.

Remaining defects are explicit:
- At 1130 ms, old low recovery to the new halfway drawing changes the broad face,
  torso and oversized tail abruptly; other paws relocate around the locked toe.
- At 1240 ms, the head lift/turn is still pronounced, and the other feet relocate
  without a depicted lift or step. One planted toe is not an all-feet plant.
- Earlier loading remains shallow; landing lacks a strong weight-bearing
  compression; the old bite/open keys still have inconsistent broken-chain tips.
- Missing true in-betweens and middle-pose identity consistency remain unresolved.

Keep this as an owner-showable rough keypose improvement. Stop this bounded
return experiment here: further whole-sprite placement edits cannot supply the
missing shape/contact transitions. No smooth-motion acceptance, game integration,
release approval or task completion is asserted. The original registered and
failed-grid/lunge controls remain available for comparison.

The next documentation-only checkpoint corrects an overbroad explanatory sentence:
whole-sprite airborne travel occurs only in the explicitly failed lunge variant.
The current return comparison has no such travel. This wording fix does not
change the captured renderer, artwork or motion timing.


## Sequential landing pair: static feasibility gate

The public-safe plan was saved before generation at ffcd676a. The first two
1254-square drawings used the original/halfway model, then a direct edit of the
contact frame to produce its immediate compression neighbor. Exact prompts are
in SEQUENTIAL-LANDING-PROMPTS.md; the unshifted diagnostic overlay and fixed-scale
420/142/130 comparisons are in evidence/sequential-pair/. Those diagnostics are
review aids only, not motion frames and not browser evidence.

Independent source/native-size review gives a limited go for the remaining three
linked drawings. Contact-to-compression genuinely bends the near elbow, lowers
chest/back and moves both airborne rear paws toward the floor. Face, paw mass
and torso identity are substantially steadier than the earlier independent keys.
Four limbs, cuffs and open chain terminals remain readable.

The near-paw contour still shifts about20 source pixels (2.2 pixels at142;6.4 at
enlarged420), while the far forepaw is almost fixed. This is an unresolved local
artwork defect; globally translating the sprite would slide the other planted
paw. Tail motion mostly follows the body down rather than providing distinct
lag/overshoot. The pair is suitable for the bounded continuation, not production
clean, not a perfect plant and not smoothness acceptance. The remaining keys
must show an explicit rear-foot landing/haunch load at970, then rise at1020 and
1080 around the same forefeet toward the reviewed1130 halfway key. No independent
scale fitting or unmotivated new foot placements. Actual rendered segment review
is still required before any wider expansion.


### Wrist-detail inspection and one local correction

The970 rear-foot landing reads clearly, but closer fore-wrist inspection exposed
a paired dark claw/paw-like protrusion above the far planted forepaw. Inspection
of the actual contact/930 crops shows the same feature was already present in
those earlier drawings; it must not be attributed solely to the970 edit. It is
a local anatomy/detail defect, not evidence of an entire fifth limb. The prior
static go did not constitute production-clean acceptance.

One narrowly prompted cleanup sibling removes only that unwanted wrist detail
from the970 source before it can condition later drawings. Both original970 and
cleanup are retained with prompts. A generative edit is not assumed pixel-exact
outside the requested patch. Independent cleanup review confirms the stray lobes are gone and the rear-foot
landing, bent haunches, forepaw placement and overall masses remain visually
preserved. Some texture/detail changed, so preservation is not pixel-exact. The
cleaned970 source is suitable for the next two bounded drawings. The reviewer
also rechecked and corrected the first-appearance attribution: both890 and930
already have the same lobes. Those earlier wrist details and the near-toe drift
remain explicit cleanup items; no further cleanup loop precedes1020/1080.


## Five-key sequential segment: render checkpoint

The first planned early-rise request overshot its intended intermediate height.
Independent review found it suitable only as a later1080 candidate, with a visible
far-hind-paw step. The one remaining planned drawing therefore used cleaned970
and that1080 pose as its two adjacent endpoints to make1020, preserving the real
prompt history. It is higher than the geometric midpoint; static review finds an
ordered970→1020→1080 rise that may read as fast rebound easing upward. No additional
drawings were generated to hide that uncertainty.

Independent inspection of the final source and same-scale six-pose diagnostic
found no new blocking anatomy/topology defect: four readable limbs, clean far
wrist after970, attached cuffs and open chain terminal. The far hind paw lifts
through1020/1080 and must visibly plant into1130. This is suitability for an actual
browser comparison only. Entry890, the fast rebound, local near-toe drift and
1080→1130 face/foot/detail changes remain specific review targets.

`?motion=landing` replaces only890–1130 ms with five linked full-body drawings:
contact890, foreleg compression930, rear-foot landing970, mid-rise1020 and later
rise1080, then the previously reviewed halfway key at1130. Early attack and later
return phases are unchanged. The entire new set uses one fixed source-frame
origin and1/1312 physical scale. No separate claw-fitting translations conceal
the known toe drift. The previous return-only comparison remains the control.
There is no body warp, crossfade, camera effect or airborne glide in this variant.

Actual Chromium capture is planned for52 native-size/context key screenshots,
normal/2×/reduced videos, before/after full context, boundary pairs, and an explicit
890–1130 ms segment loop at60fps plus a slow inspection copy. The loop reset is a
review aid, not a new motion inside the action. CI checks identical early and late
control canvases and actual delayed/failed loading of a new sequential asset.
Impact800, total1500, power55 and MP10 remain unchanged. No further art is planned
before this rendered review. Smoothness, owner acceptance and game integration
are still not established.


## c43d9015 actual browser verdict

Date: 2026-10-15 UTC. Verdict: genuine rough improvement; suitable to show as
unfinished progress. Smooth final motion and game integration remain unaccepted.

Reviewed decoded normal and comparison frames, every frame of one 60 fps segment
cycle, slow samples, all 52 desktop/mobile light/dark contexts, and boundary pairs.
At 130/142 px, contact → compression → rear landing → rise is readable and more
weight-bearing than the old held-contact/standing swap. The 970→1020 upward step
is conspicuous but follows the load logically. The 1080→1130 boundary now reads
as a rear-paw plant, with smaller face/tail/cuff/detail changes.

The 890 entry remains the largest identity/silhouette pop. Near-foretoe drift of
about two native pixels remains visible in enlarged comparison; early 890/930
wrist detail and chain-detail consistency remain cleanup items. No new clipping,
extra limb or ghost was observed. Reduced and failed/late-load images retain the
original. Independent comparison of all 12 neutral/settled canvas crops was exact;
that endpoint check does not establish identity in every intermediate pose.

The double-speed video is only 30 fps: logical 867→933 skips the 40 ms contact key,
and 1067→1133 skips the late-rise key. This limits capture evidence; it does not
prove runtime omission. Preserve this video and obtain a 60 fps double-speed
supplement with unchanged action timing and artwork.

Stop this art pass. Preserve the contact silhouette/model scale as the landing
constraint for the requested high-leap and descending-bite choreography.

Exact artifact provenance and retained videos: `evidence/c43d9015/`.

## f950764a descending closure/reach comparison

Actual Chromium clips and native 130/142 px light/dark captures establish a rough
connection improvement: jaw closure and foreleg reach both appear in decoded
normal and 2× videos. The two added keys remove the open-mouth drop straight into
landing. The 890 head/chest/paw/chain reset and 1.69/1.85 native-pixel precontact
toe penetration remain; this is not a smooth, forceful or complete high leap.
All eight updated tall/revealed actual-layout sweeps still fit at fixed floor and
width. Detailed independent review and exact artifact provenance are retained
in evidence/f950764a/. The next bounded local repair is recorded before work in
CONTACT-HANDOFF-REPAIR-PLAN.md. Production and acceptance remain unchanged.
