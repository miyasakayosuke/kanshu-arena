/**
 * Original articulated SVG study for the existing Yoko (roster 0).
 * Broad art-direction references were viewed on official DQM3 and Seven pages.
 * All paths, poses and timing below are newly authored. No reference image is embedded.
 * Kept out of the game entrypoint until this visual prototype is reviewed.
 */
export type YokoAction = 'idle' | 'attack' | 'hurt' | 'defeat';
export type YokoPose = {
  phase: 'idle' | 'anticipation' | 'strike' | 'recovery' | 'hurt' | 'defeat';
  x: number; y: number; bodyAngle: number; bodyX: number; bodyY: number;
  headAngle: number; headY: number; earLeft: number; earRight: number;
  tails: [number, number, number]; paw: number; blink: number; mouth: number;
  shadow: number; opacity: number;
};
const clamp = (v: number, min=0, max=1) => Math.min(max, Math.max(min, v));
const smooth = (v: number) => { const t=clamp(v); return t*t*(3-2*t); };
const lerp = (a:number,b:number,t:number) => a+(b-a)*smooth(t);
const finite = (v:number) => Number.isFinite(v) ? Math.max(0,v) : 0;
const pulse = (t:number,at:number,width:number) => Math.max(0,1-Math.abs(t-at)/width);
export const YOKO_ACTION_DURATION = {idle:0, attack:1120, hurt:620, defeat:840} as const;
export function sampleStorybookYoko(timeMs:number, action:YokoAction='idle', actionAgeMs=0, reduced=false):YokoPose {
  const time=finite(timeMs), age=finite(actionAgeMs), t=time/1000;
  const pose:YokoPose={phase:'idle',x:0,y:0,bodyAngle:0,bodyX:1,bodyY:1,headAngle:0,headY:0,earLeft:0,earRight:0,tails:[0,0,0],paw:0,blink:0,mouth:0,shadow:1,opacity:1};
  if (!reduced) {
    pose.bodyY=1+Math.sin(t*2.05)*.018;
    pose.bodyX=1-Math.sin(t*2.05)*.006;
    pose.headY=-Math.sin(t*2.05-.42)*1.1;
    pose.headAngle=Math.sin(t*1.1)*1.8;
    pose.tails=[Math.sin(t*1.6)*4,Math.sin(t*1.6-.65)*5,Math.sin(t*1.6-1.25)*6];
    pose.earLeft=pulse(time%5100,1320,170)*-13;
    pose.earRight=pulse(time%5100,1450,180)*8;
    pose.blink=Math.max(pulse(time%4300,2500,95),pulse(time%4300,2730,80)*.8);
  }
  if(action==='attack' && age<1120){
    const a=age;
    pose.phase=a<280?'anticipation':a<520?'strike':'recovery';
    if(!reduced){
      const wind=smooth(a/280),strike=smooth((a-280)/140),settle=smooth((a-520)/600);
      pose.x= a<280?8*wind:a<520?lerp(8,-28,strike):lerp(-28,0,settle);
      pose.y= a<280?5*wind:a<520?lerp(5,-10,strike):lerp(-10,0,settle);
      pose.bodyAngle=a<280?3*wind:a<520?-6:lerp(-6,0,settle);
      pose.bodyX=a<280?1-.06*wind:a<520?1.08:lerp(1.08,1,settle);
      pose.bodyY=a<280?1-.05*wind:a<520?1.04:lerp(1.04,1,settle);
      pose.headAngle=a<280?-6*wind:a<520?-10:lerp(-10,0,settle);
      pose.headY=a<280?3*wind:a<520?-2:lerp(-2,0,settle);
      pose.earLeft=a<520?12*wind:lerp(12,0,settle);
      pose.earRight=a<520?15*wind:lerp(15,0,settle);
      pose.tails=[0,1,2].map(i=>a<280?(-9+i*2)*wind:a<570?(13+i*5)*smooth((a-200)/300):(13+i*5)*(1-smooth((a-570-i*55)/(480-i*55)))) as [number,number,number];
      pose.paw=a<280?-4*wind:a<520?16:lerp(16,0,settle);
      pose.shadow=a<520?1.05:lerp(1.05,1,settle);
    }
    pose.blink=a<280?.24:0;
    pose.mouth=a>=280&&a<680?1:0;
  }
  if(action==='hurt' && age<620){
    pose.phase='hurt';
    const force=Math.sin(clamp(age/620)*Math.PI);
    if(!reduced){pose.x=force*11;pose.y=force*2;pose.headAngle=force*10;pose.earLeft=force*25;pose.earRight=force*29;pose.tails=[-force*8,-force*12,-force*15];pose.bodyX=1-force*.035;}
    pose.blink=.85*force;
    pose.mouth=0;
  }
  if(action==='defeat'){
    pose.phase='defeat';pose.bodyX=1;
    const fold=reduced?1:smooth(age/840);
    pose.bodyY=1-fold*.28;pose.y=fold*18;pose.headAngle=fold*20;pose.headY=fold*12;
    pose.earLeft=fold*30;pose.earRight=fold*35;pose.tails=[fold*20,fold*15,fold*10];
    pose.blink=fold;pose.shadow=1-fold*.18;pose.opacity=1-fold*.3;pose.mouth=0;
  }
  return pose;
}
const fmt=(v:number)=>v.toFixed(3);
const rotate=(v:number,x:number,y:number)=>`rotate(${fmt(v)} ${x} ${y})`;
/** Every pose is a complete SVG; it works offline as a DOM figure or rendered sprite. */
export function storybookYokoSvg(p:YokoPose, opts:{portrait?:boolean;size?:number;id?:string}={}):string {
  const id=(opts.id??'yoko').replace(/[^a-zA-Z0-9_-]/g,'');
  const g=(name:string)=>`url(#${id}-${name})`;
  const eyeScale=Math.max(.045,1-p.blink);
  const fur='#b75d4d',ink='#593d40',cream='#f6e5bd';
  const head=rotate(p.headAngle,104,137);
  // Small irregular hatch marks are authored geometry, not an imported texture.
  const strokes='<path d="m145 158 9-3m-7 10 12-4m-19 15 10-3m17-10 6-2m-46-7 5-3m14 14 6-3m18 8 7-1" fill="none" stroke="#e0a77d" stroke-width="1.7" stroke-linecap="round" opacity=".55"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.size??624}" height="${opts.portrait?(opts.size??624):(opts.size??624)*260/312}" viewBox="${opts.portrait?'46 43 131 131':'-16 -10 312 260'}" fill="none" role="img" aria-label="妖狐の${p.phase==='idle'?'待機':p.phase==='defeat'?'倒れる':p.phase==='hurt'?'被弾':'攻撃'}ポーズ">
  <defs>
    <linearGradient id="${id}-fur" x1=".12" y1="0" x2=".82" y2="1"><stop stop-color="#de9970"/><stop offset=".42" stop-color="#bd6752"/><stop offset="1" stop-color="#7f4549"/></linearGradient>
    <linearGradient id="${id}-tail" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#f9edca"/><stop offset=".46" stop-color="#e7cca8"/><stop offset="1" stop-color="#b28b91"/></linearGradient>
    <linearGradient id="${id}-cream" x1=".2" y1="0" x2=".8" y2="1"><stop stop-color="#fff2d4"/><stop offset="1" stop-color="#e5bd92"/></linearGradient>
    <linearGradient id="${id}-jade" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b1d8ad"/><stop offset="1" stop-color="#507d74"/></linearGradient>
    <filter id="${id}-grain" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency=".68" numOctaves="3" seed="17" result="grain"/>
      <feColorMatrix in="grain" type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 .1"/></feComponentTransfer>
      <feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="multiply"/>
    </filter>
  </defs>
  <ellipse cx="143" cy="216" rx="${fmt(79*p.shadow)}" ry="8" fill="#685756" opacity=".16"/>
  <g data-rig="root" opacity="${fmt(p.opacity)}" transform="translate(${fmt(p.x)} ${fmt(p.y)}) ${rotate(p.bodyAngle,140,206)} translate(140 206) scale(${fmt(p.bodyX)} ${fmt(p.bodyY)}) translate(-140 -206)">
  <g filter="${g('grain')}" stroke="${ink}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round">
    <g data-rig="tail0" transform="${rotate(p.tails[0],168,166)}">
      <path d="M155 172C142 142 142 107 166 76c17-21 19-38 13-56 28 12 42 39 35 66-6 28-37 48-39 85Z" fill="${g('tail')}"/>
      <path d="M181 33c8 19 5 35-8 55-17 23-21 48-11 69-4-25 7-45 25-65 20-24 18-43-6-59Z" fill="#fff0cc" stroke="none"/>
      <path d="M157 139c8-8 10-18 11-26 8 5 10 10 9 16 7-1 12-7 16-11-7 24-21 34-19 51l-17 1Z" fill="#b7989b" stroke="none"/>
      <path d="m179 53 4 13m-10 18-5 10m24-28-3 14" stroke="#d3b396" stroke-width="1.7" opacity=".7"/>
    </g>
    <g data-rig="tail1" transform="${rotate(p.tails[1],169,171)}">
      <path d="M156 178c7-37 23-56 49-68 20-9 36-23 45-42 15 29 9 57-13 74-19 14-46 15-59 39Z" fill="${g('tail')}"/>
      <path d="M247 81c-6 23-23 32-44 44-21 13-30 27-36 43 18-27 45-29 66-48 13-13 16-25 14-39Z" fill="#fff0cd" stroke="none"/>
      <path d="M161 172c8-20 15-29 29-34l-2 13 13-8-6 13 17-5c-12 6-28 14-35 28Z" fill="#b9989a" stroke="none"/>
      <path d="m228 111 6-8m-13 20 9-4" stroke="#d3b396" stroke-width="1.7"/>
    </g>
    <g data-rig="tail2" transform="${rotate(p.tails[2],172,177)}">
      <path d="M157 184c17-26 38-21 65-25 17-3 29-10 38-23 9 28-4 54-30 59-20 5-39-2-53 6Z" fill="${g('tail')}"/>
      <path d="M250 155c-20 21-43 12-63 22-13 7-16 11-17 17 26-16 49 1 71-18 7-6 9-13 9-21Z" fill="#fff0ce" stroke="none"/>
      <path d="m162 180 28-9-5 10 17-6-9 11 17-2-8 10-25 5Z" fill="#b9989a" stroke="none"/>
      <path d="m231 174 11-5m-17 14 10-2" stroke="#d3b396" stroke-width="1.7"/>
    </g>
    <path d="M104 157c-2 19-7 31-8 43l-10 6c-5 5-2 8 5 8h21l12-47Z" fill="#97504b"/>
    <path d="M145 140c35-7 57 13 53 39-2 18-17 30-41 29l-49-10-16-37 10-21Z" fill="${g('fur')}"/>
    <path d="M104 146c12 14 17 28 36 39 12 6 23 7 34 5-15 16-40 10-59-3l-18-25Z" fill="${g('cream')}" stroke="none"/>
    ${strokes}
    <path d="M172 166c16 5 16 18 4 29l-11 8 8 5c6 5 3 8-4 8h-26c-6-2-6-7-3-12l11-19" fill="${g('fur')}"/>
    <path d="m149 202 10 1 11 8-2 4h-24l-3-5Z" fill="${g('cream')}" stroke="none"/>
    <path d="m152 211 1 4m7-4 1 4" stroke="#bc987e" stroke-width="1.4"/>
    <g data-rig="paw" transform="rotate(${fmt(p.paw)} 106 156)">
      <path d="M98 148c13 5 15 16 11 29l-7 24 7 6c5 5 2 10-5 10H77c-6-1-7-6-2-10l11-10 4-34" fill="${g('fur')}"/>
      <path d="m88 190 15 7-3 6 8 8-4 5H79l-4-5 13-12Z" fill="${g('cream')}" stroke="none"/>
      <path d="m84 211 1 5m7-5 1 5m7-4 1 4" stroke="#bc987e" stroke-width="1.4"/>
    </g>
    <path d="M82 126c4-15 38-21 53-6l13 16-9-1 2 16-12-4-5 16-10-6-8 10-8-11-11 5 2-16-12-1Z" fill="${g('cream')}"/>
    <path d="m115 131 7 12-8-1 0 13-6-9" stroke="#cbad89" stroke-width="1.6"/>
    <g data-rig="head" transform="translate(0 ${fmt(p.headY)}) ${head}">
      <g data-rig="earLeft" transform="${rotate(p.earLeft,77,97)}">
        <path d="M72 104C57 85 54 60 57 38c18 9 31 28 33 53Z" fill="${g('fur')}"/>
        <path d="M64 49c1 17 5 32 12 43l6-9c-2-13-8-24-18-34Z" fill="#68464a" stroke="none"/>
        <path d="m68 63 5 22 4-7Z" fill="#d9a087" stroke="none"/>
      </g>
      <g data-rig="earRight" transform="${rotate(p.earRight,123,95)}">
        <path d="M112 90c8-21 23-36 41-44-2 25-13 47-28 57Z" fill="${g('fur')}"/>
        <path d="M142 58c-12 10-20 21-23 34l6 3c8-10 15-23 17-37Z" fill="#68464a" stroke="none"/>
        <path d="m135 69-11 20 7-3Z" fill="#d9a087" stroke="none"/>
      </g>
      <path d="M70 86c8-9 24-10 33-8l4-7 7 10c17 2 27 12 29 28l10 7-12 2 5 9-14 0c-10 15-24 22-39 20-16-1-27-10-34-18l-13-3 9-8-8-9 13-2c0-9 4-15 10-21Z" fill="${g('fur')}"/>
      <path d="M61 110c4 17 16 30 33 31 16 2 32-8 42-22l-13-3-8 5-11-7-10 8-12-8-11 5Z" fill="${g('cream')}" stroke="none"/>
      <path d="m97 82-3 18 7 8 7-10-3-16-4-7Z" fill="#f4d6a9" stroke="none"/>
      <path d="m65 104 12-6 9 5m26-3 11-3 7 6" stroke="#6b4543" stroke-width="2.6"/>
      <g data-rig="eyeLeft" transform="translate(79 110) scale(1 ${fmt(eyeScale)}) translate(-79 -110)">
        <path d="M67 105c6-5 14-4 20 2-2 9-13 13-18 8Z" fill="#fdf4d9" stroke-width="1.9"/>
        <ellipse cx="79" cy="109" rx="5.7" ry="7.5" fill="#839f6c" stroke="none"/><ellipse cx="79" cy="109" rx="2.7" ry="6.2" fill="#383e34" stroke="none"/><circle cx="77.5" cy="106" r="1.5" fill="#fff8df" stroke="none"/>
      </g>
      <g data-rig="eyeRight" transform="translate(117 108) scale(1 ${fmt(eyeScale)}) translate(-117 -108)">
        <path d="M107 105c7-7 15-7 20-2 0 9-8 14-17 10Z" fill="#fdf4d9" stroke-width="1.9"/>
        <ellipse cx="118" cy="106.8" rx="5" ry="6.8" fill="#839f6c" stroke="none"/><ellipse cx="118" cy="107" rx="2.6" ry="5.8" fill="#383e34" stroke="none"/><circle cx="116.5" cy="104.5" r="1.4" fill="#fff8df" stroke="none"/>
      </g>
      <path d="M85 122c3-5 13-6 19-2l-9 8Z" fill="#563e42" stroke-width="1.7"/>
      <path d="m89 121 8-1" stroke="#b68377" stroke-width="1.3"/>
      <g data-rig="mouthOpen" opacity="${p.mouth>.5?1:0}"><path d="M88 130q10 8 23-3-7 15-15 14Z" fill="#674449" stroke-width="1.6"/><path d="m103 132 5-2-3 6Z" fill="#fff0d0" stroke="none"/></g>
      <g data-rig="mouthClosed" opacity="${p.mouth>.5?0:1}"><path d="m94 128-1 6q-5 3-9-1m9 1q11 4 18-6" stroke="#7e5551" stroke-width="1.7"/></g>
      <path d="m59 121 13 3m-10 4 10-1m56-6 11-4m-11 10 11-2" stroke="#ba927e" stroke-width="1.3"/>
      <path d="m73 90 7-2m41-2 5 4m-54 45 5 3" stroke="#edb788" stroke-width="1.6" opacity=".8"/>
    </g>
    <path d="M85 148q16 9 34 0" stroke="#5a8277" stroke-width="5"/>
    <g data-rig="pendant" transform="rotate(${fmt(-p.headAngle*.8+p.tails[1]*.28)} 105 153)"><path d="m99 153 9-1 7 10-10 14-11-12Z" fill="${g('jade')}" stroke="#486a61" stroke-width="1.8"/><path d="m101 158 5 0 4 5-6 8-5-8Z" fill="#d0dfb5" stroke="none"/><path d="m104 164 3-2" stroke="#739282" stroke-width="1.3"/></g>
  </g></g></svg>`;
}

/** Static UI and fallback images use the exact same geometry as the battle rig. */
export const STORYBOOK_YOKO_ART_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(storybookYokoSvg(sampleStorybookYoko(0,'idle',0,true),{id:'static-yoko'}))}`;
export const STORYBOOK_YOKO_PORTRAIT_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(storybookYokoSvg(sampleStorybookYoko(0,'idle',0,true),{portrait:true,size:140,id:'portrait-yoko'}))}`;
