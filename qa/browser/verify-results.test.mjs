import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verify, titles } from './verify-results.mjs';
function fixture(candidate = 'awakening') {
  const wanted = { baseline: titles.ui.slice(0, 1), preview: [titles.ui[0], titles.ui[2]], catalog: titles.ui.slice(0, 2), storage: titles.storage, combined: titles.ui, awakening: Object.values(titles).flat() };
  return { suites: [{ specs: Object.values(titles).flat().map(title => ({ title, tests: ['desktop', 'phone'].map(projectName => ({ projectName, results: [{ status: wanted[candidate].includes(title) ? 'passed' : 'skipped' }] })) })) }], errors: [] };
}
for (const [candidate, count] of Object.entries({ baseline: 2, preview: 4, catalog: 4, storage: 6, combined: 6, awakening: 30 })) {
  test(`${candidate} accepts exact named coverage`, () => assert.equal(verify(fixture(candidate), candidate).passed, count));
  test(`${candidate} rejects all skipped`, () => {
    const report = fixture(candidate); report.suites[0].specs.forEach(spec => spec.tests.forEach(t => { t.results[0].status = 'skipped'; }));
    assert.throws(() => verify(report, candidate));
  });
}
test('rejects wrong matrix', () => assert.throws(() => verify(fixture('combined'), 'awakening')));
test('rejects runner errors', () => assert.throws(() => verify({ ...fixture(), errors: ['startup'] }, 'awakening')));
test('rejects missing phone evidence', () => {
  const report = fixture(); report.suites[0].specs[0].tests[1].projectName = 'desktop';
  assert.throws(() => verify(report, 'awakening'));
});
test('rejects silently replaced coverage', () => {
  const report = fixture(); report.suites[0].specs[0].title = 'a different test';
  assert.throws(() => verify(report, 'awakening'));
});
test('rejects duplicated named coverage', () => {
  const report = fixture(); report.suites[0].specs[0].title = report.suites[0].specs[1].title;
  assert.throws(() => verify(report, 'awakening'));
});
test('rejects retry passes', () => {
  const report = fixture(); report.suites[0].specs[0].tests[0].results.unshift({ status: 'failed' });
  assert.throws(() => verify(report, 'awakening'));
});
test('rejects missing tests', () => {
  const report = fixture(); report.suites[0].specs.pop();
  assert.throws(() => verify(report, 'awakening'));
});
test('rejects unexpected candidate', () => assert.throws(() => verify(fixture(), 'other')));
