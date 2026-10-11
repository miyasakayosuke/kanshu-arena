// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import { buildTimeline, CAST_IMPACT_MS, applyBattleEvents } from './playback';

let root: Root;
const pure = [24,25,26,27,28], mixed = [24,25,28,2,10];
const label = (s:string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${s}"]`)!;
const button = (s:string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(n => n.textContent?.includes(s))!;
const click = async (n:HTMLElement) => { expect(n).toBeTruthy(); await act(async()=>n.click()); };
const tick = async (ms:number) => { await act(async()=>vi.advanceTimersByTime(ms)); };
const hp = () => [...document.querySelectorAll('.commanderHp')].map(n=>n.textContent);
const mp = () => [...document.querySelectorAll('.commanderMp')].map(n=>n.textContent);
async function mount(team=pure, rule='standard') { localStorage.setItem('kanshu-workshop-v1',JSON.stringify({team,rule})); await act(async()=>root.render(<App/>)); }
async function begin(team=pure) { await mount(team); await click(label('闘技場')); await click(button('この編成で対戦する')); }
async function supplyOrder(team=pure) {
  await click(label('うつろ泉の行動を選択')); await click(button('とくぎ')); await click(button('蓄え分け'));
  for(const id of team.slice(1)) { const n=label(`${engine.monsters[id].name}の行動を選択`); if(n.disabled)continue; await click(n); await click(button('ぼうぎょ')); }
}
function fixture(mutate?:(s:engine.State)=>void) {
  const start=engine.start,advance=engine.advanceWithEvents;
  const setup=vi.spyOn(engine,'start').mockImplementationOnce((...args)=>{ const s=start(...args); s.allies.forEach(u=>{u.mp-=10;u.hp-=20;});mutate?.(s);return s; });
  const resolve=vi.spyOn(engine,'advanceWithEvents').mockImplementation((s,o)=>advance(s,o,{enemyOrders:s.enemies.filter(u=>u.hp>0).map(u=>({key:u.key,skill:engine.DEFEND}))}));
  return {setup,resolve};
}
beforeEach(()=>{
  // Pin ordinary draws to pure slime; scenario-specific fixtures may override it.
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
 vi.useFakeTimers();localStorage.clear();window.history.replaceState(null,'','#home');document.body.innerHTML='<div id="test-root"></div>';Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);root=createRoot(document.getElementById('test-root')!); });
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks();vi.useRealTimers();});

describe('slime supply playable UI',()=>{
  it('shows full-MP rejection and initial family-only MP leader without consuming the allowance',async()=>{
    await begin();expect(mp()).toEqual(['MP 70/70','MP 44/44','MP 51/51','MP 66/66','MP 57/57']);
    await click(button('とくぎ'));expect(button('蓄え分け').disabled).toBe(true);expect(button('蓄え分け').textContent).toContain('MPが全員満タン');expect(button('蓄え分け').textContent).not.toContain('MP不足');
    expect(document.querySelector('#party-status-a0')?.textContent).toBe('補給:残1回');
    await click(button('作戦'));expect(document.querySelector('.slimeTactics')?.textContent).toContain('残1回・対象のMPが全員満タン');
  });
  it.each([1,2])('spends allowance atcast, gains MP atimpact only, preserves HP/static portraits at %sx',async speed=>{
    const {setup,resolve}=fixture();await begin();
    const beforeHp=hp(),beforeMp=mp(),portraits=[...document.querySelectorAll<HTMLImageElement>('.commanderIcon img')].map(n=>n.src);
    if(speed===2)await click(label('演出速度'));
    await supplyOrder();expect(document.querySelector('#party-status-a0')?.textContent).toBe('補給:残1回');expect(mp()).toEqual(beforeMp);
    await click(button('全員おまかせ'));expect(document.querySelector('#party-status-a0')?.textContent).toBe('補給:残1回');await supplyOrder();await click(button('この指示でターン開始'));
    const result=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(result.events);
    const cast=tl.cues.find(c=>c.cast?.effect==='restoreMp'&&!c.impacts.length)!,impact=tl.cues.find(c=>c.impacts.some(e=>e.kind==='resource-gain'))!;
    expect(cast.passive).toBeUndefined();expect(result.events.filter(e=>e.kind==='cast')).toHaveLength(10);
    await tick(cast.at/speed+1);expect(document.querySelector('#party-status-a0')?.textContent).toBe('補給:残0回');expect(mp()).toEqual(beforeMp);expect(hp()).toEqual(beforeHp);
    expect(document.querySelector('.battleMessage')?.textContent).toContain('生存する粘体系 5体');expect(document.querySelector('.battleMessage')?.textContent).not.toContain('特性');expect(document.querySelectorAll('.commander.areaTarget')).toHaveLength(5);
    await tick(CAST_IMPACT_MS/speed-2);expect(mp()).toEqual(beforeMp);await tick(1);
    const throughImpact=tl.cues.filter(c=>c.at<=impact.at).reduce((s,c)=>applyBattleEvents(s,[...(c.updates??[]),...c.impacts]),setup.mock.results[0].value as engine.State);
    expect(mp()).toEqual(throughImpact.allies.map(u=>`MP ${u.mp}/${u.monster.mp}`));expect(hp()).toEqual(beforeHp);
    expect(document.querySelectorAll('.partyImpact.resource-gain')).toHaveLength(5);expect(document.querySelectorAll('.partyImpact.heal')).toHaveLength(0);expect(document.querySelector('.partyImpact.resource-gain')?.textContent).toBe('MP+8');
    expect([...document.querySelectorAll<HTMLImageElement>('.commanderIcon img')].map(n=>n.src)).toEqual(portraits);
    await click(button('演出をスキップ'));expect(mp()).toEqual(result.state.allies.map(u=>`MP ${u.mp}/${u.monster.mp}`));await click(label('うつろ泉の行動を選択'));await click(button('とくぎ'));expect(button('蓄え分け').disabled).toBe(true);expect(button('蓄え分け').textContent).toContain('使用済み');
  });
  it('includes only surviving own slimes, preserves fixed starting condition and never heals or revives',async()=>{
    const {resolve}=fixture(s=>{s.allies[1].hp=0;s.allies[0].mp=s.allies[0].monster.mp;});await begin(mixed);const beforeHp=hp();await supplyOrder(mixed);await click(button('この指示でターン開始'));
    const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(r.events),impact=tl.cues.find(c=>c.impacts.some(e=>e.kind==='resource-gain'))!;
    expect(impact.cast?.targets).toEqual(['a0','a2']);await tick(impact.at+1);expect(document.querySelectorAll('.commander.areaTarget')).toHaveLength(2);expect(document.querySelector('.battleMessage')?.textContent).toContain('生存する粘体系 2体');expect(hp()).toEqual(beforeHp);
    expect([...document.querySelectorAll('.partyImpact.resource-gain')].map(n=>n.textContent)).toEqual(['MP+0','MP+8']);expect(mp().slice(3)).toEqual(['MP 62/72','MP 46/56']);
  });
  it.each([['before-cast',false],['before-impact',true]] as const)('skip %s preserves exact final state and cannot replay gains',async(_name,afterCast)=>{
    const {resolve}=fixture();await begin();await supplyOrder();await click(button('この指示でターン開始'));const r=resolve.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>,tl=buildTimeline(r.events);
    if(afterCast)await tick(tl.cues.find(c=>c.cast?.effect==='restoreMp'&&!c.impacts.length)!.at+1);
    await click(button('演出をスキップ'));const final=mp();expect(final).toEqual(r.state.allies.map(u=>`MP ${u.mp}/${u.monster.mp}`));await tick(tl.duration+1);expect(mp()).toEqual(final);expect(resolve).toHaveBeenCalledTimes(1);expect(document.querySelector('#party-status-a0')?.textContent).toBe('補給:残0回');
  });
  it.each([{team:[24,25,2,6,10],text:'条件未成立'},{team:[25,26,27,2,10],text:'中核なし'}])('distinguishes missing qualification for $team',async({team,text})=>{
    await begin(team);await click(button('作戦'));expect(document.querySelector('.slimeTactics')?.textContent).toContain(text);
    await click(label('作戦情報を閉じる'));if(team[0]===24){await click(button('とくぎ'));expect(button('蓄え分け').disabled).toBe(true);expect(button('蓄え分け').textContent).toContain('粘体系3体以上が必要');expect(button('蓄え分け').textContent).not.toContain('MP不足');}
  });
  it('keeps old saves readable and standard-only pure team illegal in light',async()=>{
    localStorage.setItem('kanshu-team',JSON.stringify([0,2,3,4,6]));await act(async()=>root.render(<App/>));await click(label('編成'));expect([...document.querySelectorAll('.builderSlots .teamUnit')].map(n=>Number(n.getAttribute('data-monster-id')))).toEqual([0,2,3,4,6]);
    await act(async()=>root.unmount());root=createRoot(document.getElementById('test-root')!);await mount(pure,'light');await click(label('闘技場'));expect(button('この編成で対戦する').disabled).toBe(true);await click(button('標準戦'));expect(button('この編成で対戦する').disabled).toBe(false);
  });
  it('retries at full MP with one allowance and preserves exact battle results across normal,2x and skipped playback',async()=>{
    const setup=vi.spyOn(engine,'start'),resolve=vi.spyOn(engine,'advanceWithEvents');await begin();const opening=structuredClone(setup.mock.results[0].value),outcomes:engine.State[]=[];
    for(const mode of ['skip','normal','double']){
      if(mode!=='skip'){await click(button('同じ編成ですぐ再戦'));expect(setup.mock.calls.at(-1)).toEqual(setup.mock.calls[0]);expect(setup.mock.results.at(-1)!.value).toEqual(opening);expect(document.querySelector('#party-status-a0')?.textContent).toBe('補給:残1回');}
      if(mode==='double')await click(label('演出速度'));
      for(let turn=0;turn<20&&!document.querySelector('.result');turn++){await click(button('この指示でターン開始'));if(mode==='skip')await click(button('演出をスキップ'));else await tick(buildTimeline(resolve.mock.results.at(-1)!.value.events).duration/(mode==='double'?2:1)+1);}
      expect(document.querySelector('.result')).toBeTruthy();outcomes.push(resolve.mock.results.at(-1)!.value.state);
    }
    expect(outcomes[1]).toEqual(outcomes[0]);expect(outcomes[2]).toEqual(outcomes[0]);
  });
});
