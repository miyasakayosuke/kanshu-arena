/** Read-only bounded MP-resource audit. No game data or automatic policy modifications. */
import * as current from '../src/engine.ts';
import * as previous from '../tests/reference-v02031/engine.ts';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const out=process.argv[2]; assert.ok(out,'Pass an existing output directory ending in /');
const paths={currentFamilies:fileURLToPath(new URL('../src/families.ts',import.meta.url)),referenceFamilies:fileURLToPath(new URL('../tests/reference-v02031/families.ts',import.meta.url)),v32:fileURLToPath(new URL('../src/engine.ts',import.meta.url)),v31:fileURLToPath(new URL('../tests/reference-v02031/engine.ts',import.meta.url))};
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const hashes=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,sha(p)]));
assert.equal(hashes.v31,'0e9ebfc59c7befbf08c4b0ca7a4584e1fbb5479a3a82befe0a37b5cf464bae73');
for(const key of ['currentFamilies','referenceFamilies'])assert.equal(hashes[key],'9843608be0d2bb3385ad989898e29bb016ba25d314030768e66449072a57a516');
assert.deepEqual(current.monsters,previous.monsters);
const teams={ordinary:[0,2,3,4,6],guardHeavy:[1,2,5,8,10],nature:[14,3,6,9,10],demon:[29,1,8,30,31],slime:[24,25,26,27,28],beast:[12,0,2,11,13],undead:[32,4,33,34,35],dragon:[15,5,16,17,18],extraordinary:[36,12,2,30,26],material:[19,20,21,22,23],healers:[2,7,10,1,8]};
for(const ids of Object.values(teams))assert.ok(current.cost(ids)<=17);
assert.equal(new Set(Object.values(teams).flat()).size,37);
const seeds=[0,1,42,20261013,0x7fffffff,0xffffffff];
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2;};
const blank=()=>({spawns:0,aliveTurnStarts:0,zeroMpTurnStarts:0,noPaidOffenseTurnStarts:0,noPaidSkillTurnStarts:0,casts:0,paidCasts:0,basicCasts:0,guardCasts:0,zeroMpBasicCasts:0,zeroMpGuardCasts:0,mpSpent:0,mpLost:0,mpGained:0,reachedZeroAlive:0,reachedNoPaidOffenseAlive:0,diedBeforeZero:0,diedBeforeNoPaidOffense:0,survived:0,survivorMp:0,survivorMaxMp:0,firstZeroTurns:[],firstNoPaidOffenseTurns:[]});
const offensive=s=>s.kind==='hit'||s.kind==='poison';
const affordability=u=>{const paid=u.monster.skills.filter(s=>s.mpCost>0);const offense=paid.filter(offensive);return {noOffense:offense.length>0&&offense.every(s=>s.mpCost>u.mp),noPaid:paid.length>0&&paid.every(s=>s.mpCost>u.mp)};};
function run(version,engine){
 const all=blank(),bySide={allies:blank(),enemies:blank()},species=Object.fromEntries(engine.monsters.map(m=>[m.id,{id:m.id,name:m.name,maxMp:m.mp,skillCosts:m.skills.map(s=>({name:s.name,kind:s.kind,mpCost:s.mpCost})),...blank()}]));
 const turns={},skills={},games=[],examples=[];let supplyEligible=0,supplyCasts=0,supplyGains=0,otherResourceGains=0;
 const add=(u,field,value=1)=>{all[field]+=value;bySide[u.key.startsWith('a')?'allies':'enemies'][field]+=value;species[u.monster.id][field]+=value;};
 const arr=(u,field,value)=>{all[field].push(value);bySide[u.key.startsWith('a')?'allies':'enemies'][field].push(value);species[u.monster.id][field].push(value);};
 for(const [teamA,a] of Object.entries(teams))for(const [teamB,b]of Object.entries(teams))for(const seed of seeds){
  let state=engine.start(a,b,seed,{leaders:true});const key=`${teamA}/${teamB}/${seed}`;
  const records=new Map([...state.allies,...state.enemies].map(u=>[u.key,{firstZero:null,firstNoOffense:null,cost:0,loss:0,gain:0}]));
  for(const u of [...state.allies,...state.enemies]){add(u,'spawns');if(u.supplyReady===true)supplyEligible++;}
  let rounds=0,castCount=0,zeroMpCasts=0;
  while(!state.winner){assert.ok(rounds++<20);const turn=state.turn;
   const t=turns[turn]??=( {turn,games:0,living:0,zeroMp:0,noPaidOffense:0,noPaidSkill:0,sumMp:0,sumMaxMp:0} );t.games++;
   for(const u of [...state.allies,...state.enemies])if(u.hp>0){add(u,'aliveTurnStarts');t.living++;t.sumMp+=u.mp;t.sumMaxMp+=u.monster.mp;const af=affordability(u);if(u.mp===0){add(u,'zeroMpTurnStarts');t.zeroMp++;}if(af.noOffense){add(u,'noPaidOffenseTurnStarts');t.noPaidOffense++;}if(af.noPaid){add(u,'noPaidSkillTurnStarts');t.noPaidSkill++;}}
   const before=state;const shadow=new Map([...state.allies,...state.enemies].map(u=>[u.key,{...u}]));
   const orders=engine.automaticOrders(state);
   const result=engine.advanceWithEvents(state,orders);
   for(const [eventIndex,e]of result.events.entries()){
    const actor=e.actor&&shadow.get(e.actor),target=e.target&&shadow.get(e.target);
    if(e.kind==='cast'&&actor){
     add(actor,'casts');castCount++;const skill=actor.monster.skills.find(s=>s.name===e.skill)??(e.skill===engine.battleSkill(actor.monster,engine.BASIC_ATTACK).name?engine.battleSkill(actor.monster,engine.BASIC_ATTACK):engine.battleSkill(actor.monster,engine.DEFEND));
     if(skill.mpCost>0)add(actor,'paidCasts');if(e.skill===engine.battleSkill(actor.monster,engine.BASIC_ATTACK).name)add(actor,'basicCasts');if(e.effect==='guard')add(actor,'guardCasts');
     if(actor.mp===0){zeroMpCasts++;if(e.skill===engine.battleSkill(actor.monster,engine.BASIC_ATTACK).name)add(actor,'zeroMpBasicCasts');if(e.effect==='guard')add(actor,'zeroMpGuardCasts');}
     const sk=`${actor.monster.id}/${e.skill}`;const sm=skills[sk]??={id:actor.monster.id,monster:actor.monster.name,skill:e.skill,kind:e.effect,cost:skill.mpCost,casts:0,mpSpent:0};sm.casts++;sm.mpSpent+=skill.mpCost;
     if(e.effect==='restoreMp')supplyCasts++;
    }
    if(e.kind==='resource'&&actor){add(actor,'mpSpent',e.amount??0);records.get(actor.key).cost+=e.amount??0;}
    if(e.kind==='resource-loss'&&target){add(target,'mpLost',e.amount??0);records.get(target.key).loss+=e.amount??0;}
    if(e.kind==='resource-gain'&&target){add(target,'mpGained',e.amount??0);records.get(target.key).gain+=e.amount??0;if(e.effect==='slime-supply')supplyGains+=e.amount??0;else otherResourceGains+=e.amount??0;}
    // All engine HP/MP events provide authoritative absolute values. Resource cost uses actor/target same key.
    const affected=target||(e.kind==='resource'?actor:undefined);
    if(affected){if(e.hp!==undefined)affected.hp=e.hp;if(e.mp!==undefined)affected.mp=e.mp;}
    for(const u of shadow.values())if(u.hp>0){const r=records.get(u.key),af=affordability(u);let newEvent=false;
     if(r.firstZero===null&&u.mp===0){r.firstZero=turn;newEvent=true;}
     if(r.firstNoOffense===null&&af.noOffense){r.firstNoOffense=turn;newEvent=true;}
     if(newEvent&&examples.filter(x=>x.id===u.monster.id).length<2)examples.push({game:key,seed,teamA,teamB,actor:u.key,id:u.monster.id,name:u.monster.name,turn,eventIndex,kind:e.kind,mp:u.mp,hp:u.hp,costSpent:r.cost,enemyDrain:r.loss,recovery:r.gain,firstZero:r.firstZero,firstNoPaidOffense:r.firstNoOffense});
    }
   }
   state=result.state;
   for(const u of [...state.allies,...state.enemies]){assert.equal(shadow.get(u.key).mp,u.mp);assert.equal(shadow.get(u.key).hp,u.hp);}
   assert.equal(before.turn,turn);
  }
  let reachedZero=0,reachedNoOffense=0;
  for(const u of [...state.allies,...state.enemies]){const r=records.get(u.key);if(r.firstZero!==null){add(u,'reachedZeroAlive');arr(u,'firstZeroTurns',r.firstZero);reachedZero++;}else if(u.hp<=0)add(u,'diedBeforeZero');if(r.firstNoOffense!==null){add(u,'reachedNoPaidOffenseAlive');arr(u,'firstNoPaidOffenseTurns',r.firstNoOffense);reachedNoOffense++;}else if(u.hp<=0)add(u,'diedBeforeNoPaidOffense');if(u.hp>0){add(u,'survived');add(u,'survivorMp',u.mp);add(u,'survivorMaxMp',u.monster.mp);}}
  games.push({teamA,teamB,seed,turns:rounds,winner:state.winner,castCount,zeroMpCasts,reachedZero,reachedNoOffense});
 }
 const finish=m=>({...m,medianFirstZeroAmongDepleted:median(m.firstZeroTurns),medianFirstNoPaidOffenseAmongDepleted:median(m.firstNoPaidOffenseTurns)});
 return {version,games:games.length,totalTurns:games.reduce((n,g)=>n+g.turns,0),meanTurns:games.reduce((n,g)=>n+g.turns,0)/games.length,summary:finish(all),bySide:Object.fromEntries(Object.entries(bySide).map(([k,v])=>[k,finish(v)])),species:Object.values(species).map(finish),byTurn:Object.values(turns),skills:Object.values(skills),recovery:{supplyEligible,supplyCasts,supplyGains,otherResourceGains},gameRows:games,examples};
}
const results={v31:run('v31',previous),v32:run('v32',current)};
for(const [k,p]of Object.entries(paths))assert.equal(sha(p),hashes[k],'Source changed during read-only audit');
const report={schemaVersion:1,sourceSha256:hashes,scope:'All ordered pairs of 11 frozen legal teams, six seeds, leaders enabled. All37 species represented. Shipping player/CPU policies per version; shipping v31 versus recurring-2-MP v32; no other stat changes.',teams,seeds,results,limits:['Species exposure is unequal because party rosters overlap; show spawn and living-turn denominators.','First-depletion medians condition on observed depletion; deaths and ended matches are not imputed as late depletion.','MP0 is distinct from inability to afford a paid skill. Free basic/guard and finite supply remain legal where applicable.','Paired seeds are not identical per-action RNG after policy changes.','Current-version policy differences are not solely MP-cost effects; this is diagnosis, not causal balance adoption.','Turn-level late rates concern surviving actors in still-running matches, not the initial whole cohort.']};
writeFileSync(out+'mp-distribution.json',JSON.stringify(report,null,2)+'\n');
const pct=(n,d)=>(100*n/d).toFixed(1)+'%';
const lines=['# MP depletion diagnosis','',report.scope,'',...Object.values(results).flatMap(r=>[ `## ${r.version}`,`Games ${r.games}; mean turns ${r.meanTurns.toFixed(2)}.`,`Of ${r.summary.spawns} actor appearances, ${r.summary.reachedZeroAlive} (${pct(r.summary.reachedZeroAlive,r.summary.spawns)}) reached literal MP0 alive; ${r.summary.reachedNoPaidOffenseAlive} (${pct(r.summary.reachedNoPaidOffenseAlive,r.summary.spawns)}) could not afford any paid offense alive.`,`Observed first-depletion median: MP0 turn ${r.summary.medianFirstZeroAmongDepleted}; no paid offense turn ${r.summary.medianFirstNoPaidOffenseAmongDepleted}.`,`Actual MP spent ${r.summary.mpSpent}, enemy-drained ${r.summary.mpLost}, recovered ${r.summary.mpGained}. Supply casts ${r.recovery.supplyCasts}/${r.recovery.supplyEligible} eligible actor appearances.`,`Zero-MP basic/guard casts ${r.summary.zeroMpBasicCasts}/${r.summary.zeroMpGuardCasts}.`,'' ]),'## v32 highest observed paid-offense exhaustion incidence','',...results.v32.species.sort((a,b)=>b.reachedNoPaidOffenseAlive/b.spawns-a.reachedNoPaidOffenseAlive/a.spawns).slice(0,12).map(m=>`${m.name} (#${m.id}): ${m.reachedNoPaidOffenseAlive}/${m.spawns} (${pct(m.reachedNoPaidOffenseAlive,m.spawns)}); median observed turn ${m.medianFirstNoPaidOffenseAmongDepleted}; MP ${m.maxMp}; paid/basic/guard casts ${m.paidCasts}/${m.basicCasts}/${m.guardCasts}.`),'','## Limits','',...report.limits.map(s=>'- '+s),'',`Source v32 SHA256 ${hashes.v32}`];
writeFileSync(out+'mp-distribution.md',lines.join('\n')+'\n');
console.log(lines.join('\n'));
