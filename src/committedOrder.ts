import { battleSkill, skillTargetsAllies, type Order, type State, type Unit } from './engine';

/** Describe the saved intent only. Never ask the AI or resolve future hit recipients. */
export function committedOrderLabel(state: State, actor: Unit, order: Order | undefined, automatic = false): string | null {
  if (!order || order.key !== actor.key || actor.hp <= 0) return null;
  const skill = battleSkill(actor.monster, order.skill);
  if (!skill) return null;
  let scope: string;
  if (skill.kind === 'guard') scope = '自分';
  else if (skill.kind === 'restoreMp') scope = '生存味方の粘体系';
  else if (skill.randomHits) scope = '生存敵からランダム';
  else if (skill.all) scope = skillTargetsAllies(skill) ? '生存味方全体' : '生存敵全体';
  else {
    // Use the full formation, including fallen slots, so duplicate names and
    // deaths never renumber a stored target or silently substitute another one.
    const allies = state.allies.findIndex(unit => unit.key === order.target);
    const enemies = state.enemies.findIndex(unit => unit.key === order.target);
    scope = allies >= 0 ? `味方${allies + 1} ${state.allies[allies].monster.name}`
      : enemies >= 0 ? `敵${enemies + 1} ${state.enemies[enemies].monster.name}` : '対象未指定';
  }
  return `${automatic ? 'おまかせ · ' : ''}${skill.name} → ${scope}`;
}
