// One bounded offscreen-leap comparison against the frozen 1.5x higher-jump proxy. Original schematic geometry, not final artwork.
// The historical choreography is cited in README.md; no historical source import.
export const META = Object.freeze({name:'Moonlit Bite offscreen-leap proxy',durationMs:1500,impactMs:800,power:55,mp:10,nominalWidth:240,referenceWidths:[142,420],browserVerified:false,gameIntegration:false,finalArtwork:false});
export const BONES = Object.freeze({body:106,neck:28,foreUpper:41,foreLower:38,hindUpper:45,hindLower:48,forePaw:19,hindPaw:23,tail1:40,tail2:34,tail3:24,jaw:22});
export const PHASES = Object.freeze([[0,'STAND'],[100,'LOAD'],[220,'PUSH / TOE ROLL'],[360,'TAKEOFF'],[420,'ASCEND / EXIT'],[480,'ABOVE VIEWPORT'],[500,'APEX / OFFSCREEN'],[600,'DESCEND / REENTER'],[760,'BITE APPROACH'],[800,'BITE'],[840,'FOREPAW REACH'],[890,'FORE CONTACT'],[930,'COMPRESSION'],[970,'REAR LANDING'],[1080,'RECOVERY'],[1380,'STAND']]);
export const SUPPORT = Object.freeze({fore:{release:220,land:890,toe:[-122,-5],landingToe:[-157,-5],rollStart:150,rollMax:32},farFore:{release:210,land:900,toe:[-134,-5],landingToe:[-169,-5],rollStart:145,rollMax:29},hind:{release:360,land:970,toe:[20,-5],landingToe:[-15,-5],rollStart:260,rollMax:34},farHind:{release:350,land:980,toe:[12,-5],landingToe:[-23,-5],rollStart:250,rollMax:31}});
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const mix=(a,b,u)=>a+(b-a)*u;
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const avg=(a,b)=>a.map((v,i)=>(v+b[i])/2);
export const len=p=>Math.hypot(...p);
export const rad=d=>d*Math.PI/180;
export const vec=(l,a)=>[l*Math.cos(rad(a)),l*Math.sin(rad(a))];
export const point=(p,l,a)=>add(p,vec(l,a));
export const rotate=(p,a)=>[p[0]*Math.cos(rad(a))-p[1]*Math.sin(rad(a)),p[0]*Math.sin(rad(a))+p[1]*Math.cos(rad(a))];
export const smooth=u=>{const v=clamp(u,0,1);return v*v*(3-2*v);};
const blend=(a,b,u)=>a.map((v,i)=>mix(v,b[i],u));

// Monotone shape-preserving tracks drive the root/axial skeleton and AIR targets.
// Ground support is not an angle track: each supported toe is fixed in world space.
export function track(keys,t){
 if(t<=keys[0][0])return keys[0][1];if(t>=keys.at(-1)[0])return keys.at(-1)[1];
 const h=keys.slice(1).map((k,i)=>k[0]-keys[i][0]);
 const d=keys.slice(1).map((k,i)=>(k[1]-keys[i][1])/h[i]);
 const m=keys.map((k,i)=>{if(i===0||i===keys.length-1)return 0;if(d[i-1]*d[i]<=0)return 0;const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];return(w1+w2)/(w1/d[i-1]+w2/d[i]);});
 const i=keys.findLastIndex(k=>k[0]<=t),u=(t-keys[i][0])/h[i];
 return(2*u**3-3*u*u+1)*keys[i][1]+(u**3-2*u*u+u)*h[i]*m[i]+(-2*u**3+3*u*u)*keys[i+1][1]+(u**3-u*u)*h[i]*m[i+1];
}
export function axialAt(t){return {
 x:track([[0,0],[100,0],[200,-8],[260,-8],[360,-5],[500,-20],[800,-30],[890,-35],[1500,-35]],t),
 // Shallower load keeps the entire 17-unit hind-upper-leg capsule above ground.
 // Additive AIR-only rise: unchanged anchor -70; old apex -148; corrected apex -187.
 // No support, dimension, time, camera or scale changes. Additional offscreen rise begins only after release blends and ends at bite.
 y:track([[0,-70],[100,-70],[200,-55],[260,-58],[360,-82],[500,-148],[800,-113],[890,-79],[930,-54],[970,-64],[1120,-70],[1500,-70]],t)-track([[0,0],[360,0],[500,39],[800,0],[1500,0]],t)-track([[0,0],[420,0],[480,260],[600,260],[800,0],[1500,0]],t),
 body:track([[0,-180],[100,-180],[200,-170],[260,-156],[360,-137],[430,-160],[500,-178],[660,-199],[800,-205],[890,-187],[930,-180],[1500,-180]],t),
 neck:track([[0,-158],[100,-158],[200,-170],[360,-142],[500,-188],[660,-210],[800,-218],[890,-178],[1080,-158],[1500,-158]],t),
 head:track([[0,-180],[100,-180],[200,-185],[360,-143],[500,-190],[660,-212],[760,-220],[800,-222],[890,-190],[1080,-180],[1500,-180]],t),
 jawOpen:track([[0,0],[620,0],[700,18],[760,36],[800,0],[850,0],[900,4],[1000,0],[1500,0]],t),
 tail1:track([[0,-20],[100,-20],[200,5],[360,50],[500,20],[800,-15],[970,-25],[1380,-20],[1500,-20]],t),
 tail2:track([[0,-60],[100,-60],[200,-35],[360,30],[500,0],[800,-35],[970,-65],[1380,-60],[1500,-60]],t),
 tail3:track([[0,-115],[100,-115],[200,-75],[360,10],[500,-35],[800,-50],[970,-120],[1380,-115],[1500,-115]],t),
};}
export function ik(origin,target,a,b,bend){
 const delta=sub(target,origin),d=len(delta);
 if(d>=a+b||d<=Math.abs(a-b))throw new Error(`Unreachable IK target: ${d} not in (${Math.abs(a-b)},${a+b})`);
 const base=Math.atan2(delta[1],delta[0]),offset=Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1));
 return add(origin,[a*Math.cos(base+bend*offset),a*Math.sin(base+bend*offset)]);
}
function airRelative(t,fore,far){
 const x=fore?track([[0,20],[360,20],[500,0],[650,-8],[800,-24],[1500,-24]],t):track([[0,25],[420,25],[500,18],[650,38],[800,36],[890,27],[1500,27]],t);
 const y=fore?track([[0,46],[360,46],[500,42],[650,48],[800,38],[1500,38]],t):track([[0,48],[420,48],[500,31],[650,35],[800,38],[890,35],[1500,35]],t);
 // Keep descending forepaws behind the jaw/target. Same fixed bones and contacts.
 const biteTuck=fore?track([[0,0],[620,0],[760,28],[800,28],[890,28],[1500,28]],t):0;
 return [x+biteTuck+(far?-8:0),y+(far?-4:0)];
}
function footState(stem,origin,t){
 const s=SUPPORT[stem],fore=stem.toLowerCase().includes('fore'),far=stem.startsWith('far'),release=s.release,land=s.land;
 let toe,angle,contact;
 if(t<=release){toe=[...s.toe];angle=180-s.rollMax*smooth((t-s.rollStart)/(release-s.rollStart));contact='planted';}
 else if(t>=land){toe=[...s.landingToe];angle=180;contact='planted';}
 else{
  const airborne=add(origin,airRelative(t,fore,far));
  toe=blend(s.toe,airborne,smooth((t-release)/(fore?100:60)));
  const approach=fore?800:890;toe=blend(toe,s.landingToe,smooth((t-approach)/(land-approach)));
  const airborneAngle=fore?track([[0,148],[360,148],[500,170],[650,190],[800,180],[1500,180]],t):track([[0,146],[420,155],[500,150],[650,155],[800,160],[890,170],[1500,180]],t);
  angle=mix(180-s.rollMax,airborneAngle,smooth((t-release)/65));angle=mix(angle,180,smooth((t-approach)/(land-approach)));contact='air';
 }
 const kind=fore?'fore':'hind',ankle=sub(toe,vec(BONES[kind+'Paw'],angle)),knee=ik(origin,ankle,BONES[kind+'Upper'],BONES[kind+'Lower'],fore?-1:1);
 return {toe,ankle,knee,angle,contact,reach:len(sub(ankle,origin)),origin};
}
export function skeletonAt(ms){
 if(!Number.isFinite(ms))throw new Error('Finite time required');const t=clamp(ms,0,1500),q=axialAt(t),p={hip:[q.x,q.y]},feet={};
 p.shoulder=point(p.hip,BONES.body,q.body);p.head=point(p.shoulder,BONES.neck,q.neck);
 p.farShoulder=add(p.shoulder,rotate([-4,-4],q.body+180));p.farHip=add(p.hip,rotate([-5,-5],q.body+180));
 for(const stem of Object.keys(SUPPORT)){
  const o=stem==='fore'?'shoulder':stem==='farFore'?'farShoulder':stem==='hind'?'hip':'farHip';const foot=footState(stem,p[o],t);feet[stem]=foot;
  p[stem+'Knee']=foot.knee;p[stem+'Ankle']=foot.ankle;p[stem+'Toe']=foot.toe;
 }
 p.tailBase=point(p.hip,15,q.body+180);p.tail1=point(p.tailBase,BONES.tail1,q.tail1);p.tail2=point(p.tail1,BONES.tail2,q.tail2);p.tail3=point(p.tail2,BONES.tail3,q.tail3);
 p.muzzle=point(p.head,27,q.head);p.jawHinge=add(point(p.head,3,q.head),vec(5,q.head-90));p.jawTip=point(p.jawHinge,BONES.jaw,q.head-q.jawOpen);
 return {t,q,p,feet,phase:PHASES.findLast(([n])=>t>=n)[1]};
}
export function boneEdges(){return[['hip','shoulder','body'],['shoulder','head','neck'],...Object.keys(SUPPORT).flatMap(stem=>{const f=stem.toLowerCase().includes('fore'),a=f?'fore':'hind',o=stem==='fore'?'shoulder':stem==='farFore'?'farShoulder':stem==='hind'?'hip':'farHip';return[[o,stem+'Knee',a+'Upper'],[stem+'Knee',stem+'Ankle',a+'Lower'],[stem+'Ankle',stem+'Toe',a+'Paw']];}),['tailBase','tail1','tail1'],['tail1','tail2','tail2'],['tail2','tail3','tail3'],['jawHinge','jawTip','jaw']];}
const f=n=>Number(n.toFixed(5));const xy=p=>p.map(f).join(' ');
const line=(a,b,w,c,dash='')=>`<path d="M ${xy(a)} L ${xy(b)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${dash?' stroke-dasharray="'+dash+'"':''}/>`;
const oval=(p,rx,ry,a,c,fill='none',w=1.5)=>`<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" transform="translate(${xy(p)}) rotate(${f(a)})" fill="${fill}" stroke="${c}" stroke-width="${w}"/>`;
export function primitivesAt(ms){
 const {q,p,feet}=skeletonAt(ms),s=[];const near='#c0dceb',edge='#7fb2cb',far='#638393',bone='#f0af68';
 const L=(a,b,w,c)=>s.push({kind:'line',a,b,w,c});const O=(p,rx,ry,a,c,fill,w=1.5)=>s.push({kind:'oval',p,rx,ry,a,c,fill,w});
 function limb(stem,c){const k=feet[stem];L(k.origin,k.knee,stem.toLowerCase().includes('fore')?12:17,c);L(k.knee,k.ankle,8,c);L(k.ankle,k.toe,10,c);L(k.origin,k.knee,1.4,bone);L(k.knee,k.ankle,1.4,bone);L(k.ankle,k.toe,1.4,bone);}
 limb('farFore',far);limb('farHind',far);
 L(p.tailBase,p.tail1,12,far);L(p.tail1,p.tail2,8,far);L(p.tail2,p.tail3,5,far);
 O(avg(p.hip,p.shoulder),65,26,q.body,edge,'#193649',1.6);O(p.shoulder,25,28,q.body,edge,'#193649',1.6);
 limb('hind',near);limb('fore',near);L(p.hip,p.shoulder,1.5,bone);L(p.shoulder,p.head,19,edge);L(p.shoulder,p.head,1.5,bone);
 O(p.head,19.5,14.5,q.head,near,'#23485b',1.6);O(point(p.head,22,q.head),13.5,7.5,q.head,near,'#23485b',1.6);
 L(p.jawHinge,p.jawTip,5,near);L(p.jawHinge,p.jawTip,1.2,bone);
 const ear=add(p.head,rotate([-5,-11],q.head+180)),e1=add(ear,rotate([-6,0],q.head+180)),e2=add(ear,rotate([3,-15],q.head+180)),e3=add(ear,rotate([8,4],q.head+180));
 s.push({kind:'triangle',points:[e1,e2,e3],c:near,fill:'#23485b',w:1.5});
 const eye=add(p.head,rotate([-9,-5],q.head+180));O(eye,2.2,2.2,0,'#7ce4f0','#7ce4f0',0);
 for(const k of ['hip','shoulder','head','foreKnee','foreAnkle','hindKnee','hindAnkle','tail1','tail2'])O(p[k],2,2,0,bone,bone,.5);
 return s;
}
export function actorSvg(ms){return primitivesAt(ms).map(s=>s.kind==='line'?line(s.a,s.b,s.w,s.c):s.kind==='oval'?oval(s.p,s.rx,s.ry,s.a,s.c,s.fill,s.w):`<path d="M ${s.points.map(xy).join(' L ')} Z" fill="${s.fill}" stroke="${s.c}" stroke-width="${s.w}"/>`).join('');}
export function inkBounds(ms){
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const include=(x,y,rx,ry)=>{x0=Math.min(x0,x-rx);y0=Math.min(y0,y-ry);x1=Math.max(x1,x+rx);y1=Math.max(y1,y+ry);};
 for(const s of primitivesAt(ms))if(s.kind==='line'){include(...s.a,s.w/2,s.w/2);include(...s.b,s.w/2,s.w/2);}else if(s.kind==='oval'){const a=rad(s.a),rx=Math.hypot(s.rx*Math.cos(a),s.ry*Math.sin(a))+s.w/2,ry=Math.hypot(s.rx*Math.sin(a),s.ry*Math.cos(a))+s.w/2;include(...s.p,rx,ry);}else for(const p of s.points)include(...p,s.w,s.w);
 return {x0,y0,x1,y1};
}
export const PANEL = Object.freeze({large:{width:800,height:540,physicalWidth:420,origin:[487,460]},native:{width:360,height:260,physicalWidth:142,origin:[224,202]}});
// Fixed target at the center of the upper muzzle / lower jaw-tip closure locus.
const bitePose=skeletonAt(800).p;
export const TARGET=Object.freeze({center:avg(bitePose.muzzle,bitePose.jawTip),radius:7,poleX:-218});
export function visibilityAt(ms,kind){const b=inkBounds(ms),c=PANEL[kind],top=-c.origin[1]/(c.physicalWidth/240);return b.y1<top?'FULLY ABOVE':b.y0<top?'CROSSING TOP':'IN VIEW';}
export function targetSvg(ms){
 const [x,y]=TARGET.center,hit=ms>=800&&ms<870;
 let out=`<path d="M -230 0 H -206 M ${TARGET.poleX} 0 V ${f(y)} H ${f(x-TARGET.radius)}" fill="none" stroke="#8b7667" stroke-width="4" stroke-linecap="round"/><circle cx="${f(x)}" cy="${f(y)}" r="${TARGET.radius}" fill="#a76846" stroke="#f4c480" stroke-width="2"/><path d="M ${f(x-3)} ${f(y)} H ${f(x+3)} M ${f(x)} ${f(y-3)} V ${f(y+3)}" stroke="#ffedb8" stroke-width="1.5"/>`;
 if(hit)out+=`<circle cx="${f(x)}" cy="${f(y)}" r="11" fill="none" stroke="#ffdc82" stroke-width="1.5"/>`;
 return out;
}
export function panelSvg(ms,kind,model=null){
 const cfg=PANEL[kind],{width,height,physicalWidth,origin}=cfg,scale=physicalWidth/240,sk=model?model.skeletonAt(ms):skeletonAt(ms),actor=model?model.actorSvg(ms):actorSvg(ms);
 let out=`<svg x="0" y="0" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" overflow="hidden"><rect width="100%" height="100%" fill="#122737"/><path d="M 0 ${height*.42} L ${width*.2} ${height*.32} L ${width*.39} ${height*.43} L ${width*.62} ${height*.27} L ${width} ${height*.42} V ${origin[1]} H 0 Z" fill="#162d3b"/><path d="M 0 ${origin[1]} H ${width}" stroke="#71817e" stroke-width="1"/><g transform="translate(${xy(origin)}) scale(${scale})">${targetSvg(ms)}`;
 for(const k of Object.values(sk.feet))if(k.contact==='planted')out+=`<circle cx="${f(k.toe[0])}" cy="0" r="3" fill="#84e7b1"/>`;
 out+=actor+'</g>';
 out+=`<rect x=".75" y=".75" width="${width-1.5}" height="${height-1.5}" fill="none" stroke="#6c98ad" stroke-width="1.5"/><text x="12" y="22" fill="#b9d5e3" font-size="${kind==='large'?15:12}">BATTLE VIEWPORT / fixed camera / ${physicalWidth}px</text><text x="${Math.max(8,origin[0]+TARGET.poleX*scale-12)}" y="${origin[1]+20}" fill="#f4c480" font-size="${kind==='large'?13:10}">DUMMY TARGET</text><text x="12" y="${height-12}" fill="#7fa0b4" font-size="${kind==='large'?13:10}">Ground stays visible. Only top-edge exit is intentional.</text></svg>`;return out;
}
const text=(x,y,s,size=18,c='#dbe9f2')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}">${s}</text>`;
export function frameSvg(ms,{playback='PAUSED'}={}){
 const {phase,feet}=skeletonAt(ms),t=clamp(ms,0,1500);let out=`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="DejaVu Sans,sans-serif"><rect width="1280" height="800" fill="#091725"/>`;
 out+=text(28,39,'MOONLIT BITE / OFFSCREEN LEAP',25)+text(28,70,'Temporary mechanics model. One continuous battle view, not a movie cutaway.',18,'#f0bd7d')+text(28,101,`${playback} | ${t.toFixed(1)} / 1500 ms | ${phase}`,19,'#9ccbdc');
 out+=`<g transform="translate(28 125)">${panelSvg(t,'large')}</g><g transform="translate(856 125)">${panelSvg(t,'native')}</g>`;
 out+=text(856,415,`Large: ${visibilityAt(t,'large')}`,17)+text(856,441,`Native: ${visibilityAt(t,'native')}`,17);
 let y=479;for(const [k,v]of Object.entries(feet)){out+=text(856,y,`${k}: ${v.contact==='planted'?'PLANTED':'AIR'}`,15,v.contact==='planted'?'#84e7b1':'#aac0d0');y+=24;}
 out+=text(856,594,'Marked dummy bite: 800 ms',16,'#f0bd7d')+text(856,620,'Offline render. Browser untested.',14,'#a5b8c7');
 out+=`<path d="M 28 698 H 1216" stroke="#344d62" stroke-width="4"/><path d="M 28 698 H ${28+1188*t/1500}" stroke="#82d8c6" stroke-width="4"/>`;
 for(const [n,label]of [[0,'LOAD'],[360,'TAKEOFF'],[500,'OFFSCREEN'],[800,'BITE'],[970,'LAND'],[1500,'RECOVER']])out+=`<circle cx="${28+1188*n/1500}" cy="698" r="4" fill="${n===800?'#f0bd7d':'#a1bacd'}"/>`+text(Math.max(28,Math.min(1136,28+1188*n/1500-18)),727,label,12,'#a6bccc');
 out+=text(28,766,'Fixed bones, model size and camera. Intentional top clipping only. No original artwork or game integration.',15,'#adbfcd');return out+'</svg>';
}
