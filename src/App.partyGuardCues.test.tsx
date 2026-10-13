// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as engine from './engine';
import { applyBattleEvents, buildTimeline } from './playback';
import { PARTY_GUARD_MS } from './partyGuardCues';

// DOM/event timing assertions only. Canvas, native CSS appearance, reduced-motion
// pixels, viewport fitting and animation readability remain separate browser gates.
const team = [1, 2, 3, 4, 6];
let root: Root;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.includes(text))!;
const label = (text: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)!;
const actor = (slot: number) => document.querySelectorAll<HTMLButtonElement>('.commander')[slot];
const card = (key: string) => document.querySelector(`#party-hp-${key}`)!.parentElement!;
const shields = () => [...document.querySelectorAll<SVGElement>('.partyGuardCue')];
const shield = (key: string) => card(key).querySelector<SVGElement>('.partyGuardCue');
const status = (key: string) => document.querySelector(`#party-status-${key}`)?.textContent;
const resources = () => [...document.querySelectorAll('.commanderHp,.commanderMp')].map(node => node.textContent);
const saved = () => Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)!).sort().map(key => [key, localStorage.getItem(key)]);
async function click(node: HTMLElement) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function tick(ms: number) { await act(async () => vi.advanceTimersByTime(ms)); }
async function special(slot: number, name: string, target?: number) {
  await click(actor(slot)); await click(button('とくぎ')); await click(button(name));
  if (target !== undefined) await click(actor(target));
}
async function begin(options: { team?: number[]; enemies?: number[]; mutate?: (state: engine.State) => void; events?: engine.BattleEvent[]; winner?: engine.State['winner']; enemyOrders?: (state: engine.State) => engine.Order[] } = {}) {
  const party = options.team ?? team;
  localStorage.setItem('kanshu-workshop-v1', JSON.stringify({ team: party, rule: 'standard' }));
  const state = engine.start(party, options.enemies ?? party, 20261013, { leaders: true }); options.mutate?.(state);
  const start = vi.spyOn(engine, 'start').mockReturnValueOnce(state);
  const resolve = engine.advanceWithEvents;
  const advance = vi.spyOn(engine, 'advanceWithEvents').mockImplementation((current, orders) => {
    if (options.events) return {
      state: { ...applyBattleEvents(current, options.events), turn: current.turn + 1, ...(options.winner ? { winner: options.winner } : {}) },
      events: options.events,
    };
    return resolve(current, orders, { enemyOrders: options.enemyOrders?.(current) ?? current.enemies.map(unit => ({ key: unit.key, skill: engine.DEFEND })) });
  });
  await act(async () => root.render(<App />));
  await click(label('闘技場')); await click(button('この編成で対戦する'));
  return { state, start, advance };
}
async function play(advance: Awaited<ReturnType<typeof begin>>['advance'], speed = 1) {
  if (speed === 2) await click(label('演出速度'));
  await click(button('この指示でターン開始'));
  const result = advance.mock.results.at(-1)!.value as ReturnType<typeof engine.advanceWithEvents>;
  return { result, timeline: buildTimeline(result.events) };
}
async function queueOtherAttacks(except: number) {
  for (let slot = 0; slot < 5; slot++) {
    if (slot === except || actor(slot).disabled) continue;
    await click(actor(slot)); await click(button('たたかう'));
    await click(document.querySelector<HTMLButtonElement>('.targetButtons button')!);
  }
}
async function expectNoOrdinaryCue(timeline: ReturnType<typeof buildTimeline>) {
  let elapsed = 0;
  for (const cue of timeline.cues) { await tick(cue.at - elapsed); elapsed = cue.at; expect(shields()).toHaveLength(0); }
  await tick(timeline.duration - elapsed); expect(shields()).toHaveLength(0);
}
const ordinary = (target = 'a2', caster = 'a0'): engine.BattleEvent[] => [
  { kind: 'cast', actor: caster, target, skill: '守護の誓い', effect: 'protect' },
  { kind: 'guard', actor: caster, target, guard: true },
];

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '#home');
  document.body.innerHTML = '<div id="test-root"></div>';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  vi.spyOn(Math, 'random').mockReturnValue(1 / 0x100000000);
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('real ordinary allied guard event playback', () => {
  it.each([1, 2].flatMap(speed => [
    { speed, skill: 'ぼうぎょ', caster: 0, target: 0 },
    { speed, skill: '鉄壁の構え', caster: 1, target: 1 },
    { speed, skill: '守護の誓い', caster: 0, target: 2 },
  ]))('lands $skill on the exact allied recipient only at impact, at ×$speed', async scenario => {
    const { state, advance } = await begin();
    const beforeState = JSON.stringify(state), beforeSave = saved();
    const originalCard = card(`a${scenario.target}`), originalPortrait = originalCard.querySelector('.commanderIcon');
    if (scenario.skill === 'ぼうぎょ') { await click(actor(scenario.caster)); await click(button('ぼうぎょ')); }
    else await special(scenario.caster, scenario.skill, scenario.skill === '守護の誓い' ? scenario.target : undefined);
    expect(shields()).toHaveLength(0); expect(JSON.stringify(state)).toBe(beforeState);
    const { result, timeline } = await play(advance, scenario.speed);
    const eventSnapshot = JSON.stringify(result.events), resultSnapshot = JSON.stringify(result.state);
    const impact = timeline.cues.find(cue => cue.impacts.some(event => event.kind === 'guard' && event.actor === `a${scenario.caster}` && event.target === `a${scenario.target}`))!;
    const cast = timeline.cues.find(cue => !cue.impacts.length && cue.cast?.actor === `a${scenario.caster}`)!;
    expect(impact).toBeTruthy(); expect(impact.cast?.skill).toBe(scenario.skill);
    await tick(cast.at / scenario.speed);
    expect(shield(`a${scenario.target}`)).toBeNull(); expect(actor(scenario.caster).classList.contains('acting')).toBe(true);
    const beforeResources = resources();
    await tick((impact.at - cast.at) / scenario.speed - 1); expect(shield(`a${scenario.target}`)).toBeNull();
    await tick(1);
    expect(shields()).toHaveLength(1);
    const cue = shield(`a${scenario.target}`)!;
    expect(cue).toBeTruthy(); expect(cue.dataset.guardActor).toBe(`a${scenario.caster}`); expect(cue.dataset.guardTarget).toBe(`a${scenario.target}`);
    expect(cue.getAttribute('aria-hidden')).toBe('true'); expect(cue.style.animationDuration).toBe(`${640 / scenario.speed}ms`);
    expect(cue.closest('.commanderVisual')).toBe(originalCard.querySelector('.commanderVisual'));
    expect(cue.querySelector('path')).not.toBeNull(); expect(originalCard.querySelector('.commanderIcon')).toBe(originalPortrait);
    expect(document.querySelector('.battleStage .partyGuardCue')).toBeNull();
    expect(status(`a${scenario.target}`)).toContain('守り:今T'); expect(resources()).toEqual(beforeResources);
    if (scenario.caster !== scenario.target) { expect(shield(`a${scenario.caster}`)).toBeNull(); expect(actor(scenario.target).classList.contains('acting')).toBe(false); }
    await tick(PARTY_GUARD_MS / scenario.speed - 1); expect(shield(`a${scenario.target}`)).toBe(cue);
    await tick(1); expect(shields()).toHaveLength(0); expect(status(`a${scenario.target}`)).toContain('守り:今T');
    expect(JSON.stringify(result.events)).toBe(eventSnapshot); expect(JSON.stringify(result.state)).toBe(resultSnapshot); expect(saved()).toEqual(beforeSave);
    await click(button('演出をスキップ')); expect(shields()).toHaveLength(0);
    expect(resources()).toEqual(result.state.allies.flatMap(unit => [`HP ${unit.hp}/${unit.monster.hp}`, `MP ${unit.mp}/${unit.monster.mp}`]));
  });

  it('keeps original recipient slot 3 when slot 2 is dead and the same creature is present among enemies', async () => {
    const { advance } = await begin({ mutate: state => { state.allies[1].hp = 0; state.allies[2].ward = 2; } });
    await special(0, '守護の誓い', 2); const { timeline } = await play(advance);
    const impact = timeline.cues.find(cue => cue.impacts.some(event => event.kind === 'guard' && event.actor === 'a0' && event.target === 'a2'))!;
    await tick(impact.at);
    expect(shields()).toHaveLength(1); expect(shields()[0].closest('.commander')).toBe(actor(2));
    expect(actor(1).classList.contains('fallen')).toBe(true); expect(shield('a1')).toBeNull();
    expect(shields()[0].dataset.guardTarget).toBe('a2'); expect(status('a2')).toContain('自然障壁:残2T');
    expect(status('a2')).toContain('守り:今T'); expect(document.querySelector('.battleStage .partyGuardCue')).toBeNull();
  });

  it('allows repeated ordinary guarding on an already guarded and warded recipient without stacking cues or extending state', async () => {
    const { advance } = await begin({ mutate: state => { state.allies[1].ward = 2; } });
    await special(0, '守護の誓い', 1); await special(1, '鉄壁の構え');
    const { result, timeline } = await play(advance);
    const impacts = timeline.cues.filter(cue => cue.impacts.some(event => event.kind === 'guard' && event.target === 'a1' && event.effect === undefined));
    expect(impacts).toHaveLength(2);
    await tick(impacts[0].at); const firstId = shield('a1')!.dataset.guardCue;
    expect(status('a1')).toContain('守り:今T'); expect(status('a1')).toContain('自然障壁:残2T');
    await tick(640); expect(shield('a1')).toBeNull();
    await tick(impacts[1].at - impacts[0].at - 640);
    expect(shields()).toHaveLength(1); expect(shield('a1')!.dataset.guardCue).not.toBe(firstId);
    expect(shield('a1')!.style.animationDuration).toBe('640ms');
    expect(status('a1')?.match(/守り:今T/g)).toHaveLength(1);
    await tick(timeline.duration - impacts[1].at);
    expect(shields()).toHaveLength(0); expect(status('a1')).not.toContain('守り:今T');
    expect(result.state.allies[1].guard).toBe(false); expect(result.state.allies[1].ward).toBe(1);
  });

  it.each(['cleanse', 'extraordinary guard'] as const)('keeps actual engine %s events outside the ordinary guard effect', async kind => {
    const { advance } = await begin({ team: kind === 'cleanse' ? team : [36, 12, 2, 30, 26], mutate: state => { state.allies[2].hp = 50; state.allies[2].poison = 2; } });
    const caster = kind === 'cleanse' ? 1 : 0;
    await queueOtherAttacks(caster);
    await special(caster, kind === 'cleanse' ? '清めの鈴' : '合流の扉', kind === 'cleanse' ? 2 : undefined);
    const { result, timeline } = await play(advance);
    if (kind === 'cleanse') expect(result.events).toContainEqual(expect.objectContaining({ kind: 'cleanse', actor: 'a1', target: 'a2', poison: 0 }));
    else expect(result.events.filter(event => event.kind === 'guard' && event.effect === 'extraordinary-response-guard')).toHaveLength(5);
    expect(result.events.some(event => event.kind === 'guard' && event.actor?.startsWith('a') && event.effect === undefined)).toBe(false);
    await expectNoOrdinaryCue(timeline);
  });

  it.each(['killed before guarding', 'MP-drained protect fallback'] as const)('does not show the queued guard after the actor is %s', async failure => {
    const caster = failure === 'killed before guarding' ? 1 : 0;
    const { advance } = await begin({
      enemies: [29, 1, 8, 30, 31],
      mutate: state => {
        // Put the real enemy MP-drain action ahead of protection in this isolated
        // fixture to exercise cancellation/fallback; production priorities stay unchanged.
        state.enemies[0].monster = { ...state.enemies[0].monster, skills: [{ ...state.enemies[0].monster.skills[0]!, priority: 4 }, state.enemies[0].monster.skills[1]!, state.enemies[0].monster.skills[2]!] };
        if (failure === 'killed before guarding') state.allies[caster].hp = 1;
        else state.allies[caster].mp = 10;
      },
      enemyOrders: state => state.enemies.map((unit, slot) => slot === 0 ? { key: unit.key, skill: 0, target: `a${caster}` } : { key: unit.key, skill: engine.DEFEND }),
    });
    await queueOtherAttacks(caster);
    await special(caster, failure === 'killed before guarding' ? '鉄壁の構え' : '守護の誓い', failure === 'killed before guarding' ? undefined : 2);
    const { result, timeline } = await play(advance);
    if (failure === 'killed before guarding') expect(result.events).toContainEqual(expect.objectContaining({ kind: 'defeat', target: 'a1' }));
    else expect(result.events).toContainEqual(expect.objectContaining({ kind: 'fallback', actor: 'a0' }));
    expect(result.events.some(event => event.kind === 'guard' && event.actor === `a${caster}`)).toBe(false);
    await expectNoOrdinaryCue(timeline);
  });

  it('does not create a cue while selecting/cancelling protect, or from an existing guard/ward state alone', async () => {
    const { advance } = await begin({ mutate: state => { state.allies[2].guard = true; state.allies[2].ward = 2; } });
    await special(0, '守護の誓い'); expect(shields()).toHaveLength(0);
    await click(button('特技に戻る')); expect(shields()).toHaveLength(0);
    await tick(5000); expect(shields()).toHaveLength(0); expect(advance).not.toHaveBeenCalled();
    expect(status('a2')).toContain('守り:今T'); expect(status('a2')).toContain('自然障壁:残2T');
  });
});

describe('guard cue negative events and independent lifetime', () => {
  it.each([
    { name: 'heal', events: [{ kind: 'cast', actor: 'a0', target: 'a2', skill: '生命の雫', effect: 'heal' }, { kind: 'heal', actor: 'a0', target: 'a2', amount: 12, hp: 100 }] },
    { name: 'cleanse', events: [{ kind: 'cast', actor: 'a0', target: 'a2', skill: '清めの鈴', effect: 'cleanse' }, { kind: 'cleanse', actor: 'a0', target: 'a2', poison: 0 }] },
    { name: 'poison', events: [{ kind: 'cast', actor: 'e0', target: 'a2', skill: '毒霧', effect: 'poison' }, { kind: 'poison', actor: 'e0', target: 'a2', poison: 3 }] },
    { name: 'ordinary enemy guard', events: ordinary('e2', 'e0') },
    { name: 'guard expiry', events: [{ kind: 'expire', target: 'a2', guard: false, effect: 'guard', phase: 'turn-start' }] },
    { name: 'unresolved guard cast', events: [{ kind: 'cast', actor: 'a0', target: 'a2', skill: '守護の誓い', effect: 'protect' }] },
    { name: 'tagged extraordinary response', events: [{ kind: 'cast', actor: 'a0', scope: 'all', targets: ['a0', 'a2'], skill: '合流の扉', effect: 'responseGuard' }, { kind: 'guard', actor: 'a0', target: 'a0', guard: true, effect: 'extraordinary-response-guard' }, { kind: 'guard', actor: 'a0', target: 'a2', guard: true, effect: 'extraordinary-response-guard' }] },
  ] satisfies { name: string; events: engine.BattleEvent[] }[])('does not manufacture ordinary shielding for $name', async ({ events, name }) => {
    const { advance } = await begin({ events }); const { timeline } = await play(advance);
    let elapsed = 0;
    for (const cue of timeline.cues) {
      await tick(cue.at - elapsed); elapsed = cue.at; expect(shields()).toHaveLength(0);
      if (name === 'tagged extraordinary response' && cue.impacts.length) expect(document.querySelectorAll('.partyResponse')).toHaveLength(2);
    }
    await tick(timeline.duration - elapsed); expect(shields()).toHaveLength(0);
  });

  it.each([1, 2])('retains HP/MP numbers and their own expiration when guarding or the next hit arrives at ×%s', async speed => {
    const events: engine.BattleEvent[] = [
      { kind: 'cast', actor: 'a0', target: 'a2', scope: 'random', hits: 2, hitTargets: ['a2', 'a2'], skill: 'timing fixture' },
      { kind: 'damage', actor: 'e0', target: 'a2', amount: 11, hp: 100, hitIndex: 0 },
      { kind: 'resource-loss', actor: 'e0', target: 'a2', amount: 3, mp: 20, hitIndex: 0 },
      { kind: 'guard', actor: 'a0', target: 'a2', guard: true, hitIndex: 1 },
      { kind: 'cast', actor: 'e0', target: 'a2', skill: '通常攻撃', effect: 'hit' },
      { kind: 'damage', actor: 'e0', target: 'a2', amount: 9, hp: 91 },
    ];
    const { advance } = await begin({ events }); const { timeline } = await play(advance, speed);
    const hits = timeline.cues.filter(cue => cue.impacts.length);
    await tick(hits[0].at / speed);
    const numbers = [...card('a2').querySelectorAll('.partyImpact')]; expect(numbers.map(node => node.textContent)).toEqual(['−11', 'MP−3']);
    const ids = numbers.map(node => node.getAttribute('data-number-id'));
    await tick((hits[1].at - hits[0].at) / speed);
    expect(shield('a2')).not.toBeNull(); expect([...card('a2').querySelectorAll('.partyImpact')]).toEqual(numbers);
    expect(numbers.map(node => node.getAttribute('data-number-id'))).toEqual(ids);
    expect(card('a2').querySelector('.commanderHp')?.textContent).toContain('100/');
    await tick((hits[2].at - hits[1].at) / speed);
    expect(shield('a2')).toBeNull(); expect(card('a2').querySelector('.partyImpact')?.textContent).toBe('−9');
    expect(card('a2').querySelector('.commanderHp')?.textContent).toContain('91/');
  });

  it('clears the short guard cue on a later impact while showing that impact’s HP and MP numbers', async () => {
    const events: engine.BattleEvent[] = [
      { kind: 'cast', actor: 'a0', target: 'a2', scope: 'random', hits: 2, hitTargets: ['a2', 'a2'], skill: 'timing fixture' },
      { kind: 'guard', actor: 'a0', target: 'a2', guard: true, hitIndex: 0 },
      { kind: 'damage', actor: 'e0', target: 'a2', amount: 11, hp: 100, hitIndex: 1 },
      { kind: 'resource-loss', actor: 'e0', target: 'a2', amount: 3, mp: 20, hitIndex: 1 },
    ];
    const { advance } = await begin({ events }); await play(advance);
    await tick(800); expect(shield('a2')).not.toBeNull();
    await tick(180); expect(shield('a2')).toBeNull();
    const numbers = [...card('a2').querySelectorAll('.partyImpact')]; expect(numbers.map(node => node.textContent)).toEqual(['−11', 'MP−3']);
    await tick(460); expect([...card('a2').querySelectorAll('.partyImpact')]).toEqual(numbers);
    expect(status('a2')).toContain('守り:今T');
  });

  it.each([1, 2])('does not replay a guard whose scheduled impact window passed in the background at ×%s', async speed => {
    const { advance } = await begin({ events: ordinary() }); await play(advance, speed);
    vi.setSystemTime(Date.now() + 2000 / speed);
    await tick(800 / speed);
    expect(shields()).toHaveLength(0); expect(status('a2')).toContain('守り:今T');
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it.each([1, 2])('starts a delayed impact partway through its remaining visual window at ×%s', async speed => {
    const { advance } = await begin({ events: ordinary() }); await play(advance, speed);
    vi.setSystemTime(Date.now() + 100 / speed);
    await tick(800 / speed);
    expect(shield('a2')?.style.animationDelay).toBe(`${-100 / speed}ms`);
    await tick((640 - 100) / speed - 1); expect(shield('a2')).not.toBeNull();
    await tick(1); expect(shields()).toHaveLength(0); expect(status('a2')).toContain('守り:今T');
  });

  it.each(['focus', 'visibilitychange'] as const)('prunes an already-visible expired guard on %s without advancing authoritative state', async eventName => {
    const events = ordinary(); const { advance } = await begin({ events }); const { result } = await play(advance);
    await tick(800); expect(shield('a2')).not.toBeNull();
    const before = resources(), resultBefore = JSON.stringify(result), eventBefore = JSON.stringify(events);
    vi.setSystemTime(Date.now() + 10000);
    await act(async () => (eventName === 'focus' ? window : document).dispatchEvent(new Event(eventName)));
    expect(shields()).toHaveLength(0); expect(resources()).toEqual(before); expect(status('a2')).toContain('守り:今T');
    expect(JSON.stringify(result)).toBe(resultBefore); expect(JSON.stringify(events)).toBe(eventBefore); expect(advance).toHaveBeenCalledTimes(1);
  });
});

describe('guard cue interruption and replay cleanup', () => {
  it.each(['before impact', 'during cue'] as const)('clears skip %s and cannot leak into the next turn', async phase => {
    const { advance } = await begin({ events: ordinary() }); await play(advance);
    await tick(phase === 'during cue' ? 800 : 799);
    expect(shields()).toHaveLength(phase === 'during cue' ? 1 : 0);
    await click(button('演出をスキップ')); expect(shields()).toHaveLength(0);
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 2');
    await tick(1000); expect(shields()).toHaveLength(0);
    await click(button('この指示でターン開始')); await tick(799); expect(shields()).toHaveLength(0);
    await tick(1); expect(shields()).toHaveLength(1); expect(advance).toHaveBeenCalledTimes(2);
  });

  it('keeps playback progressing while a navigation prompt is cancelled, without replaying guard arrival', async () => {
    const { advance } = await begin({ events: ordinary() }); await play(advance); await tick(800);
    const id = shield('a2')!.dataset.guardCue;
    await click(label('闘技場に戻る')); await tick(300); await click(button('対戦を続ける'));
    expect(shield('a2')?.dataset.guardCue).toBe(id);
    await tick(340); expect(shields()).toHaveLength(0); expect(advance).toHaveBeenCalledTimes(1);
  });

  it.each(['before impact', 'during cue'] as const)('clears abandoned %s playback, and old timers cannot change a new match', async phase => {
    const { advance } = await begin({ events: ordinary() }); await play(advance); await tick(phase === 'during cue' ? 800 : 799);
    await click(label('闘技場に戻る')); await click(button('中断して移動'));
    expect(window.location.hash).toBe('#arena'); expect(shields()).toHaveLength(0);
    await click(button('この編成で対戦する')); const newResources = resources();
    await tick(5000); expect(shields()).toHaveLength(0); expect(resources()).toEqual(newResources);
    expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1'); expect(advance).toHaveBeenCalledTimes(1);
  });

  it.each(['natural', 'skip'] as const)('removes the effect on %s result return and the next lobby battle', async route => {
    const { advance } = await begin({ events: ordinary(), winner: 'win' }); const { timeline } = await play(advance);
    await tick(800); expect(shields()).toHaveLength(1);
    if (route === 'skip') await click(button('演出をスキップ')); else await tick(timeline.duration - 800);
    expect(window.location.hash).toBe('#arena'); expect(document.querySelector('.result')).not.toBeNull(); expect(shields()).toHaveLength(0);
    await click(button('この編成で対戦する')); await tick(5000);
    expect(shields()).toHaveLength(0); expect(document.querySelector('.battleTop')?.textContent).toContain('TURN 1');
  });

  it('cancels pending cue-expiry and playback callbacks on unmount', async () => {
    const { advance } = await begin({ events: ordinary() }); await play(advance); await tick(800);
    expect(shields()).toHaveLength(1);
    await act(async () => root.unmount()); expect(shields()).toHaveLength(0);
    await tick(5000);
    await act(async () => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    expect(shields()).toHaveLength(0); expect(advance).toHaveBeenCalledTimes(1);
    root = createRoot(document.getElementById('test-root')!);
  });
});
