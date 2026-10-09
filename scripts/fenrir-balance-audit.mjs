// Run with Node.js 22.18+ or Node.js 24. Uses native TypeScript stripping for the engine.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { advanceWithEvents, autoOrders, BASIC_ATTACK, cost, MAX_TURNS, monsters, start } from '../src/engine.ts';
const opponents = [
  { name: 'Existing heavy/guard opponent', team: [1, 5, 8, 10, 6] },
  { name: 'Existing Anubis/poison opponent', team: [11, 9, 4, 7, 10] },
  { name: 'Existing fox/healing opponent', team: [0, 3, 1, 6, 2] },
  { name: 'New Fenrir mixed opponent', team: [12, 0, 2, 6, 10] },
  { name: 'Priority-rich roster', team: [0, 6, 9, 11, 10] },
  { name: 'Guard/healing roster', team: [1, 2, 7, 10, 6] },
];
const variants = [
  { name: 'Fenrir leader / 3 beasts / cost 15', team: [12, 0, 2, 6, 10] },
  { name: 'Fenrir member / fox leader / cost 15', team: [0, 12, 2, 6, 10] },
  { name: 'Anubis leader replacement / cost 15', team: [11, 0, 2, 6, 10] },
  { name: 'Anubis member replacement / fox leader / cost 15', team: [0, 11, 2, 6, 10] },
  { name: 'Fenrir leader / 4 beasts / cost 17', team: [12, 0, 11, 2, 6] },
  { name: 'Fenrir leader / only self beast / cost 14', team: [12, 4, 8, 6, 10] },
  { name: 'Fenrir leader / opening rally disabled for both sides / cost 15', team: [12, 0, 2, 6, 10], familySupport: false },
];
for (const { team } of [...variants, ...opponents]) {
  if (team.length !== 5 || new Set(team).size !== 5 || team.some(id => !monsters[id]) || cost(team) > 17) throw new Error('Illegal five-member team');
}
const seeds = Array.from({ length: 128 }, (_, i) => (Math.imul(i + 1, 2654435761) + 20261009) >>> 0);
const newTotals = () => ({ games: 0, wins: 0, losses: 0, draws: 0, turns: 0, minTurns: Infinity, maxTurns: 0, turnLimit: 0, fenrirGames: 0, fenrirTurnOneDeaths: 0, fenrirSurvivals: 0, barrages: 0, bites: 0, basics: 0, fenrirDamage: 0, fenrirSpending: 0, fenrirHits: 0, finalTeamHpFraction: 0 });
function accumulate(totals, game) {
  totals.games++;
  totals[game.winner === 'draw' ? 'draws' : game.winner === 'win' ? 'wins' : 'losses']++;
  totals.turns += game.turns;
  totals.minTurns = Math.min(totals.minTurns, game.turns);
  totals.maxTurns = Math.max(totals.maxTurns, game.turns);
  totals.turnLimit += game.turns === MAX_TURNS ? 1 : 0;
  for (const field of ['fenrirGames', 'fenrirTurnOneDeaths', 'fenrirSurvivals', 'barrages', 'bites', 'basics', 'fenrirDamage', 'fenrirSpending', 'fenrirHits', 'finalTeamHpFraction']) totals[field] += game[field];
}
const rounded = n => Math.round(n * 1000) / 1000;
const summarize = totals => ({
  games: totals.games, wins: totals.wins, losses: totals.losses, draws: totals.draws, winPercent: rounded(100 * totals.wins / totals.games),
  meanTurns: rounded(totals.turns / totals.games), turnRange: [totals.minTurns, totals.maxTurns], turnLimitGames: totals.turnLimit,
  meanFinalTeamHpPercent: rounded(100 * totals.finalTeamHpFraction / totals.games),
  ...(totals.fenrirGames ? { fenrir: {
    turnOneDeathPercent: rounded(100 * totals.fenrirTurnOneDeaths / totals.fenrirGames), survivalPercent: rounded(100 * totals.fenrirSurvivals / totals.fenrirGames),
    meanBarrages: rounded(totals.barrages / totals.fenrirGames), meanBites: rounded(totals.bites / totals.fenrirGames), meanBasics: rounded(totals.basics / totals.fenrirGames),
    meanDirectDamage: rounded(totals.fenrirDamage / totals.fenrirGames), meanMpSpent: rounded(totals.fenrirSpending / totals.fenrirGames), meanLandedBarrageHits: rounded(totals.fenrirHits / Math.max(1, totals.barrages)),
  } } : {}),
});
function play(variant, opponent, seed, reverse) {
  let state = start(reverse ? opponent.team : variant.team, reverse ? variant.team : opponent.team, seed, { leaders: true, familySupport: variant.familySupport });
  const side = reverse ? 'enemies' : 'allies';
  const fenrirUnit = state[side].find(u => u.monster.id === 12);
  const game = { winner: '', turns: 0, fenrirGames: fenrirUnit ? 1 : 0, fenrirTurnOneDeaths: 0, fenrirSurvivals: 0, barrages: 0, bites: 0, basics: 0, fenrirDamage: 0, fenrirSpending: 0, fenrirHits: 0, finalTeamHpFraction: 0 };
  while (!state.winner && state.turn <= MAX_TURNS) {
    const result = advanceWithEvents(state, autoOrders(state));
    for (const event of result.events) if (fenrirUnit && event.actor === fenrirUnit.key) {
      if (event.kind === 'cast') { if (event.scope === 'random') { game.barrages++; game.fenrirHits += event.hitTargets.length; } else if (event.skill === monsters[12].skills[1].name) game.bites++; else if (event.skill === '通常攻撃') game.basics++; }
      else if (event.kind === 'damage') game.fenrirDamage += event.amount;
      else if (event.kind === 'resource') game.fenrirSpending += event.amount;
    }
    if (state.turn === 1 && fenrirUnit && result.state[side].find(u => u.key === fenrirUnit.key).hp === 0) game.fenrirTurnOneDeaths = 1;
    if (!result.state.history.at(-1).orders.every(o => o.accepted)) throw new Error('Invalid automatic order');
    if ([...result.state.allies, ...result.state.enemies].some(u => u.hp < 0 || u.mp < 0 || u.hp > u.monster.hp || u.mp > u.monster.mp)) throw new Error('Resource invariant violation');
    state = result.state;
  }
  if (!state.winner) throw new Error('No terminal winner');
  game.winner = !reverse || state.winner === 'draw' ? state.winner : state.winner === 'win' ? 'lose' : 'win';
  game.turns = state.turn - 1;
  game.fenrirSurvivals = fenrirUnit && state[side].find(u => u.key === fenrirUnit.key).hp > 0 ? 1 : 0;
  game.finalTeamHpFraction = state[side].reduce((sum, u) => sum + u.hp / u.monster.hp, 0) / 5;
  return game;
}
const audit = { methodology: {
  seedCountPerOrientationPerOpponent: seeds.length, seeds, leaders: true,
  policy: 'Allied side uses autoOrders; enemy side uses existing seeded legal-skill variation. Each matchup repeats with candidate on both sides to expose this policy asymmetry. Reported wins belong to the candidate team in either orientation.',
  caveats: ['Win rates compare specified CPU policies and teams, not human balance or optimized play.', 'Costs are legal but not equal across all opponents; the same-cost Anubis replacements isolate roster swaps better.', 'The passive ablation disables familySupport globally, affecting both sides in the Fenrir mirror.', 'No win-rate threshold determines pass or failure.'],
  runSource: 'src/engine.ts',
  engineSha256: createHash('sha256').update(readFileSync(new URL('../src/engine.ts', import.meta.url))).digest('hex'),
}, opponents: opponents.map(o => ({ ...o, cost: cost(o.team) })), variants: [] };
for (const variant of variants) {
  if (cost(variant.team) > 17 || new Set(variant.team).size !== 5) throw new Error('Illegal candidate team');
  const totals = newTotals(); const player = newTotals(); const enemySide = newTotals();
  const matchups = [];
  for (const opponent of opponents) {
    const subtotal = newTotals();
    for (const seed of seeds) for (const reverse of [false, true]) {
      const game = play(variant, opponent, seed, reverse);
      accumulate(totals, game); accumulate(subtotal, game); accumulate(reverse ? enemySide : player, game);
    }
    matchups.push({ opponent: opponent.name, ...summarize(subtotal) });
  }
  const row = { ...variant, cost: cost(variant.team), total: summarize(totals), candidateAsPlayer: summarize(player), candidateAsEnemy: summarize(enemySide), matchups };
  audit.variants.push(row);
  console.log(JSON.stringify({ name: row.name, ...row.total, playerWinPercent: row.candidateAsPlayer.winPercent, enemyWinPercent: row.candidateAsEnemy.winPercent }));
}

const guard = { name:'Training guard',kind:'guard',power:0,mpCost:0,priority:1 };
const dummy = (key, guarded) => ({key,monster:{id:-1,name:'Training target',icon:'🎯',cost:0,hp:10000,mp:0,atk:0,speed:1,skills:guarded?[guard]:[]},hp:10000,mp:0,guard:false,poison:0});
const scenarios = [
  {name:'Fenrir barrage, base stats, no rally, 5 targets',id:12,skill:0,targets:5,leaders:false,familySupport:false},
  {name:'Fenrir barrage, opening rally, 5 targets',id:12,skill:0,targets:5,leaders:false,familySupport:true},
  {name:'Fenrir barrage, leader plus opening rally, 5 targets',id:12,skill:0,targets:5,leaders:true,familySupport:true},
  {name:'Fenrir bite, opening rally, 5 targets',id:12,skill:1,targets:5,leaders:false,familySupport:true},
  {name:'Fenrir basic, opening rally, 5 targets',id:12,skill:BASIC_ATTACK,targets:5,leaders:false,familySupport:true},
  {name:'Fenrir barrage, opening rally, single unguarded',id:12,skill:0,targets:1,leaders:false,familySupport:true},
  {name:'Fenrir barrage, opening rally, single guarding',id:12,skill:0,targets:1,leaders:false,familySupport:true,guarded:true},
  {name:'Fenrir barrage, opening rally, all five guarding',id:12,skill:0,targets:5,leaders:false,familySupport:true,guarded:true},
  {name:'Fox area attack, base stats, 5 targets',id:0,skill:2,targets:5,leaders:false,familySupport:false},
  {name:'Quetzalcoatl area attack, base stats, 5 targets',id:5,skill:1,targets:5,leaders:false,familySupport:false},
  {name:'Anubis focused attack, base stats, 5 targets',id:11,skill:0,targets:5,leaders:false,familySupport:false},
  {name:'Anubis guard breaker, base stats, single guarding',id:11,skill:3,targets:1,leaders:false,familySupport:false,guarded:true},
];
const mean = a => Math.round(a.reduce((s,n)=>s+n,0)/a.length*1000)/1000;
audit.damageProfiles = scenarios.map(scenario => {
  const totals = [], focused = [], first = [], distinct = [], concentration = [];
  let repetitions = 0;
  let mp;
  for (let i=0;i<512;i++) {
    const seed = (Math.imul(i+1,2654435761)+20261009)>>>0;
    const state = start([scenario.id],[],seed,scenario);
    state.enemies = Array.from({length:scenario.targets},(_,i)=>dummy(`e${i}`,scenario.guarded));
    const {events} = advanceWithEvents(state,[{key:'a0',skill:scenario.skill,target:'e0'}]);
    const damage = events.filter(e=>e.kind==='damage'&&e.actor==='a0');
    const cast = events.find(e=>e.kind==='cast'&&e.actor==='a0');
    const counts = new Map();
    for (const e of damage) counts.set(e.target,(counts.get(e.target)||0)+1);
    totals.push(damage.reduce((sum,e)=>sum+e.amount,0));
    first.push(damage[0].amount);
    focused.push(damage.filter(e=>e.target==='e0').reduce((sum,e)=>sum+e.amount,0));
    distinct.push(counts.size); concentration.push(Math.max(...counts.values()));
    if(counts.size<damage.length) repetitions++;
    mp = events.find(e=>e.kind==='resource'&&e.actor==='a0')?.amount||0;
  }
  return {...scenario,seeds:512,totalDamageMean:mean(totals),totalDamageRange:[Math.min(...totals),Math.max(...totals)],meanDamageOnEnemyZero:mean(focused),meanFirstHit:first.length?mean(first):0,meanDistinctTargets:mean(distinct),meanMaximumHitsOnOneTarget:mean(concentration),repeatedTargetPercent:mean([repetitions/512*100]),mpCost:mp};
});

const destination = process.argv[2] || new URL('../docs/fenrir-balance-audit.json', import.meta.url);
writeFileSync(destination, JSON.stringify(audit, null, 2) + '\n');
console.log(`Saved ${destination}`);
