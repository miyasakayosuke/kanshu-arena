// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import BattleResult from './BattleResult';
import { advanceWithEvents, BASIC_ATTACK, start } from './engine';
import { battleFactEvidenceLines, resultFacts } from './battleInsights';

let root: Root;
beforeEach(() => {
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); });

it('expands authoritative lost-action evidence and full logs without terminal match choices', async () => {
  let battle = start([2], [1]);
  battle.enemies[0].monster = { ...battle.enemies[0].monster, hp: 5000, skills: [
    { name: '休息', kind: 'heal', power: 0, priority: 0, mpCost: 0 },
    { name: '先の一撃', kind: 'hit', power: 2000, priority: 4, mpCost: 0 },
  ] };
  battle.enemies[0].hp = 5000;
  battle = advanceWithEvents(battle, [{ key: 'a0', skill: BASIC_ATTACK, target: 'e0' }], { enemyOrders: [{ key: 'e0', skill: 0 }] }).state;
  battle = advanceWithEvents(battle, [{ key: 'a0', skill: 3, target: 'a0' }], { enemyOrders: [{ key: 'e0', skill: 1, target: 'a0' }] }).state;
  expect(battle.winner).toBe('lose');
  const callbacks = { onLog: vi.fn() };
  await act(async () => root.render(<BattleResult battle={battle} {...callbacks} />));
  const disclosure = document.querySelector<HTMLDetailsElement>('.resultDetails')!;
  expect(disclosure.open).toBe(false); await act(async () => disclosure.querySelector('summary')!.click());
  expect(disclosure.open).toBe(true);
  const fact = resultFacts(battle)[0];
  expect(fact.kind).toBe('lost-action');
  const rows = document.querySelectorAll('.battleFindings > ul > li');
  expect(rows.length).toBeLessThanOrEqual(3);
  expect(rows[0].querySelector('p')?.textContent).toBe('TURN 2：味方1 バステトは「清めの鈴」の発動前に戦闘不能。それまでの発動記録：1回。');
  const detail = rows[0].querySelector('details')!;
  expect(detail.open).toBe(false);
  await act(async () => detail.querySelector('summary')!.click());
  expect(detail.open).toBe(true);
  expect([...detail.querySelectorAll('li')].map(item => item.textContent)).toEqual(battleFactEvidenceLines(battle, fact));
  expect(detail.textContent).toContain('TURN 1・指示 1');
  expect(detail.textContent).toContain('TURN 2・指示 1');
  expect(detail.textContent).toContain('「通常攻撃」を発動');
  expect(detail.textContent).toContain('行動前確認');
  expect(detail.textContent).toContain('行動終了');
  await act(async () => detail.querySelector('summary')!.click());
  expect(detail.open).toBe(false);
  const log = [...document.querySelectorAll('button')].find(element => element.textContent?.includes('全ターンのログを見る'))!;
  expect(log.disabled).toBe(false); await act(async () => log.click());
  expect(callbacks.onLog).toHaveBeenCalledTimes(1);
  expect(document.querySelector('.rematchActions, .retryContract')).toBeNull();
  expect(document.querySelectorAll('.result button')).toHaveLength(1);
});
