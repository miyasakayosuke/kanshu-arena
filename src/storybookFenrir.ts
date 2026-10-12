/** Original storybook Fenrir: broad muzzle, heavy paws, slate fur and broken bonds.
 * Newly authored vector paths; no extracted reference images or character designs. */
export type FenrirPose={phase:'idle'|'anticipation'|'strike'|'recovery'|'hurt'|'defeat';bodyY:number;headAngle:number;headY:number;jaw:number;earNear:number;earFar:number;tail:number;mane:number;frontNear:number;frontFar:number;rearNear:number;rearFar:number;chain:[number,number,number];blink:number};
export const FENRIR_VIEW={x:-18,y:-10,width:350,height:286};
export function neutralFenrirPose():FenrirPose{return {phase:'idle',bodyY:1,headAngle:0,headY:0,jaw:0,earNear:0,earFar:0,tail:0,mane:0,frontNear:0,frontFar:0,rearNear:0,rearFar:0,chain:[0,0,0],blink:0};}
const f=(n:number)=>n.toFixed(3);
const rot=(n:number,x:number,y:number)=>`rotate(${f(n)} ${x} ${y})`;
export function storybookFenrirSvg(p:FenrirPose=neutralFenrirPose(),opts:{portrait?:boolean;size?:number;id?:string}={}):string{
 const id=(opts.id??'fenrir').replace(/[^a-zA-Z0-9_-]/g,'');const g=(name:string)=>`url(#${id}-${name})`;
 const eye=Math.max(.055,1-p.blink),size=opts.size??700;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${opts.portrait?size:size*286/350}" viewBox="${opts.portrait?'22 20 134 134':'-18 -10 350 286'}" fill="none" role="img" aria-label="フェンリルの${p.phase}ポーズ">
 <defs>
 <linearGradient id="${id}-fur" x1=".1" y1="0" x2=".85" y2="1"><stop stop-color="#829596"/><stop offset=".42" stop-color="#526c77"/><stop offset="1" stop-color="#2e4658"/></linearGradient>
 <linearGradient id="${id}-ivory" x1=".2" y1="0" x2=".65" y2="1"><stop stop-color="#fff0cb"/><stop offset=".5" stop-color="#e4d7b9"/><stop offset="1" stop-color="#9faeaa"/></linearGradient>
 <linearGradient id="${id}-mane" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#e9dfc3"/><stop offset=".6" stop-color="#b8c1b2"/><stop offset="1" stop-color="#647f83"/></linearGradient>
 <linearGradient id="${id}-brass" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#efd19b"/><stop offset=".55" stop-color="#b99059"/><stop offset="1" stop-color="#756449"/></linearGradient>
 <filter id="${id}-grain" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" seed="29" result="grain"/><feColorMatrix in="grain" type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .09"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
 </defs>
 <ellipse cx="161" cy="240" rx="119" ry="8" fill="#556461" opacity=".16"/>
 <g data-rig="root" stroke="#34464f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="${g('grain')}">
 <g data-rig="tail" transform="${rot(p.tail,241,152)}">
  <path d="M230 150c29-12 36-35 39-64l9 11 10-25 4 21 14-13c3 24-1 47-17 64l10-3c-15 21-30 29-52 28Z" fill="${g('fur')}"/>
  <path d="m275 99 10-16 3 24 14-12c-1 16-5 27-14 36l-2-11-10 17 0-12-13 9c9-11 14-23 12-35Z" fill="${g('ivory')}" stroke="none"/>
  <path d="M247 154c16-7 25-19 28-31m6-3 4-9m-28 42 12-7" stroke="#a9b9ad" stroke-width="1.7"/>
 </g>
 <g data-rig="rearFar" transform="${rot(p.rearFar,225,152)}">
  <path d="M218 143c18-4 30 6 29 23l-7 24 16 29 8 5c7 4 6 11-1 12h-30l-7-12-11-22 4-23-10-17Z" fill="#405c68"/>
  <path d="m238 222 12 0 10 8 1 4h-27Z" fill="#b7c3b8" stroke="none"/>
  <path d="m242 229 1 6m8-5 2 5" stroke-width="1.7"/>
 </g>
 <g data-rig="frontFar" transform="${rot(p.frontFar,131,143)}">
  <path d="M118 137c17-5 25 8 22 25l-9 33 5 26 9 7c5 5 2 10-4 10h-26c-5-2-5-7-2-11l-2-31 1-35Z" fill="#405c68"/>
  <path d="m114 221 17 0 2 8 6 6h-23Z" fill="#b7c3b8" stroke="none"/>
  <path d="m122 229 1 7m7-6 2 6" stroke-width="1.7"/>
 </g>
 <g data-rig="torso" transform="translate(166 216) scale(1 ${f(p.bodyY)}) translate(-166 -216)">
  <path d="m119 107 13-9 11 4 12-12 9 9 14-8 1 12 19-2c25-6 46 4 53 25l-1 14 7 9-10 10 0 12-17 6-13-2-19 10-19-4-13 6-17-7-21 1-16-16-16-7-3-27Z" fill="${g('fur')}"/>
  <path d="m137 112 20-11 17 13 23-5 25 5 16 13-24-5-22 7-28-6-19 6-17-6Z" fill="#98aaa6" stroke="none" opacity=".62"/>
  <path d="m149 152 23 7 25-5 24 0-17 12-28 7-18-5-17 2Z" fill="#2f495a" stroke="none" opacity=".55"/>
  <path d="m170 121 8 6m8-6 9 5m-30 17 9 3m29-13 11 3m-15 22 7-2" stroke="#b4c1b1" stroke-width="1.5" opacity=".6"/>
  <path d="m154 135 6 6-7 7 4 8m15-24 5 7-6 7 3 7m13-19 4 5-5 7" stroke="#91d7bd" stroke-width="2.3" opacity=".95"/>
 </g>
 <g data-rig="rearNear" transform="${rot(p.rearNear,222,151)}">
  <path d="M225 137c15 3 23 18 15 34l-20 26 9 27 12 5c7 5 4 12-3 12h-33c-5-2-5-7-1-11l-8-29 8-27-11-3c-1-17 11-32 32-34Z" fill="${g('fur')}"/>
  <path d="m220 150 9 6-7 16-13 19-5-1 10-22-6-2Z" fill="#8fa5a4" stroke="none"/>
  <path d="m206 220 19-2 4 10 9 5 0 6h-32l-3-5Z" fill="${g('ivory')}" stroke="none"/>
  <path d="m212 232 1 7m8-7 2 7m7-6 2 6" stroke-width="1.7"/>
  <path d="m200 208 23-3 4 12-24 5Z" fill="${g('brass')}" stroke-width="2.3"/>
  <path d="m205 212 14-2 2 4-13 3" stroke="#f2ddb3" stroke-width="1.5"/>
 </g>
 <g data-rig="mane" transform="${rot(p.mane,120,114)}">
  <path d="m103 92 28-1 21 23-8 4 15 16-14 1 10 19-15-1 1 20-13-7-9 23-10-10-14 15-1-19-17 6 5-19-17 0 7-16-12-8 12-18-3-10Z" fill="${g('mane')}"/>
  <path d="m102 108 13 0 16 18-12-2 8 20-11-4-8 24-7-9-10 16 2-26-9 5 8-22-10 2Z" fill="${g('ivory')}" stroke="none"/>
  <path d="m119 114 12 15-6 1 6 12m-36 2 0 11m17-9-5 17" stroke="#8fa49d" stroke-width="1.5"/>
 </g>
 <g data-rig="frontNear" transform="${rot(p.frontNear,103,153)}">
  <path d="M97 145c14 0 22 12 15 26l-18 24-13 26 10 9c5 5 2 11-5 12H52c-7-1-8-6-3-11l18-17 11-30 5-25Z" fill="${g('fur')}"/>
  <path d="m97 157 4 9-17 30-8 22-10 5 16-38 5-22Z" fill="#91a8a6" stroke="none"/>
  <path d="m65 222 16 0 7 12-3 6H52l0-6Z" fill="${g('ivory')}" stroke="none"/>
  <path d="m60 233 1 7m8-7 1 7m8-6 2 6" stroke-width="1.8"/>
  <path d="m72 203 24 10-7 13-25-10Z" fill="${g('brass')}" stroke-width="2.4"/>
  <path d="m73 208 16 7-3 5-16-7Z" fill="none" stroke="#f4dcb0" stroke-width="1.5"/>
  <path d="m78 211 5 2-2 5-5-2Z" fill="#87c7ac" stroke-width="1"/>
  <g data-rig="chain0" transform="${rot(p.chain[0],69,214)}"><path d="M70 216c-12-8-22 0-17 9 4 9 17 4 16-4" fill="none" stroke="#3e4d51" stroke-width="7"/><path d="M70 216c-12-8-22 0-17 9 4 9 17 4 16-4" fill="none" stroke="${g('brass')}" stroke-width="4"/>
   <g data-rig="chain1" transform="${rot(p.chain[1],55,224)}"><path d="M55 225c-10-6-21 0-17 8 4 8 16 6 17-1" fill="none" stroke="#3e4d51" stroke-width="7"/><path d="M55 225c-10-6-21 0-17 8 4 8 16 6 17-1" fill="none" stroke="${g('brass')}" stroke-width="4"/>
    <g data-rig="chain2" transform="${rot(p.chain[2],39,232)}"><path d="m40 232-9-4-10 5-1 9 6 4m7-1 8-5-1-6" fill="none" stroke="#3e4d51" stroke-width="7"/><path d="m40 232-9-4-10 5-1 9 6 4m7-1 8-5-1-6" fill="none" stroke="${g('brass')}" stroke-width="4"/></g>
   </g>
  </g>
 </g>
 <g data-rig="head" transform="translate(0 ${f(p.headY)}) ${rot(p.headAngle,119,116)}">
  <g data-rig="earFar" transform="${rot(p.earFar,126,69)}"><path d="m111 69 8-28 25-19-2 36-13 23Z" fill="${g('fur')}"/><path d="m122 58 14-24-1 25-8 10Z" fill="#42586a" stroke="none"/><path d="m129 49 6-9-2 17" stroke="#aaa98f" stroke-width="2"/></g>
  <g data-rig="earNear" transform="${rot(p.earNear,81,69)}"><path d="m70 78-9-22-3-35 27 18 13 29Z" fill="${g('ivory')}"/><path d="m68 34 15 12 6 17-12-4Z" fill="#4a626e" stroke="none"/><path d="m72 43 8 7 3 10" stroke="#a7aba0" stroke-width="2"/></g>
  <path d="M72 65c15-11 39-13 56-1l13 19 13 7-12 8 10 12-17 3 3 14-16-1-8 12-20-4-17 0-16-15-14-13 9-22Z" fill="${g('ivory')}"/>
  <path d="m82 63 15 5 14-7 14 13-7 14 7 10-18 3-13-13-12 7-13-10 9-12Z" fill="#5a7580" stroke="none"/>
  <path d="m97 66 7 2-4 16-6 8-7-3 6-12Z" fill="#f1e6c7" stroke="none"/>
  <path d="m132 87 7 6-9 8 9 4-11 10 0-8-10 8-2-9Z" fill="#9eafa6" stroke="none"/>
  <path d="m59 90 14-9 2 15-12 12-7-7Z" fill="#f5e9c8" stroke="none"/>
  <path d="m62 84 18 0 7 8m18-10 17-4 8 5" stroke="#4c636b" stroke-width="3.4"/>
  <g data-rig="eyeNear" transform="translate(77 94) scale(1 ${f(eye)}) translate(-77 -94)"><path d="M65 90c7-4 16-2 22 3l-5 10c-8 3-16-2-17-13Z" fill="#fff2d1" stroke-width="1.8"/><ellipse cx="77" cy="96" rx="5.5" ry="7.5" fill="#75bba9" stroke="none"/><ellipse cx="77" cy="96" rx="2.3" ry="6" fill="#273f43" stroke="none"/><circle cx="75.5" cy="92.7" r="1.5" fill="#fffbdd" stroke="none"/></g>
  <g data-rig="eyeFar" transform="translate(115 91) scale(1 ${f(eye)}) translate(-115 -91)"><path d="m104 90 19-7c3 7-4 15-15 16Z" fill="#fff2d1" stroke-width="1.8"/><ellipse cx="115" cy="91" rx="4.4" ry="6.4" fill="#75bba9" stroke="none"/><ellipse cx="115" cy="91" rx="2" ry="5" fill="#273f43" stroke="none"/><circle cx="114" cy="88.7" r="1.3" fill="#fffbdd" stroke="none"/></g>
  <g data-rig="jaw" transform="${rot(p.jaw,103,117)}"><path d="M42 115c17 2 34 4 50-5l20 6-10 25-20 8-23-8-19-14Z" fill="${g('ivory')}" stroke-width="2.4"/><path d="m46 116 31 3 24-7-5 20-16 8-23-10Z" fill="#4f4249" stroke-width="1.5"/><path d="m63 132 15 2 13-5-11 8Z" fill="#b48379" stroke="none"/><path d="m66 133 4-6 4 9m12-2 5-8 2 5" fill="#f2e7c9" stroke="none"/></g>
  <path d="M70 99c12-4 21-1 27 6l10 10-18 9-23-1-26-9-6-11 10-6Z" fill="${g('ivory')}" stroke-width="2.2"/>
  <path d="m46 117 9 3-1 12-6-5Zm30 5 10-1-6 14-4-5Z" fill="#fff3d1" stroke-width="1.3"/>
  <path d="M32 99c8-8 22-6 28-1l-4 12-11 3-13-7Z" fill="#344a55" stroke-width="2"/><path d="m37 99 10-2 7 2-10 2Z" fill="#93a6a4" stroke="none"/>
  <path d="m64 105 7 1m4 5 5 0m-26 4-8 3m11 1-7 3m47-3 9-4m-3 9 8-4" stroke="#8d9d94" stroke-width="1.5"/>
  <path d="m80 70 7 1m-17 39 4 1m46-41 6 3m-5 48 6-3" stroke="#eaddba" stroke-width="1.5"/>
 </g></g></svg>`;
}
export const STORYBOOK_FENRIR_ART_URL=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(storybookFenrirSvg(neutralFenrirPose(),{id:'static-fenrir'}))}`;
export const STORYBOOK_FENRIR_PORTRAIT_URL=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(storybookFenrirSvg(neutralFenrirPose(),{portrait:true,size:140,id:'portrait-fenrir'}))}`;
