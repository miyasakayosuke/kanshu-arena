#!/usr/bin/env node
/** Pre-outcome bounded matrix. No simulations and no production mutation. */
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {monsters,cost,assignedFamilyCount,extraordinaryResponseEligible} from '../../src/engine.ts';
const sha=value=>createHash('sha256').update(value).digest('hex');
const rows=[
 ['fullbeast',[12,0,2,11,13],'推薦純獣・先手と5獣連撃'],
 ['fullnature',[14,3,6,9,10],'推薦純自然・C15、毒3体と開幕障壁'],
 ['puredragon',[15,5,16,17,18],'推薦純竜・攻撃蓄積と後攻解放'],
 ['purematerial',[19,20,21,22,23],'推薦純物質・有限修復と重撃'],
 ['pureslime',[24,25,26,27,28],'推薦純粘体・有限MP補給'],
 ['puredemon',[29,1,8,30,31],'推薦純悪魔・MP圧力と解除'],
 ['pureundead',[32,4,33,34,35],'推薦純不死・毒残回数の交換'],
 ['janus-mixed',[36,12,2,30,26],'推薦超常混成・広域応答と速攻/解除。固定対策候補1'],
 ['nature-brute-dryas',[14,3,6,10,28],'既知の支配的な合法C17自然+粘体'],
 ['nature-brute-tengu',[14,6,9,10,28],'既知の支配的な別型C17自然+粘体'],
 ['old-triple-poison',[4,3,7,2,10],'旧毒3体・C15・単体清めと回復'],
 ['material-strong',[19,20,23,7,10],'有限修復、二つの清め、重撃。固定対策候補2'],
 ['slime-strong-area',[24,4,25,27,28],'既知のC17全体攻撃混成'],
 ['slime-strong-poison',[24,6,9,27,28],'既知のC17毒混成'],
 ['undead-reapply',[32,4,33,3,10],'不死3体の毒交換後に遅いナーガが再付与するC17'],
 ['janus-poison',[36,4,3,10,30],'超常/不死/自然/悪魔4種類、毒3体C15'],
 ['janus-ward',[36,14,10,20,35],'4種類C16、自然障壁と共通応答'],
 ['demon-dual-cleanse',[29,8,30,7,2],'MP圧力と二つの清め。固定対策候補3'],
 ['dragon-cleanse-mixed',[15,16,18,7,2],'竜3体と二つの汎用手当て、C17'],
 ['material-break-mixed',[19,20,22,11,3],'物質3体、解除と単体重撃、毒/回復C17'],
 ['slime-break-mixed',[24,25,27,11,7],'粘体3体、補給と解除/回復C17'],
 ['demon-poison-mixed',[29,30,31,2,3],'悪魔3体、毒/回復を添えるC17'],
 ['undead-burst-mixed',[32,4,35,12,3],'不死3体、獣の連撃と毒/回復C17'],
 ['beast-heavy-mixed',[12,13,2,23,7],'獣4体と重撃C17。5獣の連弾追加は不成立'],
];
const teams=rows.map(([id,ids,role])=>{
 if(ids.length!==5||new Set(ids).size!==5||ids.some(i=>!monsters[i])||cost(ids)>17)throw Error(`Illegal ${id}`);
 return {id,ids,cost:cost(ids),role,families:ids.map(i=>monsters[i].family),distinctFamilies:assignedFamilyCount(ids.map(i=>({monster:monsters[i]}))),extraordinaryEligible:extraordinaryResponseEligible(ids.map(i=>({monster:monsters[i]})))};
});
if(teams.length!==24||new Set(teams.map(t=>[...t.ids].sort((a,b)=>a-b).join(','))).size!==24)throw Error('Duplicate matrix');
const seeds=(start,n)=>Array.from({length:n},(_,i)=>(start+Math.imul(i+1,0x9e3779b1))>>>0);
const matrixSeeds=seeds(0xa11fa017,16),counterSeeds=seeds(0xc017fa18,64),reserveCounterSeeds=seeds(0x7efac019,64);
if(new Set([...matrixSeeds,...counterSeeds,...reserveCounterSeeds]).size!==144)throw Error('Seed overlap');
const source={engineSha256:sha(readFileSync('src/engine.ts')),familiesSha256:sha(readFileSync('src/families.ts'))};
const result={schemaVersion:1,status:'frozen-before-system-candidate-outcomes',authoritativeDate:'2026-10-10 UTC',source,priorEvidence:'Prior slime/demon/undead diagnostic results informed the already identified stress anchors. No new poison-scale experiment has run. This is evidence-informed design, not a random population sample.',teams,matrixSeeds,counterSeeds,reserveCounterSeeds,policy:'Explicit production autoOrders for both physical sides; no legacy random enemy branch. Any later new poison-reservation/scoring algorithm requires a separate policy arm at all three scales.',scales:[1,0.5,0],preferIfAllGatesPass:[0.5,0],knownShells:['nature-brute-dryas','nature-brute-tengu'],counterplans:['janus-mixed','material-strong','demon-dual-cleanse'],gates:{knownShellScoreBelow:0.9,knownShellExactC17OpponentScoreImprovementAtLeast:0.1,counterPlansRequiredPerShell:2,counterScoreAtLeast:0.6,counterSeedClustered95LowerBoundAbove:0.5,counterOrientationScoreAbove:0.5,newDominanceScoreAtLeast:0.9,maxAdjudicationRateIncrease:0.05,individualAdjudicationFlagAtLeast:0.25},limits:'Screening judgments, not target50%, human fairness or exhaustive legal-team guarantees. Mirrors excluded from independent matchup-score evidence. COST<=17 and exactC17 partitions reported separately. Hold adoption for unresolved new dominance or adjudication regression; retain all failures.'};
const path='docs/all-family-matrix-freeze.json';if(existsSync(path))throw Error('Refuse overwriting an existing pre-outcome freeze');writeFileSync(path,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({path,sha256:sha(readFileSync(path)),teams:teams.length,exactC17:teams.filter(t=>t.cost===17).length,distinctSeeds:144}));
