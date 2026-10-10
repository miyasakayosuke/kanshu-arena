#!/usr/bin/env node
/** Development sensitivity only. Never imported by shipping UI or the main lab policy. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBattle } from './core.mjs';
import { advanceWithEvents, autoOrders, battleSkill, baseDamage, speedFor, canUseSkill, MAX_TURNS } from '../../src/engine.ts';
const root = fileURLToPath(new URL('../../', import.meta.url));
const load = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const config = load('configs/balance-lab/dragon-charge14.json');
// Explicit old values prevent later adopted stats from silently changing this probe.
const initial = load('configs/balance-lab/dragon-initial-values.json').candidate.overrides;
const sha = value => createHash('sha256').update(value).digest('hex');
function plan(state, side, predict) {
  const orders = autoOrders(state, side);
  if (!predict) return orders;
  const friends = state[side];
  const enemies = state[side === 'allies' ? 'enemies' : 'allies'].filter(unit => unit.hp > 0);
  for (const unit of friends) {
    if (unit.hp <= 0 || unit.dragonCharge === undefined || !enemies.length) continue;
    const index = unit.monster.skills.findIndex(skill => skill.dragonChargeFinisher);
    const finisher = unit.monster.skills[index];
    if (!finisher || !canUseSkill(unit, finisher)) continue;
    let charge = unit.dragonCharge;
    for (const order of orders) {
      const ally = friends.find(friend => friend.key === order.key);
      const skill = battleSkill(ally.monster, order.skill);
      if (ally.key !== unit.key && ally.hp > 0 && ally.monster.family === 'dragon' && skill?.kind === 'hit' && skill.mpCost > 0 && !skill.dragonChargeFinisher
        && (skill.priority > finisher.priority || (skill.priority === finisher.priority && speedFor(ally, state.turn) > speedFor(unit, state.turn)))) charge++;
    }
    charge = Math.min(5, charge);
    const damage = enemies.reduce((sum, enemy) => sum + Math.min(enemy.hp, baseDamage({ ...unit, dragonCharge: charge }, finisher)), 0) - finisher.mpCost * 0.18;
    const current = orders.find(order => order.key === unit.key);
    const old = battleSkill(unit.monster, current.skill);
    const targets = old?.all ? enemies : [enemies.reduce((a, b) => a.hp < b.hp ? a : b)];
    const oldDamage = old?.kind === 'hit' ? targets.reduce((sum, enemy) => sum + Math.min(enemy.hp, baseDamage(unit, old)), 0) - old.mpCost * 0.18 : 0;
    if (damage > oldDamage) { current.skill = index; delete current.target; }
  }
  return orders;
}
const cases = [
  ['initial7', 7, 190], ['point14', 14, 190], ['point14-hp220', 14, 220],
];
const results = [];
for (const [name, perPoint, hp] of cases) for (const predict of [false, true]) {
  const overrides = structuredClone(initial);
  overrides.dragonCharge = { perPoint };
  overrides.monsters[15].hp = hp;
  const rows = [];
  for (const scenario of config.scenarios.filter(item => item.a === 'puredragon')) {
    const a = config.teams.find(team => team.id === scenario.a).ids;
    const b = config.teams.find(team => team.id === scenario.b).ids;
    let wins = 0, draws = 0, turns = 0, casts = 0;
    for (const seed of config.seeds) for (const swap of [false, true]) {
      let state = createBattle(swap ? b : a, swap ? a : b, seed, overrides);
      while (!state.winner && state.turn <= MAX_TURNS) {
        const resolved = advanceWithEvents(state, plan(state, 'allies', predict), { enemyOrders: plan(state, 'enemies', predict) });
        state = resolved.state;
        casts += resolved.events.filter(event => event.kind === 'cast' && event.dragonChargeSpent !== undefined).length;
      }
      if (!state.winner) throw new Error('Timing probe failed to terminate');
      if (state.winner === (swap ? 'lose' : 'win')) wins++;
      if (state.winner === 'draw') draws++;
      turns += state.turn - 1;
    }
    rows.push({ opponent: scenario.b, wins, draws, score: wins + draws / 2, games: config.seeds.length * 2, turns, casts });
  }
  results.push({ name, predict, overrides, rows });
  console.log(name, predict, rows.map(row => `${row.opponent}:W${row.wins}D${row.draws}/${row.games}`).join(' '));
}
const output = resolve(process.argv[2] ?? 'lab-results/dragon-timing-probe.json');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({
  note: 'Non-shipping optimistic queued-charge sensitivity. Same policy on both sides, separate from equal-policy production-autoOrders lab. Predicts paid allied attacks before the anchor; ignores enemy interruption, mitigation in scoring and future target changes. Resolution still uses production guard/ward/RNG. Not a human win-rate model.',
  source: Object.fromEntries(['src/engine.ts', 'src/families.ts', 'scripts/balance-lab/core.mjs', 'scripts/balance-lab/probe-dragon-timing.mjs', 'configs/balance-lab/dragon-charge14.json', 'configs/balance-lab/dragon-initial-values.json'].map(path => [path, sha(readFileSync(resolve(root, path)))])),
  seeds: config.seeds, results,
}, null, 2) + '\n');
console.log(`Saved ${output}`);
