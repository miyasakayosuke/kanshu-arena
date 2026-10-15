# First real-combat lifecycle run stopped on a timer assertion

Source3505ab26; run38753422571. All unchanged game tests/build and16 standalone
checks passed. Earlier frozen-art renders completed. The new lifecycle matrix
captured only its first desktop case before an exact callback-time assertion
failed. This is not a completed lifecycle pass.

Observed captures retain MP50 after the10MP cast debit. Target HP is150 at799
logicalms and76 at800. At817 the renderer has observed that authoritative impact
and selects the closed-jaw key at actionAge800. The preceding800 capture still
shows the prior rAF drawing. This is a real frame-observation lag, not evidence
that the canvas has a separate damage clock.

The first JSON did not save cue logs before the failing assertion. The next test
must retain those logs even on failure. Investigation of the exact installed
Playwright1.56.1 source confirms that a zero-delay timer scheduled during a tick
is placed1 wall-ms later; runFor also rounds its ending tick upward. The corrected
assertion permits only that0–1ms start-callback floor and keeps the800ms impact
callback exact. At2x, the pre-impact probe uses798 logicalms, one whole wall-ms
before impact, rather than799 which rounds into the400ms wall-clock deadline.

Source: [Playwright1.56.1 clock implementation](https://github.com/microsoft/playwright/blob/v1.56.1/packages/injected/src/clock.ts#L223-L245).
No game timing, gameplay, animation or source image changes are made by this
measurement correction. The next actual run must confirm the logged values.

The production App currently has its own dark UI and light arena styling. Browser
color-scheme emulation is not a claim of a separate light-theme implementation.
The first screenshot is inspected as the actual accepted-main styling.
