# Paired HP/MP lower-body stack (v0.20.23)

Incremental implementation from deployed v0.20.22 tree `212b14fe3b478d6d23b23ab3f5658f2fd342636a`.

## Reason and narrow change

Native QA found that the upper HP line of a simultaneous HP/MP result could still rise onto a rear Banshee's face. The v0.20.22 pair is lower than the v0.20.21 pair by about 44.93 aspect units for that rear body; this improves placement but does not establish face clearance. Source-coordinate comparison is not a pixel recreation of the old release.

Only HP and MP results co-emitted for the same target in the same authoritative impact batch now form a planted stack. They retain their 34-unit line separation and shift four additional aspect units down: ordinary paired HP sits at foot minus54 and MP at foot minus20. Their previous 22-unit upward drift is disabled. At the native 310-pixel-wide canvas used for the observed Banshee case, this lowers the fully risen v0.20.22 stack by about11.19 screen pixels.

Font, font-size pop, alpha/fade, values, colors, lifetime, event ownership, camera, numbered markers, particle/reaction coordinates and other result motion are unchanged. Earlier unrelated impacts do not retroactively become a stationary pair. Existing removal-subtitle lane reservation is retained. No engine, AI, RNG, save, ally-result or artwork changes.

## Verification and limits

Renderer tests cover the actual Banshee ID4 fixture, both rates, reduced motion, aspects1/1.4/2.82, event ages0/85/210/500/680, font/alpha preservation, marker clearance and unrelated cross-batch HP/MP trajectories. Existing geometry, multi-hit, subtitle, camera, resize and rig suites remain applicable.

Independent review recommends the extra four-unit offset for common-layout chin clearance. The lowest MP line retains roughly two screen pixels of conservative full-em/stroke clearance above the foot marker at the observed310-pixel-wide canvas. This still needs actual native-font/pixel acceptance at peak pop and after recoil settles.

This is not a universal guarantee that every face stays unobstructed in an exceptionally shallow stage. At618×140 (aspect about2.82), formation height-fitting shrinks some rear bodies while result text remains width-scaled; a two-line full-size stack may still cross a small face. Typography, broad layout or target-column changes are outside this bounded follow-up. Do not report automated coordinate tests as proving native face clearance.

## Provenance

Project-specific AI-assisted placement code and tests only. No reference-game assets, screenshots, video frames, prose, animation tracks, third-party code, fonts or dependencies are added. Existing rights/similarity review questions remain open. Inventory tests are not legal clearance.
