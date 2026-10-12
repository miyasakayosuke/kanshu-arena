# v0.20.16 Completed-action portraits

Base: public v0.20.15 commit `4fad2dc598168f1161bf3bbd5dc221fdbe8354e8`, tree `7aebc1a25d14b3da45ec2c79078d69ee4132ccd8`.

The existing turn-replay builder now exposes command start/end spans alongside unchanged effect cues. Only actual cast groups produce spans. Passive repair, poison ticks, fallback notices, resource updates and defeated queued units without a cast do not create additional actions. Multi-hit spans retain the existing recovery interval.

During replay, the current ally reads 行動中, completed living allies read 行動済 with static portrait opacity, and unacted allies read 待機. Defeated allies retain 戦闘不能. The text is included in each card's accessible description. HP/MP and status text retain their existing appearance. No portrait motion or transition is added. Skip, natural finish, next turn, new encounter, rematch and confirmed navigation reset the presentation state through the existing timer lifecycle.

Engine, balance, RNG, persistence, team saves, character assets and replay effect timing are unchanged. The reference observation is used only as a generic presentation principle; no external media or expression is bundled.

Validation: focused real-engine 1×/2× command and passive tests, defeated-before-action fixture, fallback/multihit spans, skip/navigation/rematch/next-turn cleanup, static CSS contract and full existing suite. Native phone contrast/fit and reduced-motion browser rendering remain publisher acceptance checks; DOM/CSS tests do not establish pixel-level rendering.

The reviewed candidate is integrated into v0.20.16. Fresh aggregate results are recorded in `release-validation-v02016.json`. Actual native rendering is accepted only after the exact release deployment; this source record does not claim device or performance verification.
