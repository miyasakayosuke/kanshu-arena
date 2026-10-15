# Conditional short-screen Skip result

Source814f40d057dfe2481fdfee658e0de64a3ddd673a; CI38764616520.
Control781309f67000ef8800b9f1c19d42418901d61142 remains preserved.
Decision: retain this as the preferred conditional short-portrait Skip candidate.
Stop the bounded UI experiment here. This is an opt-in fixture, not production
adoption, full-animation quality acceptance or permission to release.

An independent read-only reviewer inspected the raw event/state data, all eight
screenshots and decoded continuous25fps recordings. Both complete final battle
states equal the corresponding781 baseline exactly. Each genuine Skip commits
once; no cues or candidate motion revive during the post-Skip observation. All
game tests/build, provenance checks and18 standalone checks passed as well.

## Visible improvement

Both390x640 cases retain the existing status paragraph and existing Skip button.
The enabled116x44px button occupies x266–382,y588–632; the unchanged status text
fits beside it at x12–258. The band is readable throughout the bite and control
activation. It does not cover the arena, enemy vitals, ally cards or battle text.
The front keyboard focus ring is fully contained in the viewport.

Five genuine Tab presses reach front1x Skip with no scroll, then Enter activates
it. Rear2x uses a freshly center-hit-tested pointer click with zero wheel steps.
The same DOM elements/handler and Tab order are retained. Preparation verifies
that the scene and inner scroll do not move when the band is applied. Actual bite
draws preserve physical width, floor and stage bounds throughout the action.

After Skip, inner scroll remains0 and both scenes stay at y89. Both wolves remain
fully framed, improving on the cropped upper scene in781. No automatic post-Skip
scroll restoration is used. The pre-clock arena reveal is still visibly a layout
transition; the band causes no movement during the bite itself.

## Timing and presentation limits

Observed impact callbacks occur at805ms front1x and406ms rear2x, respectively5/6
wall-ms after their nominal deadlines. First closed-jaw draws follow the observed
impact by11ms in both cases, without earlier closure in the recorded draw trace.
The skill remains10MP, one800ms logical impact and a1500ms command. These measured
CI-browser delays are not universal timing guarantees or same-frame sync claims.

Lower command choices and next-turn start still require ordinary command-phase
scrolling. The next-turn button begins at y695.58 front and726.58 rear, below the
640px viewport. Preserving the whole arena does not make every command fit at
once. This consequence is retained rather than silently repaired by auto-scroll.

Coverage is limited to the two fixed390x640 contexts, safeBottom=0. The pure
placement check rejects an inadequate band, including its nonzero-safe-area test,
but actual device safe areas, resize/rotation and modal interaction were not
rendered here. Layer ordering was inspected in code only.25fps video cannot prove
each very short key exposure; earlier denser controlled captures remain relevant.
The known rough pose/identity/chain/foot/edge gaps are unchanged. No new artwork
or further control-placement iteration is warranted by this result.
