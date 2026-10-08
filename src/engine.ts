export type Skill={name:string;power:number;priority:number;kind:'hit'|'heal'|'guard'|'poison';all?:boolean};
export type Monster={id:number;name:string;icon:string;cost:number;hp:number;atk:number;speed:number;skills:Skill[]};
const hit=(name:string,power:number,priority=0,all=false):Skill=>({name,power,priority,kind:'hit',all});
const heal:Skill={name:'生命の雫',power:65,priority:0,kind:'heal'};
const guard:Skill={name:'鉄壁の構え',power:0,priority:1,kind:'guard'};
const poison:Skill={name:'毒霧',power:12,priority:0,kind:'poison',all:true};
export const monsters:Monster[]=[
[0,'妖狐','🦊',4,150,47,85,[hit('狐火',55),hit('疾風斬り',38,2),hit('炎嵐',28,0,true)]],
[1,'トロル','🪨',3,250,53,23,[hit('巨人の鉄槌',65),hit('終焉の一撃',110,-2),guard]],
[2,'バステト','🐈',3,170,30,57,[hit('爪撃',45),heal,guard]],
[3,'ドリュアス','🌳',3,180,35,67,[hit('樹海の槍',60),heal,poison]],
[4,'バンシー','👻',3,155,38,75,[hit('悲鳴',54),poison,hit('影縫い',35,2)]],
[5,'ケツァルコアトル','🐉',4,200,52,47,[hit('竜の牙',65),hit('嵐の息吹',34,0,true),guard]],
[6,'ガルーダ','🦅',2,138,39,96,[hit('急降下',48),hit('先制の翼',35,2),hit('旋風',25,0,true)]],
[7,'セルキー','🦭',4,190,34,61,[hit('水刃',55),heal,guard]],
[8,'イフリート','🔥',3,187,52,42,[hit('灼熱拳',69),hit('火炎旋風',33,0,true),hit('終焉の一撃',99,-2)]],
[9,'烏天狗','🐦',3,166,41,79,[hit('風切り',51),hit('疾風斬り',36,2),poison]],
[10,'ナーガ','🐍',2,185,33,39,[hit('蛇牙',48),poison,guard]],
[11,'アヌビス','🐺',4,172,54,76,[hit('冥府の刃',68),hit('影斬り',40,2),hit('終焉の一撃',105,-2)]]
].map(([id,name,icon,cost,hp,atk,speed,skills])=>({id:id as number,name:name as string,icon:icon as string,cost:cost as number,hp:hp as number,atk:atk as number,speed:speed as number,skills:skills as Skill[]}));
export type Unit={key:string;monster:Monster;hp:number;guard:boolean;poison:number};
export type State={turn:number;seed:number;allies:Unit[];enemies:Unit[];log:string[];winner:null|'win'|'lose'|'draw'};
export type Order={key:string;skill:number;target?:string};
export const cost=(team:number[])=>team.reduce((n,id)=>n+(monsters[id]?.cost??0),0);
export const start=(team:number[],enemy:number[],seed=42):State=>({turn:1,seed,allies:team.map((id,i)=>({key:'a'+i,monster:monsters[id],hp:monsters[id].hp,guard:false,poison:0})),enemies:enemy.map((id,i)=>({key:'e'+i,monster:monsters[id],hp:monsters[id].hp,guard:false,poison:0})),log:['戦闘開始！'],winner:null});
const random=(seed:number)=>((Math.imul(seed,1664525)+1013904223)>>>0);
export function advance(old:State,orders:Order[]):State{
 if(old.winner)return old;
 const b:State={...old,allies:old.allies.map(x=>({...x,guard:false})),enemies:old.enemies.map(x=>({...x,guard:false})),log:[...old.log,`── TURN ${old.turn} ──`]};
 let seed=b.seed;const actions:{unit:Unit;skill:Skill;side:'a'|'e';target?:string;tie:number}[]=[];
 for(const [side,units] of [['a',b.allies],['e',b.enemies]] as const){for(const u of units){if(u.hp<=0)continue;const order=orders.find(o=>o.key===u.key);const index=side==='e'?seed%u.monster.skills.length:order?.skill??0;const skill=u.monster.skills[index]??u.monster.skills[0];seed=random(seed);actions.push({unit:u,skill,side,target:order?.target,tie:seed})}}
 actions.sort((a,c)=>c.skill.priority-a.skill.priority||c.unit.monster.speed-a.unit.monster.speed||a.tie-c.tie);
 for(const a of actions){const u=a.unit;if(u.hp<=0)continue;const opponents=a.side==='a'?b.enemies:b.allies;const friends=a.side==='a'?b.allies:b.enemies;
 b.log.push(`${u.monster.name}の「${a.skill.name}」！`);
 if(a.skill.kind==='guard'){u.guard=true;continue}
 if(a.skill.kind==='heal'){const t=friends.filter(x=>x.hp>0).sort((x,y)=>x.hp/x.monster.hp-y.hp/y.monster.hp)[0];if(t){const value=Math.min(a.skill.power,t.monster.hp-t.hp);t.hp+=value;b.log.push(`${t.monster.name} HP +${value}`)}continue}
 const living=opponents.filter(x=>x.hp>0);if(!living.length)continue;const targets=a.skill.all?living:[living.find(x=>x.key===a.target)??living[seed%living.length]];
 for(const t of targets){seed=random(seed);const dmg=Math.max(1,Math.floor((a.skill.power+u.monster.atk*.38)*(0.9+(seed%21)/100)*(t.guard?.5:1)));t.hp=Math.max(0,t.hp-dmg);b.log.push(`${t.monster.name}に ${dmg} ダメージ${t.hp===0?'・撃破！':''}`);if(a.skill.kind==='poison'&&t.hp>0){t.poison=3;b.log.push(`${t.monster.name}は毒を受けた`)}}
 }
 for(const u of [...b.allies,...b.enemies])if(u.hp>0&&u.poison>0){const dmg=Math.max(1,Math.floor(u.monster.hp*.06));u.hp=Math.max(0,u.hp-dmg);u.poison--;b.log.push(`${u.monster.name}は毒で${dmg}ダメージ`)}
 const aliveA=b.allies.some(x=>x.hp>0),aliveE=b.enemies.some(x=>x.hp>0);
 b.winner=!aliveA&&!aliveE?'draw':!aliveA?'lose':!aliveE?'win':null;
 if(!b.winner&&b.turn>=20){const sum=(units:Unit[])=>units.reduce((n,u)=>n+u.hp/u.monster.hp,0);b.winner=sum(b.allies)===sum(b.enemies)?'draw':sum(b.allies)>sum(b.enemies)?'win':'lose'}
 if(b.winner)b.log.push(b.winner==='win'?'勝利！':b.winner==='lose'?'敗北…':'引き分け');b.turn++;b.seed=seed;return b;
}