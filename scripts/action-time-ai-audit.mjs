/** HISTORICAL v30→v31 comparison, not current v32 policy or optimal-play proof.
 * Both inputs are frozen test-only references. Current MP policy uses mp-recovery-audit.mjs.
 * Run: node scripts/action-time-ai-audit.mjs [output-directory]
 * Manual control uses the SAME fully explicit orders in BOTH engines on every turn.
 */
import * as before from '../tests/reference-v02030/engine.ts';
import * as after from '../tests/reference-v02031/engine.ts';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(process.argv[2] ?? resolve(root, '../action-time-ai-candidate'));
const baselinePath = resolve(root, 'tests/reference-v02030/engine.ts');
const candidatePath = resolve(root, 'tests/reference-v02031/engine.ts');
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const baselineHash = sha(baselinePath), candidateHash = sha(candidatePath);
assert.equal(baselineHash, '1f6cf122daf5fe3010ac97e73a7a09eb7bcee2fab033d670db49e7e170557489', 'Baseline must be the exact accepted v30 engine');
assert.equal(candidateHash,'0e9ebfc59c7befbf08c4b0ca7a4584e1fbb5479a3a82befe0a37b5cf464bae73','Historical candidate must be exact v31');
const seeds = [0, 1, 42, 20261013, 0x7fffffff, 0xffffffff];
const teams = {
  ordinary: [0, 2, 3, 4, 6], guards: [1, 2, 5, 8, 10],
  nature: [14, 3, 6, 9, 10], demon: [29, 1, 8, 30, 31],
  slime: [24, 25, 26, 27, 28], beast: [12, 0, 2, 11, 13],
  undead: [32, 4, 33, 34, 35], dragon: [15, 5, 16, 17, 18],
  extraordinary: [36, 12, 2, 30, 26], material: [19, 20, 21, 22, 23],
};
for (const [name, ids] of Object.entries(teams)) assert.ok(before.cost(ids) <= 17, `${name} must be legal`);
const starterTeams=[[0,2,3,4,6],[1,5,8,10,6],[11,9,4,7,10],[0,3,1,6,2],[1,2,7,8,10],[0,4,6,9,11]];
starterTeams.forEach((ids,index)=>{teams[`starter${index}`]=ids;assert.ok(before.cost(ids)<=17);});
const matchups = [['guards','ordinary'],['nature','demon'],['slime','guards'],['beast','undead'],['dragon','extraordinary'],['material','demon'],['guards','guards'],['nature','nature'],['extraordinary','extraordinary']];
const cohorts = [
  {name: 'mixed-full-mp', pairs: matchups, zeroMp: false},
  {name: 'guard-capable-zero-mp', pairs: [['guards','guards'],['guards','ordinary'],['guards','nature']], zeroMp: true},
];
const all = state => [...state.allies, ...state.enemies];
function initial(engine, teamA, teamB, seed, zeroMp, leaders = true) {
  const state = engine.start(teams[teamA], teams[teamB], seed, {leaders});
  if (zeroMp) all(state).forEach(unit => { unit.mp = 0; });
  return state;
}
function play(engine, request, modern, automaticPolicy) {
  let state = initial(engine, request.teamA, request.teamB, request.seed, request.zeroMp, request.leaders);
  const metrics = {turns: 0, casts: 0, guards: 0, basics: 0, zeroMpCasts: 0, zeroMpGuards: 0, zeroMpBasics: 0, maxGuardStreak: 0, mpSpent: 0, mpGenerated: 0, mpLost: 0, effectiveHeals: 0, zeroHeals: 0};
  const streaks = new Map();
  const firstTurn = [];
  const transcript=createHash('sha256');
  let firstTurnAlliedSurvivors, firstTurnEnemySurvivors;
  while (!state.winner) {
    assert.ok(metrics.turns < 20, 'Engine exceeded the existing 20-turn cap');
    const old = structuredClone(state);
    const commands = modern ? engine.automaticOrders(state) : engine.autoOrders(state);
    // Omitted opposing orders deliberately exercise each version's shipping CPU.
    const result = engine.advanceWithEvents(state, commands, automaticPolicy ? {automaticPolicy} : {});
    assert.deepEqual(state, old, 'Resolver mutated its input');
    const mp = new Map(all(state).map(unit => [unit.key, unit.mp]));
    const record = result.state.history.at(-1);
    transcript.update(JSON.stringify(result));
    const seen = new Set();
    for (const event of result.events) {
      if (event.kind === 'cast') {
        assert.ok(!seen.has(event.actor), 'Actor cast more than once in a turn'); seen.add(event.actor);
        metrics.casts++;
        const guard = ['guard','protect','responseGuard'].includes(event.effect), basic = event.skill === '通常攻撃';
        metrics.guards += Number(guard); metrics.basics += Number(basic);
        if (mp.get(event.actor) === 0) { metrics.zeroMpCasts++; metrics.zeroMpGuards += Number(guard); metrics.zeroMpBasics += Number(basic); }
        streaks.set(event.actor, guard ? (streaks.get(event.actor) ?? 0) + 1 : 0);
        metrics.maxGuardStreak = Math.max(metrics.maxGuardStreak, streaks.get(event.actor));
        if (state.turn === 1) firstTurn.push({actor: event.actor, skill: event.skill, target: event.target, targets: event.targets, source: record.orders.find(order => order.key === event.actor)?.source});
      }
      if (event.kind === 'resource') metrics.mpSpent += event.amount ?? 0;
      if (event.kind === 'resource-gain') metrics.mpGenerated += event.amount ?? 0;
      if (event.kind === 'resource-loss') metrics.mpLost += event.amount ?? 0;
      if (event.kind === 'heal') { metrics.effectiveHeals += Number(event.amount > 0); metrics.zeroHeals += Number(event.amount === 0); }
      if (event.mp !== undefined) mp.set(event.target, event.mp);
    }
    for (const unit of all(result.state)) {
      assert.ok(Number.isInteger(unit.hp) && unit.hp >= 0 && unit.hp <= unit.monster.hp);
      assert.ok(Number.isInteger(unit.mp) && unit.mp >= 0 && unit.mp <= unit.monster.mp);
    }
    metrics.turns++; state = result.state;
    if(metrics.turns===1){firstTurnAlliedSurvivors=state.allies.filter(unit=>unit.hp>0).length;firstTurnEnemySurvivors=state.enemies.filter(unit=>unit.hp>0).length;}
  }
  return {...metrics, winner: state.winner, adjudicated: state.allies.some(unit => unit.hp > 0) && state.enemies.some(unit => unit.hp > 0), transcriptSha256:transcript.digest('hex'), firstTurn, firstTurnAlliedSurvivors, firstTurnEnemySurvivors, finalSeed: state.seed};
}
function explicitManualParity(request) {
  let old = initial(before, request.teamA, request.teamB, request.seed, request.zeroMp, request.leaders);
  let candidate = initial(after, request.teamA, request.teamB, request.seed, request.zeroMp, request.leaders);
  assert.deepEqual(candidate, old);
  let turns = 0;
  while (!old.winner) {
    assert.ok(turns++ < 20);
    const orders = before.autoOrders(old), enemyOrders = before.autoOrders(old, 'enemies');
    const expected = before.advanceWithEvents(old, orders, {enemyOrders});
    const actual = after.advanceWithEvents(candidate, orders, {enemyOrders});
    try { assert.deepEqual(actual, expected); }
    catch (error) {
      mkdirSync(out, {recursive:true});
      writeFileSync(resolve(out, 'manual-parity-first-difference.json'), JSON.stringify({request, turn: old.turn, orders, enemyOrders, expected, actual}, null, 2));
      throw error;
    }
    old = expected.state; candidate = actual.state;
  }
  return turns;
}
function summarize(rows, arm) {
  const values = rows.map(row => row[arm]);
  const total = key => values.reduce((sum, value) => sum + value[key], 0);
  return {
    games: rows.length, alliesWins: values.filter(value => value.winner === 'win').length,
    enemiesWins: values.filter(value => value.winner === 'lose').length, draws: values.filter(value => value.winner === 'draw').length,
    focalWins: rows.filter(row => row[arm].winner === (row.swapped ? 'lose' : 'win')).length,
    adjudicated: values.filter(value => value.adjudicated).length,
    meanTurns: total('turns') / rows.length, maxTurns: Math.max(...values.map(value => value.turns)),
    ...Object.fromEntries(['casts','guards','basics','zeroMpCasts','zeroMpGuards','zeroMpBasics','mpSpent','mpGenerated','mpLost','effectiveHeals','zeroHeals'].map(key => [key,total(key)])),
    maxGuardStreak: Math.max(...values.map(value => value.maxGuardStreak)),
  };
}
const rows = [];
let manualTurns = 0;
for (const cohort of cohorts) for (const [focal, opponent] of cohort.pairs) for (const seed of seeds) for (const swapped of [false,true]) {
  const request = {cohort: cohort.name, focal, opponent, swapped, teamA: swapped ? opponent : focal, teamB: swapped ? focal : opponent, seed, zeroMp: cohort.zeroMp};
  const old = play(before, request, false), snapshotLive = play(after, request, true, 'snapshot-live'), tactical = play(after, request, true, 'tactical'), narrow = play(after, request, true, 'narrow-live'), candidate = play(after, request, true);
  // Exact repeatability includes outcomes, cast order, resources, and final RNG.
  assert.deepEqual(play(after, request, true), candidate);
  manualTurns += explicitManualParity(request);
  rows.push({...request, before: old, snapshotLive, tactical, narrow, after: candidate});
}
assert.equal(sha(baselinePath), baselineHash, 'Baseline source changed during audit');
assert.equal(sha(candidatePath), candidateHash, 'Candidate source changed during audit; rerun final source');
const summary = Object.fromEntries(cohorts.map(cohort => {const group = rows.filter(row => row.cohort === cohort.name); return [cohort.name, {before:summarize(group,'before'),snapshotLive:summarize(group,'snapshotLive'),tactical:summarize(group,'tactical'),narrow:summarize(group,'narrow'),after:summarize(group,'after'),outcomesChanged:group.filter(row=>row.before.winner!==row.after.winner).length}];}));
const starterOpenings=[];
for (const arm of ['before','snapshotLive','tactical','narrow','after']) for (const opening of ['auto','manual-fox','manual-first-special']) {
  const engine=arm==='before'?before:after;
  let state=engine.start([0,2,3,4,6],[1,5,8,10,6],20261008);
  let turns=0, firstTurn;
  while(!state.winner) {
    assert.ok(turns++ < 20);
    let orders=arm==='before'?engine.autoOrders(state):engine.automaticOrders(state);
    if(turns===1 && opening==='manual-fox') orders=orders.map(order=>order.key==='a0'?{key:'a0',skill:0,target:'e0'}:order);
    if(turns===1 && opening==='manual-first-special') orders=state.allies.map(unit=>({key:unit.key,skill:0,target:'e0'}));
    const result=engine.advanceWithEvents(state,orders,arm==='snapshotLive'?{automaticPolicy:'snapshot-live'}:arm==='tactical'?{automaticPolicy:'tactical'}:arm==='narrow'?{automaticPolicy:'narrow-live'}:{});
    state=result.state;
    if(turns===1) firstTurn={alliedSurvivors:state.allies.filter(unit=>unit.hp>0).length,enemySurvivors:state.enemies.filter(unit=>unit.hp>0).length,orders:state.history.at(-1).orders,casts:result.events.filter(event=>event.kind==='cast')};
  }
  starterOpenings.push({arm,opening,seed:20261008,leaders:false,winner:state.winner,turns,firstTurn});
}
const starterPanel=[];
for(const arm of ['before','snapshotLive','tactical','narrow','after']) {
  const games=[];
  for(let a=0;a<starterTeams.length;a++)for(let b=0;b<starterTeams.length;b++)if(a!==b)for(const seed of [0,1,42,2026,20261008,0xffffffff]){
    const request={teamA:`starter${a}`,teamB:`starter${b}`,seed,zeroMp:false,leaders:false};
    const result=play(arm==='before'?before:after,request,arm!=='before',arm==='snapshotLive'?'snapshot-live':arm==='tactical'?'tactical':arm==='narrow'?'narrow-live':undefined);
    games.push({...request,...result});
  }
  const aggregate=summarize(games.map(game=>({swapped:false,[arm]:game})),arm);
  starterPanel.push({arm,...aggregate,shortGames3To7:games.filter(game=>game.turns>=3&&game.turns<=7).length,firstTurnAlliedWipes:games.filter(game=>game.firstTurnAlliedSurvivors===0).length,histogram:games.reduce((histogram,game)=>({...histogram,[game.turns]:(histogram[game.turns]??0)+1}),{}),games});
}
const report = {
  schemaVersion:1, baselineTree:'fc4a6b7a1bc38747621a75d96a071b6f246d42a6', baselineHash, candidateHash,
  policy:{before:'v30 allies snapshot autoOrders; shipping seeded CPU enemies',snapshotLive:'same action-time checkpoints with legacy public-state scorer; symmetric deferred intents',tactical:'headless symmetric HP-utility automatic scorer (rejected broad policy change)',narrow:'rejected live ally support and fixed-token live enemy variation',after:'approved scope: live ally automatic choice; legacy pre-turn enemy choice except exhausted guard-only pool progress fix'},
  limitations:['Paired initial seeds are not matched per-action rolls after policies diverge.','Bounded legal teams and seeds, not optimal-play, enjoyment or global balance evidence.','Both orientations are included; mirrors normalize focal score by construction. Read physical ally wins separately.','Old 736-match all-auto parity is intentionally not claimed.','Manual control supplies identical concrete orders to both engines and compares complete state, events, history, logs and seed.'],
  seeds, teams, pairedGames:rows.length, gameplayRollouts:rows.length*5, candidateRepeatabilityGames:rows.length,
  starterOpenings, starterPanel, explicitManualParity:{games:rows.length,turns:manualTurns,exact:true},summary,rows,
};
assert.equal(sha(baselinePath),baselineHash,'Baseline changed during final panels');
assert.equal(sha(candidatePath),candidateHash,'Candidate changed during final panels');
mkdirSync(out,{recursive:true});
writeFileSync(resolve(out,'action-time-ai-audit.json'),JSON.stringify(report,null,2)+'\n');
const lines=['# Action-time automatic AI audit','',`Paired games: ${rows.length}; exact explicit-manual differential: ${rows.length} games / ${manualTurns} turns.`, '',...Object.entries(summary).flatMap(([name,data])=>[`## ${name}`,'',...['before','snapshotLive','tactical','narrow','after'].map(arm=>{const v=data[arm];return `${arm}: ally/enemy/draw ${v.alliesWins}/${v.enemiesWins}/${v.draws}; mean turns ${v.meanTurns.toFixed(2)}, max ${v.maxTurns}; guards/basic ${v.guards}/${v.basics}; zero-MP guards/basic ${v.zeroMpGuards}/${v.zeroMpBasics}; longest guard streak ${v.maxGuardStreak}; MP spent/generated/lost ${v.mpSpent}/${v.mpGenerated}/${v.mpLost}.`;}),`Changed paired outcomes: ${data.outcomesChanged}.`,'']), '## Starter pacing panel','',...starterPanel.map(({arm,games,meanTurns,shortGames3To7,firstTurnAlliedWipes})=>`${arm}: ${games.length} games, mean ${meanTurns.toFixed(2)} turns; ${shortGames3To7} within 3–7 turns; ${firstTurnAlliedWipes} first-turn allied wipes.`),'','## Limits','',...report.limitations.map(line=>`- ${line}`),'',`Baseline SHA-256: ${baselineHash}`,`Candidate SHA-256: ${candidateHash}`,''];
writeFileSync(resolve(out,'action-time-ai-audit.md'),lines.join('\n'));
console.log(JSON.stringify({pairedGames:rows.length,manual:report.explicitManualParity,summary,starterPanel:starterPanel.map(({games,...summary})=>summary),starterOpenings:starterOpenings.map(({firstTurn,...row})=>({...row,alliedSurvivors:firstTurn.alliedSurvivors,enemySurvivors:firstTurn.enemySurvivors})),out},null,2));
