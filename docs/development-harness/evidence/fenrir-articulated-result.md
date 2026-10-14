# Articulated Fenrir candidate: final review result

2026-10-14 UTC. Review-only candidate, not adopted or deployed.

## Result

The near foreleg now performs a distinct lift, forward plant and recovery at enlarged and approximately 130 CSS-pixel display sizes. The original face is preserved and the body does not squash. The final rendered candidate nevertheless fails visual acceptance: conspicuous geometric and sawtooth cutout edges remain at the rear thigh and chest/support roots. Further automatic mask iterations stop here. Owner visual acceptance is still unmet; technical test success is not approval.

Final source: 2e3d54f85d2662f915a8eef9e0f9acdf4cbfc71f on candidate/fenrir-articulated-motion.

- https://github.com/miyasakayosuke/kanshu-arena/commit/2e3d54f85d2662f915a8eef9e0f9acdf4cbfc71f
- https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38574724277

The previous capture at 858e2a5f117d6ce375eb873b3fabe45609f7d87a exposed disconnected fur, chain and cuff fragments. A bounded mask-ownership correction removed those islands, but replaced or retained visible attachment seams. Independent inspection of the second exact rendered sequence confirmed these as blocking silhouette defects, not harmless texture changes. No further implementation is running.

## Technical evidence

Both isolated CI captures completed successfully. Final CI passed all 15 rights self-tests, the rights inventory, 3,587 game tests, production build, ten specific rig tests, actual Chromium capture, reduced-motion checks and MP4 encoding. The workflow is candidate-branch restricted, contents-read only, and has no deployment action.

The final MP4 is H.264, 1120 × 1000, 120 frames at 24 fps, exactly five seconds, 732,042 bytes. It shows the enlarged character and a verified 130 CSS-pixel version side by side. Light/dark named poses, entry/exit comparisons and mobile screenshots accompany the CI artifact. A durable review-copy of the MP4 has also been retained privately for the owner.

- MP4 SHA-256: 7fb55f0e5085689500f6fe90296b875042f0c53d3c7883d621a6284d28323af7
- Downloaded CI ZIP SHA-256: 0382fd1beacac9875f159747a01bfc2e3c3ba23f337504d75a787df2b6fd6e8f, verified against the service digest.
- 5,001 sampled poses: maximum bone-length error 2.3e-13 pixels, minimum reach margin 12.905 pixels, maximum support-contact displacement zero.
- Paw lift 90 source pixels, forward plant 110 pixels; 40-pixel torso advance occurs after planting. A separate rigid 40-pixel downward load preserves reach.
- Source-to-plates entry difference improved from 21,082 to 15,867 changed canvas pixels after correction. Maximum channel delta remains 255, and one opaque pixel is lost. This is not a seamlessness pass.
- Reduced-motion canvas is pixel-identical to the original static pose. No browser page exceptions were recorded.

## Assets and limitations

Original PNG remains byte-identical: SHA-256 e072a556adb672e192065347486e674d091bb03892decfe0c84625c84ebd4137. The built-in image editor generated one registered hidden-chest supplemental plate, SHA-256 db88301fac2c1c3ad7c82597ddef0ccc7daa3ed900285ba176fe2f9f84921a40. Only the narrow hidden chest region is sampled; generated face, visible body and tail regions are excluded. The full prompt and provenance limits are recorded on the candidate branch. Original creation provenance remains incompletely reverified; no ownership, licensing or legal-clearance claim is made.

Shoulder and elbow pivots beneath fur are inferred. Three support legs are stationary cutouts. The chain is one rigid original assembly with a small sway, not individually constrained links, and the tail follows the torso without delayed response. These simplifications and the remaining attachment defects prevent claiming the full visual specification is satisfied.

## Scope and stopping condition

No production game source, gameplay, save data, dependencies, main branch, or held awakening integration changed. Main was reverified at 14134f351d8eca79714199e1f2b34dc76e826a4e. The final implementation attempt count is three; it is not reset or bypassed. The candidate and evidence remain preserved, but adoption and further direction require a separate decision. No release or owner acceptance is recorded.
