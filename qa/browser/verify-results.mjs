import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
export function verify(report, candidate) {
  const counts = { baseline: 2, preview: 4, catalog: 4, storage: 6, combined: 6 };
  if (!Object.hasOwn(counts, candidate)) throw new Error('Unknown candidate');
  const tests = [];
  const visit = suite => {
    for (const spec of suite.specs ?? []) tests.push(...spec.tests);
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  const passed = tests.filter(test => test.results.length === 1 && test.results[0].status === 'passed');
  const skipped = tests.filter(test => test.results.length === 1 && test.results[0].status === 'skipped');
  if (report.errors?.length || tests.length !== 12 || passed.length !== counts[candidate] || skipped.length !== 12 - counts[candidate]) {
    throw new Error(`Unexpected QA coverage: candidate=${candidate}, total=${tests.length}, passed=${passed.length}, skipped=${skipped.length}; expected ${counts[candidate]} passed out of 12`);
  }
  for (const project of ['desktop', 'phone']) {
    if (passed.filter(test => test.projectName === project).length !== counts[candidate] / 2) throw new Error(`Missing ${project} evidence`);
  }
  return { candidate, total: tests.length, passed: passed.length, skipped: skipped.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(verify(JSON.parse(fs.readFileSync('test-results/results.json', 'utf8')), process.env.QA_CANDIDATE)));
}
