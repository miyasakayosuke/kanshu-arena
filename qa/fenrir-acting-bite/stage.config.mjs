import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url));
const expected={
 'src/App.tsx':'f1a4127cbf2cbcafea279bc10758d418b44a6e11',
 'src/navigation.ts':'bef0448dd63a4a2749833601939504a4c78ad61c',
 'src/style.css':'1a1a10ca3b13d0231db7085c05f66d1960707b73',
 'src/enemyFormation.ts':'779232829eddd60cab2c2f11957e5ffa791b28c9',
 'src/BattleStage.tsx':'b8a14bc2384be86f3a1717c3ba6202acf7022133',
 'src/MonsterArt.tsx':'9b09fc236e1f9f70d3b72097c6b19d1a8b0b4efc',
};
for(const [path,sha]of Object.entries(expected)){const b=readFileSync(root+path);const got=createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');if(got!==sha)throw Error('Actual accepted-main source mismatch: '+path+' '+got);}
function once(code,from,to){if(!code.includes(from))throw Error('Fixture hook not found: '+from);return code.replace(from,to);}
export default defineConfig({root,base:'/',server:{host:'127.0.0.1',port:8884,strictPort:true},plugins:[{
 name:'isolated-fenrir-stage-fixture',enforce:'pre',
 transform(code,id){if(id.endsWith('/src/App.tsx')){
 code=once(code,'useState<State | null>(null)',"useState<State | null>(() => start([0,1,2,3,4], (window as any).__stageStudy.row === 'rear' ? [1,12,2,3,4] : [12,1,2,3,4], 42))");
 return once(code,'const [playing, setPlaying] = useState(false);', 'const [playing, setPlaying] = useState(false);\n  (window as any).__stageStudy.setPlayingForLayoutOnly = setPlaying;');
 }
 if(id.endsWith('/src/navigation.ts'))return once(code,"useState<Screen>(() => readScreen() === 'battle' ? 'arena' : readScreen())","useState<Screen>('battle')");
 if(id.endsWith('/src/BattleStage.tsx'))return once(code,'const rigDrawn=unit.monster.id===0?',"const studyDrawn=unit.monster.id===12 && (window as any).__stageStudy?.draw(ctx,{index,foot,bodyScale,width,canvas:element});\n          const rigDrawn=studyDrawn || (unit.monster.id===0?").replace('sampleFenrirBattlePose(rigFrame),rigTarget):false;','sampleFenrirBattlePose(rigFrame),rigTarget):false);');
 }
},react()]});
