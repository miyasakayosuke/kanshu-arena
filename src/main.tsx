import React,{useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {monsters,cost,start,advanceWithEvents,type State,type Order,type BattleEvent} from './engine';
import './style.css';
import BattleStage from './BattleStage';
const initial=[0,2,3,4,6];
function App(){
const [team,setTeam]=useState<number[]>(initial);
const [page,setPage]=useState<'home'|'battle'>('home');
const [battle,setBattle]=useState<State|null>(null);
const [orders,setOrders]=useState<Record<string,number>>({});
const [focus,setFocus]=useState<number|null>(null);
const [filter,setFilter]=useState('');
const [sort,setSort]=useState('id');
const [round,setRound]=useState(0);
const [showLog,setShowLog]=useState(false);
const [effect,setEffect]=useState<{text:string;type:string;tick:number}|null>(null);
const [playing,setPlaying]=useState(false);
const [impact,setImpact]=useState<BattleEvent|null>(null);
const timers=useRef<ReturnType<typeof setTimeout>[]>([]);
useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
const choose=(id:number)=>{if(team.includes(id)){setTeam(team.filter(x=>x!==id));return}if(team.length>=5||cost([...team,id])>17)return;setTeam([...team,id])};
const begin=()=>{const opponents=[[1,5,8,10,6],[11,9,4,7,10],[0,3,1,6,2]][round%3];setBattle(start(team,opponents,round+20261008));setOrders({});setPage('battle')};
const execute=()=>{if(!battle||playing)return;
 const cmds:Order[]=battle.allies.filter(x=>x.hp>0).map(x=>({key:x.key,skill:orders[x.key]??0}));
 const {state:next,events}=advanceWithEvents(battle,cmds);
 setPlaying(true);setOrders({});setImpact(null);timers.current.forEach(clearTimeout);timers.current=[];
 let offset=0;let cast=0;
 for(const event of events){
   if(event.kind==='cast'){
     const name=event.skill??'攻撃';
     const type=/炎|火|灼熱|狐火/.test(name)?'fire':/毒|影|冥府|悲鳴/.test(name)?'shadow':/水|雫|回復/.test(name)?'water':/風|翼|疾風|旋風|嵐/.test(name)?'wind':/鉄壁|構え/.test(name)?'guard':'slash';
     const tick=cast++;const at=offset;
     timers.current.push(setTimeout(()=>{setImpact(event);setEffect({text:name,type,tick})},at));
     offset+=650;
   }else if(event.kind==='damage'||event.kind==='heal'||event.kind==='defeat'){
     const at=offset;timers.current.push(setTimeout(()=>{
       setImpact(event);
       if(event.target&&event.hp!==undefined){setBattle(prev=>prev?{...prev,allies:prev.allies.map(u=>u.key===event.target?{...u,hp:event.hp!}:u),enemies:prev.enemies.map(u=>u.key===event.target?{...u,hp:event.hp!}:u)}:prev)}
     },at));offset+=event.kind==='defeat'?250:360;
   }
 }
 timers.current.push(setTimeout(()=>{setEffect(null);setImpact(null);setBattle(next);setPlaying(false)},offset+450));
};
const visible=monsters.filter(m=>m.name.includes(filter)||m.skills.some(s=>s.name.includes(filter))).sort((a,b)=>sort==='speed'?b.speed-a.speed:sort==='hp'?b.hp-a.hp:sort==='cost'?a.cost-b.cost:a.id-b.id);
return <div className="app"><header><div className="eyebrow">KANSHU ARENA · VERSION 0.2 PREVIEW</div><h1>環獣のアリーナ</h1><div className="sub">勝負は、編成から。</div></header>
{page==='home'&&<main><div className="sectionTitle">あなたの編成 <span>{team.length}/5体 · COST {cost(team)}/17</span></div><div className="team">{team.map(id=><button key={id} className="teamUnit" onClick={()=>setFocus(id)}><span>{monsters[id].icon}</span></button>)}{Array.from({length:5-team.length},(_,i)=><div className="empty" key={i}>＋</div>)}</div><p className="hint">モンスターをタップして能力を確認。下の一覧で編成を変更できます。</p><div className="sectionTitle">モンスター図鑑 <span>{monsters.length}体</span></div><div className="tools"><input aria-label="検索" placeholder="名前・特技で検索" value={filter} onChange={e=>setFilter(e.target.value)}/><select aria-label="並べ替え" value={sort} onChange={e=>setSort(e.target.value)}><option value="id">図鑑順</option><option value="speed">素早さ順</option><option value="hp">HP順</option><option value="cost">低コスト順</option></select></div><div className="roster">{visible.map(m=><button className={'rosterItem '+(team.includes(m.id)?'selected':'')} key={m.id} onClick={()=>setFocus(m.id)}><span className="avatar">{m.icon}</span><span className="rosterText"><strong>{m.name}</strong><small>HP {m.hp} · 攻撃 {m.atk} · 速さ {m.speed}</small></span><span className="cost">C{m.cost}<br/>{team.includes(m.id)?'✓':'＋'}</span></button>)}</div></main>}
{page==='battle'&&battle&&<main className="battle"><div className="sectionTitle">闘技場 <span>TURN {battle.turn}</span></div><BattleStage allies={battle.allies} enemies={battle.enemies} effect={effect} impact={impact}/><div className="battleStatus">敵残存 {battle.enemies.filter(u=>u.hp>0).length}/5　｜　味方残存 {battle.allies.filter(u=>u.hp>0).length}/5</div>{battle.winner?<div className="result"><h2>{battle.winner==='win'?'勝利！':battle.winner==='lose'?'敗北…':'引き分け'}</h2><button className="primary" onClick={()=>{setRound(round+1);setPage('home')}}>編成に戻る</button></div>:<div className="commands">{battle.allies.filter(u=>u.hp>0).map(u=><div className="command" key={u.key}><span>{u.monster.icon} {u.monster.name}</span><select aria-label={u.monster.name+'の技'} value={orders[u.key]??0} onChange={e=>setOrders({...orders,[u.key]:Number(e.target.value)})}>{u.monster.skills.map((s,i)=><option value={i} key={i}>{s.name}{s.priority>0?' ⚡':s.priority<0?' ⏳':''}</option>)}</select></div>)}<button className="primary" disabled={playing} onClick={execute}>{playing?'特技発動中…':'この指示でターン開始'}</button></div>}<button className="secondary" onClick={()=>setShowLog(!showLog)}>{showLog?'戦闘ログを閉じる':'戦闘ログを見る'}</button>{showLog&&<div className="log">{battle.log.slice(-35).map((line,i)=><div key={i}>{line}</div>)}</div>}<button className="textButton" disabled={playing} onClick={()=>setPage('home')}>対戦を中断して編成へ</button></main>}
{focus!==null&&<div className="overlay" onClick={()=>setFocus(null)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setFocus(null)}>×</button><div className="heroIcon">{monsters[focus].icon}</div><h2>{monsters[focus].name}</h2><p>コスト {monsters[focus].cost}　HP {monsters[focus].hp}　攻撃 {monsters[focus].atk}　速さ {monsters[focus].speed}</p><h3>特技</h3>{monsters[focus].skills.map(s=><div className="skill" key={s.name}>{s.name} <small>{s.priority>0?'先制':s.priority<0?'アンカー':''}　威力 {s.power}</small></div>)}<button className="secondary" onClick={()=>{choose(focus);setFocus(null)}}>{team.includes(focus)?'編成から外す':'編成に加える'}</button></div></div>}
{page==='home'&&<footer><button className="primary" disabled={team.length!==5} onClick={begin}>この編成で対戦する　→</button></footer>}</div>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
