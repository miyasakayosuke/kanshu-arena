# Fenrir identity pose study

Status: three non-adopted study images, not animation frames or production art. The builder visually inspected the original and all three outputs. Independent final review was unavailable; this is not an independent acceptance result.

## Scope and method

Three separate built-in image_gen requests referenced the same untouched original image. The outputs cover preparatory load, descending bite approach, and foreleg-first landing. No additional generation, interpolation, rigging, cut-warp, image editing, integration, publication, Adobe operation, new service, or credentials were used. Exact prompts are in `prompts.json`. All three PNGs are exact copies of tool outputs.

The adopted temporary motion source was read only: `recovery/arena-offscreen-rig/source/rig.mjs` and its README, builder report, and decoded normal enlarged pose sheet. Its relevant intent is a loaded leap, complete top-edge exit, descending bite near 800 ms with forepaws behind the muzzle, fore contacts around 890/900 ms, compression around 930 ms, and rear contacts around 970/980 ms. These still studies do not validate any of those timings or continuous motion constraints.

## Identity comparison

- Broad identity is recognizable across all three images: slate/cream coat, turquoise eyes, angular cyan flank markings, large chest mane, plume tail, and two gold cuffs remain.
- Four distinct paws are visually readable in every image. The bite image has overlapping forelimbs that need a deliberate anatomy cleanup before animation; a still image cannot verify hidden joints or fixed bone lengths.
- Face direction is not locked. Load and bite turn the muzzle toward image-left; landing returns to the original more rightward face turn. This would create an obvious orientation discontinuity in a leftward attack.
- Bite expression makes the muzzle and cheek planes sharper and the open mouth more aggressive than the original calm face. The open jaw requires a designed mouth model, not an assumption that identity is exact.
- Ear and head shapes are broadly similar, but no exact facial landmarks or consistent rotation were enforced. Do not label them identical.
- Torso and legs appear substantial, but proportions and foreshortening vary between poses. These are not a constant-bone-length or anatomically measured result.
- Mane clump layout, tail curvature/volume, and exact cyan markings are redrawn rather than stable. Tail silhouette is particularly fuller and rounder in some outputs.
- The two cuff locations are broadly correct: large nearer foreleg cuff with short chain, and narrow nearer hindleg cuff with ring/stub; far legs remain bare. However, chain link count, link geometry, broken-end shape, cuff ornament, and orientation are not constant. Topology must be redrawn from one fixed equipment design.

## Pose-specific defects

1. Load: clear lowered front and bent limbs, but only a shallow rear-body load. It reads partly like an advance/crouch rather than the chosen strong upward propulsion. Paws have perspective offsets, so an exact common support plane is not established.
2. Descending bite: clear diagonal head-first downward intent and open jaw. Forepaws are behind the muzzle horizontally but hang below the chest more than the selected tucked-back rig pose; the silhouette is not yet a faithful key pose. Hindleg overlap and limb connection need explicit cleanup.
3. Landing: forepaws down and rear paws raised communicate foreleg-first arrival, but the face turns away from the leftward attack and the chest/elbow compression is insufficiently explicit. It does not yet prove a load-bearing landing.

## Technical checks

All outputs are RGBA PNGs with genuine zero-alpha background pixels. Dimensions differ: load is 1491 by 1055; bite and landing are 1312 by 1199. They do not share an animation canvas, scale, ground anchor, or camera registration. Alpha bounds and hashes are recorded in `manifest.json`. Nonzero alpha reaches canvas boundaries despite the prompt requesting generous margins; crop and edge cleanup would be required before production. No padding, rescaling, cropping, or alpha modification was performed in this study.

The source SHA-256 remains `e072a556adb672e192065347486e674d091bb03892decfe0c84625c84ebd4137`, matching the hash recorded before generation.

## Concrete next production choice

Do not keep generating variants and do not tween or cut-warp these images into a finished attack. The useful next choice is a controlled hand-drawn three-key-pose correction against a locked model sheet: fix one leftward face construction, exact fore/hind joint placement at load/bite/landing, a single cuff and chain-link design, consistent mane and tail volumes, and common canvas/ground registration. An illustration/animation tool or artist can make those targeted corrections; no claim is made that such a tool is connected or already authorized here. Inspect those corrected keys before any in-betweening or full animation. Until that choice is approved and completed, retain these as reference studies only.
