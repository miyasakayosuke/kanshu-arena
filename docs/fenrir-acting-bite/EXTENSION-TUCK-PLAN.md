# One controlled extension-to-tuck bridge

Status: planned bounded experiment after the reviewed full1500ms start-pair
study. One new whole-body drawing at most, followed by static and actual rendered
review. This does not reopen the rejected paw cleanup or replace the full pose set.

## Fixed references and source grid

Use the retained high-leap-toe-off-study.png and high-leap-apex-study.png as BOTH
adjacent conditioning references, plus reference.png for original skull, paw,
fur and cuff identity. Both adjacent keys remain unchanged. Keep their raw
1254x1254 transparent source grid and physical scale1/1312. The renderer's
continuous source-origin trajectory stays unchanged. No fit-to-canvas scaling,
whole-body rotation, crossfade or deformation is used to hide the transition.

The target is a shallow diagonal between the extended upward-looking push and
compact downward-looking apex. The shoulder/hip line pitches progressively;
hind joints tuck partway, forelegs remain folded, muzzle turns gradually down,
and jaw stays nearly closed. Preserve adult skull/chest/paw masses, four limbs,
fore/rear cuff locations and one attached chain with its open terminal. Tail and
chain may trail the turn but cannot change attachment or acquire extra parts.

Approximate hand-inspection guides in raw source pixels (not calibrated anatomical
measurements):
- Skull center: push(250,220), bridge around(225,435), apex(200,650).
- Shoulder: push(540,470), bridge around(580,505), apex(620,540).
- Hip: push(850,820), bridge around(850,690), apex(850,560).
- Cuffed rear paw: push(1150,1120), bridge around(1115,1000), apex(1080,880).
- Near forepaw center: push roughly(295,735), bridge around(328,823),
  apex roughly(360,910); far forepaw center: push roughly(120,610), bridge
  around(175,780), apex roughly(230,950). Track the near cuff center as well.
- Treat these as loose corridors for corresponding anatomical points, not
  targets that justify shrinking the shoulder-to-hip span or paw masses.

## Timing and comparison

The drawing represents approximately430ms, the middle of its exposure.
Control is the retained0a5a0695 full study. Candidate inserts the one bridge only
from400 through459ms, then uses retained apex from460 through559ms. The push
before400, the same rising root path,500ms peak,560ms descent,800ms hit,890ms
contact and1500ms total remain identical. The unresolved260ms load-to-extension
jump is retained explicitly; this experiment cannot claim to solve it.

## Acceptance before expansion

1. Inspect the unshifted raw sources and onion-skin/same-scale comparison. New
   head/chest/hip and four paws must be genuinely intermediate, without a fresh
   size/identity reset, additional wrist/paw fragment or changed chain attachment.
2. Inspect native130/142px and enlarged views. Preserve physical mass; do not
   rescue a bad drawing by rescaling or nudging the whole sprite. A source-grid
   or content-size mismatch is a failure to report, not permission to normalize it.
3. Only if the static gate is useful, capture actual Chromium360–560ms A/B and
   full1500ms normal/2x/slow, with exact399/400/459/460 boundaries. At60fps the
   60ms key has visible exposures at2x; verify decoded frames, not just manifests.
4. Compare all other phases for unchanged pixels and retain original endpoints
   and isolated reduced-original checks. This is not combat/Skip acceptance.
5. Recheck the new silhouette in all8 real-layout contexts. Do not worsen the
   recorded tiny left-edge crop or vertical clearance; no broad layout redesign.
6. Stop after the one drawing and rendered verdict. If it fails articulation or
   identity, retain the failure and reassess the method instead of generating
   another independent whole-key replacement automatically.

A held midpoint can split one large drop into two smaller jumps, or create
a sawtooth head path while the root rises. Both400 and460 boundaries must improve
without a new head bob/reversal; a merely intermediate static silhouette is not
enough. A successful result would be a smaller articulation discontinuity in the
rough study. It would not establish final smoothness, adoption or release readiness.
