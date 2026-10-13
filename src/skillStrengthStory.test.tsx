// @vitest-environment happy-dom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { monsters, start, baseDamage } from './engine';
import MonsterDetails from './MonsterDetails';
import { skillDetail, skillLore } from './monsterDetailContent';
import { fixedDamageHint, monsterRole } from './strategy';

describe('story-led strength without numeric skill power', () => {
  it('covers all 106 skill instances and keeps MP, target/effects and complete stories', () => {
    const skills = monsters.flatMap(monster => monster.skills);
    expect(skills).toHaveLength(106);
    for (const skill of skills) {
      const detail = skillDetail(skill);
      expect(detail).toContain(`MP ${skill.mpCost}`);
      expect(detail).not.toMatch(/威力\s*\d|固定基礎\d|回復[1-9]\d*|補正後攻撃力の38%/);
      expect(skillLore(skill.name)).not.toBe(skillLore('unknown'));
      expect(skillLore(skill.name).length).toBeLessThanOrEqual(100);
      expect(skillLore(skill.name)).not.toMatch(/威力\s*\d|固定基礎\d/);
    }
  });
  it('has no hidden numeric power text or attributes anywhere in all roster profiles', () => {
    for (const monster of monsters) {
      const html = renderToStaticMarkup(<MonsterDetails id={monster.id} onClose={() => {}} />);
      expect(JSON.stringify(monsterRole(monster.id))).not.toMatch(/[1-9]\d*回復|回復[1-9]\d*/);
      expect(html).not.toMatch(/威力\s*\d|固定基礎\d|回復(?:35|65|70)|基礎目安/);
    }
    const app = readFileSync('src/App.tsx', 'utf8');
    // The only retained power field is the explicit MP resource replenishment, not HP damage/healing.
    expect(app.match(/s\.power/g)).toHaveLength(1);
    expect(app).toContain('MP補給+${s.power}');
  });
  it('describes genuinely light area and conditional attacks without a universal damage promise', () => {
    const state = start([14, 15, 16, 18, 12], [1]);
    expect(baseDamage(state.allies[0], monsters[14].skills[0]!)).toBeLessThan(20);
    expect(skillLore('海山の轟き')).toContain('浅い波紋');
    expect(skillLore('渇天の息')).toContain('竜気のない息はかすか');
    expect(skillLore('破縛の連牙')).toContain('一噛みは浅く');
    expect(skillLore('塚底の取り立て')).toContain('霧が多く残るほど');
    expect(skillLore('結び払い')).toContain('わずか');
    expect(skillLore('悠久の雫')).toContain('豊かに');
    state.allies[1].dragonCharge = 5;
    expect(fixedDamageHint(monsters[15].skills[0]!, state.allies[1])).toContain('現在の竜気5');
    expect(fixedDamageHint(monsters[15].skills[0]!, state.allies[1])).not.toContain('100');
  });
});

import { displayBattleLogLine } from './skillDisplay';
import { POISON_TIMING_HINT } from './poisonDescription';
import { poisonCashoutHint } from './strategy';
import { detailRules } from './monsterDetailContent';

it('hides conditional HP-strength formulas while retaining status counts and actual log outcomes', () => {
  const battle = start([32, 4, 35, 19, 20], [1]);
  const snapshot = structuredClone(battle);
  const actor = battle.allies[0];
  const target = { ...battle.enemies[0], poison: 3 };
  for (const compact of [false, true]) {
    const hint = poisonCashoutHint(actor, actor.monster.skills[0]!, target, compact);
    expect(hint).toContain('3回');
    expect(hint).not.toMatch(/基礎|×|最大\d|14|22|66/);
  }
  for (const monster of monsters) {
    const texts = [JSON.stringify(monsterRole(monster.id)), ...detailRules(monster.id).map(rule => rule.text), ...monster.skills.map(skillDetail)];
    for (const text of texts) expect(text).not.toMatch(/基礎[+＋]?\d|追加基礎|(?:6|14)%|竜気1につき18|14[→か]/);
  }
  expect(POISON_TIMING_HINT).not.toContain('6%');
  expect(POISON_TIMING_HINT).toContain('3回');
  const opening = battle.log.map(displayBattleLogLine).join('');
  expect(opening).not.toMatch(/14→22|最大HPの14%/);
  expect(displayBattleLogLine('トロルに126ダメージ')).toBe('トロルに126ダメージ');
  expect(displayBattleLogLine('生命の雫で65回復')).toBe('生命の雫で65回復');
  expect(displayBattleLogLine('トロルの毒を3回分消費（残り0回・直接攻撃の基礎に+66）')).toBe('トロルの毒を3回分消費（残り0回・一撃を強化）');
  expect(displayBattleLogLine('毒を0回分消費（残り0回・直接攻撃の基礎に+0）')).toBe('毒を0回分消費（残り0回・追加なし）');
  expect(battle).toEqual(snapshot);
});
