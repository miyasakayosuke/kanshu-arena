# Fenrir preview: final technical checkpoint

Candidate branch: https://github.com/miyasakayosuke/kanshu-arena/tree/candidate/fenrir-original-motion

Final source: 2f41f450b8c29c7b54288b181e8a3e7ea23002ce

Final successful QA: https://github.com/miyasakayosuke/kanshu-arena/actions/runs/38566967826

All steps passed: locked dependencies, 15 rights self-tests, rights inventory, 3,587 game tests, game build, four mesh checks, official Chromium installation, 144 actual rendered frames, mobile/controls checks, Ubuntu ffmpeg installation, six-second 24-fps MP4 encoding and artifact retention. No page exceptions were reported. The workflow has read-only repository permission and does not deploy.

Final artifact ID: 11895188935. ZIP SHA-256 verified after download: 004dfc51b06d73ac88d9a741759c06b3a23d7fef478b109a2467a419b90d7ab1. Final CI MP4 SHA-256: f094ab76fbd03cf51855a0ad707ba95c109d67020f74264668ee2acc0716674f.

The earlier owner-facing preview was assembled locally from the successful Chromium capture of dcc02c4cbc42888136a333abf67af415f722f1d2 after that run's video-packaging step lacked ffmpeg. Its capture ZIP was verified, and its H.264 MP4 SHA-256 is 66ad08da98f44e5889298925ac5098f57b42ff4ce8bcd8901b46d6303c6f16c6. The final revision changes packaging and evidence only; original image, rig and page source are unchanged.

## Visual disposition

Technical success does not establish visual acceptance. Independent rendered-frame review judged the candidate worth showing as a work-in-progress, but not game-ready: chest/leg compression is rubbery, the foreleg does not perform a distinct action, chain movement lacks independent weight, and the calm brace is insufficiently dramatic. The owner prefers larger motion. The current crouch is not selected for adoption.

Preserve the independent visual review and articulated-motion specification alongside this checkpoint. A next candidate should use actual limb segmentation and fixed-length articulation, with minimal hidden-surface artwork, rather than amplifying the whole-image mesh deformation. No new supplemental artwork or external generation has been performed as part of this checkpoint.

The production main branch remains 14134f351d8eca79714199e1f2b34dc76e826a4e. The separate awakening candidate remains held. No visual acceptance or production deployment is recorded.
