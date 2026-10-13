// @vitest-environment happy-dom
import React, {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import App from './App';
import * as engine from './engine';

let root:Root;
const button=(text:string)=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent?.includes(text))!;
const label=(text:string)=>document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const actor=(index:number)=>document.querySelectorAll<HTMLButtonElement>('.commander')[index];
const command=(text:string)=>[...document.querySelectorAll<HTMLButtonElement>('.commandButtons button')].find(node=>node.querySelector('strong')?.textContent===text)!;
async function click(node:HTMLElement){expect(node).toBeTruthy();await act(async()=>{node.focus();node.click();});}
async function begin(){
  const team=[2,0,3,4,6];localStorage.setItem('kanshu-workshop-v1',JSON.stringify({team,rule:'standard'}));
  const realStart=engine.start,realAdvance=engine.advanceWithEvents;
  let state!:engine.State;
  vi.spyOn(engine,'start').mockImplementationOnce(()=>{
    state=realStart(team,[1,5,8,10,6],42,{leaders:true});
    for(const unit of [...state.allies,...state.enemies]) {unit.monster={...unit.monster,hp:500,mp:60,atk:20};unit.hp=500;unit.mp=60;delete unit.rally;delete unit.ward;}
    state.allies[0].monster={...state.allies[0].monster,atk:0,speed:10,skills:[{name:'試験強打',kind:'hit',power:100,priority:0,mpCost:8},{name:'試験回復',kind:'heal',power:160,priority:0,mpCost:8}]};
    state.enemies[0].monster={...state.enemies[0].monster,atk:0,speed:100,skills:[{name:'先行する強打',kind:'hit',power:440,priority:0,mpCost:0}]};
    return state;
  });
  const advance=vi.spyOn(engine,'advanceWithEvents').mockImplementation((state,orders)=>realAdvance(state,orders,{enemyOrders:state.enemies.map((unit,index)=>({key:unit.key,skill:index===0?0:engine.DEFEND,...(index===0?{target:'a1'}:{})}))}));
  await act(async()=>root.render(<App/>));await click(label('闘技場'));await click(button('この編成で対戦する'));
  return {state,advance};
}
beforeEach(()=>{
  vi.useFakeTimers();localStorage.clear();window.history.replaceState(null,'','#home');document.body.innerHTML='<div id="test-root"></div>';
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
  vi.spyOn(HTMLElement.prototype,'scrollIntoView').mockImplementation(()=>{});root=createRoot(document.getElementById('test-root')!);
});
afterEach(async()=>{await act(async()=>root.unmount());vi.restoreAllMocks();vi.useRealTimers();});

describe('automatic command UI defers the actual choice to the authoritative action',()=>{
  it('stores no skill, target or MP reservation and shows an honest undecided tactics entry',async()=>{
    const {state,advance}=await begin();const initial=JSON.stringify(state);
    expect(engine.chooseAutomaticOrder(state,'a0').skill).toBe(0);
    await click(command('おまかせ'));expect(document.activeElement).toBe(actor(1));await click(actor(0));
    expect(document.querySelector('.committedOrder')?.textContent).toContain('おまかせ · 行動時に判断');
    expect(document.querySelector('.committedOrder')?.textContent).not.toMatch(/試験強打|試験回復|→/);
    await click(button('作戦'));const preview=[...document.querySelectorAll('.initiativeList li')].find(node=>node.textContent?.includes('バステト'))!;
    expect(preview.textContent).toContain('おまかせ・行動時に判断');expect(preview.textContent).toContain('特技・対象未決定');
    expect(JSON.stringify(state)).toBe(initial);expect(advance).not.toHaveBeenCalled();
  });
  it.each(['manual','timeout','cancel-replacement'] as const)('resolves the saved auto intent to a newly needed heal via %s',async route=>{
    const {state,advance}=await begin();await click(command('おまかせ'));
    for(let i=1;i<5;i++){await click(actor(i));await click(command('ぼうぎょ'));}
    if(route==='cancel-replacement'){
      await click(actor(0));await click(command('とくぎ'));await click(button('試験回復'));
      expect(document.querySelectorAll('.allyRecipient')).toHaveLength(5);
      await act(async()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
      await click(button('コマンドに戻る'));
      expect(document.querySelector('.committedOrder')?.textContent).toContain('おまかせ · 行動時に判断');
    }
    expect(state.allies[0].mp).toBe(60);
    if(route==='timeout')await act(async()=>vi.advanceTimersByTime(30000));
    else {const start=document.querySelector<HTMLButtonElement>('.turnStart')!;await act(async()=>{start.click();start.click();});}
    expect(advance).toHaveBeenCalledTimes(1);expect(advance.mock.calls[0][1]).toEqual([{key:'a0',skill:engine.AUTO},...state.allies.slice(1).map(unit=>({key:unit.key,skill:engine.DEFEND}))]);
    const result=advance.mock.results[0].value as ReturnType<typeof engine.advanceWithEvents>;
    expect(result.state.history!.at(-1)!.orders.find(order=>order.key==='a0')).toMatchObject({skill:1,target:'a1',source:'automatic',decisionPriority:0,accepted:true});
    const heal=result.events.find(event=>event.kind==='heal'&&event.actor==='a0');expect(heal).toMatchObject({target:'a1'});expect(heal!.amount).toBeGreaterThan(0);
    expect(result.state.allies[0].mp).toBe(52);expect(state.allies[0].mp).toBe(60);
    await click(button('演出をスキップ'));expect(document.querySelectorAll('.commander.ordered')).toHaveLength(0);
    await act(async()=>vi.advanceTimersByTime(1000));expect(advance).toHaveBeenCalledTimes(1);
  });
});
