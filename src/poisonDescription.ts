import { poisonImpactScaleFor, type Skill, type Unit } from './engine';

/** Shared status rules; independent of the immediate hit's optional scale. */
export const POISON_TIMING_HINT = '毒は付与したターンを含むターン終了時に、最大HPに応じたダメージを3回（端数切り捨て・残りHPまで）。再付与は残り3回へ更新し、重ねがけなし。毒解除は現在の毒を消し、その後の毒ダメージを止めますが、後からの毒付与は予防しません。守り・自然障壁は継続毒を軽減しません。';

/** Compact command copy only; never changes skill cost, targeting, or orders. */
export function poisonSkillHint(skill: Skill, unit?: Unit): string {
  if (skill.kind !== 'poison') return '';
  const scale = poisonImpactScaleFor(unit ?? {});
  const direct = scale === 0 ? '即時HP減少なし' : `即時ダメージ${scale < 1 ? '（弱め）' : ''}`;
  return `${skill.all ? '敵全体' : '敵1体'} · ${direct}＋毒（T末・3回）`;
}

/** Profiles use the engine default; battle views pass the actual current unit. */
export function poisonSkillDetail(skill: Skill, unit?: Unit): string {
  if (skill.kind !== 'poison') return '';
  const scale = poisonImpactScaleFor(unit ?? {});
  const direct = scale === 0 ? '即時のHPダメージはありません。' : `命中時にも${scale < 1 ? '弱めの' : ''}ダメージを与えます。全体攻撃の半減補正は受けません。最終ダメージは攻撃力・乱数±10%・守り・自然障壁で変わり、端数切り捨て・最低1・相手の残りHPまで。一定のダメージを保証するものではありません。`;
  return `${skill.all ? '敵全体' : '敵1体'}が対象。${direct}生き残った相手に毒を付与。${POISON_TIMING_HINT}`;
}
