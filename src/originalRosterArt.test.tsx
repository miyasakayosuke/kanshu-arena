// @vitest-environment happy-dom
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import MonsterArt,{CHARACTER_ART} from './MonsterArt';
import {monsters} from './engine';
import {BEAST_ORIGINAL_ART} from './beastOriginalArt';
import {NATURE_ORIGINAL_ART} from './natureOriginalArt';
import {MIXED_ORIGINAL_ART} from './mixedOriginalArt';

const original = {...BEAST_ORIGINAL_ART,...NATURE_ORIGINAL_ART,...MIXED_ORIGINAL_ART};
const parse=(source:string)=>new DOMParser().parseFromString(source,'image/svg+xml');
describe('completed original roster art',()=>{
  it('covers all 37 IDs exactly and replaces precisely the twelve initial glyphs',()=>{
    expect(Object.keys(CHARACTER_ART).map(Number).sort((a,b)=>a-b)).toEqual(monsters.map(monster=>monster.id));
    expect(Object.keys(original).map(Number).sort((a,b)=>a-b)).toEqual(Array.from({length:12},(_,id)=>id));
  });
  it.each(monsters)('$name has static full-body and portrait images everywhere',monster=>{
    const art=CHARACTER_ART[monster.id];
    for(const portrait of [false,true]){
      const html=renderToStaticMarkup(<MonsterArt monster={monster} portrait={portrait}/>);
      const document=new DOMParser().parseFromString(html,'text/html');
      const img=document.querySelector('img')!;
      expect(img).not.toBeNull();expect(document.querySelectorAll('img')).toHaveLength(1);
      expect(img.getAttribute('src')).toBe(portrait?art.portraitUrl:art.artUrl);
      expect(img.getAttribute('draggable')).toBe('false');expect(img.getAttribute('style')).toBeNull();
      expect(img.className).not.toMatch(/motion|animat/);expect(document.body.textContent).not.toContain(monster.icon);
    }
  });
  it.each(Object.entries(original))('ID%s is self-contained shared geometry with a deliberate portrait crop',(_id,art)=>{
    for(const [source,url,width] of [[art.full,art.artUrl,280],[art.portrait,art.portraitUrl,140]] as const){
      expect(decodeURIComponent(url.split(',')[1])).toBe(source);
      const doc=parse(source);expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.documentElement.getAttribute('width')).toBe(String(width));
      expect(doc.querySelectorAll('path').length).toBeGreaterThan(20);
      expect(doc.querySelectorAll('image,text,script,animate,animateTransform,set,foreignObject')).toHaveLength(0);
      expect(source).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)|@font-face|\bhref\s*=/);
      const ids=[...doc.querySelectorAll('[id]')].map(node=>node.id);
      expect(new Set(ids).size).toBe(ids.length);
      for(const ref of source.matchAll(/url\(#([\w-]+)\)/g))expect(ids).toContain(ref[1]);
      expect(doc.querySelectorAll('rect')).toHaveLength(0);
    }
    expect(parse(art.full).documentElement.getAttribute('viewBox')).toBe('0 0 280 210');
    expect(parse(art.portrait).documentElement.getAttribute('viewBox')).not.toBe('0 0 280 210');
    expect(parse(art.full).documentElement.innerHTML).toBe(parse(art.portrait).documentElement.innerHTML);
    expect(art.spriteWidth).toBeGreaterThanOrEqual(95);expect(art.spriteWidth).toBeLessThanOrEqual(127);
  });
  it('uses twelve independent silhouettes and unique gradient namespaces across all 37 bodies',()=>{
    const shapes=Object.values(original).map(art=>[...parse(art.full).querySelectorAll('path')].map(path=>path.getAttribute('d')).join('|'));
    expect(new Set(shapes).size).toBe(12);
    const ids=Object.values(CHARACTER_ART).flatMap(art=>[...parse(decodeURIComponent(art.artUrl.split(',')[1])).querySelectorAll('[id]')].map(node=>node.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
