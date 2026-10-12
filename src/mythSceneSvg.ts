/** Original nine-second paper-theatre scenes. All vector geometry is local.
 * The camera remains fixed: action comes from articulated actors, props and scenery.
 * No timers or DOM reads here; one deterministic sample can also render a still. */
import { GENBU_SVG } from './familyArt';
import { DRAGON_ART } from './dragonArt';
import { MATERIAL_ART } from './materialArt';
import { SLIME_ART } from './slimeArt';
import { DEMON_ART } from './demonArt';
import { UNDEAD_ART } from './undeadArt';
import { EXTRAORDINARY_ART } from './extraordinaryArt';
import { neutralFenrirPose, storybookFenrirSvg } from './storybookFenrir';
import { clampMythTime, type MythId } from './mythVignettes';

const n = (v:number) => (Math.abs(v)<.00001?0:v).toFixed(3);
const s = (v:number) => Math.max(0,Math.min(1,v));
const ease = (v:number) => {const a=s(v);return a*a*(3-2*a);};
const phase = (t:number,a:number,b:number) => ease((t-a)/(b-a));
const pulse = (t:number,a:number,b:number) => Math.sin(Math.PI*s((t-a)/(b-a)));
const tr = (x:number,y:number) => `translate(${n(x)} ${n(y)})`;
const rot = (r:number,x:number,y:number) => `rotate(${n(r)} ${x} ${y})`;
const path = (d:string,fill:string,stroke='none',width=2,extra='') => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const circle = (x:number,y:number,r:number,fill:string,extra='') => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}" ${extra}/>`;
const ellipse = (x:number,y:number,rx:number,ry:number,fill:string,extra='') => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" ${extra}/>`;
const group = (label:string,body:string,transform='',extra='') => `<g data-scene-part="${label}" transform="${transform}" ${extra}>${body}</g>`;
const inner = (svg:string) => svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');

type Drawing = {defs:string; parts:string[]};
function separate(svg:string):Drawing {
  const body=inner(svg), end=body.indexOf('</defs>')+7;
  const content=body.slice(end).split(/<!--[^]*?-->/);
  return {defs:body.slice(0,end),parts:content};
}
const drawings:Partial<Record<MythId,Drawing>>={
  14:separate(GENBU_SVG),15:separate(DRAGON_ART[15].full),19:separate(MATERIAL_ART[19].full),
  24:separate(SLIME_ART[24].full),29:separate(DEMON_ART[29].full),32:separate(UNDEAD_ART[32].full),36:separate(EXTRAORDINARY_ART[36].full),
};
function actor(id:Exclude<MythId,12>,x:number,y:number,scale:number,changes:Record<number,string>={},extra='',replacements:Record<number,string>={}) {
  const d=drawings[id]!;
  return group(`actor-${id}`,d.defs+d.parts.map((part,i)=>group(`rig-${id}-${i}`,replacements[i]??part,changes[i]??'')).join(''),`${tr(x,y)} scale(${scale})`,`fill="none" ${extra}`);
}
function sky(top:string,bottom:string,land:string) {
  return `<defs><linearGradient id="scene-sky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><radialGradient id="scene-glow"><stop stop-color="#fff2c8" stop-opacity=".5"/><stop offset="1" stop-color="#fff2c8" stop-opacity="0"/></radialGradient></defs><rect width="800" height="480" fill="url(#scene-sky)"/>`+path('M0 365Q190 333 400 363T800 348V480H0Z',land);
}
function stars(t:number,colour='#e8e5c8') {
  return group('stars',Array.from({length:30},(_,i)=>{
    const x=25+(i*97)%760,y=18+(i*53)%178,r=i%4===0?1.8:1;
    return circle(x,y,r,colour,`opacity="${n(.3+.45*(.5+.5*Math.sin(t*.4+i)))}"`);
  }).join(''));
}
function snow(t:number,amount=32) {
  return group('snow',Array.from({length:amount},(_,i)=>{
    const x=(i*73+Math.sin(t*.7+i)*12+t*(6+i%3))%840-20;
    const y=(i*47+t*(9+i%5))%490;
    return circle(x,y,i%4===0?2.5:1.3,'#eaf4e9',`opacity="${i%3===0?.65:.35}"`);
  }).join(''));
}
function ripples(t:number,x:number,y:number,colour:string,spread=1) {
  return group('ripples',Array.from({length:5},(_,i)=>ellipse(x,y+12*i,45+27*i+Math.sin(t*1.3+i)*8,4+5*i, 'none',`stroke="${colour}" stroke-width="${i===0?2:1}" opacity="${n((.65-i*.1)*spread)}"`)).join(''));
}
function mountains(colour:string,dy=0) { return group('distant-mountains',path('M0 260 89 151 162 234 272 110 344 238 450 184 548 253 656 131 740 210 800 154V374H0Z',colour),tr(0,dy)); }
function grass(x:number,y:number,colour:string) {return group('grass',path('M0 0q-8-25-20-32M0 0q-3-34 5-48M0 0q10-27 22-29','none',colour,3),tr(x,y));}
function coin(x:number,y:number,angle=0,scale=1) {return group('coin',ellipse(0,0,12,5,'#d8ab61','stroke="#85663f" stroke-width="2"')+ellipse(0,-3,12,5,'#f4d491','stroke="#aa8150" stroke-width="1.5"')+path('M-6-4H5','none','#fff0be',1.5),`${tr(x,y)} rotate(${n(angle)}) scale(${scale})`);}

function fenrir(t:number) {
  const strain=phase(t,2.6,4.0),released=phase(t,4.1,4.65),settle=phase(t,5.5,7.0);
  const p=neutralFenrirPose();p.phase=t<2.6?'idle':t<4.1?'anticipation':t<5.4?'strike':'recovery';
  p.bodyY=1-.14*strain+.14*released;p.headAngle=22*strain-42*released+7*settle;p.headY=13*strain-20*released;
  p.frontNear=-17*strain+36*released-14*settle;p.frontFar=15*strain-29*released+9*settle;
  p.rearNear=12*strain-31*released+18*settle;p.rearFar=-9*strain+22*released-11*settle;p.tail=-12*strain+32*released-12*settle;
  p.jaw=8*pulse(t,3.7,5.6);p.earNear=-9*strain+13*released+5*pulse(t,7.5,8.1);p.earFar=-6*strain+10*released;
  p.mane=-4*strain+7*released;p.chain=[-12*released,15*released,-20*released];
  p.blink=pulse(t,7.9,8.15);
  const x=158+62*released,y=90+13*strain-40*pulse(t,4.1,5.3)-13*released,scale=1.36;
  let art=storybookFenrirSvg(p,{id:'myth-fenrir'});
  // The scene's active restraint is a smooth ribbon. Existing broken metal links
  // on the character remain a separate, earlier-history design detail.
  const bindingBefore=path(`M75 346Q154 ${n(313-22*strain)} 290 323Q359 ${n(325-16*strain)} 410 354Q473 384 690 324`,'none','#f3e7c7',4);
  const ends=group('broken-silk',path(`M75 346Q160 ${n(307-45*released)} 227 ${n(322-52*released)}L${n(274-50*released)} ${n(333-72*released)}`,'none','#f3e7c7',4)+path(`M690 324Q543 ${n(360+18*released)} 435 ${n(352+15*released)}L${n(381+60*released)} ${n(338-30*released)}`,'none','#f3e7c7',4));
  return sky('#213b4e','#8caea9','#bacdbe')+stars(t)+
    group('northern-light',path(`M70 15Q210 ${n(112+t*2)} 363 50T790 10L800 63Q570 147 410 91T70 46Z`,'#82c4b0'),'', 'opacity=".19"')+
    mountains('#526e78')+mountains('#73918e',80)+
    path('M0 402 110 325 248 330 326 370 428 319 555 340 627 307 800 350V480H0Z','#748c88')+
    path('M110 325 248 330 276 346 174 341 114 350 70 362Z','#e3e8d5')+
    path('M428 319 555 340 601 329 553 355 440 340 369 357Z','#e4eadc')+
    ellipse(410,387,204,16,'#38585e','opacity=".22"')+
    group('fenrir-articulated',inner(art),`${tr(x,y)} scale(${scale}) translate(18 10)`)+
    group('silk-binding',t<4.1?bindingBefore:ends,'',`opacity="${n(1-.45*settle)}"`)+
    group('release-snow',Array.from({length:12},(_,i)=>{
      const a=i*Math.PI/6,d=phase(t,4.15,5.5);return circle(330+Math.cos(a)*90*d,340+Math.sin(a)*70*d+20*d*d,2,'#eff4df');
    }).join(''),'',`opacity="${n(pulse(t,4.1,5.8))}"`)+snow(t)+
    path('M0 445Q126 401 221 447T485 454 800 426V480H0Z','#d7e1ce');
}

function genbu(t:number) {
  const rise=phase(t,1.8,3.8),uncoil=phase(t,3.4,5.8),bow=pulse(t,6.8,8.4);
  return sky('#1a3446','#638d98','#314f58')+stars(t)+
    circle(652,78,35,'#dce6cb','opacity=".7"')+circle(664,65,36,'#254656')+
    mountains('#355463',55)+path('M0 326Q250 301 440 334T800 318V480H0Z','#527b81')+
    group('lake-reflections',Array.from({length:10},(_,i)=>path(`M${60+i*69} ${350+i%3*15}h${35+i%4*12}`,'none','#b2d4c3',1.5,'opacity=".28"')).join(''))+
    ripples(t,402,398,'#bde6d4',rise)+
    actor(14,190,151+(1-rise)*152,1.48,{7:rot(-12+15*uncoil,207,136),6:rot(-3*bow,76,144),1:rot(-6*uncoil,214,160)})+
    group('near-water',path(`M0 414Q140 ${n(407+4*Math.sin(t))} 245 423T440 413 800 418V480H0Z`,'#436f77'))+
    ripples(t,405,429,'#9cd2c5',rise)+snow(t,20)+
    group('winter-reeds',grass(61,463,'#173f4b')+grass(744,453,'#244851'));
}

function vritra(t:number) {
  const release=phase(t,4,6.8),recoil=pulse(t,3.9,5.7),lower=phase(t,4.7,6.7);
  return sky('#3a3c62','#aa9999','#806f69')+mountains('#575473',45)+
    path('M0 205 136 153 230 258 274 348 176 480H0Z','#635f75')+
    path('M800 168 700 159 572 267 529 351 632 480H800Z','#666374')+
    path('M267 203Q394 167 528 211L581 346H214Z','#7896ae')+
    group('impounded-water',Array.from({length:5},(_,i)=>path(`M${284-i*10} ${228+i*20}q85 ${-8+3*Math.sin(t+i)} 182 0`,'none','#bfccd0',2,'opacity=".45"')).join(''))+
    group('released-river',path(`M317 310Q400 296 480 314L${n(481+160*release)} 480H${n(317-166*release)}Z`,'#74bfc3')+Array.from({length:7},(_,i)=>path(`M${340+i*15} 326Q${338+i*17} ${n(369+10*Math.sin(t+i))} ${n(289+i*28)} 480`,'none','#d1e7d4',2,`opacity="${n(.5*release)}"`)).join(''),'',`opacity="${n(release)}"`)+
    group('vritra-fall',actor(15,202+recoil*35+lower*145,155+lower*8,1.37,{3:rot(3*recoil-4*lower,150,160),5:rot(3*recoil-4*lower,150,160)},'',{4:path('M126 66Q150 70 159 97L168 128 192 143 214 149 213 169 190 170 166 155 148 144 133 115Z','url(#vr-body)','#252440',2)+drawings[15]!.parts[4]}),rot(-22*lower,202+recoil*35+lower*145+151*1.37,155+lower*8+181*1.37))+
    group('indra-distant-thunder',path('M498 12 462 80 486 82 441 168','none','#f7e5bb',5)+path('M498 12 462 80 486 82 441 168','none','#fff8d6',2),'',`opacity="${n(.85*pulse(t,3.45,4.55))}"`)+
    group('river-spray',Array.from({length:15},(_,i)=>circle(268+i*20,383+Math.sin(t*2+i)*8,2+i%2,'#d4e6d8')).join(''),'',`opacity="${n(release*.75)}"`)+
    path('M0 460 88 394 220 418 253 480H0ZM800 455 719 381 617 418 589 480H800Z','#544f64')+
    group('clearing',circle(408,120,150,'url(#scene-glow)'),' ',`opacity="${n(release*.5)}"`);
}

function talos(t:number) {
  const walk=phase(t,1.2,4.0),step=Math.sin(walk*Math.PI*4)*(1-phase(t,3.4,4.0)),lift=phase(t,4.2,6.2),look=phase(t,6.4,7.7);
  const x=127+walk*110,y=120-Math.abs(step)*7;
  const arm=drawings[19]!.parts[4], cut=arm.indexOf('<path d="m177 68');
  const rivets='<g fill="#d9be83" stroke="#536247" stroke-width="1.3"><circle cx="82" cy="83" r="5"/><circle cx="67" cy="114" r="4"/></g>';
  const raised=group('talos-left-arm',arm.slice(0,cut)+rivets,rot(49*lift,88,80))+arm.slice(cut).replace('<circle cx="82" cy="83" r="5"/>','').replace('<circle cx="67" cy="114" r="4"/>','');
  const a=49*lift*Math.PI/180;
  const rockX=x+(88+(50-88)*Math.cos(a)-(158-80)*Math.sin(a))*1.4;
  const rockY=y+(80+(50-88)*Math.sin(a)+(158-80)*Math.cos(a))*1.4;
  return sky('#7caeba','#e9d4a8','#c8ae7e')+circle(655,86,48,'#fae9b5')+
    path('M0 255Q190 237 405 258T800 239V427H0Z','#5b9eaa')+
    group('coastal-waves',Array.from({length:7},(_,i)=>path(`M${-80+i*91+t*3} ${283+i%3*29}q45 -8 90 0t85 0`,'none','#c6ddcc',2,'opacity=".55"')).join(''))+
    path('M0 364 140 298 304 313 448 365 560 406 800 417V480H0Z','#a6885d')+
    path('M0 350 140 293 304 306 446 357 425 374 277 329 133 316 0 377Z','#d8c596')+
    group('footprints',Array.from({length:3},(_,i)=>ellipse(205+i*34,386+i*2,12,4,'#846e4e',`opacity="${n(s(walk*3-i)*.5)}"`)).join(''))+
    actor(19,x,y,1.4,{1:rot(step*4,140,146),3:rot(-7*look,139,55)},'',{4:raised})+
    group('coastal-stone',path('M-26 4-14-19 13-23 33-2 20 22-15 22Z','#9caa98','#617872',3)+path('M-14-19 13-23 22-12-3-8Z','#c8cbb0'),`${tr(rockX,rockY)} rotate(${n(49*lift)})`)+
    grass(704,457,'#6f8266')+grass(69,463,'#6d7b5d')+
    group('sea-birds',path(`M${587-t*6} 144q9 -9 18 0 9-9 18 0M${655-t*4} 181q7 -7 14 0 7-7 14 0`,'none','#527883',2));
}

function spring(t:number) {
  const drop=phase(t,1.3,3.3),splash=pulse(t,3.3,4.5),share=phase(t,4.5,6.8),wobble=Math.sin((t-3.3)*10)*pulse(t,3.3,5.2);
  const bubbles=Array.from({length:3},(_,i)=>{
    const x=400+share*(105+i*54),y=348-share*(32+i%2*37)+Math.sin(t*2+i)*4;
    return group('bubble-friend',circle(x,y,14-i*2,'#c6d8c6',`stroke="#7c9c9d" stroke-width="2"`)+ellipse(x-4,y-5,3,2,'#fcf1d5')+circle(x-3,y+1,1.2,'#526275')+circle(x+3,y+1,1.2,'#526275'),'',`opacity="${n(share)}"`);
  }).join('');
  return sky('#403e60','#8a8594','#8d8296')+
    path('M0 0H800V238L738 107 660 61 534 41 441 90 374 45 236 59 145 109 62 251 0 313Z','#56546b')+
    path('M84 0 145 170 181 84 206 0ZM578 0 611 108 646 34 664 0Z','#747086')+
    circle(393,186,176,'url(#scene-glow)')+
    path('M0 405Q121 330 282 367T581 361 800 398V480H0Z','#716b88')+
    ellipse(405,408,293,46,'#a9b9ae')+ellipse(405,410,234,28,'#869da1')+
    actor(24,193,121,1.5,{1:`translate(136 190) scale(${n(1+wobble*.035)} ${n(1-wobble*.065)}) translate(-136 -190)`,2:`translate(136 190) scale(${n(1+wobble*.018)} ${n(1-wobble*.025)}) translate(-136 -190)`})+
    group('falling-drop',path('M0-13C-4-5-10 0-10 6a10 10 0 0 0 20 0C10 0 4-5 0-13Z','#dfe4cb','#8aaba5',2)+ellipse(-3,3,2,4,'#fff4da'),tr(417,95+drop*235),`opacity="${n(1-phase(t,3.3,3.45))}"`)+
    group('droplet-splash',Array.from({length:7},(_,i)=>circle(417+(i-3)*17*splash,332-Math.sin(i/6*Math.PI)*48*splash,3,'#e7e9c9')).join(''),'',`opacity="${n(splash)}"`)+
    ripples(t,417,373,'#e0dcc0',.3+splash*.7)+bubbles+
    group('cave-mushrooms',path('M75 426v-20m12 24v-13','none','#d6b8b4',5)+ellipse(75,405,16,7,'#b997ad')+ellipse(89,417,10,5,'#d6b2bb'));
}

function mammon(t:number) {
  const stack=phase(t,1,3),run=phase(t,3.2,4.8),catchCoin=phase(t,4.8,5.6),returnCoin=phase(t,5.7,7.1),nod=pulse(t,7.1,8.5);
  const arm=drawings[29]!.parts[2], cut=arm.indexOf('<path d="M155 88');
  const reach=-38*run+66*catchCoin-10*returnCoin;
  const a=reach*Math.PI/180;
  const handX=281+(96+(43-96)*Math.cos(a)-(126-96)*Math.sin(a))*1.38;
  const handY=82+(96+(43-96)*Math.sin(a)+(126-96)*Math.cos(a))*1.38;
  const leftArm=group('mammon-catching-hand',arm.slice(0,cut),rot(reach,96,96))+arm.slice(cut);
  const cx=t<4.8?296+(handX-296)*run:handX,cy=t<4.8?323+(handY-12-323)*run:handY-12;
  return sky('#3d3c53','#b09679','#725e55')+
    path('M85 0V329M706 0V324','none','#635360',34)+
    path('M147 0V248Q212 292 271 249V0M536 0V226Q591 267 647 226V0','#5a5163')+
    circle(405,161,210,'url(#scene-glow)')+
    group('hanging-lamp',path('M395 0v59','none','#ab946d',3)+path('M363 68 395 52 427 68 413 88H377Z','#be9560','#655846',3)+ellipse(395,85,18,7,'#fae4a2'))+
    actor(29,281,82,1.38,{3:rot(5*returnCoin,175,130),4:rot(6*nod,135,78)},'',{2:leftArm})+
    group('counting-table',path('M128 332 650 331 680 353 113 357Z','#a7855d','#655343',3)+path('M139 359v121M638 354v126','none','#5e514a',18))+
    group('stacked-coins',Array.from({length:7},(_,i)=>coin(260+(i%3)*28,332-Math.floor(i/3)*7-6*(1-stack)*(i%2))).join(''))+
    group('runaway-coin',coin(cx,cy,run*320-returnCoin*180,1.1))+
    group('caught-glint',path('M0-12V-5M0 5v7M-12 0h7M5 0h7','none','#ffedb8',2),tr(cx,cy-2),`opacity="${n(pulse(t,5.1,5.9))}"`)+
    path('M0 449Q84 422 141 461H0ZM800 438Q740 414 689 480H800Z','#524858');
}

function draugr(t:number) {
  const open=phase(t,1.9,3.9),rise=phase(t,3.1,5.8),guard=phase(t,5.8,7.4);
  return sky('#273d4d','#71847d','#667963')+stars(t)+circle(645,87,32,'#d7dcbc')+
    path('M0 348 99 299 163 326 245 238 359 180 489 208 606 296 800 336V480H0Z','#3e584f')+
    path('M236 362V256Q346 134 463 254V369Z','#263e40')+
    group('buried-treasure',path('M286 338 406 337 419 368H276Z','#b7a471','#675e48',3)+Array.from({length:6},(_,i)=>coin(294+i*19,341+i%2*4)).join(''),'',`opacity="${n(open)}"`)+
    group('mound-door',path('M-84 33-78-80-35-139 34-143 82-84 94 40Z','#7c8b74','#485d52',4)+path('M-53-69-16-102 34-85M-9-18 29-28','none','#a3af8e',3),`${tr(350+174*open,363+20*open)} rotate(${n(21*open)})`)+
    actor(32,191+guard*11,142+(1-rise)*173,1.42,{2:rot(-4*guard,80,93),3:rot(-7*guard,140,109),5:rot(-4*guard,139,72)})+
    group('mound-lip',path('M0 419Q170 367 264 415T461 401 654 400 800 424V480H0Z','#71836a'))+
    group('ground-mist',path(`M0 436Q140 ${n(410+5*Math.sin(t))} 288 435T560 426 800 440V455H0Z`,'#b7c3ab'),'', 'opacity=".35"')+
    grass(122,431,'#405b51')+grass(693,431,'#3b594f');
}

function janus(t:number) {
  const turn=phase(t,2.4,4.0),open=phase(t,3.7,6.1),dawn=phase(t,4,7.4),bird=phase(t,6.6,8.9);
  return sky('#4c526d','#c3b092','#a59b80')+
    group('dawn-sky',`<rect width="800" height="480" fill="#efd5a1"/>`,'',`opacity="${n(dawn*.7)}"`)+
    path('M0 345 125 300 260 336 469 300 620 315 800 280V480H0Z','#84908a')+
    path('M0 426 397 290 800 419V480H0Z','#beb293')+
    group('threshold-light',path('M302 272H500L740 480H42Z','#f9e7b2'),'',`opacity="${n(dawn*.7)}"`)+
    group('gate-arch',path('M235 387V164C235 45 563 45 563 164V387H524V167C524 95 274 95 274 167V387Z','#b8b89d','#747e73',4)+path('M238 148H275M521 148H560M237 214H273M525 214H562M238 286H274M525 287H561','none','#8c9788',3))+
    group('opening-left-door',path('M276 162Q301 124 397 126V383H276Z','#6c8580','#485f61',3)+path('M303 173V355M337 149V357M371 139V361','none','#95a89a',3),`translate(276 0) scale(${n(1-.94*open)} 1) translate(-276 0)`)+
    group('opening-right-door',path('M401 126Q494 124 521 162V383H401Z','#657d7a','#485f61',3)+path('M423 141V361M456 146V359M490 176V355','none','#95a89a',3),`translate(521 0) scale(${n(1-.94*open)} 1) translate(-521 0)`)+
    actor(36,231,121,1.35,{5:rot(55*turn,56,120),6:rot(-10*turn+7*open,135,72),7:rot(-10*turn+7*open,135,72)})+
    group('first-bird',path('M-15 0Q-6-12 0-1Q7-13 17-3','none','#4d7273',3),`${tr(410+185*bird,298-112*bird)} rotate(${n(-12*bird)})`,`opacity="${n(bird)}"`)+
    group('paving',path('M345 441 377 420 423 421 449 439 409 455ZM132 460 174 437 212 453 173 475ZM584 456 626 438 671 455 633 477Z','#d2c6a5','#9b9f89',2))+
    grass(66,408,'#72876f')+grass(736,406,'#748873');
}
const renderers:Record<MythId,(time:number)=>string>={12:fenrir,14:genbu,15:vritra,19:talos,24:spring,29:mammon,32:draugr,36:janus};
/** One bounded timeline: exact end frame is held, never wraps or fetches assets. */
export function mythSceneSvg(id:MythId,ms:number):string {
  const t=clampMythTime(ms)/1000;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480" fill="none" data-myth-id="${id}" data-myth-time="${n(t)}">${renderers[id](t)}<path d="M14 41V15H42M758 15H786V41M14 439V465H42M758 465H786V439" fill="none" stroke="#f4e6c1" stroke-width="1" opacity=".45"/></svg>`;
}
