# Remote preservation status

The frozen local package was independently reproduced and visually reviewed. FREEZE-MANIFEST.json describes that complete local 31-file package, not a promise that every file is present in this branch.

Two local package entries are not included here:
- reference/high-leap-timing.mjs: reference-copy write was denied and was not retried. The frozen existing source is retained unchanged at https://github.com/miyasakayosuke/kanshu-arena/blob/62fb3a46c05427445922e8e7205c81d8dfd8390b/docs/fenrir-acting-bite/high-leap-timing.mjs . The local test reference differs from that source only by one additional trailing blank line. No full-action choreography was authored or modified. Do not automatically reattempt the denied copy or rewrite dependencies to evade it.
- evidence/native-130px-boundaries.png: upload returned a disconnected response; read-first lookup of its calculated Git blob returned not found. The final 142px boundary sheet, enlarged sheet and comparison recordings are preserved. The 130px local result remains covered by the independent package verification but is not claimed as remotely saved.

Remote standalone test reproduction is incomplete because the test reference copy is absent. The independently tested local package and its hashes are identified by the freeze manifest. All authored 300ms proxy code and the main comparison movie are preserved; no production code or original artwork changed.

FRAMING.md describes additional initial-layout outputs available locally. The initial-layout evidence preserved remotely is limited to normal-300ms-60fps.mp4, paused-430ms.png and rig.mjs.txt plus framing-only.patch; the initial full comparison movie and enlarged sheet are not included. Final deliverables are distinct from those retained initial captures.

This branch is an unintegrated one-trial mechanics comparison. It is not release approval, finished-art continuity proof, browser/game QA, or full-action acceptance. The trial is complete for evaluation; do not start another trial automatically.
