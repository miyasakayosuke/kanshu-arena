# Fenrir bite studies: supplemental visual review

2026-10-15 UTC. Baseline game: `14134f351d8eca79714199e1f2b34dc76e826a4e`.

Status: **unapproved studies; motion quality has not passed**. These files are a
recoverable checkpoint, not a game integration or release. The game source and
timing are unchanged. The original reference is retained byte-for-byte.

## Independent static review findings

The six-key-pose study communicates a promising large attack. The bite around
frames 8–10 of the 24-frame study is worth retaining. No obvious additional limbs
or segmented chest/thigh seams were found in the static sheets. This is not proof
of consistency during playback.

The 24-frame study does not yet establish smooth animation:

- Frames 3–6 do not clearly load and extend the hindquarters.
- The jaw is open at frame 4, closed in frames 5–7 and open again at frame 8. This
  adds an accidental mouth action instead of a single opening and bite.
- The 11→12 transition lacks a clear forepaw contact and compression beat.
- Recovery reverses head direction at 13→14 and 16→17, then jumps at 19→20.
- Frames 21–24 mostly repeat a hold rather than a progressively settling pose.
- Uniform frame timing would put the strongest bite before the required 800 ms.
  The existing action clock needs an explicit, nonuniform exposure schedule.
- The generated neutral redraw changes muzzle, fur and cuff/chain details from
  the selected original. It must not replace the exact original neutral.
- Broken chain tips read as closed loops. Attachment, link count, thickness and
  open broken ends need a consistent model across poses.

The returned sheet does not obey the requested 256 px cell boundaries: some
extremities cross them. A naive fixed-grid crop is therefore invalid. Any future
atlas needs inspected full-shape bounds or corrected spacing, without clipping
paws, ears, chains or tails.

## Narrow correction direction

Keep the successful extended bite silhouette. Correct anticipation and landing
as weight-bearing full-body poses; remove the early extra jaw opening; make
recovery continuous; lock face, cuff and chain identity against the original.
Use the exact original neutral for the beginning and end. Do not regenerate the
entire approach or hide missing drawings through crossfades, blur or body squash.
Each corrected pose requires another independent check before more in-betweens.

## Early checkpoint verification (before browser CI)

- Source PNG identity and SHA-256 checked; original bytes unchanged.
- Generated RGBA sheet dimensions and alpha inspected.
- Static source sheets and a Canvas2D light/dark montage inspected.
- Separate independent read-only static pose review completed.

No actual browser animation, 130–142 px playback, desktop/mobile playback,
normal/2x/skip/reduced-motion/repeated-cast/late-load/interruption/fallback test,
or integrated game motion has passed. Local Chromium launch and the cloud
browser's localhost connection were unavailable in the earlier inspection.
Canvas2D rendering is not substituted for browser evidence. No CI result or
owner visual approval is claimed.

## Checkpoint contents and origin

`assets/reference.png` is the selected project reference, unchanged. Its original
creation provenance remains unverified. `assets/keyposes-first.png` and
`assets/inbetween-study.png` are built-in image-generation outputs; exact prompts
are in `PROMPTS.md`. `pose-render.png` is a deterministic montage of the six-pose
sheet on light/dark backgrounds for inspection, not additional generated art.
`pose-gallery.html` is a static viewing aid. `provenance.json` records file hashes.
Nothing here establishes legal clearance, game adoption, release, or acceptance.

## Reproducible byte checks

Run `node docs/fenrir-acting-bite/verify-study.mjs` for all PNG byte hashes and dimensions. The existing general rights checker hashes UTF-8 text; binary PNG hashes are therefore recorded separately as `binarySha256`, with this explicit check rather than treating decoded text as image bytes. The general inventory still checks all listed files exist and verifies text hashes.

## Narrow corrections and diagnostic playback

A separate independent static review found the two-pose correction's left pose useful as a closed-jaw hind-load key. Its right pose reads as settled low recovery, not forepaws-first landing, and is used only in that role. Both show four limbs, coherent bent hocks and clearer broken chain ends. Two additional bridge poses target grounded hind drive and forepaw contact with airborne rear paws. Independent static review found both usable for timed keypose diagnosis: readable four-limb anatomy, correct cuff locations, open chain terminal, raised forepaws with hind support in the drive, and airborne rear paws at forepaw contact. Keep the already-open jaw continuous into the bite; verify body scale and floor contact in playback. This is not motion acceptance.

The new index.html is an isolated **discrete keypose diagnostic**, not a smooth motion or game integration. It uses an explicit exposure schedule preserving 800 ms impact and 1500 ms total. It displays the exact reference at the beginning and end; there is no body deformation, crossfade, motion blur or camera movement. The switches deliberately expose missing in-betweens and identity/foot-position jumps. Chain differences in the old bite remain visible and unresolved.

The renderer selects one connected whole wolf from each sheet, preserving its source RGBA and a four-pixel soft edge. This is whole-sprite isolation, not articulated body-part masking. Original files remain untouched. Transparent fringes, missing islands, ground contacts, relative scale and all transitions need actual rendered inspection; the selection algorithm does not establish visual quality.

A branch-only isolated CI workflow renders normal, double-speed and reduced-motion videos, desktop/mobile light/dark key screenshots, and checks skip/repeat/late-load/defeat/fallback behavior. These are preview-controller checks, not proof of integration with the game's authoritative events. At this checkpoint CI and rendered review are pending. No game sources or release workflow are modified.

## Actual browser follow-up

The earlier pending browser status is historical. Exact baseline b0b697ed completed isolated Chromium CI and independent sampled rendered review. See [BROWSER-REVIEW.md](BROWSER-REVIEW.md) for provenance, retained evidence, corrected review findings and the same-art registration comparison. This remains an unapproved rough pilot, not a smooth animation or game integration.
