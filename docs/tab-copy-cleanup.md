# v0.20.11 redundant tab-copy cleanup

Date: 2026-10-12. Baseline: public v0.20.10 commit `6852230e96184577f5d30cfe8e840ac2824d8115`, tree `9b79a301732ad817a8dce598949acf78e9e8b7ce`.

## Scope

- Remove the shared visible game brand/playtest title band and per-tab English badge. Preserve game identity as a visually hidden h1 and the existing document title. Keep a visible build version in the existing credits page; the release integrator must update it with the package version. During battle, preserve the same Home action in a compact header.
- Remove the editor introduction, redundant slot tutorial, candidate English eyebrow, promotional phrases for the three highlighted characters, and the catalog action's secondary explanatory line. Keep those characters' names/detail controls, slot context, state feedback, budget warnings and accessible route identity.
- Remove the roster's redundant reassurance about opening details. Preserve the important pre-/post-leader stat distinction.
- Remove decorative result/tactics eyebrows and the result motivational prompt. Preserve actual outcomes, HP/MP, facts, retry conditions, turn/target instructions and on-demand tactical help.
- The catalog was already visually title-free and retains its focusable accessible title and all 37 read-only cards, lore, skills and optional mythology scenes.
- Home and arena-lobby intro removal, pasture artwork/layout and footer ordering belong to the separately coordinated HomeScreen patch. They are not claimed as part of this isolated source diff.

No engine, stat, AI, timing, persisted-team format, action callback or navigation behavior changes. No new third-party media, code, fonts, descriptions, dependencies or licenses.

## Regression coverage

`App.tabCopy.test.tsx` checks all four routes, absent decorative brand header, accessible identity, read-only catalog, editor context/focus, detail closure, Escape cancellation without team changes, incomplete-team feedback, battle clock/HP/MP, tactics time warning, leave confirmation, and win/lose/draw outcomes with replay terms. `tabCopy.layout.test.ts` checks hidden-heading CSS and 44px battle Home control at four viewport sizes; these CSS contracts alone do not claim real-browser geometry.

Three existing assertions change only because the requested text was removed: `TeamBuilder.test.tsx` checks the retained ヤヌス name instead of its former promotional prefix; `App.dragonWave.test.tsx` and `App.materialWave.test.tsx` check the retained battle Home action instead of the deleted PLAYTEST header label. Current release identification is checked by `creditsVersion.test.ts`. No engine, timing, damage, resource, portrait or navigation behavior assertions are weakened.

This separately reviewed component is integrated with home and compact details for v0.20.11. Final combined tests/build are recorded in release-validation-v02011.json; rendered acceptance follows exact deployment.
