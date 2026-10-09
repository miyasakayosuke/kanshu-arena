import { useState } from 'react';
import { monsters, cost, leaderFor } from './engine';
import { rules, monsterRole, saveTeamSlots, isValidTeam, type RuleId, type TeamSlot } from './strategy';

type Props = { slots: (TeamSlot | null)[]; setSlots: (slots: (TeamSlot | null)[]) => void; team: number[]; setTeam: (team: number[]) => void; rule: RuleId; setRule: (rule: RuleId) => void; onFocus: (id: number) => void; notice: string; setNotice: (message: string) => void; practice: boolean; leavePractice: () => void };
export default function TeamBuilder({slots,setSlots,team,setTeam,rule,setRule,onFocus,notice,setNotice,practice,leavePractice}:Props) {
  const [filter,setFilter]=useState('');
  const [role,setRole]=useState('all');
  const [sort,setSort]=useState('id');
  const [leaderFilter,setLeaderFilter]=useState('all');
  const [costFilter,setCostFilter]=useState('all');
  const budget=rules[rule].budget;
  const leader=team.length ? leaderFor(team[0]) : null;
  const visible=monsters.filter(m=>{
    const trait=leaderFor(m.id);
    const query=filter.trim().toLocaleLowerCase();
    return (!query || `${m.name} ${trait.name} ${trait.description} ${m.skills.map(s=>s.name).join(' ')}`.toLocaleLowerCase().includes(query))
      && (role==='all' || m.skills.some(s=>role==='fast'?s.priority>=2:role==='anchor'?s.priority<0:role==='area'?s.all:role==='break'?s.breaksGuard:s.kind===role))
      && (leaderFilter==='all' || trait.stat===leaderFilter)
      && (costFilter==='all' || (costFilter==='fit' ? !team.includes(m.id) && team.length<5 && cost(team)+m.cost<=budget : m.cost===Number(costFilter)));
  }).sort((a,b)=>sort==='speed'?b.speed-a.speed:sort==='hp'?b.hp-a.hp:sort==='atk'?b.atk-a.atk:sort==='cost'?a.cost-b.cost:a.id-b.id);
  const save=(index:number)=>{
    if(!isValidTeam(team,budget)) return;
    const next=slots.map((slot,i)=>i===index?{team:[...team],rule}:slot);
    setSlots(next);
    let stored=false;try{stored=saveTeamSlots(localStorage,next);}catch{/* Blocked storage still permits this-session experimentation. */}
    setNotice(stored?`編成${index+1}に保存しました`:'このブラウザでは保存できません。再読み込みするまでは呼び出せます。');
  };
  const load=(index:number)=>{
    const slot=slots[index];if(!slot)return;
    setRule(slot.rule);setTeam([...slot.team]);setNotice(`編成${index+1}を呼び出しました`);
  };
  return <main className="home">
    <div className="intro"><span className="eyebrow">TEAM & BESTIARY</span><h2>編成・図鑑</h2><p>リーダーと役割を選んで、5体を組み合わせよう。</p></div>
    <div className="ruleTabs" aria-label="対戦ルール">{Object.values(rules).map(value=><button key={value.id} aria-pressed={rule===value.id} onClick={()=>setRule(value.id)}><strong>{value.name}</strong><small>COST {value.budget}</small></button>)}</div>
    <p className="hint ruleHint">{rules[rule].description}</p>
    {practice&&<div className="practiceNotice">同じ相手・同じ条件で再挑戦 <button onClick={leavePractice}>通常の対戦へ</button></div>}
    <section className="partyCard"><div className="sectionTitle">出場パーティ <span>{team.length}/5体 <b className={cost(team)>budget?'overBudget':''}>COST {cost(team)}/{budget}</b></span></div>
      <div className="team">{team.map((id,index)=><button key={id} className={`teamUnit ${index===0?'teamLeader':''}`} aria-label={`${monsters[id].name}の詳細`} onClick={()=>onFocus(id)}><small>{index===0?'LEADER':`0${index+1}`}</small><span>{monsters[id].icon}</span><i>C{monsters[id].cost}</i></button>)}{Array.from({length:5-team.length},(_,i)=><div className="empty" key={i}>＋</div>)}</div>
      {leader&&<div className="leaderBanner"><span>✦ {leader.name}</span><small>{leader.description}</small></div>}
      <p className="hint">先頭がリーダー。詳細から変更できます。入れ替えは1体外して追加。</p>
      {cost(team)>budget&&<p className="budgetWarning" role="status">あとCOST {cost(team)-budget}減らすと出場できます。</p>}
    </section>
    <section className="savedTeams" aria-label="保存した編成"><div className="sectionTitle">編成メモ <span>このブラウザに3枠保存</span></div><div className="slotGrid">{slots.map((slot,i)=><div className="teamSlot" key={i}><strong>編成 {i+1}</strong><span className="slotIcons">{slot?slot.team.map(id=>monsters[id].icon).join(''):'未保存'}</span><small>{slot?`${rules[slot.rule].name} · C${cost(slot.team)}`:'リーダーも保存'}</small><div><button aria-label={`編成${i+1}を呼び出す`} disabled={!slot} onClick={()=>load(i)}>呼出</button><button aria-label={`編成${i+1}に保存`} disabled={!isValidTeam(team,budget)} onClick={()=>save(i)}>{slot?'上書き':'保存'}</button></div></div>)}</div><p className="saveNotice" role="status">{notice||'試した編成を残して、いつでも組み替え。'}</p></section>
    <div className="sectionTitle">モンスター図鑑 <span>{visible.length} / {monsters.length}体</span></div>
    <div className="tools"><input aria-label="検索" placeholder="名前・特技・リーダーを検索" value={filter} onChange={e=>setFilter(e.target.value)}/><select aria-label="並べ替え" value={sort} onChange={e=>setSort(e.target.value)}><option value="id">図鑑順</option><option value="speed">素早さ順</option><option value="hp">HP順</option><option value="atk">攻撃力順</option><option value="cost">低コスト順</option></select></div>
    <div className="filterChips" aria-label="特技で絞り込み">{[['all','すべて'],['fast','先制'],['anchor','アンカー'],['heal','回復'],['area','全体'],['poison','毒'],['protect','味方を守る'],['cleanse','毒解除'],['break','防御解除'],['guard','防御']].map(([value,label])=><button key={value} aria-pressed={role===value} onClick={()=>setRole(value)}>{label}</button>)}</div>
    <div className="advancedFilters"><select aria-label="リーダー効果で絞り込み" value={leaderFilter} onChange={e=>setLeaderFilter(e.target.value)}><option value="all">全リーダー効果</option><option value="hp">HPアップ</option><option value="atk">攻撃アップ</option><option value="speed">素早さアップ</option></select><select aria-label="コストで絞り込み" value={costFilter} onChange={e=>setCostFilter(e.target.value)}><option value="all">全コスト</option><option value="2">COST 2</option><option value="3">COST 3</option><option value="4">COST 4</option><option value="fit">空き枠に追加可能</option></select><button aria-label="絞り込みをリセット" onClick={()=>{setFilter('');setRole('all');setLeaderFilter('all');setCostFilter('all');setSort('id');}}>リセット</button></div>
    <div className="roster">{visible.map(m=><button className={`rosterItem ${team.includes(m.id)?'selected':''}`} key={m.id} aria-label={`${m.name}の詳細`} onClick={()=>onFocus(m.id)}><span className="avatar">{m.icon}</span><span className="rosterText"><strong>{m.name}</strong><small>HP {m.hp} · MP {m.mp}</small><small>ATK {m.atk} · SPD {m.speed}</small><em>{monsterRole(m.id).name}</em><small className="leaderTag">L · {leaderFor(m.id).description}</small></span><span className="cost">C{m.cost}<br/>{team.includes(m.id)?'✓':'＋'}</span></button>)}</div>
    {!visible.length&&<p className="emptySearch">該当するモンスターがいません。検索や絞り込みを変えてみてください。</p>}
  </main>;
}
