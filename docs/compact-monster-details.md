# v0.20.11 compact monster-detail implementation

Base: public v0.20.10 commit `6852230e96184577f5d30cfe8e840ac2824d8115`, exact tree `9b79a301732ad817a8dce598949acf78e9e8b7ce`.

## Requested behavior

- Remove tactical role descriptions, strengths and weaknesses from monster details.
- Read details without vertical scrolling on ordinary phones, including 360×640 and 400×606.
- Keep the complete myth/flavour stories, actual battle rules, base stats, source links and existing optional movies.

## Implementation

Four manually selected groups: 姿 / 物語 / 能力 / 特技. The opened profile starts with the full existing character artwork. The name, family and cost remain under the artwork. The fixed top header also identifies the monster and owns the 44px Close control; the tab strip stays outside the reader.

物語 contains the full existing flavour and origin plus the existing source link, including its accessible source title and new-tab notice. 能力 starts with all four base stats and the full leader effect. Additional mechanical explanations use numbered, manual pages, with at most 140 characters per page. 特技 has a 2-column selector for all actual skills. Every skill retains its complete rule text and its complete original skill story in explicit pages. No ellipsis, line clamp, cropped rules, automatic advance or automatic movie play is introduced. No swipe listener is added, preserving text selection and operating-system edge gestures.

Existing `monsterRole` name/strength/tradeoff blocks are no longer rendered. Mixed family paragraphs lose the promotional descriptions “低コストの獣系アタッカー”, “先制で狙われると脆く”, “HPが低く、回復・守護は持ちません” and “攻撃を止めて補給する手番を選ぶ中核です”. Poison-counter advice is restated as the actual cleanse/guard effect. Numeric skill costs, finite-use constraints, hit timing, eligibility, removal rules and calculations remain. Engine, strategy data, artwork, save data and movie code are untouched.

Keyboard tabs use roving tabIndex, aria-selected, aria-controls, labelled tabpanels, ArrowLeft/ArrowRight and Home/End. Tab/Shift+Tab remains trapped in the topmost profile and ignores hidden panels/pages/skills. Manual page controls retain focus at both ends. Switching groups or skills resets the local emergency scroll offset. Escape and Close retain prior focus restoration; nested movie behavior remains owned by the unchanged player.

## Viewport and accessibility contract

The modal is limited to 680px and the available dynamic viewport, with safe-area-aware overlay padding. All four tabs and Close stay fixed. Art flexes into the remaining space. Appearance headings and image-fallback text use content-based minimum sizing and visible overflow, so enlarged text can extend the fallback reader rather than being cropped by the older art-stage clipping rule. Text is 14px or larger for stories, skill rules and family mechanics, with at least 44px interactive targets. A 140-character technical page, a maximum two-row skill selector and page buttons are budgeted below the ordinary phone reader height.

The reader deliberately retains `overflow-y:auto` as an accessibility fallback. Very short/landscape screens, extreme zoom, text enlargement, unusually large system fonts or future longer content may scroll instead of hiding information. This exception must not be described as zero scrolling under every possible condition. The normal-phone no-scroll goal needs rendered verification; DOM/CSS checks do not measure geometry.

## Verification and integration

- Existing full-family mechanical contracts remain, with selectors adapted to tabs and removed tactical copy.
- All 37 profiles are tested by actually visiting every ability page, skill rule page and skill story page, then comparing reconstructed text with the full source.
- All 37 flavour/origin/source records retain their full text and links.
- Keyboard groups, hidden-control exclusion, page boundaries, text pagination, repeated dismissal, previous focus, body overflow, saved data, catalog filters, history, nested movie focus/inert and manual movie activation are covered by tests.
- Cascade checks cover 360×640, 400×606, 802×394, 326×432, 500×758, 720×900 and 240×320 in three stylesheet orders. They verify the visibility rules, readable type/contrast, fixed controls, scalable art, no text truncation and fallback overflow. They are not screenshots or geometry assertions.
- No local browser retry was made because that route was already verified blocked. Publisher live QA must inspect every tab/page for the longest profiles (Janus, poison users, Fenrir, Vritra), measure reader scrollHeight/clientHeight at the two normal phone sizes, check portrait fallback and movie loading/retry/return, and test a short landscape/text-enlarged fallback.

This implementation is integrated with pasture home and copy cleanup for v0.20.11. Final combined checks are recorded in release-validation-v02011.json; live acceptance follows exact deployment.
