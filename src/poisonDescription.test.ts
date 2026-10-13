import { describe, expect, it } from 'vitest';
import { attackFor, DEFAULT_POISON_IMPACT_SCALE, monsters, poisonImpactScaleFor, start } from './engine';
import { POISON_TIMING_HINT, poisonSkillDetail, poisonSkillHint } from './poisonDescription';

const poison = monsters[3].skills[2]!;
const defaultUnit = () => start([3], [10]).allies[0];

describe('poison descriptions follow authoritative mechanics', () => {
  it.each([1, 0.5, 0])('separates immediate and periodic damage at explicit scale %s', scale => {
    const unit = { ...defaultUnit(), poisonImpactScale: scale };
    const compact = poisonSkillHint(poison, unit);
    const detail = poisonSkillDetail(poison, unit);
    expect(compact).toContain('敵全体');
    expect(compact).toContain('T末・3回');
    expect(compact.length).toBeLessThanOrEqual(58);
    expect(detail).toContain(POISON_TIMING_HINT);
    if (scale === 0) {
      expect(compact).toContain('即時HP減少なし');
      expect(detail).toContain('即時のHPダメージはありません');
      expect(detail).not.toContain('最低1');
      expect(detail).not.toContain('威力12');
    } else {
      expect(compact).toContain('即時ダメージ');
      expect(detail).not.toMatch(/威力\s*\d|基礎約|基礎目安/);
      expect(detail).toContain('全体攻撃の半減補正は受けません');
      expect(detail).toContain('乱数±10%・守り・自然障壁');
      expect(detail).toContain('相手の残りHPまで');
      expect(detail).toContain('最終ダメージは攻撃力');
      expect(detail.includes('弱めの')).toBe(scale === 0.5);
    }
  });

  it('uses the engine default only when the unit override is absent, preserving explicit zero', () => {
    const unit = defaultUnit();
    expect(unit).not.toHaveProperty('poisonImpactScale');
    expect(poisonSkillHint(poison, unit)).toBe(poisonSkillHint(poison, { ...unit, poisonImpactScale: DEFAULT_POISON_IMPACT_SCALE }));
    expect(poisonSkillDetail(poison, unit)).toBe(poisonSkillDetail(poison, { ...unit, poisonImpactScale: DEFAULT_POISON_IMPACT_SCALE }));
    expect(poisonSkillDetail(poison).includes('即時のHPダメージはありません')).toBe(Number(DEFAULT_POISON_IMPACT_SCALE) === 0);
    expect(poisonSkillDetail(poison, { ...unit, poisonImpactScale: 0 })).toContain('即時のHPダメージはありません');
  });

  it.each([undefined, Number.NaN, Infinity, -1, 2, 0.25])('uses the engine scale validation for %s', override => {
    const unit = { ...defaultUnit(), poisonImpactScale: override };
    const normalized = poisonImpactScaleFor(unit);
    expect(poisonSkillHint(poison, unit)).toBe(poisonSkillHint(poison, { ...unit, poisonImpactScale: normalized }));
    expect(poisonSkillDetail(poison, unit)).toBe(poisonSkillDetail(poison, { ...unit, poisonImpactScale: normalized }));
  });

  it('keeps actual attack private without mutating the battle inputs', () => {
    const unit = { ...defaultUnit(), monster: { ...monsters[3], atk: 100 }, rally: 1, rallyPercent: 10, poisonImpactScale: 0.5 };
    const before = structuredClone({ unit, poison });
    expect(attackFor(unit)).toBe(110);
    expect(poisonSkillDetail(poison, unit)).not.toMatch(/26\.9|基礎目安/);
    expect(poisonSkillHint(poison, unit)).toContain('即時ダメージ（弱め）');
    expect({ unit, poison }).toEqual(before);
  });

  it('explains three ticks, refresh without stacking, and cleanse without future prevention', () => {
    for (const phrase of ['付与したターンを含むターン終了時', '最大HPに応じたダメージ', '3回', '残り3回へ更新', '重ねがけなし', '毒解除は現在の毒を消し', '後からの毒付与は予防しません', '守り・自然障壁は継続毒を軽減しません']) {
      expect(POISON_TIMING_HINT).toContain(phrase);
    }
  });

  it('does not describe unrelated skills as poison or alter the shared skill definition', () => {
    for (const skill of monsters[3].skills.filter(skill => skill.kind !== 'poison')) {
      expect(poisonSkillHint(skill)).toBe('');
      expect(poisonSkillDetail(skill)).toBe('');
    }
    expect(poison).toMatchObject({ name: '毒霧', mpCost: 16, all: true, power: 12, kind: 'poison' });
  });
});
