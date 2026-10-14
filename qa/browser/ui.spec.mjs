import { test, expect } from './fixtures.mjs';
const kind = process.env.QA_CANDIDATE;
const nav = (page, name) => page.locator('.mainNav').getByRole('button', { name, exact: true });
async function screenshot(page, info, label) {
  const file = info.outputPath(`${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await info.attach(label, { path: file, contentType: 'image/png' });
}
async function noHorizontalOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function scrollList(list) {
  await list.evaluate(node => { node.scrollTop = Math.min(240, node.scrollHeight - node.clientHeight); });
  await expect.poll(() => list.evaluate(node => node.scrollTop)).toBeGreaterThan(30);
}
test.beforeEach(async ({ page }) => {
  test.skip(kind === 'storage', 'Storage uses an isolated dev-server import harness; UI uses production builds');
  // Seed battle draws only; no timers, rendering, storage, or browser APIs are mocked.
  await page.addInitScript(() => { Math.random = () => 1 / 0x100000000; });
  await page.goto('./');
});
test('catalog navigation, detail keyboard focus, team and complete play loop', async ({ page }, info) => {
  await nav(page, '図鑑').click();
  const list = page.getByLabel('図鑑一覧', { exact: true });
  await expect(list.locator('.catalogCard')).toHaveCount(37);
  await expect(page.locator('.catalogScreen h2')).toBeFocused();
  await noHorizontalOverflow(page);
  await screenshot(page, info, 'catalog');
  const opener = list.getByRole('button', { name: '妖狐の詳細', exact: true });
  await opener.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const appearance = page.locator('[data-detail-tab="appearance"]');
  await appearance.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-detail-tab="story"]')).toBeFocused();
  await expect(page.locator('[data-detail-tab="story"]')).toHaveAttribute('aria-selected', 'true');
  await screenshot(page, info, 'detail-story');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
  await nav(page, '編成').click();
  await expect(page.locator('.builderSlots')).toBeVisible();
  await noHorizontalOverflow(page);
  await screenshot(page, info, 'team');
  const lineup = () => page.locator('.builderSlots > button').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-monster-id'), label: node.getAttribute('aria-label') })));
  const partyBefore = await lineup();
  expect(partyBefore).toHaveLength(5);
  expect(partyBefore.every(slot => slot.id !== null)).toBe(true);
  await nav(page, '闘技場').click();
  await page.getByRole('button', { name: /^この編成で対戦する(?:\s*→)?$/ }).click();
  await expect(page.locator('.battleStage')).toBeVisible();
  await noHorizontalOverflow(page);
  await screenshot(page, info, 'battle');
  for (let turn = 0; turn < 20 && await page.locator('.result').count() === 0; turn++) {
    await page.getByRole('button', { name: 'この指示でターン開始', exact: true }).click();
    await page.getByRole('button', { name: '演出をスキップ', exact: true }).click();
    await expect(page.getByRole('button', { name: 'この指示でターン開始', exact: true }).or(page.locator('.result'))).toBeVisible();
  }
  await expect(page.locator('.result')).toBeVisible();
  await screenshot(page, info, 'result');
  await nav(page, '編成').click();
  await expect(page.locator('.builderSlots')).toBeVisible();
  expect(await lineup()).toEqual(partyBefore);
  await page.reload();
  await expect(page.locator('.builderSlots')).toBeVisible();
  expect(await lineup()).toEqual(partyBefore);
  await info.attach('party-preserved-through-play-and-reload', { body: JSON.stringify(partyBefore), contentType: 'application/json' });
});
test('catalog result changes reset real scroll and navigation retains it', async ({ page }, info) => {
  test.skip(kind !== 'catalog', 'Feature assertion belongs only to the catalog candidate');
  await nav(page, '図鑑').click();
  const list = page.getByLabel('図鑑一覧', { exact: true });
  await scrollList(list);
  const originalScroll = await list.evaluate(node => node.scrollTop);
  await nav(page, 'ホーム').click(); await nav(page, '図鑑').click();
  await expect.poll(() => list.evaluate(node => node.scrollTop)).toBe(originalScroll);
  await page.getByLabel('並べ替え', { exact: true }).selectOption('speed');
  await expect.poll(() => list.evaluate(node => node.scrollTop)).toBe(0);
  await scrollList(list);
  await page.locator('.filterDisclosure summary').click();
  await expect.poll(() => list.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await page.getByLabel('系統で絞り込み', { exact: true }).selectOption('dragon');
  await expect.poll(() => list.evaluate(node => node.scrollTop)).toBe(0);
  await expect(list.locator('.catalogCard')).toHaveCount(5);
  await page.getByLabel('検索', { exact: true }).fill('存在しない図鑑検索');
  await expect(list.locator('.catalogCard')).toHaveCount(0);
  await page.getByRole('button', { name: '絞り込みをリセット', exact: true }).click();
  await expect(list.locator('.catalogCard')).toHaveCount(37);
  await expect(page.getByLabel('並べ替え', { exact: true })).toHaveValue('id');
  await expect(page.locator('.filterDisclosure')).toHaveAttribute('open', '');
  await expect.poll(() => list.evaluate(node => node.scrollTop)).toBe(0);
  await screenshot(page, info, 'catalog-reset');
});
test('awakening calculator is hypothetical, bounded and resets between monsters and reopen', async ({ page }, info) => {
  test.skip(kind !== 'preview', 'Calculator assertion belongs only to the awakening preview candidate');
  await nav(page, '図鑑').click();
  const catalogBefore = await page.locator('.catalogGallery').innerText();
  await page.getByRole('button', { name: '妖狐の詳細', exact: true }).click();
  await page.locator('[data-detail-tab="abilities"]').click();
  const calculator = page.locator('.awakeningPreview');
  const slider = calculator.getByRole('slider');
  const result = calculator.locator('.awakeningResult');
  const stats = page.locator('.profilePanel:not([hidden]) .stats');
  const base = await stats.locator('div').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.querySelector('small').textContent, Number(node.querySelector('b').textContent)])));
  const statsBefore = await stats.innerText();
  const storageBefore = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  await page.evaluate(() => {
    window.qaStorageWrites = [];
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) { window.qaStorageWrites.push(method); return original.apply(this, args); };
    }
  });
  await expect(calculator).not.toHaveAttribute('open', '');
  await calculator.locator('summary').click();
  await expect(slider).toHaveValue('0');
  await expect(calculator).toContainText('所持状況・保存データ・戦闘には反映されません');
  await expect(calculator).toContainText(`MP ${base.MP}・素早さ ${base['素早さ']}は変わりません`);
  await expect(calculator).toContainText('防御力は現在未導入');
  for (const [level, rate] of [[0, 95], [4, 98], [99, 100]]) {
    await calculator.getByRole('button', { name: `覚醒${level}`, exact: true }).click();
    await expect(slider).toHaveValue(String(level));
    await expect(result).toContainText(`覚醒${level}の試算（リーダー補正前）`);
    for (const label of ['HP', '攻撃']) {
      const row = result.locator('dl > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) });
      await expect(row.locator('b')).toHaveText(String(Math.round(base[label] * rate / 95)));
    }
    expect(await stats.innerText()).toBe(statsBefore);
    await result.scrollIntoViewIfNeeded();
    await screenshot(page, info, `awakening-stage-${level}`);
  }
  await expect(calculator.getByRole('button', { name: '＋1', exact: true })).toBeDisabled();
  await calculator.getByRole('button', { name: '−1', exact: true }).click();
  await expect(slider).toHaveValue('98');
  await calculator.getByRole('button', { name: '覚醒0', exact: true }).click();
  await expect(calculator.getByRole('button', { name: '−1', exact: true })).toBeDisabled();
  await calculator.getByRole('button', { name: '＋1', exact: true }).click();
  await expect(slider).toHaveValue('1');
  await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('1');
  await page.keyboard.press('End'); await expect(slider).toHaveValue('99');
  await expect(result).toContainText('最大段階の試算です');
  for (const control of await calculator.locator('button, input').all()) {
    const box = await control.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  }
  await noHorizontalOverflow(page);
  await page.locator('.profileBrowse button').last().click();
  await expect(calculator).not.toHaveAttribute('open', '');
  await calculator.locator('summary').click(); await expect(slider).toHaveValue('0');
  await calculator.getByRole('button', { name: '覚醒99', exact: true }).click();
  await page.getByRole('button', { name: '詳細を閉じる', exact: true }).click();
  await page.getByRole('button', { name: '妖狐の詳細', exact: true }).click();
  await page.locator('[data-detail-tab="abilities"]').click();
  await expect(calculator).not.toHaveAttribute('open', '');
  await calculator.locator('summary').click(); await expect(slider).toHaveValue('0');
  expect(await stats.innerText()).toBe(statsBefore);
  expect(await page.evaluate(() => window.qaStorageWrites)).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).toBe(storageBefore);
  await page.getByRole('button', { name: '詳細を閉じる', exact: true }).click();
  expect(await page.locator('.catalogGallery').innerText()).toBe(catalogBefore);
});
