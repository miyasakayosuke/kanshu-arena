# Family trials and encounter selection: candidate provenance

Date (UTC): 2026-10-11. This is an unshipped implementation candidate, not a release approval or legal clearance.

Base: frozen v0.18.6 tree `d974e21da54d5d2c5eb12977e5fa1578a923bd0c`, associated public commit `3c4fa1157180d2d3f9e15e270fccf9aa3f326083`. The isolated snapshot commit is `ac6626cc118488acf42fd83eac7ad831bece0194`.

## Actual source and scope

- `src/familyTrials.ts`: new AI-assisted original project code written for the user's request to try family parties easily and draw random family opponents. Its eight presets reuse the existing project's `src/strategy.ts` `recommendedTeams` at runtime, including names, notes and leader-first roster order. Family classifications come directly from existing `src/families.ts` and `src/engine.ts`. No new character, family tag, stat, cost, skill or description is introduced.
- The seven pure recommendations form the standard opponent pool. Existing costs leave only the pure nature recommendation legal under COST15. The existing Janus recommendation is explicitly mixed and excluded from the pure opponent pool.
- The seeded selector is newly written arithmetic using an odd uint32 multiplication and bucket scaling. It does not copy code from an external library or consume the battle engine's random stream. It is not a security or cryptographic function. Ordinary App starts draw a fresh seed with `Math.random`; repeats of a family remain possible. Immediate retry and controlled practice reuse the captured enemy, rule and seed.
- `src/App.tsx`: original integration changes only to the encounter import, state type and new-encounter selection. No battle engine, AI, save format, artwork, animation, styling, version or manifest change is part of this candidate.
- `src/familyTrials.test.ts` and `src/App.familyEncounters.test.tsx`: new original tests for source parity, pure/legal pools, deterministic distribution, detached encounter arrays and battle lifecycle behavior.
- All existing App suites pin ordinary encounter entropy to a fixed seed (the pure slime opponent in standard), so CI does not depend on whichever family happens to be drawn. The new encounter lifecycle suite separately varies real seeds. Existing App command, dragon and material regression files retain their previous explicit battlefield through test-only fixtures built from the project's former CPU team and seed. No assertions were deleted. Strategy and navigation assertions were adjusted for controlled fresh seeds and the existing pure demon leader bonus.

No external research excerpts, media, font, sound, reference image, dependency or new third-party notice was added. Existing third-party notice files are unchanged. Preset text is reused from the project, not independently researched or represented as newly cleared. This candidate does not resolve any previous provenance, similarity, trademark, or professional-review questions.

## Integration scope

The integrated release includes the picker, home/lobby copy, final version, asset-manifest entry, merged tests, rendered/browser QA and any release or publication decision. Candidate machine checks verify implementation and recorded inventories only; they do not establish legal clearance. The standalone candidate was not independently deployed.
