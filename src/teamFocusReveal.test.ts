// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { revealFocusedTeamSlot, teamFocusScrollDelta } from './teamFocusReveal';
const rect = (top: number, height: number, left = 100, width = 50) => new DOMRect(left, top, width, height);
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('team slot focus reveal geometry', () => {
  it.each([
    ['320×432 native failure', rect(242.714,104),0,282,76.714],
    ['390×533 visible', rect(240,104),0,383,0],
    ['short landscape',rect(180,92),0,156,128],
    ['200% zoom / narrow short viewport',rect(250,104),0,52,276],
    ['visual viewport offset',rect(270,104),100,316,70],
    ['above visible band',rect(-30,104),0,282,-42],
    ['taller than uncovered area',rect(180,104),0,68,198],
  ])('%s uses measured uncovered space', (_name, slot, top, bottom, expected) => {
    const delta = teamFocusScrollDelta(slot as DOMRect, top as number, bottom as number);
    expect(delta).toBeCloseTo(expected as number, 3);
    const bounds = { top: (slot as DOMRect).top - delta, bottom: (slot as DOMRect).bottom - delta };
    const center = (bounds.top + bounds.bottom) / 2;
    expect(center).toBeGreaterThan(top as number);
    expect(center).toBeLessThan(bottom as number);
    if ((slot as DOMRect).height <= (bottom as number) - (top as number) - 24) {
      expect(bounds.top).toBeGreaterThanOrEqual((top as number) + 12);
      expect(bounds.bottom).toBeLessThanOrEqual((bottom as number) - 12);
    }
  });
  it('does not scroll absent geometry or an impossible fully covered viewport', () => {
    expect(teamFocusScrollDelta(rect(242,104),0,0)).toBe(0);
    expect(teamFocusScrollDelta(rect(0,0),0,280)).toBe(0);
  });
  it('measures both docks, accounts for safe-area/wrapping height, and scrolls only the page', () => {
    document.body.innerHTML='<div class="app"><div class="teamOverview"><button id="slot"></button></div><footer class="screenAction"></footer><nav class="mainNav"></nav><div class="candidateList"></div></div>';
    const slot = document.querySelector<HTMLButtonElement>('#slot')!;
    vi.spyOn(slot,'getBoundingClientRect').mockReturnValue(rect(242.714,104));
    vi.spyOn(document.querySelector('.screenAction')!,'getBoundingClientRect').mockReturnValue(rect(282,86,0,320));
    vi.spyOn(document.querySelector('.mainNav')!,'getBoundingClientRect').mockReturnValue(rect(368,64,0,320));
    vi.stubGlobal('visualViewport',{offsetTop:0,height:432});
    const scroll = vi.spyOn(window,'scrollBy').mockImplementation(() => {});
    const list = document.querySelector<HTMLElement>('.candidateList')!; list.scrollTop=193;
    revealFocusedTeamSlot(slot);
    expect(scroll).toHaveBeenCalledExactlyOnceWith({top:76.714,left:0,behavior:'instant'});
    expect(list.scrollTop).toBe(193);
  });
  it('does not scroll hidden or detached slots, or docks that do not overlap horizontally', () => {
    document.body.innerHTML='<div class="app"><div hidden><button id="slot"></button></div><footer class="screenAction"></footer></div>';
    const slot=document.querySelector<HTMLButtonElement>('#slot')!;
    vi.spyOn(slot,'getBoundingClientRect').mockReturnValue(rect(220,104));
    vi.spyOn(document.querySelector('.screenAction')!,'getBoundingClientRect').mockReturnValue(rect(250,110,400,100));
    vi.stubGlobal('visualViewport',{offsetTop:0,height:432});
    const scroll=vi.spyOn(window,'scrollBy').mockImplementation(() => {});
    revealFocusedTeamSlot(slot); expect(scroll).not.toHaveBeenCalled();
    slot.parentElement!.removeAttribute('hidden'); revealFocusedTeamSlot(slot); expect(scroll).not.toHaveBeenCalled();
    slot.remove(); revealFocusedTeamSlot(slot); expect(scroll).not.toHaveBeenCalled();
  });
});
