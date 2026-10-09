// @vitest-environment happy-dom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import App from './App';
import * as engine from './engine';
let root:Root;
const button=(text:string)=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.includes(text))!;
const label=(text:string)=>document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
async function click(element:HTMLElement){expect(element).toBeTruthy();await act(async()=>element.click());}
async function openTeam(){if(window.location.hash!=='#team')await click(label('編成'));}
async function openArena(){if(window.location.hash!=='#arena')await click(label('闘技場'));}
async function startBattle(){await openArena();await click(button('この編成で対戦する'));}
async function mount(){await act(async()=>root.render(<App/>));await openTeam();}
async function select(labelText:string,value:string){await act(async()=>{const el=document.querySelector<HTMLSelectElement>(`select[aria-label="${labelText}"]`)!;el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));});}
async function finish(){for(let i=0;i<20&&!document.querySelector('.result');i++){await click(button('この指示でターン開始'));await click(button('演出をスキップ'));}expect(document.querySelector('.result')).toBeTruthy();}
beforeEach(()=>{vi.useFakeTimers();localStorage.clear();window.history.replaceState(null,'','#home');document.body.innerHTML='<div id="test-root"></div>';Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);root=createRoot(document.getElementById('test-root')!);});
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks();vi.useRealTimers();});
describe('strategy workshop and fair rules',()=>{
  it('changes a leader without changing membership and applies both leaders on battle start',async()=>{
    const start=vi.spyOn(engine,'start');await mount();
    await click(label('2枠・バステトを入れ替える'));await click(label('バステトをリーダーにする'));
    expect(document.querySelector('.teamUnit')?.getAttribute('data-monster-id')).toBe('2');
    expect(document.querySelector('.leaderBanner')?.textContent).toContain('最大HP +12%');
    expect(document.querySelectorAll('.teamUnit')).toHaveLength(5);
    await startBattle();
    expect(start).toHaveBeenLastCalledWith([2,0,3,4,6],[1,5,8,10,6],20261008,{leaders:true});
    expect(document.querySelector('.commanderHp')?.textContent).toBe('HP 190/190');
    await click(button('作戦'));expect(document.querySelector('.enemyIntel')?.textContent).toContain('HP 280/280');
  });
  it('saves and restores three independent team slots including leader and rules',async()=>{
    await mount();await click(label('編成1に保存'));
    await click(label('2枠・バステトを入れ替える'));await click(label('バステトをリーダーにする'));
    await click(button('軽量戦'));await click(label('編成2に保存'));
    await click(label('編成1を呼び出す'));
    expect(document.querySelector('.teamUnit')?.getAttribute('data-monster-id')).toBe('0');
    expect(document.querySelector('.ruleTabs [aria-pressed=true]')?.textContent).toContain('標準戦');
    await click(label('編成2を呼び出す'));
    expect(document.querySelector('.teamUnit')?.getAttribute('data-monster-id')).toBe('2');
    expect(document.querySelector('.ruleTabs [aria-pressed=true]')?.textContent).toContain('軽量戦');
    expect(label('編成3を呼び出す').disabled).toBe(true);
    const saved=JSON.parse(localStorage.getItem('kanshu-team-slots-v1')!);
    expect(saved).toHaveLength(3);expect(saved[0].team[0]).toBe(0);expect(saved[1].team[0]).toBe(2);expect(saved[1].rule).toBe('light');
    await act(async()=>root.unmount());root=createRoot(document.getElementById('test-root')!);await mount();
    await click(label('編成2を呼び出す'));expect(document.querySelector('.ruleTabs [aria-pressed=true]')?.textContent).toContain('軽量戦');
  });
  it('keeps an over-budget team visible but prevents battle and saving until it is legal',async()=>{
    localStorage.setItem('kanshu-team',JSON.stringify([0,5,7,8,10]));await mount();
    await openArena();expect(button('この編成で対戦する').disabled).toBe(false);
    await openTeam();await click(button('軽量戦'));
    expect(document.querySelectorAll('.teamUnit')).toHaveLength(5);
    expect(document.querySelector('.budgetWarning')?.textContent).toContain('COST 2');
    expect(label('編成1に保存').disabled).toBe(true);
    await openArena();expect(button('この編成で対戦する').disabled).toBe(true);
    await click(button('標準戦'));expect(button('この編成で対戦する').disabled).toBe(false);
  });
  it('combines role, leader and cost filters and can reset them',async()=>{
    await mount();await click(button('モンスター図鑑を開く'));await click(button('味方を守る'));expect(document.querySelectorAll('.rosterItem')).toHaveLength(2);
    await select('コストで絞り込み','2');await select('リーダー効果で絞り込み','hp');
    expect(document.querySelectorAll('.rosterItem')).toHaveLength(1);expect(document.querySelector('.rosterItem')?.textContent).toContain('ナーガ');
    await click(label('絞り込みをリセット'));expect(document.querySelectorAll('.rosterItem')).toHaveLength(13);
    await click(button('毒解除'));expect(document.querySelectorAll('.rosterItem')).toHaveLength(2);
  });
  it('does not reveal an enemy party before starting, and lightweight opponents obey the selected budget',async()=>{
    const start=vi.spyOn(engine,'start');await mount();
    expect(document.querySelector('.enemyIntel')).toBeNull();expect(button('作戦')).toBeUndefined();
    await openArena();expect(document.querySelector('.ruleHint')?.textContent).toContain('相手の編成は対戦開始時に公開');
    await click(button('軽量戦'));await startBattle();
    expect(engine.cost(start.mock.calls[0][1])).toBeLessThanOrEqual(15);
    await click(button('作戦'));expect(document.querySelectorAll('.enemyIntel details')).toHaveLength(5);
    expect(document.querySelector('.tacticsModal')?.textContent).toContain('両軍COST上限15');
  });
  it('remains playable when saved-team storage reads or writes fail',async()=>{
    vi.spyOn(localStorage,'getItem').mockImplementation(()=>{throw Error('blocked');});
    vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw Error('blocked');});
    await mount();await click(label('編成1に保存'));
    expect(document.querySelector('.saveNotice')?.textContent).toContain('保存できません');
    expect(label('編成1を呼び出す').disabled).toBe(false);
    await startBattle();expect(document.querySelector('.battleMode')).toBeTruthy();
  });
});
describe('counterplay, reading opponents and practice',()=>{
  it('uses the same allied target panel for protect and cleanse and keeps four command buttons',async()=>{
    localStorage.setItem('kanshu-team',JSON.stringify([1,2,3,4,6]));const advance=vi.spyOn(engine,'advanceWithEvents');await mount();await startBattle();
    expect(document.querySelectorAll('.commandButtons button')).toHaveLength(4);
    await click(button('とくぎ'));expect(document.querySelectorAll('.skillButtons button')).toHaveLength(4);await click(button('守護の誓い'));
    expect(document.querySelectorAll('.allyTargets button')).toHaveLength(5);expect(document.querySelector('.enemyTargets')).toBeNull();
    await click(label('バステトを対象に選択'));
    await click(button('とくぎ'));await click(button('清めの鈴'));expect(document.querySelectorAll('.allyTargets button')).toHaveLength(5);
    await click(label('トロルを対象に選択'));await click(button('この指示でターン開始'));
    expect(advance.mock.calls[0][1]).toContainEqual({key:'a0',skill:3,target:'a1'});expect(advance.mock.calls[0][1]).toContainEqual({key:'a1',skill:3,target:'a0'});
  });
  it('explains estimated initiative without revealing enemy orders or pausing the 30-second deadline',async()=>{
    await mount();await startBattle();await click(button('作戦'));
    expect(document.querySelectorAll('.initiativeList li')).toHaveLength(5);
    expect(document.querySelector('.tacticsModal')?.textContent).toContain('敵の行動は未公開');
    await act(async()=>vi.advanceTimersByTime(10000));expect(document.querySelector('[role=timer]')?.textContent).toContain('20');
    await act(async()=>vi.advanceTimersByTime(20000));expect(document.querySelector('.tacticsModal')).toBeNull();expect(document.querySelector('.playingPanel')).toBeTruthy();
  });
  it('restarts the exact encounter and supports rebuilding before the same matchup',async()=>{
    const start=vi.spyOn(engine,'start');await mount();await startBattle();const original=structuredClone(start.mock.calls[0]);
    await finish();await click(button('同じ編成ですぐ再戦'));
    expect(start.mock.calls[1]).toEqual(original);expect(document.querySelector('[role=timer]')?.textContent).toContain('30');
    expect([...document.querySelectorAll('.commanderMp')].map(el=>el.textContent)).toEqual(start.mock.results[1].value.allies.map((unit:engine.Unit)=>`MP ${unit.monster.mp}/${unit.monster.mp}`));
    await finish();await click(button('編成を見直して再戦'));expect(document.querySelector('.practiceNotice')).toBeTruthy();
    await click(label('2枠・バステトを入れ替える'));await click(label('バステトをリーダーにする'));await openArena();await click(button('この編成で同じ相手に再戦'));
    expect(start.mock.calls[2][0][0]).toBe(2);expect(start.mock.calls[2].slice(1)).toEqual(original.slice(1));
    expect(document.querySelector('[role=timer]')?.textContent).toContain('30');
  });
  it('cancels controlled practice when the rule is changed',async()=>{
    const start=vi.spyOn(engine,'start');await mount();await startBattle();await finish();await click(button('編成を見直して再戦'));
    await click(button('軽量戦'));expect(document.querySelector('.practiceNotice')).toBeNull();await startBattle();
    expect(engine.cost(start.mock.calls[1][1])).toBeLessThanOrEqual(15);
  });
});
