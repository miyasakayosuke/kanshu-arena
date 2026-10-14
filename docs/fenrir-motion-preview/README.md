# Fenrir articulated step candidate

Isolated review-only successor to the unselected mesh crouch. No production import, art adoption, game deployment, or awakening integration is included.

The five-second study uses original-texture rigid plates, a two-bone foreleg with fixed lengths, a separately rotating paw, and stationary support-leg plates. The near paw lifts approximately 90 source pixels and advances 110 pixels before planting; the torso then transfers 40 pixels forward. A 40-pixel rigid downward load keeps the plant reachable without stretching the leg or compressing the chest. Shoulder/elbow centers beneath fur are inferred pivots, not anatomically recovered facts. Support contacts retain their different perspective heights.

The entire head and torso use a rigid translation, without full-body squash. The original cuff remains with the lower foreleg. The original chain remains a rigid assembly with limited sway rather than individually reconstructed links. The tail currently follows the torso rigidly without a separate delayed response. It is not a true 3D turn or a physically simulated chain. Original overlapping mane and fur plates conceal attachment cuts; rendered seam acceptance is required.

## Artwork

`original.png` is the existing selected project illustration, 1312 × 1199 RGBA, retained byte-for-byte: SHA-256 e072a556adb672e192065347486e674d091bb03892decfe0c84625c84ebd4137. Its original creation tool and full provenance were not independently reverified. No new ownership, license or legal clearance is asserted.

`chest-patch.png` was generated on 2026-10-14 using the built-in image editing tool, with the original as edit target and transparent output. One generation was used; no external generation service or CLI/API fallback was used. The output is 1312 × 1199 RGBA, SHA-256 db88301fac2c1c3ad7c82597ddef0ccc7daa3ed900285ba176fe2f9f84921a40. The exact prompt is in `chest-patch-prompt.txt`.

The generated full-frame output has fine texture changes throughout. It MUST only be sampled through the narrow hidden-chest runtime mask, approximately x345–580/y540–835; the generated face, visible body, feet and tail are never adopted. Identity registration is supported by local shoulder/eye/marking correlations, but this is not proof of seam invisibility. Chest interior alpha is mostly 253 and must be checked on light and dark backgrounds. The original's existing edge colors remain unchanged. Hidden anatomy and new chest contour are a draft hypothesis.

The existing external animation sample informed amplitude/timing only. Its bytes, malformed foreleg and changing chain are not included. No third-party art, animation, audio, font, model or source code is introduced. Existing dependencies remain unchanged.

## Review and reproduction

Serve this directory through an ordinary static HTTP server. The page displays a large specimen and the same motion at approximately 130 CSS pixels, with comparison, playback, timeline, background and reduced-motion controls. Review all pose transitions, not just stills.

Run `node --test docs/fenrir-motion-preview/rig-checks.mjs` for deterministic reach, fixed-length, contact, loop, reduced-motion and source-preservation checks. Numeric success does not establish visible anatomy or quality. The candidate-only contents-read CI workflow runs the existing rights/tests/build suite and actual Chromium capture, then installs Ubuntu ffmpeg and encodes the MP4. It cannot deploy or write repository content.

Explicit owner visual acceptance remains unmet. The candidate must receive independent rendered review and owner approval before any production adoption. The current main game and held awakening candidate remain unchanged.
