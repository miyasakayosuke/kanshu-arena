import { test, expect } from './fixtures.mjs';
import { nav, panel, launch, seed, teams, snapshot, rawProgress, connectProgress, openTraining, noOverflow, screenshot, evidence, completeBattle } from './progression-helpers.mjs';

test.beforeEach(async ({ page }) => {
  test.skip(process.env.QA_CANDIDATE !== 'awakening', 'Integrated progression belongs only to the awakening candidate');
  // Deterministic encounter draw only. Actual engine, animations, timers, and IDB run.
  await page.addInitScript(() => { Math.random = () => 1 / 0x100000000; });
});

test('fresh AwakeningPanel browsing grants no materials and fits both viewports', async ({ page }, info) => {
  const oldTeams = await seed(page);
  const before = await rawProgress(page);
  await expect(panel(page)).toContainText('共通素材 0');
  await expect(panel(page)).toContainText('累計 0勝');
  await openTraining(page);
  await expect(panel(page).getByRole('button', { name: '1段階の覚醒を確認', exact: true })).toBeDisabled();
  await panel(page).getByLabel('育成するモンスター').selectOption('1');
  await panel(page).getByLabel('育成するモンスター').selectOption('0');
  await panel(page).getByText('素材の集め方と試行中の数値', { exact: true }).click();
  await expect(panel(page)).toContainText('累計10勝');
  await noOverflow(page);
  await screenshot(page, info, 'fresh-awakening-panel');
  await nav(page, '図鑑').click();
  await page.getByRole('button', { name: '妖狐の詳細', exact: true }).click();
  await page.getByRole('button', { name: '詳細を閉じる', exact: true }).click();
  await nav(page, '編成').click();
  await nav(page, 'ホーム').click();
  await page.reload();
  await expect(panel(page)).toContainText('共通素材 0');
  expect(await rawProgress(page)).toEqual(before);
  expect(await teams(page)).toEqual(oldTeams);
});

test('upgrade confirmation cancellation and repeated submission spend once durably without changing old teams', async ({ page }, info) => {
  const oldTeams = await seed(page, 'materials');
  const before = await rawProgress(page);
  await openTraining(page);
  await expect(panel(page)).toContainText('専用素材 3 + 共通素材 7');
  await panel(page).getByRole('button', { name: '1段階の覚醒を確認', exact: true }).click();
  await panel(page).getByRole('button', { name: 'やめる', exact: true }).click();
  expect(await rawProgress(page)).toEqual(before);
  await panel(page).getByRole('button', { name: '1段階の覚醒を確認', exact: true }).click();
  await noOverflow(page);
  await screenshot(page, info, 'upgrade-confirmation');
  // Two synchronous native click events exercise the actual handler/lock boundary.
  await panel(page).getByRole('button', { name: '素材を消費して覚醒する', exact: true }).evaluate(button => { button.click(); button.click(); });
  await expect(panel(page)).toContainText('覚醒 1 / 99');
  await expect(panel(page)).toContainText('共通素材 23');
  const after = await snapshot(page);
  expect(after.progress.monsters['0']).toEqual({ level: 1, essence: 0 });
  expect(after.revision).toBe(JSON.parse(before.head).revision + 1);
  const saved = await rawProgress(page);
  await page.reload();
  await openTraining(page);
  await expect(panel(page)).toContainText('覚醒 1 / 99');
  expect(await rawProgress(page)).toEqual(saved);
  expect(await teams(page)).toEqual(oldTeams);
  await noOverflow(page);
  await screenshot(page, info, 'upgrade-durable');
  await evidence(info, 'upgrade-saved-once', { revisionBefore: JSON.parse(before.head).revision, revisionAfter: after.revision, level: 1, common: 23, oldTeamBytesPreserved: true });
});

test('selection reward is claimable once and the level-99 cap survives reload', async ({ page }, info) => {
  const oldTeams = await seed(page, 'choice');
  const before = await snapshot(page);
  await openTraining(page);
  await expect(panel(page)).toContainText('選択報酬 1回分');
  await panel(page).getByLabel('育成するモンスター').selectOption('1');
  await expect(panel(page)).toContainText('最大の覚醒段階です');
  await expect(panel(page).getByRole('button', { name: /の素材を受け取る（1回分）$/ })).toBeDisabled();
  await panel(page).getByLabel('育成するモンスター').selectOption('0');
  await panel(page).getByRole('button', { name: /の素材を受け取る（1回分）$/ }).evaluate(button => { button.click(); button.click(); });
  await expect(panel(page)).toContainText('選択報酬 0回分');
  await expect(panel(page)).toContainText('専用素材 10');
  expect((await snapshot(page)).revision).toBe(before.revision + 1);
  await panel(page).getByRole('button', { name: '1段階の覚醒を確認', exact: true }).click();
  await panel(page).getByRole('button', { name: '素材を消費して覚醒する', exact: true }).click();
  await expect(panel(page)).toContainText('覚醒 99 / 99');
  await expect(panel(page)).toContainText('最大の覚醒段階です');
  await expect(panel(page).getByRole('button', { name: '1段階の覚醒を確認', exact: true })).toHaveCount(0);
  const after = await snapshot(page);
  expect(after.progress.monsters['0']).toEqual({ level: 99, essence: 0 });
  expect(after.progress.common).toBe(before.progress.common);
  expect(after.progress.selections).toEqual([]);
  await page.reload(); await openTraining(page);
  await expect(panel(page)).toContainText('覚醒 99 / 99');
  expect(await snapshot(page)).toEqual(after);
  expect(await teams(page)).toEqual(oldTeams);
  await noOverflow(page);
  await screenshot(page, info, 'selection-claimed-level-99');
});

test('normal production battle completion grants the engine outcome reward once across navigation and reload', async ({ page }, info) => {
  const oldTeams = await seed(page);
  await nav(page, '闘技場').click();
  await launch(page).evaluate(button => { button.click(); button.click(); });
  await expect(page.locator('.battleStage')).toBeVisible();
  const begun = await snapshot(page);
  expect(begun.progress.nextBattleSequence).toBe(2);
  expect(begun.progress.activeBattle.sequence).toBe(1);
  expect(begun.progress.common).toBe(0);
  const initial = JSON.parse(begun.progress.activeBattle.context.initialStateJson);
  expect(initial.state.allies.map(unit => unit.monster.id)).toEqual([0, 2, 3, 4, 6]);
  await completeBattle(page);
  await expect(panel(page)).toContainText('（保存済み）');
  const after = await snapshot(page);
  const receipt = after.progress.receipt;
  const outcome = { win: 'VICTORY', lose: 'DEFEAT', draw: 'DRAW' };
  await expect(page.locator('.result h2')).toContainText(outcome[receipt.outcome]);
  expect(after.progress.activeBattle).toBeNull();
  expect(receipt.sequence).toBe(1);
  expect(receipt.common).toBe(receipt.outcome === 'win' ? 5 : 1);
  expect(after.progress.common).toBe(receipt.common);
  expect(after.progress.wins).toBe(receipt.outcome === 'win' ? 1 : 0);
  expect(after.revision).toBe(begun.revision + 1);
  const rawAfter = await rawProgress(page);
  await noOverflow(page);
  await screenshot(page, info, 'completed-battle-durable-reward');
  await nav(page, 'ホーム').click(); await nav(page, '闘技場').click();
  await page.reload();
  await expect(panel(page)).toContainText(`共通素材 ${receipt.common}`);
  expect(await rawProgress(page)).toEqual(rawAfter);
  expect(await teams(page)).toEqual(oldTeams);
  await evidence(info, 'normal-engine-terminal-reward', { begunRevision: begun.revision, completedRevision: after.revision, receipt, reloadedExactBytes: true, oldTeamBytesPreserved: true });
});

test('stale visible upgrade confirmation cannot overwrite a newer browser-tab commit', async ({ context, page }, info) => {
  const oldTeams = await seed(page, 'materials');
  await openTraining(page);
  await panel(page).getByRole('button', { name: '1段階の覚醒を確認', exact: true }).click();
  const second = await context.newPage();
  await second.goto('credits.html'); await connectProgress(second);
  await second.evaluate(async () => {
    const loaded = await window.qaProgress.adapter.load();
    await window.qaProgress.adapter.dispatch(loaded.snapshot.token, { kind: 'upgrade', speciesId: '0', expectedLevel: 0 });
  });
  const newest = await rawProgress(second);
  await panel(page).getByRole('button', { name: '素材を消費して覚醒する', exact: true }).click();
  await expect(panel(page)).toContainText('保存を完了できませんでした');
  expect(await rawProgress(page)).toEqual(newest);
  await panel(page).getByRole('button', { name: '保存を再確認', exact: true }).click();
  await expect(panel(page)).toContainText('覚醒 1 / 99');
  await expect(panel(page)).toContainText('共通素材 23');
  expect(await rawProgress(page)).toEqual(newest);
  expect(await teams(page)).toEqual(oldTeams);
  await screenshot(page, info, 'stale-confirmation-reloaded');
});

test('navigation during a real pending IndexedDB begin cannot reopen the abandoned battle', async ({ page }, info) => {
  const oldTeams = await seed(page);
  await nav(page, '闘技場').click();
  // Test both staying away and returning to the arena before begin resolves.
  // A newer navigation generation invalidates begin even if the route matches again.
  for (const roundTrip of [false, true]) {
    const sequence = (await snapshot(page)).progress.nextBattleSequence;
    // Hold a real competing IDB transaction with chained requests; no adapter,
    // engine, timer or React function is replaced. Release after navigation.
    await page.evaluate(async () => {
      window.qaHoldRelease = false; window.qaHoldDone = false;
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('kanshu-awakening-v1', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction('awakening-record', 'readwrite');
          tx.oncomplete = () => { db.close(); window.qaHoldDone = true; };
          tx.onabort = () => { db.close(); window.qaHoldDone = true; };
          const keep = () => { const get = tx.objectStore('awakening-record').get('state'); get.onsuccess = () => { if (!window.qaHoldRelease) keep(); }; };
          keep(); resolve();
        };
      });
    });
    await launch(page).click();
    await expect(launch(page)).toBeDisabled();
    await nav(page, '図鑑').click();
    await expect(page.locator('.catalogScreen')).toBeVisible();
    if (roundTrip) {
      await nav(page, '闘技場').click();
      await expect(launch(page)).toBeDisabled();
    }
    await page.evaluate(() => { window.qaHoldRelease = true; });
    await expect.poll(() => page.evaluate(() => !!window.qaHoldDone)).toBe(true);
    await expect.poll(async () => (await snapshot(page)).progress.receipt?.sequence).toBe(sequence);
    const after = await snapshot(page);
    expect(after.progress.receipt.outcome).toBe('abandoned');
    await expect(page.locator('.battleStage')).toHaveCount(0);
    if (!roundTrip) await expect(page.locator('.catalogScreen')).toBeVisible();
    expect(after.progress.common).toBe(0);
    expect(after.progress.activeBattle).toBeNull();
    expect(after.progress.nextBattleSequence).toBe(sequence + 1);
    expect(await teams(page)).toEqual(oldTeams);
    if (!roundTrip) await nav(page, '闘技場').click();
    await expect(launch(page)).toBeEnabled();
    await noOverflow(page);
    await screenshot(page, info, roundTrip ? 'pending-begin-roundtrip-safe' : 'pending-begin-navigation-safe');
  }
});

test('real begin-write abort leaves no phantom battle or reward and permits a reviewed retry', async ({ page }, info) => {
  await seed(page);
  const before = await rawProgress(page);
  await nav(page, '闘技場').click();
  await page.evaluate(() => {
    window.qaBeginAbortWrites = 0;
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = original.apply(this, args);
      if (this.transaction.db.name === 'kanshu-awakening-v1') {
        window.qaBeginAbortWrites++;
        IDBObjectStore.prototype.put = original;
        this.transaction.abort();
      }
      return request;
    };
  });
  await launch(page).click();
  await expect(panel(page)).toContainText('保存を完了できませんでした');
  expect(await page.evaluate(() => window.qaBeginAbortWrites)).toBe(1);
  await expect(page.locator('.battleStage')).toHaveCount(0);
  expect(await rawProgress(page)).toEqual(before);
  await panel(page).getByRole('button', { name: '保存を再確認', exact: true }).click();
  await expect(launch(page)).toBeEnabled();
  await launch(page).click();
  await expect(page.locator('.battleStage')).toBeVisible();
  expect((await snapshot(page)).progress.activeBattle.sequence).toBe(1);
  await page.getByRole('button', { name: '闘技場に戻る', exact: true }).click();
  await page.getByRole('button', { name: '中断して移動', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).progress.receipt?.outcome).toBe('abandoned');
  expect((await snapshot(page)).progress.common).toBe(0);
  await screenshot(page, info, 'begin-abort-retry');
});

test('active battle navigation cancel Back and Forward never create rewards or resurrect a discarded match', async ({ page }, info) => {
  const oldTeams = await seed(page);
  await nav(page, '闘技場').click(); await launch(page).click();
  await expect(page.locator('.battleStage')).toBeVisible();
  const active = await rawProgress(page);
  await page.getByRole('button', { name: '闘技場に戻る', exact: true }).click();
  await expect(page.getByRole('alertdialog', { name: '対戦を中断しますか', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(await rawProgress(page)).toEqual(active);
  await page.goBack();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: '対戦を続ける', exact: true }).click();
  await expect(page.locator('.battleStage')).toBeVisible();
  expect(await rawProgress(page)).toEqual(active);
  await page.goBack();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: '中断して移動', exact: true }).click();
  await expect(panel(page)).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).progress.receipt?.outcome).toBe('abandoned');
  const discarded = await rawProgress(page);
  expect(JSON.parse(discarded.head).progress.common).toBe(0);
  await page.goForward();
  await expect(page.locator('.battleStage')).toHaveCount(0);
  await expect(page).toHaveURL(/#arena$/);
  expect(await rawProgress(page)).toEqual(discarded);
  expect(await teams(page)).toEqual(oldTeams);
  await noOverflow(page);
  await screenshot(page, info, 'history-discard-no-resurrection');
});

test('reload keeps an active battle blocked until explicit no-reward discard is confirmed', async ({ page }, info) => {
  const oldTeams = await seed(page);
  await nav(page, '闘技場').click(); await launch(page).click();
  await expect(page.locator('.battleStage')).toBeVisible();
  const before = await rawProgress(page);
  await page.reload();
  await expect(panel(page)).toContainText('未終了の対戦が保存されています');
  await expect(launch(page)).toBeDisabled();
  await expect(page.locator('.battleStage')).toHaveCount(0);
  expect(await rawProgress(page)).toEqual(before);
  await panel(page).getByRole('button', { name: '未終了の対戦を整理する', exact: true }).click();
  await panel(page).getByRole('button', { name: '戻る', exact: true }).click();
  expect(await rawProgress(page)).toEqual(before);
  await panel(page).getByRole('button', { name: '未終了の対戦を整理する', exact: true }).click();
  await noOverflow(page);
  await screenshot(page, info, 'interrupted-discard-confirmation');
  await panel(page).getByRole('button', { name: '報酬なしで終了する', exact: true }).evaluate(button => { button.click(); button.click(); });
  await expect(panel(page)).not.toContainText('未終了の対戦が保存されています');
  await expect(launch(page)).toBeEnabled();
  const after = await snapshot(page);
  expect(after.revision).toBe(JSON.parse(before.head).revision + 1);
  expect(after.progress.activeBattle).toBeNull();
  expect(after.progress.receipt).toEqual({ sequence: 1, outcome: 'abandoned', common: 0, selection: null });
  expect(after.progress.common).toBe(0);
  await page.reload();
  await expect(launch(page)).toBeEnabled();
  expect(await snapshot(page)).toEqual(after);
  expect(await teams(page)).toEqual(oldTeams);
  await screenshot(page, info, 'interrupted-discard-durable');
});
