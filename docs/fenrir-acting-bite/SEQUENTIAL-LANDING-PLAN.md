# Registered sequential landing: bounded feasibility experiment

Date: 2026-10-15 UTC. Status: planned, unapproved artwork; no game integration.

## Why change the drawing process

The retained 45133ceb return comparison is a rough improvement, but independent
standalone generated poses repeatedly change the skull, chest, tail and feet.
More coordinates, crossfades or body warps cannot supply missing weight transfer.
Keep the whole-body sprite method while testing adjacent-frame-conditioned
redraws with shared physical-scale landmarks. Only the built-in image tool is
used; no external service, paid animator or new material is involved.

## First gate: two adjacent drawings only

1. At 890 ms: forepaw contact, rear feet still airborne, matching the direction
   and jaw state of the preceding bite. Use the exact original model and the
   reviewed full-height halfway-return drawing to lock body mass and scale.
2. At 930 ms: derive directly from that contact drawing, not independently from
   a description. Keep the foreground toe, skull/paw/chest/tail mass, cuff
   placement and attached open-ended chain topology. Bend the elbows and lower
   the chest; show the rear feet descending but not yet planted. Tail and chain
   may overlap through modest inertial follow-through without changing topology.

Use one full-height character per image, not a shallow contact-sheet cell.
Both are interpreted at the original's fixed source-pixel physical scale. Keep
one near-foretoe ground anchor, and check the other paws individually; any moving
paw must have an explicit lifted path. No independent fit-to-canvas rescaling.
Compare both source silhouettes and a registered onion-skin/landmark diagnostic
against the adjacent keys. Such overlays are review guides, not generated art or
frames used in the final motion.

### Go / no-go criteria before any remaining drawings

- Four readable limbs, correct bent joints, no duplicated/vanishing parts or seams.
- The change reads as foreleg load and chest compression, not body shrinkage.
- Original adult skull, muzzle, chest, paw and tail masses stay coherent at one
  physical scale. A larger canvas by itself does not satisfy this criterion.
- Foreground contact toe stays registered; other feet move through a readable
  airborne path, with no unexplained teleportation or premature rear-foot plant.
- Cuffs remain on the correct limbs; one attached chain, stable link order and
  an open broken terminal remain recognizable across the pair.
- Jaw state is continuous with the bite and leads toward the closed return.
- An independent reviewer sees a credible adjacent transition at 130/142 px and
  enlarged size. A second isolated good-looking pose is not a pass.

If the pair fails, retain it and report the specific consistency limit. Do not
keep generating the same request or expand it into a full sheet automatically.
No claim of animator-grade smoothness is made for the built-in image tool.

## Conditional next segment, only after pair review

If the pair is coherent, complete at most three further linked drawings:
970 ms rear paws land and haunches compress; 1020 ms planted foreleg raises the
chest; 1080 ms head/body turn partway toward the reviewed 1130 ms halfway key.
Replace only the old 890–1130 ms contact/recovery interval. Render the 240 ms
segment and the full one-bite context in actual Chromium at 130/142 px, enlarged,
normal and double speed with effects/camera motion off. Review before expanding.

The complete motion still needs deep hind-loaded anticipation and toe-off through
550 ms, connected jaw opening/closure around the 800 ms hit, denser 1130–1240 ms
head-turn drawings, and a final settle into the exact original. A nominal frame
count alone is not smoothness. No production adoption follows from this study.

## Invariants

Only existing Moonlit Bite: power 55, MP 10, one impact at 800 ms, total 1500 ms.
Exact original endpoints, anatomy/identity/provenance requirements and original
visual acceptance/release gates remain. Preserve all prior failures and trials.
