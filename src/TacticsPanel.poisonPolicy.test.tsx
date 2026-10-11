// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import TacticsPanel from './TacticsPanel';
import { start, type StartOptions } from './engine';

let root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  document.body.innerHTML = '<div id="test-root"></div>';
  root = createRoot(document.getElementById('test-root')!);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; });

describe('poison counterplay and actual automatic-order policy', () => {
  it.each<[StartOptions, boolean]>([[{},true],[{reservePoison:true},true],[{reservePoison:false},false]])('describes the real policy %j', async (options, reserved) => {
    const battle = start([14,3,6,9,10], [29,1,8,30,31], 42, options);
    await act(async () => root.render(<TacticsPanel battle={battle} orders={{}} playing={false} rule="standard" onClose={() => {}} />));
    const text = document.body.textContent!;
    expect(text).toContain('物質系の反攻');
    expect(text).toContain('悪魔系のMP圧力');
    expect(text).toContain('玄武の障壁は自然系だけ');
    expect(text).toContain('手動で合法な指示へ変えられます');
    expect(text.includes('自動指示は同じターンの重複予定を控えます')).toBe(reserved);
    expect(text.includes('同じターンの他の毒の予定を考慮しません')).toBe(!reserved);
  });
});
