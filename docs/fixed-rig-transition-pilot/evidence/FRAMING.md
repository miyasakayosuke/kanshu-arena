# Fixed capture framing correction

The first rendered version used 600×450 enlarged panels, a fixed root origin
at (0.72×width, 0.83×height), and 1280×900 comparison frames. It clipped lower
hind paws and the tail. The initial comparison movie, one paused screenshot,
enlarged sheet and initial source are retained in `retained-initial-layout/`.

A first origin-only correction improved the candidate snapshots but the held
control still exceeded the viewport during its rising held pose. Actual librsvg
stroked-ink bounds exposed this: sampled minimum margin was negative.

The final capture uses 600×600 enlarged panels and one fixed origin at
(0.62×width, 0.57×height), with 1280×1050 comparison frames. Native-size panels
use (0.64×width, 0.59×height), including narrow contact-sheet panels. These origins
are constant for every time, identical between A and B, and not chosen per pose.
No rig bone length, anatomical shape, pose angle, interpolation, physical scale
or source root trajectory changed during these capture corrections.

The final bounds test measures both variants, all five panel configurations and
the full 360–660ms interval at 0.25ms spacing (12,010 samples). A conservative
maximum vertex-speed bound covers the space between samples. The check requires
every sampled ink margin to exceed that bound plus a numerical allowance.

This is a corrected presentation frame, not a second animation design iteration.
