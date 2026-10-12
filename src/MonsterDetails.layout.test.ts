import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

// Cascade contracts and text budgets are not rendered browser geometry.
// Release QA still measures scrollHeight/clientHeight on the supported phones.
const sheets = Object.fromEntries(['style.css', 'catalog.css', 'monsterDetails.css'].map(file => [file, readFileSync(new URL(file, import.meta.url), 'utf8')]));
function styles(width: number, height: number, order: string[]) {
  const window = new Window({ width, height });
  const css = order.map(file => sheets[file]).join('\n').replaceAll('@media(', '@media (');
  window.document.body.innerHTML = `<style>${css}</style><div class="overlay profileOverlay"><section class="modal profileModal profileArtFirst profileTabbed">
    <div class="profileHeader"><strong>No. 006 · ケツァルコアトル</strong><button class="close">×</button></div>
    <div class="profileTabs" role="tablist"><button aria-selected="true">姿</button><button>物語</button></div>
    <div class="profileBody"><section class="profilePanel profileAppearance"><div class="profileHeading"><span class="heroIcon"><img class="monsterArt"></span><div class="profileIdentity"><h2>ケツァルコアトル</h2></div><div class="mythEntryHost"><div class="mythEntry"><button class="mythPlay">物語</button></div></div></div></section><section class="profilePanel" hidden><section class="profileStory"><div><span class="storyLabel">ひとこと <small>本作の創作</small></span><p class="monsterLore">長い日本語のひとこと</p></div><div><span class="storyLabel">伝承</span><p class="monsterOrigin">伝承の紹介</p><a class="loreSource">出典</a></div></section><div class="detailPages"><div class="detailPageContent"><div class="detailPage"><h3>能力</h3><p class="familyExplanation">効果</p><small class="detailSkillRule">特技</small><p class="skillLore">物語</p></div><div class="detailPage" hidden>次のページ</div></div><nav class="detailPager"><button>前へ</button><span>1 / 2</span><button>次へ</button></nav></div><div class="detailSkillReading" hidden>非表示の特技</div><div class="detailSkillPicker"><button>特技</button></div></section></div>
  </section></div><section class="modal tacticsModal"><button class="close">×</button></section>`;
  return Object.assign((selector: string) => window.getComputedStyle(window.document.querySelector(selector)!), { window });
}

describe.each([
  ['catalog.css', 'monsterDetails.css', 'style.css'],
  ['style.css', 'catalog.css', 'monsterDetails.css'],
  ['monsterDetails.css', 'style.css', 'catalog.css'],
])('compact profile cascade in %s + %s + %s order', (...order) => {
  it.each([[360, 640], [400, 606], [802, 394], [326, 432], [500, 758], [720, 900], [240, 320]])('keeps Close and tabs fixed, with an accessible fallback at %s×%s', (width, height) => {
    const style = styles(width, height, order);
    expect(style('.profileModal').display).toBe('flex');
    expect(style('.profileModal').flexDirection).toBe('column');
    expect(style('.profileModal').overflow).toBe('hidden');
    expect(style('.profileModal').padding).toBe('0px');
    expect(sheets['monsterDetails.css']).toContain('height:min(680px, calc(100dvh - 24px))');
    expect(style('.profileModal').maxHeight).toBe('100%');
    expect(style('.profileHeader').flexShrink).toBe('0');
    expect(style('.profileTabs').flexShrink).toBe('0');
    expect(style('.profileHeader .close').position).toBe('static');
    expect(style('.profileHeader .close').width).toBe('44px');
    expect(style('.profileHeader .close').height).toBe('44px');
    expect(parseFloat(style('.profileBody').minHeight)).toBe(0);
    expect(style('.profileBody').overflowY).toBe('auto');
    expect(style('.profileBody').getPropertyValue('overscroll-behavior')).toBe('contain');
    expect(style('.profileAppearance').display).toBe('flex');
    expect(style('.profileHeading').flexDirection).toBe('column');
    expect(style('.profileHeading').flexWrap).toBe('nowrap');
    expect(style('.profileHeading').overflow).toBe('visible');
    expect(style('.profileHeading').minHeight).toBe('min-content');
    expect(style('.profileHeading').flexShrink).toBe('0');
    expect(style('.profileAppearance').minHeight).toBe('min-content');
    expect(style('.heroIcon').flexShrink).toBe('0');
    expect(style('.heroIcon').minHeight).toBe('100px');
    expect(style('.heroIcon .monsterArt').objectFit).toBe('contain');
    expect(style('.heroIcon .monsterArt').position).toBe('absolute');
    expect(style('.profilePanel[hidden]').display).toBe('none');
    expect(style('.detailPage[hidden]').display).toBe('none');
    expect(style('.detailSkillReading[hidden]').display).toBe('none');
    for (const selector of ['.profileTabs button', '.detailPager button', '.detailSkillPicker button', '.mythPlay', '.loreSource']) expect(parseFloat(style(selector).minHeight)).toBeGreaterThanOrEqual(44);
    expect(style('.detailPageContent').overflow).not.toBe('hidden');
    style.window.document.querySelector('.heroIcon')!.innerHTML = '<span class="catalogArtFallback"><span>狐</span><small>画像を表示できません</small></span>';
    expect(style('.heroIcon').minHeight).toBe('min-content');
    expect(style('.heroIcon').flexBasis).toBe('auto');
    expect(style('.heroIcon').overflow).toBe('visible');
    for (const selector of ['.monsterLore', '.monsterOrigin', '.familyExplanation', '.detailSkillRule', '.skillLore']) {
      expect(parseFloat(style(selector).fontSize), selector).toBeGreaterThanOrEqual(14);
      expect(style(selector).overflowWrap).toBe('anywhere');
      expect(style(selector).whiteSpace).not.toBe('nowrap');
      expect(style(selector).textOverflow).not.toBe('ellipsis');
    }
    // Other modal readers and close positions retain their existing layouts.
    expect(style('.tacticsModal').overflow).toBe('auto');
    expect(style('.tacticsModal .close').position).toBe('absolute');
  });
});

function luminance(color: string) {
  const channels = color.startsWith('#') ? color.slice(1).match(/../g)!.map(value => parseInt(value, 16)) : color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const [r, g, b] = channels.map(value => { const x = value / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
  return .2126 * r + .7152 * g + .0722 * b;
}
function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
it('retains readable contrast for story and mechanical copy', () => {
  const style = styles(360, 640, ['catalog.css', 'monsterDetails.css', 'style.css']);
  const backgrounds = style('.profileModal').backgroundImage.match(/#[a-f\d]{6}/gi)!;
  for (const selector of ['.storyLabel', '.storyLabel small', '.monsterLore', '.monsterOrigin', '.loreSource', '.familyExplanation', '.detailSkillRule', '.skillLore']) for (const background of backgrounds) expect(contrast(style(selector).color, background), `${selector} on ${background}`).toBeGreaterThanOrEqual(4.5);
});
