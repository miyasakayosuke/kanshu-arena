import{defineConfig}from'vite';import react from'@vitejs/plugin-react';import{fileURLToPath}from'node:url';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const expected={
 'src/engine.ts':'fed8293f9bb4894ae988f2f178531631a49dab79',
 'src/playback.ts':'28e1911224abef508c270c7dc53206d15fd2fdae',
 'src/battleMotion.ts':'a2c020e7ad54f14b82b73f78cdfc9b461a8c3b22',
 'src/App.tsx':'f1a4127cbf2cbcafea279bc10758d418b44a6e11',
 'src/navigation.ts':'bef0448dd63a4a2749833601939504a4c78ad61c',
 'src/style.css':'1a1a10ca3b13d0231db7085c05f66d1960707b73',
 'src/enemyFormation.ts':'779232829eddd60cab2c2f11957e5ffa791b28c9',
 'src/BattleStage.tsx':'b8a14bc2384be86f3a1717c3ba6202acf7022133',
 'src/MonsterArt.tsx':'9b09fc236e1f9f70d3b72097c6b19d1a8b0b4efc',
};
for(const[path,sha]of Object.entries(expected)){const b=readFileSync(root+path),got=createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');if(got!==sha)throw Error('Accepted-main source mismatch '+path);}
function once(code,from,to){if(code.split(from).length!==2)throw Error('Expected one fixture hook: '+from);return code.replace(from,to);}
export function transformFixture(code,id){
 if(id.endsWith('/src/App.tsx')){
 code=once(code,'const [battle, setBattle] = useState<State | null>(null)',"const [battle, setBattle] = useState<State | null>(() => start([0,1,2,3,4], (window as any).__biteLifecycle.row === 'rear' ? [5,12,18,20,23] : [12,5,18,20,23], (window as any).__biteLifecycle.row === 'rear' ? 1 : 0, {leaders:true}))");
 code=once(code,'const [playing, setPlaying] = useState(false);','const [playing, setPlaying] = useState(false);\n  useEffect(() => () => (window as any).__biteLifecycle.clear("unmount"), []);');
 code=once(code,'const begin = () => {','const begin = () => {\n    (window as any).__biteLifecycle.clear("new-match");');
 code=once(code,'const discardBattle = () => {','const discardBattle = () => {\n    (window as any).__biteLifecycle.clear("discard");');
 code=once(code,'const finishPlayback = () => {','const finishPlayback = () => {\n    (window as any).__biteLifecycle.finish(latestResult.current);');
 code=once(code,'const execute = (timeout = false) => {','const execute = async (timeout = false) => {');
 code=once(code,'playingLock.current = true; commandDeadline.current = null;','playingLock.current = true; commandDeadline.current = null;\n    const qaTicket=(window as any).__biteLifecycle.prepare();');
 code=once(code,'const playbackStartedAt = Date.now();','if (!await (window as any).__biteLifecycle.beforeClock(qaTicket, {timeline, events:result.events, before:battle, after:result.state, speed}) || id!==playbackId.current || !playingLock.current) return;\n    const playbackStartedAt = Date.now();\n    (window as any).__biteLifecycle.started(playbackStartedAt);');
 code=once(code,'const updates = [...(cue.updates ?? []), ...cue.impacts];','const updates = [...(cue.updates ?? []), ...cue.impacts];\n        (window as any).__biteLifecycle.cue({cueIndex,cue,updates,at:Date.now(),id});');
 code=once(code,'timeoutAction.current = () => execute(true);','timeoutAction.current = () => execute(true);\n  (window as any).__biteLifecycle.observe({battle,playing,visualCast,impact,playbackId:playbackId.current});');
 return code;
 }
 if(id.endsWith('/src/navigation.ts'))return once(code,"useState<Screen>(() => readScreen() === 'battle' ? 'arena' : readScreen())","useState<Screen>('battle')");
 if(id.endsWith('/src/BattleStage.tsx')){
 code=once(code,"const motion = actorId === 36", "const qaBite=(window as any).__biteLifecycle.frame({event:cast?.event,actorId,alive:!!caster&&caster.hp>0,age,reduced,now});\n      const motion = actorId === 36");
 code=once(code,'const attacker = cast?.event.actor === unit.key && motion.phase !== \'rest\';',"const qaActor=qaBite.eligible && cast?.event.actor===unit.key;\n        const attacker = !qaActor && cast?.event.actor === unit.key && motion.phase !== 'rest';");
 code=once(code,'const shake = latestHit ?', 'const shake = !qaBite.eligible && latestHit ?');
 code=once(code,'const zoom = 1 + motion.camera;', 'const zoom = 1 + (qaBite.eligible ? 0 : motion.camera);');
 code=once(code,'if ((unit.monster.id===0 && yokoRig.ready)', 'if ((unit.monster.id===12 && (window as any).__biteLifecycle.originalReady) || (unit.monster.id===0 && yokoRig.ready)');
 code=once(code,'const rigDrawn=unit.monster.id===0?',"const studyDrawn=unit.monster.id===12 && (window as any).__biteLifecycle.draw(ctx,{unit,index,foot,bodyScale,width,canvas:element,qaBite,cast:cast?.event,age,reduced});\n          const rigDrawn=studyDrawn || (unit.monster.id===0?");
 code=once(code,'sampleFenrirBattlePose(rigFrame),rigTarget):false;','sampleFenrirBattlePose(rigFrame),rigTarget):false);');
 code=once(code,'if(!rigDrawn && characterImage?.complete && characterImage.naturalWidth>0) ctx.drawImage(characterImage, -width / 2, top, width, height);','if(!rigDrawn && characterImage?.complete && characterImage.naturalWidth>0) ctx.drawImage(characterImage, -width / 2, top, width, height);\n          if(!studyDrawn) (window as any).__biteLifecycle.ordinary(rigDrawn ? "rig" : characterImage?.complete && characterImage.naturalWidth>0 ? "image" : "none",unit);');
 code=once(code,'ctx.fillText(unit.monster.icon, 0, 0);','ctx.fillText(unit.monster.icon, 0, 0);\n          (window as any).__biteLifecycle.ordinary("emoji",unit);');
 // The existing slash travels independently. Omit it only during this exact bite diagnostic.
 code=once(code,"if (cast && cast.event.scope !== 'all' && (locate", "if (!qaBite.eligible && cast && cast.event.scope !== 'all' && (locate");
 return code;
 }
}
export default defineConfig({root,base:'/',server:{host:'127.0.0.1',port:8885,strictPort:true},plugins:[{name:'opt-in-fenrir-combat-lifecycle',enforce:'pre',transform:transformFixture},react()]});
