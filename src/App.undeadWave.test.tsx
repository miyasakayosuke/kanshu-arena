// @vitest-environment happy-dom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import App from './App';
import * as engine from './engine';
import {applyBattleEvents,buildTimeline} from './playback';
let root:Root;
const pure=[32,4,33,34,35],mixed=[2,32,4,35,10];
const label=(text:string)=>document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const button=(text:string)=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(n=>n.textContent?.includes(text))!;
const click=async(n:HTMLElement)=>{expect(n).toBeTruthy();await act(async()=>n.click());};
const tick=async(ms:number)=>{await act(async()=>vi.advanceTimersByTime(ms));};
const hp=()=>[...document.querySelectorAll('.commanderHp')].map(n=>n.textContent);
const mp=()=>[...document.querySelectorAll('.commanderMp')].map(n=>n.textContent);
const status=(index=0)=>document.querySelector(`#party-status-a${index}`)?.textContent;
async function mount(team=pure,rule='standard'){localStorage.removeItem('kanshu-team-workshop-v2');localStorage.setItem('kanshu-workshop-v1',JSON.stringify({team,rule}));await act(async()=>root.render(<App/>));}
async function begin(team=pure){await mount(team);await click(label('闘技場'));await click(button('この編成で対戦する'));}
async function defend(team=pure){for(const id of team){const n=label(`${engine.monsters[id].name}の行動を選択`);if(n.disabled)continue;await click(n);await click(button('ぼうぎょ'));}}
function fixture(mutate?:(s:engine.State)=>void,reapply=false){
 const start=engine.start,advance=engine.advanceWithEvents;
 const setup=vi.spyOn(engine,'start').mockImplementationOnce((team)=>{const s=start(team,pure,3291);s.allies[0].poison=3;mutate?.(s);return s;});
 const resolve=vi.spyOn(engine,'advanceWithEvents').mockImplementation((s,o)=>advance(s,o,{enemyOrders:s.enemies.map((u,i)=>i===0?{key:u.key,skill:0,target:'a0'}:i===1&&reapply?{key:u.key,skill:1}:{key:u.key,skill:engine.DEFEND})}));
 return {setup,resolve};
}
beforeEach(()=>{
  // Pin ordinary draws to pure slime; scenario-specific fixtures may override it.
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  vi.useFakeTimers();localStorage.clear();window.history.replaceState(null,'','#home');document.body.innerHTML='<div id="test-root"></div>';Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);root=createRoot(document.getElementById('test-root')!);});
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks();vi.useRealTimers();});

describe('undead poison cashout playable UI',()=>{
 it.each([1,2])('keeps poison and HP until the same real impact, no healing or MP gain, at %sx',async speed=>{
  const {setup,resolve}=fixture();await begin();if(speed===2)await click(label('演出速度'));await defend();
  const beforeHp=hp(),beforeMp=mp(),portraits=[...document.querySelectorAll<HTMLImageElement>('.commanderIcon img')].map(n=>n.src);
  expect(status()).toContain('毒:残3回');await click(button('この指示でターン開始'));
  const result=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(result.events);
  const cast=tl.cues.find(c=>c.cast?.actor==='e0'&&c.cast.skill==='塚底の取り立て'&&!c.impacts.length)!;
  const impact=tl.cues.find(c=>c.impacts.some(e=>e.kind==='poison-cashout'))!;
  await tick(cast.at/speed+1);expect(hp()).toEqual(beforeHp);expect(status()).toContain('毒:残3回');expect(document.querySelector('.partyCashout')).toBeNull();
  await tick((impact.at-cast.at)/speed-2);expect(hp()).toEqual(beforeHp);expect(status()).toContain('毒:残3回');await tick(1);
  const hit=impact.impacts.find(e=>e.kind==='damage')!;
  expect(hp()[0]).toBe(`HP ${hit.hp}/${setup.mock.results[0].value.allies[0].monster.hp}`);expect(status()).not.toContain('毒:');expect(document.querySelector('.partyCashout')?.textContent).toBe('毒3回消費');
  expect(document.querySelector('.partyImpact.damage')?.textContent).toBe(`−${hit.amount}`);expect(mp()).toEqual(beforeMp);expect(document.querySelector('.partyImpact.heal')).toBeNull();expect(document.querySelector('.partyImpact.resource-gain')).toBeNull();
  expect([...document.querySelectorAll<HTMLImageElement>('.commanderIcon img')].map(n=>n.src)).toEqual(portraits);
  expect(result.events.filter(e=>e.kind==='cast')).toHaveLength(10);expect(result.events.filter(e=>e.kind==='poison-cashout')).toHaveLength(1);
  await click(button('演出をスキップ'));expect(hp()).toEqual(result.state.allies.map(u=>`HP ${u.hp}/${u.monster.hp}`));expect(document.querySelector('.partyCashout')).toBeNull();
 });
 it.each(['whole','before-impact','after-impact'] as const)('%s skip applies final state exactly once with no late repeat',async mode=>{
  const {resolve}=fixture();await begin();await defend();await click(button('この指示でターン開始'));const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(r.events),impact=tl.cues.find(c=>c.impacts.some(e=>e.kind==='poison-cashout'))!;
  if(mode!=='whole')await tick(impact.at+(mode==='before-impact'?-1:1));await click(button('演出をスキップ'));
  const finalHp=hp(),finalMp=mp();expect(finalHp).toEqual(r.state.allies.map(u=>`HP ${u.hp}/${u.monster.hp}`));expect(finalMp).toEqual(r.state.allies.map(u=>`MP ${u.mp}/${u.monster.mp}`));expect(status()).not.toContain('毒:');
  await tick(tl.duration+1000);expect(hp()).toEqual(finalHp);expect(mp()).toEqual(finalMp);expect(resolve).toHaveBeenCalledTimes(1);expect(document.querySelector('.partyCashout')).toBeNull();
 });
 it.each([{ticks:0,lethal:false},{ticks:3,lethal:true}])('retains named zero/lethal cashout metadata: $ticks/$lethal',async({ticks,lethal})=>{
  const {resolve}=fixture(s=>{s.allies[0].poison=ticks;if(lethal)s.allies[0].hp=1;});await begin();await defend();await click(button('この指示でターン開始'));
  const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,impact=buildTimeline(r.events).cues.find(c=>c.impacts.some(e=>e.kind==='poison-cashout'))!;await tick(impact.at+1);
  expect(document.querySelector('.battleMessage')?.textContent).toContain('塚底の取り立て');expect(document.querySelector('.partyCashout')?.textContent).toBe(`毒${ticks}回消費`);
  expect(status()).not.toContain('毒:');if(lethal)expect(hp()[0]).toMatch(/^HP 0\//);expect(impact.impacts.some(e=>e.kind==='defeat')).toBe(lethal);
 });
 it('reapplies fresh poison only at the later real poison impact and ticks it at turn end',async()=>{
  const {resolve}=fixture(s=>{s.enemies[1].monster={...s.enemies[1].monster,speed:20};},true);await begin();await defend();await click(button('この指示でターン開始'));
  const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(r.events),consume=tl.cues.find(c=>c.impacts.some(e=>e.kind==='poison-cashout'))!,poison=tl.cues.find(c=>c.impacts.some(e=>e.kind==='poison'&&e.target==='a0'))!;
  expect(poison.at).toBeGreaterThan(consume.at);await tick(consume.at+1);expect(status()).not.toContain('毒:');await tick(poison.at-consume.at-2);expect(status()).not.toContain('毒:');await tick(1);expect(status()).toContain('毒:残3回');
  await click(button('演出をスキップ'));expect(status()).toContain('毒:残2回');expect(r.events.filter(e=>e.kind==='poison-cashout')).toHaveLength(1);
 });
 it('offers current target tradeoff without reserving poison, and cancel leaves state intact',async()=>{
  const {setup}=fixture(s=>{s.enemies[0].poison=3;s.enemies[1].poison=1;});await begin();await click(button('とくぎ'));expect(document.querySelectorAll('.skillButtons button')).toHaveLength(2);expect(button('塚底の取り立て').textContent).toContain('不死の連携でさらに強まる');
  await click(button('塚底の取り立て'));const hints=[...document.querySelectorAll('.cashoutTargetHint')];expect(hints[0].textContent).toContain('毒3回 → 一撃を強める');expect(hints[1].textContent).toContain('毒1回 → 一撃を強める');expect(hints[2].textContent).toContain('毒0回 → 追加なし');
  expect(hints[0].getAttribute('title')).toContain('残す場合はターン末の毒が続く');expect(hints[0].getAttribute('title')).toContain('実際の命中時に再判定');
  await click(button('特技に戻る'));expect(mp()[0]).toBe('MP 62/62');expect(document.querySelectorAll('.enemyVital')[0].textContent).toContain('毒:残3回');
 });
 it.each([{team:mixed,qualified:true},{team:[2,32,4,6,10],qualified:false}])('shows offleader fixed bonus/current legality and mixed exclusion for $team',async({team,qualified})=>{
  fixture(s=>{s.allies[1].mp=17;s.allies[2].hp=0;});await begin(team);await click(label('ドラウグルの行動を選択'));await click(button('とくぎ'));expect(button('塚底の取り立て').disabled).toBe(true);expect(button('塚底の取り立て').textContent).toContain('MP不足');expect(button('土蓋の拳').disabled).toBe(false);
  await click(button('作戦'));const tactics=document.querySelector('.undeadTactics')!;expect(tactics.textContent).toContain(qualified ? '開戦時の不死3体条件成立' : '条件未成立');expect(tactics.textContent).toContain('現在MP 17・MP不足');expect(tactics.textContent).toContain('ドラウグルだけ');expect(document.body.textContent).toContain('仲間の攻撃には追加されません');
 });
 it('leaves old saves/navigation intact and rejects pure C17 under light C15',async()=>{
  localStorage.setItem('kanshu-team',JSON.stringify([0,2,3,4,6]));await act(async()=>root.render(<App/>));await click(label('編成'));expect([...document.querySelectorAll('.builderSlots .teamUnit')].map(n=>Number(n.getAttribute('data-monster-id')))).toEqual([0,2,3,4,6]);
  await act(async()=>root.unmount());root=createRoot(document.getElementById('test-root')!);await mount(pure,'light');await click(label('闘技場'));expect(button('この編成で対戦する').disabled).toBe(true);expect(document.body.textContent).toContain('17/15');await click(button('標準戦'));expect(button('この編成で対戦する').disabled).toBe(false);
 });
 it('replays a full turn by the same authoritative states with no extra command',async()=>{
  const {setup,resolve}=fixture();await begin();await defend();await click(button('この指示でターン開始'));const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(r.events);
  let projected=setup.mock.results[0].value as engine.State,elapsed=0;
  for(const cue of tl.cues){await tick(cue.at-elapsed);elapsed=cue.at;projected=applyBattleEvents(projected,[...(cue.updates??[]),...cue.impacts]);expect(hp()).toEqual(projected.allies.map(u=>`HP ${u.hp}/${u.monster.hp}`));expect(mp()).toEqual(projected.allies.map(u=>`MP ${u.mp}/${u.monster.mp}`));}
  await tick(tl.duration-elapsed+1);expect(hp()).toEqual(r.state.allies.map(u=>`HP ${u.hp}/${u.monster.hp}`));expect(resolve).toHaveBeenCalledTimes(1);
 });
});
