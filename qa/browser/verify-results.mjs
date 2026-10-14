import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
export const titles = {
  "ui": [
    "catalog navigation, detail keyboard focus, team and complete play loop",
    "catalog result changes reset real scroll and navigation retains it",
    "awakening calculator is hypothetical, bounded and resets between monsters and reopen"
  ],
  "storage": [
    "real same-origin pages serialize competing heads, stale writes and duplicate rewards",
    "explicit legacy import, roster migration, real abort and reload preserve exact bytes",
    "real IndexedDB schema and future-version refusal leave existing bytes intact"
  ],
  "progression": [
    "fresh AwakeningPanel browsing grants no materials and fits both viewports",
    "upgrade confirmation cancellation and repeated submission spend once durably without changing old teams",
    "selection reward is claimable once and the level-99 cap survives reload",
    "normal production battle completion grants the engine outcome reward once across navigation and reload",
    "stale visible upgrade confirmation cannot overwrite a newer browser-tab commit",
    "navigation during a real pending IndexedDB begin cannot reopen the abandoned battle",
    "real begin-write abort leaves no phantom battle or reward and permits a reviewed retry",
    "active battle navigation cancel Back and Forward never create rewards or resurrect a discarded match",
    "reload keeps an active battle blocked until explicit no-reward discard is confirmed"
  ]
};
export function verify(report, candidate) {
  const wanted = {
    baseline: titles.ui.slice(0, 1), preview: [titles.ui[0], titles.ui[2]],
    catalog: titles.ui.slice(0, 2), storage: titles.storage, combined: titles.ui,
    awakening: [...titles.ui, ...titles.storage, ...titles.progression],
  };
  if (!Object.hasOwn(wanted, candidate)) throw new Error('Unknown candidate');
  const tests = [];
  const visit = suite => {
    for (const spec of suite.specs ?? []) tests.push(...spec.tests.map(test => ({ ...test, title: spec.title })));
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  const total = 2 * Object.values(titles).flat().length;
  const passed = tests.filter(test => test.results.length === 1 && test.results[0].status === 'passed');
  const skipped = tests.filter(test => test.results.length === 1 && test.results[0].status === 'skipped');
  const count = 2 * wanted[candidate].length;
  if (report.errors?.length || tests.length !== total || passed.length !== count || skipped.length !== total - count) {
    throw new Error(`Unexpected QA coverage: candidate=${candidate}, total=${tests.length}, passed=${passed.length}, skipped=${skipped.length}; expected ${count} passed out of ${total}`);
  }
  for (const project of ['desktop', 'phone']) {
    const projectTests = tests.filter(test => test.projectName === project);
    if (projectTests.length !== total / 2 || new Set(projectTests.map(test => test.title)).size !== total / 2) throw new Error(`Missing or duplicated ${project} coverage`);
    const actual = passed.filter(test => test.projectName === project).map(test => test.title).sort();
    if (JSON.stringify(actual) !== JSON.stringify([...wanted[candidate]].sort())) throw new Error(`Missing ${project} named evidence`);
  }
  return { candidate, total: tests.length, passed: passed.length, skipped: skipped.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(verify(JSON.parse(fs.readFileSync('test-results/results.json', 'utf8')), process.env.QA_CANDIDATE)));
}
