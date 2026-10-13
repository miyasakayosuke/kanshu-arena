// @vitest-environment happy-dom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import App from './App';
import * as engine from './engine';
import {applyBattleEvents,buildTimeline} from './playback';
let root:Root;
const mixed=[36,12,2,30,26];
const label=(text:string)=>document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const button=(text:string)=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(n=>n.textContent?.includes(text))!;
const click=async(n:HTMLElement)=>{expect(n).toBeTruthy();await act(async()=>n.click());};
const tick=async(ms:number)=>{await act(async()=>vi.advanceTimersByTime(ms));};
const hp=()=>[...document.querySelectorAll('.commanderHp')].map(n=>n.textContent);
const mp=()=>[...document.querySelectorAll('.commanderMp')].map(n=>n.textContent);
const status=(index=0)=>document.querySelector(`#party-status-a${index}`)?.textContent;
async function mount(team=mixed,rule='standard'){localStorage.removeItem('kanshu-team-workshop-v2');localStorage.setItem('kanshu-workshop-v1',JSON.stringify({team,rule}));await act(async()=>root.render(<App/>));}
async function begin(team=mixed){await mount(team);await click(label('闘技場'));await click(button('この編成で対戦する'));}
async function skills(){await click(label('ヤヌスの行動を選択'));await click(button('とくぎ'));}
async function command(choice:number,team=mixed){for(const id of team){const n=label(`${engine.monsters[id].name}の行動を選択`);if(n.disabled)continue;await click(n);if(id===36){await click(button('とくぎ'));await click(button(engine.monsters[36].skills[choice]!.name));}else await click(button('ぼうぎょ'));}}
function fixture(choice=0,mutate?:(s:engine.State)=>void,enemyTeam=mixed,enemyOrders?:(s:engine.State)=>engine.Order[]){
 const start=engine.start,advance=engine.advanceWithEvents;
 const setup=vi.spyOn(engine,'start').mockImplementationOnce(team=>{const s=start(team,enemyTeam,3617);s.allies[0].poison=3;s.allies[1].poison=2;s.enemies[0].poison=3;mutate?.(s);return s;});
 const resolve=vi.spyOn(engine,'advanceWithEvents').mockImplementation((s,o)=>advance(s,o,{enemyOrders:enemyOrders?.(s)??s.enemies.map((u,i)=>({key:u.key,skill:i===0?choice:engine.DEFEND}))}));
 return {setup,resolve};
}
beforeEach(()=>{
  // Pin ordinary draws to pure slime; scenario-specific fixtures may override it.
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  vi.useFakeTimers();localStorage.clear();window.history.replaceState(null,'','#home');document.body.innerHTML='<div id="test-root"></div>';Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);root=createRoot(document.getElementById('test-root')!);});
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks();vi.useRealTimers();});

describe('extraordinary shared response UI',()=>{
 it.each([0,1])('offers response %s as one group order; replacing spends neither MP nor shared use',async choice=>{
  fixture();await begin();await skills();expect(document.querySelectorAll('.skillButtons button')).toHaveLength(4);
  expect(button('境目の清め').textContent).toContain('HP回復0');expect(button('合流の扉').textContent).toContain('生存味方全員');
  await click(button(engine.monsters[36].skills[choice]!.name));expect(document.querySelector('.targetButtons')).toBeNull();expect(document.querySelectorAll('.battleTarget')).toHaveLength(0);
  expect(mp()[0]).toBe('MP 58/58');expect(status()).toContain('応答:残1回');await click(label('ヤヌスの行動を選択'));await click(button('ぼうぎょ'));await skills();expect(button('境目の清め').disabled).toBe(false);expect(button('合流の扉').disabled).toBe(false);expect(mp()[0]).toBe('MP 58/58');
 });
 it.each([0,1].flatMap(choice=>[1,2].map(speed=>({choice,speed}))))('debits once at cast and applies only living recipients at impact: $choice/$speed',async({choice,speed})=>{
  const {setup,resolve}=fixture(choice,s=>{s.allies[4].hp=0;});await begin();if(speed===2)await click(label('演出速度'));await command(choice);
  const portrait=[...document.querySelectorAll<HTMLImageElement>('.commanderIcon img')].map(n=>n.src);await click(button('この指示でターン開始'));
  const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(r.events),cast=tl.cues.find(c=>c.cast?.actor==='a0'&&c.cast.effect===(choice?'responseGuard':'responseCleanse'))!,impact=tl.cues.find(c=>c.impacts.some(e=>e.actor==='a0'&&e.effect===(choice?'extraordinary-response-guard':'extraordinary-response-cleanse')))!;
  expect(cast.cast!.targets).toEqual(['a0','a1','a2','a3']);await tick(cast.at/speed+1);
  expect(mp()[0]).toBe('MP 34/58');expect(status()).toContain('応答:残0回');expect(status()).toContain('毒:残3回');if(choice)expect(status()).not.toContain('守り:');expect(document.querySelector('.partyResponse')).toBeNull();
  expect(document.querySelector('.battleMessage')?.textContent).toContain('生存する味方全員 4体');await tick((impact.at-cast.at)/speed-1);
  if(choice)expect(status()).toContain('守り:今T');else expect(status()).not.toContain('毒:');expect(document.querySelectorAll('.partyResponse')).toHaveLength(4);expect(document.querySelector('.partyImpact.heal')).toBeNull();expect(document.querySelector('.partyImpact.resource-gain')).toBeNull();
  expect(hp()).toEqual(setup.mock.results[0].value.allies.map((u:engine.Unit)=>`HP ${u.hp}/${u.monster.hp}`));expect([...document.querySelectorAll<HTMLImageElement>('.commanderIcon img')].map(n=>n.src)).toEqual(portrait);
  expect(r.events.filter(e=>e.kind==='response'&&e.actor==='a0')).toHaveLength(1);expect(r.events.filter(e=>e.kind==='cast').length).toBeLessThanOrEqual(9);await click(button('演出をスキップ'));await skills();for(const name of ['境目の清め','合流の扉']){expect(button(name).disabled).toBe(true);expect(button(name).textContent).toContain('共通の応答は使用済み');}expect(button('門番の構え').disabled).toBe(false);expect(status()).not.toContain('守り:');
 });
 it.each([0,1].flatMap(choice=>['whole','before-impact','after-impact'].map(mode=>({choice,mode}))))('skip $mode/$choice preserves the authoritative state and no delayed repeat',async({choice,mode})=>{
  const {resolve}=fixture(choice);await begin();await command(choice);await click(button('この指示でターン開始'));const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(r.events),impact=tl.cues.find(c=>c.impacts.some(e=>e.effect===(choice?'extraordinary-response-guard':'extraordinary-response-cleanse')))!;
  if(mode!=='whole')await tick(impact.at+(mode==='before-impact'?-1:1));await click(button('演出をスキップ'));const finalHp=hp(),finalMp=mp();expect(finalHp).toEqual(r.state.allies.map(u=>`HP ${u.hp}/${u.monster.hp}`));expect(finalMp).toEqual(r.state.allies.map(u=>`MP ${u.mp}/${u.monster.mp}`));expect(status()).toContain('応答:残0回');expect(status()).not.toContain('守り:');await tick(tl.duration+1);expect(hp()).toEqual(finalHp);expect(mp()).toEqual(finalMp);expect(resolve).toHaveBeenCalledTimes(1);expect(document.querySelector('.partyResponse')).toBeNull();
 });
 it.each([{reason:'poison',text:'毒のある生存味方がいない'},{reason:'guard',text:'生存する味方は全員守り中'},{reason:'mp',text:'MP不足'},{reason:'ineligible',text:'系統4種類以上が必要'}])('explains $reason without fabricating use',async({reason,text})=>{
  fixture(0,s=>{if(reason==='poison')s.allies.forEach(u=>u.poison=0);if(reason==='guard')s.allies.forEach(u=>u.guard=true);if(reason==='mp')s.allies[0].mp=23;});await begin(reason==='ineligible'?[36,12,2,10,6]:mixed);await skills();expect(button(reason==='guard'?'合流の扉':'境目の清め').disabled).toBe(true);expect(button(reason==='guard'?'合流の扉':'境目の清め').textContent).toContain(text);expect(button('門番の構え').disabled).toBe(false);
 });
 it('shows both sides current poison, MP24 and shared allowance after a unique-family ally dies',async()=>{
  fixture(0,s=>{s.allies[4].hp=0;s.enemies[0].mp=23;});await begin([2,36,12,30,26]);await click(button('作戦'));const plans=[...document.querySelectorAll('.extraordinaryTactics')];expect(plans).toHaveLength(2);expect(plans[0].textContent).toContain('所属系統4種類');expect(plans[0].textContent).toContain('共通の残1回');expect(plans[0].textContent).toContain('生存対象4体');expect(plans[0].textContent).toContain('必要24');expect(plans[1].textContent).toContain('MP不足');expect(document.querySelector('.enemyIntel')?.textContent).toContain('生存する味方全員の現在毒だけ解除・HP回復0・共通1回');
 });
 it('does not spend the response when a faster cleanser removes the only poison',async()=>{
  const {resolve}=fixture(0,s=>{s.allies.forEach(u=>u.poison=0);s.allies[1].poison=3;s.allies[2].monster={...s.allies[2].monster,speed:100};});await begin();await command(0);await click(label('バステトの行動を選択'));await click(button('とくぎ'));await click(button('清めの鈴'));await click(label('味方2 フェンリルを清めの鈴の対象に選択'));await click(button('この指示でターン開始'));const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;expect(r.events.some(e=>e.kind==='cast'&&e.actor==='a0')).toBe(false);await click(button('演出をスキップ'));expect(mp()[0]).toBe('MP 58/58');expect(status()).toContain('応答:残1回');
 });
 it('falls back after MP drain without spending the shared response',async()=>{
  const {resolve}=fixture(0,s=>{s.allies[0].mp=24;s.enemies[0].monster={...s.enemies[0].monster,speed:110};},[29,1,8,30,31],s=>s.enemies.map((u,i)=>i===0?{key:u.key,skill:0,target:'a0'}:{key:u.key,skill:engine.DEFEND}));await begin();await command(0);await click(button('この指示でターン開始'));const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;expect(r.events.some(e=>e.kind==='fallback'&&e.actor==='a0')).toBe(true);expect(r.events.some(e=>e.kind==='response'&&e.actor==='a0')).toBe(false);await click(button('演出をスキップ'));expect(status()).toContain('応答:残1回');await skills();expect(button('境目の清め').textContent).toContain('MP不足');expect(button('合流の扉').textContent).toContain('MP不足');
 });
 it('keeps a killed core down without casting, healing or revival',async()=>{
  const {resolve}=fixture(0,s=>{s.allies[0].hp=1;},[0,2,3,4,6],s=>s.enemies.map((u,i)=>i===0?{key:u.key,skill:0,target:'a0'}:{key:u.key,skill:engine.DEFEND}));await begin();await command(0);await click(button('この指示でターン開始'));const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;expect(r.events.some(e=>e.kind==='response'&&e.actor==='a0')).toBe(false);await click(button('演出をスキップ'));expect(hp()[0]).toMatch(/^HP 0\//);expect(label('ヤヌスの行動を選択').disabled).toBe(true);
 });
 it('allows later poison reapplication after clearing and uses real end-of-turn ticks',async()=>{
  const {resolve}=fixture(0,undefined,[36,4,3,10,30],s=>s.enemies.map((u,i)=>i===3?{key:u.key,skill:1}:{key:u.key,skill:engine.DEFEND}));await begin();await command(0);await click(button('この指示でターン開始'));const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(r.events),clear=tl.cues.find(c=>c.impacts.some(e=>e.actor==='a0'&&e.kind==='cleanse'))!,poison=tl.cues.find(c=>c.impacts.some(e=>e.target==='a0'&&e.kind==='poison'))!;expect(poison.at).toBeGreaterThan(clear.at);await tick(clear.at+1);expect(status()).not.toContain('毒:');await tick(poison.at-clear.at);expect(status()).toContain('毒:残3回');await click(button('演出をスキップ'));expect(status()).toContain('毒:残2回');
 });
 it('replays both sides exactly through cast, effects, expiry and next input clock',async()=>{
  const {setup,resolve}=fixture(1);await begin();await command(0);await click(button('この指示でターン開始'));const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(r.events);let projected=setup.mock.results[0].value as engine.State,elapsed=0;
  for(const cue of tl.cues){await tick(cue.at-elapsed);elapsed=cue.at;projected=applyBattleEvents(projected,[...(cue.updates??[]),...cue.impacts]);expect(hp()).toEqual(projected.allies.map(u=>`HP ${u.hp}/${u.monster.hp}`));expect(mp()).toEqual(projected.allies.map(u=>`MP ${u.mp}/${u.monster.mp}`));expect([...document.querySelectorAll('.enemyMp')].map(n=>n.textContent)).toEqual(projected.enemies.map(u=>`MP ${u.mp}/${u.monster.mp}`));expect(status()).toBe(engine.effectStatus(projected.allies[0]));}
  await tick(tl.duration-elapsed+1);expect(document.querySelector('[role=timer]')?.textContent).toContain('30');expect(resolve).toHaveBeenCalledTimes(1);
 });
 it('preserves old save keys and denies C17/C16 examples under light while the adverse C15 mix stays legal',async()=>{
  localStorage.setItem('kanshu-team',JSON.stringify([0,2,3,4,6]));await act(async()=>root.render(<App/>));await click(label('編成'));expect([...document.querySelectorAll('.builderSlots .teamUnit')].map(n=>Number(n.getAttribute('data-monster-id')))).toEqual([0,2,3,4,6]);await act(async()=>root.unmount());root=createRoot(document.getElementById('test-root')!);await mount(mixed,'light');await click(label('闘技場'));expect(button('この編成で対戦する').disabled).toBe(true);expect(document.body.textContent).toContain('17/15');expect(engine.cost([36,12,2,10,35])).toBe(16);expect(engine.cost([36,4,3,10,30])).toBe(15);expect(engine.extraordinaryResponseEligible([36,14,10,20,35].map(id=>({monster:engine.monsters[id]})))).toBe(true);
 });
 it('rechecks guard after injected same-priority attack kills the last unguarded protector',async()=>{
  // Defensive recheck fixture: normal attacks cannot have priority3. The public
  // game still uses its unchanged skills; this only puts the UI at that boundary.
  const team=[36,1,2,30,26];const {resolve}=fixture(1,s=>{s.allies.slice(2).forEach(u=>u.hp=0);s.allies[1].hp=1;s.allies[1].monster={...s.allies[1].monster,speed:120};s.enemies[0].monster={...s.enemies[0].monster,speed:90,skills:[{...s.enemies[0].monster.skills[0]!,priority:3}]};},[0,2,3,4,6],s=>s.enemies.map((u,i)=>i===0?{key:u.key,skill:0,target:'a1'}:{key:u.key,skill:engine.DEFEND}));await begin(team);await command(1,team);await click(label('トロルの行動を選択'));await click(button('とくぎ'));await click(button('守護の誓い'));await click(label('味方1 ヤヌスを守護の誓いの対象に選択'));await click(button('この指示でターン開始'));const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;expect(r.events.some(e=>e.kind==='cast'&&e.actor==='a0')).toBe(false);expect(r.events.some(e=>e.kind==='response'&&e.actor==='a0')).toBe(false);await click(button('演出をスキップ'));expect(mp()[0]).toBe('MP 58/58');expect(status()).toContain('応答:残1回');
 });
 it('restores MP and the one response for a new lobby battle and cancels all prior playback',async()=>{
  const {setup,resolve}=fixture(1,s=>s.enemies.forEach(u=>{u.hp=1;u.poison=1;}),mixed,s=>s.enemies.map(u=>({key:u.key,skill:engine.DEFEND})));
  await begin();await command(1);await click(button('この指示でターン開始'));await click(button('演出をスキップ'));
  expect(document.querySelector('.arenaLobby .result')).toBeTruthy();expect(window.location.hash).toBe('#arena');
  expect(document.querySelector('.battleMode,.partyResponse,.rematchActions,.retryContract,[role=timer]')).toBeNull();
  await tick(buildTimeline(resolve.mock.results[0].value.events).duration+1);
  expect(setup).toHaveBeenCalledTimes(1);expect(resolve).toHaveBeenCalledTimes(1);
  vi.mocked(Math.random).mockReturnValue(2 / 0x100000000);
  await click(button('この編成で対戦する'));
  expect(setup).toHaveBeenCalledTimes(2);expect(setup.mock.calls[1][2]).toBe(2);expect(setup.mock.calls[1][2]).not.toBe(setup.mock.calls[0][2]);
  expect(mp()[0]).toBe('MP 58/58');expect(status()).toContain('応答:残1回');expect(document.querySelector('.partyResponse')).toBeNull();
  expect(document.querySelector('[role=timer]')?.textContent).toContain('30');expect(resolve).toHaveBeenCalledTimes(1);
 });

});
