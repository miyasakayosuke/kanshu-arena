# Short-portrait grid sizing follow-up

- Date (UTC): 2026-10-11.
- Base: v0.18.4 tree `cba0fd7e83d6fd53feba906c72cea19d68d75577`; integration owner identifies public commit `3079b89de184d852e0f1b661ae67e9f2500d7c1e`.
- Isolated candidate; no publication or version change.

The integration owner's live Chrome measurement at 326×432 found battle rows of `38px 11.4286px 27px 301.571px`, with battle clientHeight and scrollHeight both 386. The stage clipped its 140px Canvas and 62.7679px vitals: its own height was 11.4286px and scrollHeight 203. The prior CSS cascade tests did not detect this rendered-layout failure.

One short-portrait CSS declaration now uses `38px max-content max-content max-content` instead of auto tracks. This reserves intrinsic parent rows for the existing stage, caption, and command dock. The intended result is a single overflowing battle scroller, without changing the child content or ordinary layout rules.

The CSS and regression-contract update were directly authored for this project with AI assistance. No external code, text, assets, dependencies, art, fonts, sound, or motion samples were added. No battle renderer, gameplay data, engine, AI, saves, targeting, clock, or motion timing changed. The manifest records this origin; this is not a rights-clearance claim.

Verification: focused CSS/Canvas/caption regression, full tests, rights self-tests, rights inventory, TypeScript/Vite build, distribution notices, and patch application are recorded in the accompanying validation evidence. The updated CSS test verifies that intrinsic track declarations survive the cascade for normal and compact-caption states. It does not measure geometry.

Actual proof remains post-deployment only: stage outer height must contain its Canvas plus vitals; caption and commands must follow it without overlap; battle scrollHeight must exceed clientHeight at 326×432; scrolling must retain clock/exit access and reachable commands/skip. Verify 457×605 and 596×381 remain unchanged. No alternate local browser/hosting route was attempted.

Existing rights/similarity questions and licensing status remain unchanged. Professional review and independent publication verification were not performed.
