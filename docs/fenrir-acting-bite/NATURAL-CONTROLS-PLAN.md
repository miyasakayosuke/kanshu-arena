# Frozen-art natural-clock control check

Prerequisite: retain the successful c05053e9 controlled10-case evidence and the
failed3505ab26 comparison. No additional artwork, animation timing or gameplay
changes are planned. The existing hash-locked opt-in adapter remains unchanged.

Run exactly two actual Chromium short-portrait390x640 cases with NO page.clock:
1. Front Fenrir at1x, legal commands entered through the UI, then genuine Tab
   traversal to Skip and Enter activation.
2. Rear Fenrir at2x, the same legal command setup, then genuine wheel scrolling
   to reveal Skip and a center-hit-tested pointer click.

Allow the first real bite to finish before testing Skip so the capture can show
its natural event/frame sequence. Retain continuous browser video and snapshots
before scrolling, while Skip is focused/hit-tested, and after completion. Record
actual cue and rAF timestamps, observed HP-to-close delay, source pose order,
button geometry, focus path, inner scroll and result viewport. Browser/CI timing
is measured evidence, not a universal hardware-performance guarantee.

Assert the real Skip commits the complete unchanged-engine result once and that
no pending cue or late render resumes during a short post-Skip observation.
Do not force a winner, alter HP/MP, warp art, modify the scene during playback or
silently repair UI cropping. Keep offscreen/occluded controls and post-Skip
viewport consequences explicit. The first result receives independent review.

The existing ten controlled cases and frozen-art renders remain preserved and
will not be rerun for this smaller follow-up. The normal game tests, build,
source-hash checks and adapter assertions remain enabled for the new candidate.
Stop after these two natural-clock cases and their bounded review.
