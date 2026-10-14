# Motion preview capture record

Candidate rendered: dcc02c4cbc42888136a333abf67af415f722f1d2

- CI: https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38565441938
- All 15 rights self-tests, rights inventory, 3,587 game tests, game build and four mesh checks passed.
- Actual Chromium capture completed: 144 frames at 24 fps, six seconds, 1100 × 900 desktop review board. The same candidate was checked at a 390-pixel mobile viewport. No page exceptions were recorded. Pause, original-pose comparison and resume controls passed.
- The overall CI run failed at video packaging only because ffmpeg was absent. The successfully retained frame artifact was downloaded, its SHA-256 verified, then encoded with local ffmpeg; no screenshot pixels or animation timing were changed before encoding.
- Captured ZIP SHA-256: 776188e3450df04b8241748c276b74f3fea159dc14c67ff72eabd2293497a64c
- Assembled H.264 MP4: six seconds, 24 fps, 1100 × 900, 1,290,957 bytes.
- MP4 SHA-256: 66ad08da98f44e5889298925ac5098f57b42ff4ce8bcd8901b46d6303c6f16c6

The original illustration bytes match the recorded source SHA-256. An implementation review of rendered neutral/load/brace keyframes found visible shoulder lowering, fixed toe contacts and preserved identifiable face/chain shapes. This is not independent visual approval. The small-scale movement is intentionally more restrained than the enlarged study; there is no new mouth opening, footstep or 3D turn. Owner visual review and any adoption decision remain outstanding. No game deployment occurred.

The next workflow revision explicitly installs Ubuntu's ffmpeg package before MP4 encoding. It does not change the artwork, rig, rendered page or production game.
