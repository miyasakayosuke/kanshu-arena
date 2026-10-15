# Bounded descending-bite to contact bridge

Continue the same Moonlit Bite after the actual-layout staging review. Keep
power 55, MP 10, a single impact at 800 ms and total duration 1500 ms. No new
skill, external service or production deployment is part of this experiment.

## Staging constraint

The actual-layout comparison identifies a usable candidate rule: reserve the
needed scene height before the action, settle the playing panel, and reveal the
arena once if the current inner scroll obscures the action. Keep the physical
sprite size and landing floor fixed during the motion. Do not repeatedly
scroll, shrink the wolf or use an unrestricted overlay over the header.

The tested reservation uses the larger of the existing scene height and
ceil((1.31 * fixed Fenrir width + 18 + rear-row gap) / (358 / 460)), with the
real rear-row gap 70 * scene width / 720. Existing larger scenes stay unchanged.
This is a candidate presentation constraint, not production integration.
Short-portrait Skip visibility and real combat activation remain open gates.

## Exactly two adjacent-conditioned whole-body keys

1. 800 ms bite closure. Condition directly on the reviewed descending open-jaw
   pose, with the contact key and exact original as model constraints. Close the
   jaw into one forceful bite, extend the neck/head down-left along the attack
   line, and keep the forefeet airborne and clear of that jaw-led line. Hips
   remain higher than shoulders. Preserve the adult skull, paws, torso, tail,
   cuff placement and attached open-ended chain. Do not rotate a flat image.
   Review this source and a same-scale adjacent comparison before the next key.
2. Forepaw reach into 890 ms contact. Condition on the reviewed closure and the
   existing contact drawing. Keep the jaw closed after its single attack; unfold
   the forelegs toward their actual contact positions, with the rear paws still
   airborne. The shoulders begin to level toward contact without an abrupt
   standing-pose swap. This key occupies 840–890 ms in the first timing study;
   closure is shown from 800–840 ms. The 800 ms game impact does not move.

Use the existing full-height square source grid and one physical source scale
of 1/1312. Compare both adjacent drawings without per-image fit-to-canvas scaling.
Keep all four limbs countable, both cuffs on their original limbs, and the one
chain attached with a visible broken terminal. Avoid the old wrist-lobe artifact.
Leave transparent margin around every extremity. Preserve the existing apex and
landing experiment; do not regenerate the whole set or the exact neutral.

## Actual rendered stopping point

After source review, render the connected descending open jaw → closure → reach
→ retained contact/compression/rise segment. Inspect the 799/800, 839/840 and
889/890 boundaries, normal speed, 2× at 60 fps, and slow playback at 130/142 px
and enlarged. Keep effects/camera motion off. Recheck the new silhouettes within
the tested headroom envelope at unchanged scale. Record all failures explicitly.

Acceptance for this experiment is a coherent single jaw closure followed by
readable airborne reach/contact, with materially smaller identity/shape jumps
than the old mismatched bite-to-contact boundary. A source-image pass alone is
insufficient. Stop after this pair and rendered independent review; if it loses
anatomy or identity, retain the result and change the method rather than generate
an unbounded sheet. Missing takeoff, apex pitch bridges, fine in-betweens, chain
cleanup and the final real-game controller/Skip gates remain separate work.
