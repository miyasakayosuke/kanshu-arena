# v0.20.17 Catalog continuous viewing

The scoped viewing change was originally checked against v0.20.15, then integrated onto public v0.20.16 commit `dc65454c31d23e969f98390af1942e938b097204`, preserving its completed-action states. Fresh combined release checks are recorded in release-validation-v02017.json.

## Change

The catalog detail header offers previous/next within the filtered and sorted result snapshot that opened the reader. The first/last controls stay visible but are inert and marked aria-disabled; there is no wrap. Single-result and non-catalog details have no browsing controls. Adjacent monster names are exposed in the controls' accessible names.

The selected detail tab stays selected. Skills reset deterministically to the new monster's first skill; ability pages reset to their first page. Reader scroll resets on monster changes. Close, Escape and backdrop dismiss the same reader and restore the original catalog opener without changing its scroll, filters, sorting, history or saved parties. Reopening starts in 姿 as before. There are no keyboard arrow shortcuts conflicting with tab navigation.

The controls occupy the existing header, each at least 44 × 44 CSS pixels. No reader row, copy block, new art, mutation of monsters/skills, battle/RNG, save schema or dependency is added.

## Reference and limits

The design uses the general previous/next browsing interaction to keep inspection continuous, implemented with the project's original React/CSS and existing art. No original game's assets, text, screenshots, sound or code are included. Persistent art on every reading tab is a separate possible improvement, not implemented here.

## Required rendered acceptance

At 320 × 568 and 390 × 844, use the longest catalog name and all four tabs: header controls must fit without added row/height, overlap, text clipping or introducing body overflow beyond the existing long-text fallback. Check 200% text/short landscape fallback, 44px targets, keyboard focus ring and named controls.

Filter to dragon, sort speed, scroll the gallery, open a middle card and browse both directions; confirm order and current tab. Reach first/last and repeat clicks. Filter to a single monster and confirm controls disappear. Switch skills, browse to a different monster and confirm first skill plus complete effect/story. Escape and close must return to the original card/scroll. Check browser Back while detail is open. Open and dismiss an existing myth movie after browsing, ensuring layered Escape and focus restoration. Confirm home pasture, four footer buttons and three saved teams are unchanged.

Automated tests and static CSS checks do not replace this native rendered acceptance.
