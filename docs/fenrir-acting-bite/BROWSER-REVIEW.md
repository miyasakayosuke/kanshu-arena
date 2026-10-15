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
