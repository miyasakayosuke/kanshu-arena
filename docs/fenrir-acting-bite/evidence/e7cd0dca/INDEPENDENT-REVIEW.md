# Independent full-arc playing-layout review

Source e7cd0dcaee824a50ea90263f816c049cbdc3885b, actual Chromium artifacts.
All eight tall-plus-top-scroll sweeps were independently recalculated: each has
40 samples from 500 to 890 ms, zero stage/viewport failures, zero potential UI
bounding-box overlaps, constant physical width and floor, and at least 20.19 px
of top clearance inside the scene. Actual 560 ms screenshots confirm the whole
wolf is visible. Natural scroll hides the short-portrait leap and clips the
desktop-rear tail at the top.

The preceding actual Tab trials reached an enabled turn button whose center
hit-test resolved to it in all 24 fixtures, each in 21 presses. This establishes
that narrow keyboard focus result, not combat activation.

Close this bounded staging experiment. Conditional headroom reservation plus a
one-time arena reveal after playing layout settles, before the motion clock,
is suitable for continuing the isolated motion candidate. Do not repeatedly
scroll or change physical scale/floor during the action. Retain user scrolling.
The new jaw-close/reach silhouettes must be checked against the same envelope.

The short-portrait Skip control is below the viewport after revealing the arena.
Its activation/focus behavior and actual combat integration remain open. This
layout fixture uses the real App playing state through a test-only setter; it
does not execute a combat turn. No final motion, owner or release acceptance is
established by these results.
