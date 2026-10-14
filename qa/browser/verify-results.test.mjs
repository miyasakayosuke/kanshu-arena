import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verify } from './verify-results.mjs';
function fixture(passed) {
  const tests = Array.from({ length: 12 }, (_, index) => ({ projectName: index % 2 ? 'phone' : 'desktop', results: [{ status: index < passed ? 'passed' : 'skipped' }] }));
  return { suites: [{ specs: [{ tests }] }], errors: [] };
}
for (const [candidate, count] of Object.entries({ baseline: 2, preview: 4, catalog: 4, storage: 6, combined: 6 })) {
  test(`${candidate} accepts exact coverage`, () => assert.equal(verify(fixture(count), candidate).passed, count));
  test(`${candidate} rejects all skipped`, () => assert.throws(() => verify(fixture(0), candidate)));
}
test('rejects wrong matrix', () => assert.throws(() => verify(fixture(4), 'storage')));
test('rejects runner errors', () => assert.throws(() => verify({ ...fixture(2), errors: ['startup'] }, 'baseline')));
test('rejects missing phone evidence', () => {
  const report = fixture(2); report.suites[0].specs[0].tests[1].projectName = 'desktop';
  assert.throws(() => verify(report, 'baseline'));
});
test('rejects unexpected candidate', () => assert.throws(() => verify(fixture(2), 'other')));
