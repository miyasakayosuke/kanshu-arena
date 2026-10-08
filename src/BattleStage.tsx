import {useEffect,useRef} from 'react';
import type {Unit} from './engine';
type Effect={text:string;type:string;tick:number}|null;
export default function BattleStage({allies,enemies,effect}:{allies:Unit[];enemies:Unit[];effect:Effect}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const el=canvas.current;if(!el)return;const ctx=el.getContext('2d');if(!ctx)return;
 let frame=0;let handle=0;let last=0;const duration=1100;
 const draw=(now:number)=>{if(!last)last=now;const t=now/1000;const phase=effect?Math.min(1,(now-last)/duration):0;const w=el.width=720,h=el.height=680;
 const shake=effect&&phase>.42&&phase<.72?Math.sin(now*.14)*10*(1-phase):0;
 ctx.save();ctx.translate(shake,shake*.5);
 const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#111c36');bg.addColorStop(.55,'#283d53');bg.addColorStop(1,'#101c2e');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 for(let i=0;i<22;i++){const x=(i*79+31)%w,y=(i*47+21)%320;ctx.fillStyle='rgba(255,230,164,.12)';ctx.beginPath();ctx.arc(x,y,1.2+Math.sin(t+i)*.6,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#3b4c56';ctx.beginPath();ctx.ellipse(w/2,440,370,125,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b9a06a';ctx.lineWidth=3;ctx.stroke();
 for(let k=0;k<3;k++){ctx.strokeStyle='rgba(240,213,139,.16)';ctx.beginPath();ctx.ellipse(w/2,440,140+k*95,45+k*30,0,0,Math.PI*2);ctx.stroke()}
 const zoom=effect?1+Math.sin(phase*Math.PI)*.09:1;ctx.translate(w/2,h/2);ctx.scale(zoom,zoom);ctx.translate(-w/2,-h/2);
 const drawTeam=(units:Unit[],enemy:boolean)=>units.forEach((u,i)=>{const x=110+i*125+(enemy?0:0),baseY=enemy?238:490;const alive=u.hp>0;const bob=alive?Math.sin(t*2.5+i)*5:0;const attacker=effect&&((enemy&&effect.tick%2===1)||(!enemy&&effect.tick%2===0))&&i===effect.tick%5;
 const lunge=attacker?Math.sin(phase*Math.PI)*(enemy?65:-65):0;
 const y=baseY+bob+lunge;
 ctx.save();ctx.globalAlpha=alive?1:.22;
 ctx.fillStyle='#0b1226aa';ctx.beginPath();ctx.ellipse(x,baseY+44,42,11,0,0,Math.PI*2);ctx.fill();
 if(effect&&phase>.47&&phase<.75&&!attacker&&i===effect.tick%5){ctx.translate(Math.sin(now*.13)*10,0)}
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='70px system-ui';ctx.shadowColor=enemy?'#f26b6b':'#69caff';ctx.shadowBlur=attacker?30:8;ctx.fillText(u.monster.icon,x,y);ctx.shadowBlur=0;
 ctx.fillStyle='#070f1c';ctx.fillRect(x-44,baseY+57,88,10);ctx.fillStyle=enemy?'#eb7467':'#5ad6a3';ctx.fillRect(x-43,baseY+58,86*u.hp/u.monster.hp,8);
 ctx.fillStyle='#fff4dc';ctx.font='bold 16px system-ui';ctx.fillText(u.monster.name,x,baseY+82);ctx.restore()});
 drawTeam(enemies,true);drawTeam(allies,false);
 if(effect){const colors:Record<string,string[]>={fire:['#ffeb7a','#ff4e1e'],water:['#ddffff','#2da7ff'],shadow:['#e8b3ff','#7428cc'],wind:['#c7ffe7','#2fe1a4'],guard:['#fff5c2','#d5a94c'],slash:['#fff','#ffda84']};const c=colors[effect.type]??colors.slash;
 const cx=w/2,cy=320;const power=Math.sin(phase*Math.PI);ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=0;i<36;i++){const a=i*2.399+effect.tick;const r=power*(30+(i*17)%175);const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.7;ctx.globalAlpha=power*(.3+(i%4)*.16);ctx.fillStyle=c[i%2];ctx.beginPath();ctx.arc(x,y,(i%3+1)*power*10,0,Math.PI*2);ctx.fill()}
 ctx.globalAlpha=power*.85;const glow=ctx.createRadialGradient(cx,cy,5,cx,cy,170*power+5);glow.addColorStop(0,c[0]);glow.addColorStop(.35,c[1]);glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,170*power+5,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.fillStyle='#fff4cf';ctx.strokeStyle='#131b2d';ctx.lineWidth=7;ctx.font='bold 33px system-ui';ctx.textAlign='center';ctx.strokeText(effect.text,cx,110);ctx.fillText(effect.text,cx,110);
 if(phase>.55&&phase<.9){ctx.fillStyle='#fff8c7';ctx.font='bold 31px system-ui';ctx.fillText('HIT!',cx,360-(phase-.55)*100)}
 }
 ctx.restore();frame++;handle=requestAnimationFrame(draw)};
 handle=requestAnimationFrame(draw);return()=>cancelAnimationFrame(handle)
 },[allies,enemies,effect]);
 return <canvas className="battleCanvas" ref={canvas} aria-label="モンスターが攻撃・被弾する戦闘フィールド"/>;
}