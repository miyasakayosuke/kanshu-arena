# Repository work

- Read `docs/rights/release-checklist.md` before adding or changing characters, artwork, text, sound, fonts, third-party code, research excerpts, or release packaging.
- Preserve exact third-party notices. `public/THIRD_PARTY_NOTICES.txt` is shipped with the game; its licenses do **not** license this project's own code or art.
- Record new/changed assets and their actual origins in `docs/rights/asset-manifest.json`. Keep evidence and unresolved provenance/visual-similarity questions. Do not mark a source as cleared because it is mythical, AI-assisted, publicly accessible, linked, or merely renamed.
- Research links and gameplay ideas are not permission to copy a game's concrete expression. Do not bundle reference images, music, screenshots, archived pages, copied descriptions, or extracted game code without documented applicable rights and the owner's approval.
- Run `npm run rights:test`, `npm run rights:check`, `npm test`, and `npm run build` before a release. The build checks source notices and their presence in `dist`; these are inventory checks, not an automated legal opinion.
- After an authorized deployment, verify the exact commit and the live `credits.html` / `THIRD_PARTY_NOTICES.txt` URLs. Log the evidence using `docs/rights/release-checklist.md`.
- Do not choose a license for the project's own work, contact an attorney/rightsholder, sign legal terms, or incur a fee without the owner's authorization. Keep pending professional-review questions in `docs/rights/review-ledger.md`.
