# Home simplification and readable monster identity

Date: 2026-10-12 UTC. Reviewed implementation integrated into the v0.20.6 release candidate. This note preserves the isolated implementation evidence; final release checks and public-browser acceptance are recorded separately in docs/rights/releases/2026-10-12-v0.20.6.md.

## Exact baseline and scope

Based on released v0.20.5 commit `ec739f98df957b6cb7042b035e089ca86f32d26c`, source tree `ee5ac1dea75cdcf6c3b0b5fad37c5b7ebfcc5b43`. The isolated baseline was exported from that exact tree, rather than the release checkout's older imported HEAD.

The home screen removes only the redundant 「闘技場へ」 and 「編成へ」 buttons. Its three footer destinations and distinct 「系統パーティを試す」 entry remain. The short-landscape home no longer reserves a second column for the deleted navigation buttons. The current party, leader effect, readiness text and credits link remain.

All 37 current monster identities now have two short paragraphs directly under the existing portrait, before their gameplay role:

- 「ひとこと」, marked 「本作の創作」: original, warm, lightly humorous game fiction.
- 「伝承」: a concise, independently paraphrased introduction with a small source link. The five existing game-original entries, IDs 24–28, instead say 「ゲームオリジナル」 and explain their origin honestly, without fabricated mythology or historical links.

The previous long-form monster story is replaced rather than duplicated. The existing expandable section still contains all base statistics and skill stories; its label is now 「能力値・特技の物語」. Ability explanations, gameplay roles and tradeoffs, skill names, battle rules, names and IDs, all artwork and animation, save data/schema, footer routing and family-trial behavior are unchanged. The fixed 44×44 close header, body scroller, focus trap and v0.20.5 topmost Escape behavior are preserved; source links are included in the focus cycle.

## Text origins and rights limits

The full 37-entry source/support record is `docs/monster-lore-sources.json`; the compact runtime data is `src/monsterLore.ts`. Source evidence supports only the traditional facts, not fictional personalities, artwork, family labels or combat abilities. IDs 22, 23 and 33 remain game adaptations of documented motifs rather than invented claims about ancient proper names. All character names are preserved.

Japanese prose, UI labels, integration code and tests were written directly for this project with AI assistance. The desired broad qualities are short, approachable and gently funny. No Dragon Quest or other game's description sentences, reference illustrations, modern source translations, archived pages, audio, fonts, extracted code or external dependencies are imported. The linked evidence is not a license for source expression. Existing questions about visual similarity, trademark, copyright ownership and professional review remain open; passing inventory checks is not legal clearance.

## Validation and review boundary

New automated tests cover exact IDs/names for all 37 entries, unique concise flavour/origin text, complete source provenance, honest game-original labeling, always-visible placement outside the statistics disclosure, one copy of each description, unchanged skill counts and all skill stories, source-link safety/accessibility, and keyboard cycling without a source link. Existing focus tests now include source links and Escape from them. Home tests require one unique trial entry, all three footer destinations, repeated footer clicks without duplicate history, and a single-column layout at 400×606, 802×394, 326×432 and 720×900 CSS sizes. Existing profile-scroller cascade checks cover the fixed header and five sizes. Lore typography uses 14px flavour, 13px origin and 11–12px labels/source links, with regression checks for at least 4.5:1 contrast against both modal gradient ends and wrap-anywhere behavior at five sizes.

The final aggregate contains 2,504 tests across 110 files, with 15 rights-checker self-tests. The checker fixture now retains the new text-provenance file, and a regression requires missing provenance to fail. Exact final test/build results and patch/tree hashes are recorded in the candidate evidence bundle. No separate lint script exists. Source/distribution rights checks are notice/inventory checks only.

Rendered candidate browser QA is not completed: the local Chromium process is blocked by runtime socket restrictions, including the approved execution escalation. The separate cloud browser cannot access this executor's local preview; prior verified attempts are documented in the v0.20.5 work. No candidate screenshot is presented as proof. After any separately authorized publication, acceptance must check actual portrait and short-landscape layouts, all description text/source reachability, fixed × after scrolling, expanded statistics, Tab/Shift+Tab, one Escape back to an intact catalog, footer navigation and family-trial saves. A serious layout regression needs correction or the prior verified release restored.

The isolated implementation did not publish. Authorized publication is handled by the separate v0.20.6 release workflow. No license/visibility change, subscription, outside contact or fee was performed in this implementation.
