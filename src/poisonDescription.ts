import { baseDamage, poisonImpactScaleFor, type Skill, type Unit } from './engine';

/** Shared status rules; independent of the immediate hit's optional scale. */
export const POISON_TIMING_HINT = '毒は付与したターンを含むターン終了時に、最大HPの6%のダメージを3回（端数切り捨て・残りHPまで）。再付与は残り3回へ更新し、重ねがけなし。毒解除は現在の毒を消し、その後の毒ダメージを止めますが、後からの毒付与は予防しません。守り・自然障壁は継続毒を軽減しません。';

const displayedBasis = (unit: Unit, skill: Skill) => Number(baseDamage(unit, skill).toFixed(2));
const scaledBasis = (scale: number) => scale === 1 ? '' : scale === 0.5 ? '（基礎半分）' : `（基礎×${scale}）`;

/** Compact command copy only; never changes skill cost, targeting, or orders. */
export function poisonSkillHint(skill: Skill, unit?: Unit): string {
  if (skill.kind !== 'poison') return '';
  const scale = poisonImpactScaleFor(unit ?? {});
  const direct = scale === 0 ? '即時HP減少なし' : `即時${unit ? `基礎約${displayedBasis(unit, skill)}` : 'ダメージ'}${scaledBasis(scale)}`;
  return `${skill.all ? '敵全体' : '敵1体'} · ${direct}＋毒（T末・最大HP6%×3回）`;
}

/** Profiles use the engine default; battle views pass the actual current unit. */
export function poisonSkillDetail(skill: Skill, unit?: Unit): string {
  if (skill.kind !== 'poison') return '';
  const scale = poisonImpactScaleFor(unit ?? {});
  const formula = `威力${skill.power}＋補正後攻撃力の38%`;
  const basis = scale === 0.5 ? `（${formula}）の半分` : scale === 1 ? formula : `（${formula}）×${scale}`;
  const direct = scale === 0 ? '即時のHPダメージはありません。' : `即時ダメージの基礎は${basis}${unit ? `（現在の基礎目安：約${displayedBasis(unit, skill)}）` : ''}。全体攻撃の半減補正は受けません。最終ダメージは乱数±10%・守り・自然障壁で変わり、端数切り捨て・最低1・相手の残りHPまで。表示は確定ダメージではありません。`;
  return `${skill.all ? '敵全体' : '敵1体'}が対象。${direct}生き残った相手に毒を付与。${POISON_TIMING_HINT}`;
}
