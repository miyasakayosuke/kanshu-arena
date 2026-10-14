import { expect } from './fixtures.mjs';

export const sourceOrigin = 'http://127.0.0.1:4174';
export const nav = (page, name) => page.locator('.mainNav').getByRole('button', { name, exact: true });
export const panel = page => page.getByRole('region', { name: '育成と対戦報酬', exact: true });
export const launch = page => page.getByRole('button', { name: /^この編成で対戦する(?:\s*→)?$/ });

export async function connectProgress(page) {
  await page.evaluate(async origin => {
    const { IndexedDbTransactionalStorage } = await import(`${origin}/kanshu-arena/src/awakening/indexedDbStorage.ts`);
    const { AwakeningStorage } = await import(`${origin}/kanshu-arena/src/awakening/storage.ts`);
    const P = await import(`${origin}/kanshu-arena/src/awakening/playSession.ts`);
    const D = await import(`${origin}/kanshu-arena/src/awakening/domain.ts`);
    const backend = new IndexedDbTransactionalStorage(indexedDB, P.AWAKENING_DATABASE);
    window.qaProgress = { backend, adapter: new AwakeningStorage(backend, P.rosterIds, P.trialRules), P, D };
  }, sourceOrigin);
}

export async function rawProgress(page) {
  await connectProgress(page);
  return page.evaluate(() => window.qaProgress.backend.transaction(record => ({ record, result: record })));
}
export async function snapshot(page) {
  const raw = await rawProgress(page);
  if (!raw.head) return null;
  return { ...JSON.parse(raw.head), token: raw.head };
}
export async function teams(page) {
  return page.evaluate(() => Object.fromEntries(['kanshu-team-workshop-v2', 'kanshu-workshop-v1', 'kanshu-team-slots-v1', 'kanshu-team'].map(key => [key, localStorage.getItem(key)])));
}

// Open a static production page first: no React app has mounted yet. Domain modules
// come from the separate source server, but all real IDB writes belong to 4173.
// Fixture state is explicit synthetic input; it is never evidence of earned rewards.
export async function seed(page, mode = 'fresh') {
  await page.goto('credits.html');
  await connectProgress(page);
  await page.evaluate(async mode => {
    const { P, D } = window.qaProgress;
    let progress = D.createProgress(P.rosterIds, P.trialRules);
    if (mode === 'materials' || mode === 'choice') progress.common = 30;
    if (mode === 'materials') progress.monsters['0'].essence = 3;
    if (mode === 'choice') {
      const context = { initialStateJson: '{"fixture":true}', mode: 'qa-fixture', teamId: 'qa-team', statRuleVersion: D.STAT_RULE_VERSION };
      for (let n = 0; n < 10; n++) {
        progress = D.beginBattle(progress, context, P.trialRules);
        progress = D.settleBattle(progress, progress.activeBattle.sequence, { kind: 'engine-terminal', engineState: { winner: 'win' } }).state;
      }
      progress.monsters['0'].level = 98;
      progress.monsters['1'].level = 99;
    }
    D.validateProgress(progress);
    const { IndexedDbTransactionalStorage } = await import('http://127.0.0.1:4174/kanshu-arena/src/awakening/indexedDbStorage.ts');
    const { AwakeningStorage } = await import('http://127.0.0.1:4174/kanshu-arena/src/awakening/storage.ts');
    const backend = new IndexedDbTransactionalStorage(indexedDB, P.AWAKENING_DATABASE, JSON.stringify(progress));
    await new AwakeningStorage(backend, P.rosterIds, P.trialRules).initialize();
    const slots = [{ team: [0, 2, 3, 4, 6], rule: 'standard' }, { team: [1, 2, 3, 4, 6], rule: 'standard' }, { team: [3, 2, 0, 4, 6], rule: 'light' }];
    localStorage.setItem('kanshu-team-workshop-v2', JSON.stringify({ version: 2, teams: slots, selected: 0, draft: null, previous: null }));
    localStorage.setItem('kanshu-workshop-v1', '\n' + JSON.stringify(slots[1], null, 2) + '\n');
    localStorage.setItem('kanshu-team-slots-v1', '\n' + JSON.stringify(slots, null, 2) + '\n');
    localStorage.setItem('kanshu-team', '[ 0, 2, 3, 4, 6 ]');
  }, mode);
  const before = await teams(page);
  await page.goto('./');
  await expect(panel(page)).toContainText('共通素材');
  await expect(panel(page).getByRole('button', { name: '保存を再確認', exact: true })).toBeEnabled();
  expect(await teams(page)).toEqual(before);
  const module = await page.locator('script[type="module"][src]').getAttribute('src');
  expect(module).toMatch(/^\/kanshu-arena\/assets\/.+\.js$/);
  return before;
}

export async function openTraining(page) {
  const details = panel(page).locator('details').filter({ has: page.locator('summary', { hasText: /^素材を使って育成する$/ }) });
  if (!(await details.getAttribute('open')) && !(await details.evaluate(node => node.open))) await details.locator('summary').click();
  return details;
}
export async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Document fits the viewport').toBe(true);
  for (const button of await panel(page).locator('button:visible, select:visible').all()) {
    const box = await button.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
}
export async function screenshot(page, info, label) {
  const path = info.outputPath(`${label}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(label, { path, contentType: 'image/png' });
}
export async function evidence(info, label, value) {
  await info.attach(label, { body: JSON.stringify(value, null, 2), contentType: 'application/json' });
}
export async function completeBattle(page) {
  await expect(page.locator('.battleStage')).toBeVisible();
  for (let turn = 0; turn < 20 && await page.locator('.result').count() === 0; turn++) {
    await page.getByRole('button', { name: 'この指示でターン開始', exact: true }).click();
    await page.getByRole('button', { name: '演出をスキップ', exact: true }).click();
    await expect(page.getByRole('button', { name: 'この指示でターン開始', exact: true }).or(page.locator('.result'))).toBeVisible();
  }
  await expect(page.locator('.result')).toBeVisible();
}
