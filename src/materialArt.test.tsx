// @vitest-environment happy-dom
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {MATERIAL_ART} from './materialArt';
import {DRAGON_ART} from './dragonArt';
import MonsterArt,{CHARACTER_ART} from './MonsterArt';
import {monsters} from './engine';
const entries=Object.entries(MATERIAL_ART);
describe('original material SVG registry',()=>{
  it.each(entries)('keeps %s full figure and portrait independently authored, static and self-contained',(id,art)=>{
    for(const [source,url,width] of [[art.full,art.artUrl,280],[art.portrait,art.portraitUrl,140]] as const) {
      expect(decodeURIComponent(url.split(',')[1])).toBe(source);
      const doc=new DOMParser().parseFromString(source,'image/svg+xml');
      expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.documentElement.getAttribute('width')).toBe(String(width));
      expect(doc.querySelectorAll('path,circle,ellipse').length).toBeGreaterThan(18);
      expect(doc.querySelectorAll('image,text,script,animate,animateTransform,set,foreignObject,rect')).toHaveLength(0);
      expect(source).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)|@font-face|\bhref\s*=/);
      const ids=[...doc.querySelectorAll('[id]')].map(node=>node.id);
      expect(new Set(ids).size).toBe(ids.length);
      for(const ref of source.matchAll(/url\(#([\w-]+)\)/g)) expect(ids).toContain(ref[1]);
    }
    const full=new DOMParser().parseFromString(art.full,'image/svg+xml');
    const portrait=new DOMParser().parseFromString(art.portrait,'image/svg+xml');
    expect(full.documentElement.getAttribute('viewBox')).toBe('0 0 280 210');
    expect(portrait.documentElement.getAttribute('viewBox')).not.toBe('0 0 280 210');
    expect(portrait.documentElement.innerHTML).toBe(full.documentElement.innerHTML);
    const monster=monsters.find(m=>m.id===Number(id))!;
    expect(CHARACTER_ART[monster.id]).toBe(art);
    for(const crop of [true,false]) {
      const markup=renderToStaticMarkup(<MonsterArt monster={monster} portrait={crop}/>);
      const img=new DOMParser().parseFromString(markup,'text/html').querySelector('img')!;
      expect(img.getAttribute('src')).toBe(crop?art.portraitUrl:art.artUrl);
      expect(img.getAttribute('draggable')).toBe('false');
      expect(img.getAttribute('style')).toBeNull();
      expect(img.className).not.toMatch(/motion|animat/);
    }
  });
  it('has five unrelated silhouettes and exclusive gradient namespaces',()=>{
    const paths=entries.map(([,art])=>[...new DOMParser().parseFromString(art.full,'image/svg+xml').querySelectorAll('path')].map(p=>p.getAttribute('d')).join('|'));
    expect(new Set(paths).size).toBe(5);
    const ids=entries.flatMap(([,art])=>[...new DOMParser().parseFromString(art.full,'image/svg+xml').querySelectorAll('[id]')].map(node=>node.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(MATERIAL_ART[19].full).toContain('hollow ring torso');
    expect(MATERIAL_ART[20].full).toContain('no foot, tongue');
    expect(MATERIAL_ART[21].full).toContain('No face, arms or legs');
    expect(MATERIAL_ART[22].full).toContain('exactly three wheels');
    expect(MATERIAL_ART[23].full).toContain('far pair of legs');
  });
  it('preserves the seven earlier drawings and every earlier emoji fallback',()=>{
    expect([12,13,14,15,16,17,18].map(id=>CHARACTER_ART[id].spriteWidth)).toEqual([110,99,121,127,118,125,116]);
    for(const [id,art] of Object.entries(DRAGON_ART)) expect(CHARACTER_ART[Number(id)]).toBe(art);
    for(const monster of monsters.filter(m=>m.id<12)) expect(renderToStaticMarkup(<MonsterArt monster={monster}/>)).toBe(monster.icon);
  });
});
