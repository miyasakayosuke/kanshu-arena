# Fenrir: articulated motion candidate specification

## Goal and boundary

Prepare a new, review-only candidate with clearly larger, deliberate foreleg action while preserving the selected original illustration. Do not enlarge the rejected crouch deformation. The current mesh candidate remains not selected and is not game-ready. No production adoption is authorized by this specification.

Source: the existing project PNG at docs/fenrir-motion-preview/original.png on the isolated candidate branch; 1312 × 1199 RGBA, SHA-256 e072a556adb672e192065347486e674d091bb03892decfe0c84625c84ebd4137. Original creation provenance remains not independently reverified in this pass. Do not replace its visible face, eyes, fur pattern, palette, cuff design or silhouette with a newly generated full illustration.

The existing five-second Firefly sample can be inspected offline for amplitude and timing. Do not reuse its malformed foreleg or morphing chain as final pixels. Cropping, retiming, stabilization or ordinary video editing cannot reconstruct missing anatomy.

## Minimum asset work

Use the original as the authoritative visible texture. Segment it through native runtime clipping/layer masks, retaining original source bytes. New raster content must be created only through the supported image-edit/generation tool, in a separate candidate. The minimum new painting is a hidden-surface patch, not a new full wolf.

1. **Body under the near foreleg.** Complete the chest/side fur that becomes visible when the original near foreleg lifts. Confine new painting to the previously occluded shoulder-to-lower-chest region. Keep the original mane as a foreground overlay so it conceals the shoulder attachment seam.
2. **Near foreleg overlap surfaces.** Complete only the missing small fur areas at the shoulder and elbow that rigid segment rotation exposes. Preserve the original visible upper arm, forearm, paw/toes, cuff texture and proportions. If adequate overlap exists in the original, do not generate this patch unnecessarily.
3. **Chain overlap surfaces, only if needed.** Separate each visible original link and the broken end. Complete a missing back arc only where separation exposes it. Preserve link count, thickness, gold texture and broken-end shape; never replace the chain with a changing generated video shape.

Do not generate mouth interior, teeth or a new head angle for the first articulated test. Keep the original head closed-mouth and rigid. A large foreleg action and forward weight transfer should first prove that the rig works without risking the liked face. If stronger expression or an actual turn remains necessary, create separately reviewed head/jaw plates afterward; a single planar rotation is not a true turn.

Approximate source landmarks for planning, requiring validation during segmentation: near shoulder (440, 560), elbow (435, 770), wrist/cuff region (365, 930), paw contact (320, 1120); far forepaw around (170, 1100). These are visual estimates, not an approved anatomical skeleton.

## Layer order and rig

Back-to-front: far rear leg, far foreleg, tail, torso/hidden patch, near rear leg, near foreleg upper arm, near forearm and paw, original mane overlap, original head, cuff/chain in its appropriate foreground order. Adjust ordering against the source image rather than inventing overlaps.

- Near foreleg uses a two-bone IK chain with fixed segment lengths and a separate paw rotation. Shoulder follows the torso; paw is the contact target.
- During support, lock the paw contact to the floor. During swing, lift then advance the paw on a smooth arc, then explicitly replant it before the torso transfers forward.
- Keep far foreleg and rear feet as support contacts during the near-leg step. Body translation/rotation must remain within the reachable joint configuration; do not solve reach by stretching the leg or shortening the chest.
- Cuff follows the forearm as a rigid painted part. Chain links use fixed-length constraints and damped trailing motion at the cuff attachment. Link shapes must never scale or morph. Use deterministic sampling or a fixed-step, seeded simulation for reproducible captures.
- Torso and head are predominantly rigid transforms. Limit deformation to small joint/overlap regions. No whole-body squash, vertical chest compression or camera zoom as a substitute for articulation.

## First pose sequence: about five seconds

1. **Neutral support (0.0–0.5s):** original stance, no visual jump on entry.
2. **Load and lift (0.5–1.1s):** shift weight toward supporting limbs, lift the near forepaw roughly 70–100 source pixels. Shoulder and elbow articulate; toes clear the floor visibly.
3. **Forward plant (1.1–1.5s):** place that paw roughly 110–150 source pixels forward, rotating the paw toward contact. Plant before the body drives forward.
4. **Threatening brace (1.5–2.7s):** torso follows forward approximately 40–70 source pixels, head lowers slightly as a rigid part, tail responds with delay. Preserve a broad, stable stance. The action must read through its silhouette even with the unchanged calm face.
5. **Recovery step (2.7–4.3s):** transfer weight back, lift and return the near paw deliberately rather than sliding it along the ground.
6. **Settle (4.3–5.0s):** return to source pose; chain settles and the loop closes without a snap.

These are starting ranges, not requirements to force if the original anatomy cannot support them. At approximately 130px body width, the proposed paw advance is about 11–15px and lift about 7–10px, making the action materially clearer than the current body dip.

## Acceptance and stop conditions

Compare original, neutral, lifted, planted, braced and recovered poses at large size and approximately 130px simultaneously. Capture a real animated preview, not only pose diagrams or numerical tests.

Required visual properties:
- Original face/eyes/markings retain their identity; no full-character redraw.
- A distinct foreleg lift and forward plant are obvious at game scale.
- Weight transfer follows the plant; support feet do not slide or hover.
- Upper/lower leg lengths stay fixed within rendering tolerance; no bowed rubber leg, compressed chest, hyperextension or stretching rear leg.
- Shoulder/elbow seams, occluded fur and detached-part holes remain invisible on both light and dark backgrounds.
- Chain count and shape remain constant; motion trails the cuff with believable weight, without intersecting the paw or body unnaturally.
- The five-second sequence loops cleanly and reduced-motion mode remains static.

Stop and report if the supplemental patch cannot match the source, if a visible anatomical defect persists, or if preserving the original and achieving the requested motion conflict. Do not hide defects with a smaller preview, excessive motion blur, rapid cuts or stronger global distortion. Independent rendered review and explicit owner approval remain necessary before adoption.

## Service and permission boundary

This is an offline design specification only. No new image generation, external upload, paid service or credit expenditure has been performed for it. Any external generation service must be named and its original-image upload and cost/credit allowance separately authorized before use. Built-in review-only supplemental asset work, if assigned, must use its supported image-generation/editing workflow and preserve the original reference for comparison.
