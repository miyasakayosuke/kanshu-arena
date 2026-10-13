# Enemy result text: lower-body band (v0.20.22)

Implementation based on public v0.20.21, commit `6512be3cc7ced82ba7971699a9db85de90967a67`, tree `69bcb7984730e6ca959d40c685ae2087f7d3d5d6`.

## Change

Enemy damage, healing and MP result text now has a dedicated anchor at its target's existing formation foot minus 24 aspect-scaled units. The shared impact point still drives particles, projectile endpoints and support reactions. The result anchor is resolved against the same original slot after resize and defeat and uses the existing camera transform.

Each numeric event keeps its amount, text, color, alpha lifetime, typeface/pop and multi-hit offset. Normal results keep the existing rise. HP results reserve a 34-unit upper lane when the same target also has a numeric MP result. Numeric results similarly reserve a lane above existing break/cashout/response subtitles. The reservation considers the current impact batch and still-visible earlier impacts, then remains fixed for that event; a later multi-hit cannot fall onto an earlier removal subtitle or move an existing number.

On an exceptionally shallow stage, an upper lane's final text baseline is bounded by its current em/outline envelope at the canvas top. This is a deliberate spatial exception: rise can stop early there instead of clipping. Event timing, alpha, playback speed, camera, particles and reaction positions are unchanged. Ordinary lower-body lanes do not reach the clamp in the tested layouts.

No ally result layer, engine, AI, RNG, saves, combat values, artwork, dependencies or public media changed.

## Verification

Automated renderer coverage includes single/all-target results, damage/healing/MP, simultaneous HP/MP, repeated multi-hit and removal subtitles, lethal targets, 1×/2×, reduced motion, all five slots and partial formations, large/small drawings, nonzero camera framing, resize, and extreme shallow-stage clipping. Formation geometry tests cover all registered artworks and aspect ratios through 2.82. Existing rig, targeting and other presentation suites remain applicable.

The release owner must inspect the actual native browser render at normal and short phone layouts, including paired result text and text widths. Render-spy tests establish transforms and ownership, not actual font glyph pixel bounds or complete subjective face/number readability.

## Origin and distribution

New code is project-specific AI-assisted implementation of a general readability principle: place result text away from creature faces. Private gameplay research is not included in this repository or browser artifact. No reference-game frames, imagery, animations, prose or source code were copied. Existing artwork rights and similarity-review questions remain open; inventory checks are not legal clearance.
