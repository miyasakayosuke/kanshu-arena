import {sampleStorybookYoko,storybookYokoSvg,type YokoPose} from './storybookYoko';
export type RigPart='root'|'tail0'|'tail1'|'tail2'|'paw'|'head'|'earLeft'|'earRight'|'eyeLeft'|'eyeRight'|'mouthOpen'|'mouthClosed'|'pendant';
export type Bounds={x:number;y:number;width:number;height:number};
export type YokoLayer={id:string;parts:RigPart[];bounds:Bounds;svg:string};
const bounds:Record<RigPart,Bounds>={
 root:{x:56,y:104,width:151,height:122},tail0:{x:133,y:12,width:88,height:173},tail1:{x:146,y:59,width:117,height:130},tail2:{x:148,y:127,width:124,height:81},
 paw:{x:67,y:140,width:52,height:86},head:{x:37,y:62,width:124,height:94},earLeft:{x:45,y:29,width:53,height:83},earRight:{x:103,y:38,width:58,height:73},
 eyeLeft:{x:60,y:96,width:35,height:28},eyeRight:{x:100,y:91,width:35,height:31},mouthOpen:{x:79,y:119,width:42,height:31},mouthClosed:{x:75,y:120,width:46,height:25},pendant:{x:86,y:143,width:39,height:42},
};
let compiled:readonly YokoLayer[]|undefined;
/** Compile once outside animation frames. Dynamic groups become cached static layers. */
export function compileYokoLayers():readonly YokoLayer[]{
 if(compiled)return compiled;
 const source=storybookYokoSvg(sampleStorybookYoko(0,'idle',0,true),{id:'yoko-layer'});
 const doc=new DOMParser().parseFromString(source,'image/svg+xml');
 const defs=doc.querySelector('defs')!.outerHTML;
 const root=doc.querySelector('[data-rig="root"]')!;
 const layers:YokoLayer[]=[];
 function visit(node:Element,ancestors:string[],parts:RigPart[]){
  const part=node.getAttribute('data-rig') as RigPart|null;
  const nextParts=part?[...parts,part]:parts;
  const attrs=[...node.attributes].filter(a=>a.name!=='data-rig'&&!(part&&['transform','opacity'].includes(a.name))).map(a=>` ${a.name}="${a.value.replaceAll('&','&amp;').replaceAll('"','&quot;')}"`).join('');
  const wrappers=[...ancestors,`<g${attrs}>`];
  let pending:string[]=[];
  function flush(){
   if(!pending.length)return;
   const b=bounds[nextParts.at(-1)??'root'];
   const content=wrappers.join('')+pending.join('')+'</g>'.repeat(wrappers.length);
   layers.push({id:`yoko-part-${layers.length}`,parts:[...nextParts],bounds:{...b},svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${b.width*2}" height="${b.height*2}" viewBox="${b.x} ${b.y} ${b.width} ${b.height}" fill="none">${defs}${content}</svg>`});pending=[];
  }
  for(const child of [...node.children]){
   if(child.hasAttribute('data-rig')||child.querySelector('[data-rig]')){flush();visit(child,wrappers,nextParts);}
   else pending.push(child.outerHTML);
  }
  flush();
 }
 visit(root,[],[]);
 if(layers.length>20)throw new Error('Yoko rig exceeds its bounded layer budget');
 if(layers.reduce((sum,l)=>sum+l.bounds.width*l.bounds.height*16,0)>8*1024*1024)throw new Error('Yoko rig exceeds its decoded layer budget');
 compiled=Object.freeze(layers.map(layer=>Object.freeze({...layer,parts:Object.freeze(layer.parts) as unknown as RigPart[]})));
 return compiled;
}
export type CachedYokoLayer={layer:YokoLayer;image:HTMLImageElement};
/** One cache per mounted arena, shared by every Yoko unit. Never allocated per frame. */
export class YokoRigCache {
 private entries:CachedYokoLayer[]=[];
 private cleanups:Array<()=>void>=[];
 private disposed=false;
 private started=false;
 private failed=false;
 private loaded=new Set<HTMLImageElement>();
 get ready(){return !this.disposed&&!this.failed&&this.started&&this.entries.length>0&&this.loaded.size===this.entries.length;}
 get layers():readonly CachedYokoLayer[]{return this.entries;}
 get decodedBytes(){return this.entries.reduce((sum,{layer})=>sum+layer.bounds.width*2*layer.bounds.height*2*4,0);}
 ensure(){
  if(this.started||this.disposed)return;
  this.started=true;
  try{
   const definitions=compileYokoLayers();
   // Register all entries before assigning src: synchronous test/cache loads are valid.
   this.entries=definitions.map(layer=>({layer,image:new Image()}));
   for(const {layer,image} of this.entries){
    const onLoad=()=>{if(!this.disposed&&image.naturalWidth>0)this.loaded.add(image);};
    const onError=()=>{if(!this.disposed)this.failed=true;};
    image.addEventListener('load',onLoad);image.addEventListener('error',onError);
    this.cleanups.push(()=>{image.removeEventListener('load',onLoad);image.removeEventListener('error',onError);});
    image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(layer.svg)}`;
    if(image.complete){if(image.naturalWidth>0)onLoad();else onError();}
   }
  }catch{this.failed=true;}
 }
 dispose(){this.disposed=true;this.cleanups.forEach(cleanup=>cleanup());this.cleanups=[];this.entries=[];this.loaded.clear();}
}
const rad=(degrees:number)=>degrees*Math.PI/180;
function rotation(ctx:CanvasRenderingContext2D,angle:number,x:number,y:number){ctx.translate(x,y);ctx.rotate(rad(angle));ctx.translate(-x,-y);}
/** All motion is a cheap matrix or opacity. There are no SVG/parser/image allocations here. */
export function applyYokoPart(ctx:CanvasRenderingContext2D,part:RigPart,p:YokoPose){
 switch(part){
  case 'root':ctx.globalAlpha*=p.opacity;ctx.translate(p.x,p.y);rotation(ctx,p.bodyAngle,140,206);ctx.translate(140,206);ctx.scale(p.bodyX,p.bodyY);ctx.translate(-140,-206);break;
  case 'tail0':rotation(ctx,p.tails[0],168,166);break;
  case 'tail1':rotation(ctx,p.tails[1],169,171);break;
  case 'tail2':rotation(ctx,p.tails[2],172,177);break;
  case 'paw':rotation(ctx,p.paw,106,156);break;
  case 'head':ctx.translate(0,p.headY);rotation(ctx,p.headAngle,104,137);break;
  case 'earLeft':rotation(ctx,p.earLeft,77,97);break;
  case 'earRight':rotation(ctx,p.earRight,123,95);break;
  case 'eyeLeft':ctx.translate(79,110);ctx.scale(1,Math.max(.045,1-p.blink));ctx.translate(-79,-110);break;
  case 'eyeRight':ctx.translate(117,108);ctx.scale(1,Math.max(.045,1-p.blink));ctx.translate(-117,-108);break;
  case 'mouthOpen':ctx.globalAlpha*=p.mouth>.5?1:0;break;
  case 'mouthClosed':ctx.globalAlpha*=p.mouth>.5?0:1;break;
  case 'pendant':rotation(ctx,-p.headAngle*.8+p.tails[1]*.28,105,153);break;
 }
}
export function drawYokoRig(ctx:CanvasRenderingContext2D,cache:YokoRigCache,pose:YokoPose,target:Bounds):boolean{
 if(!cache.ready)return false;
 ctx.save();ctx.translate(target.x,target.y);ctx.scale(target.width/312,target.height/260);ctx.translate(16,10);
 // Existing arena shadow stays on the floor; never stamp a separate shadow per part.
 const blur=ctx.shadowBlur;ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 for(const {layer,image} of cache.layers){
  ctx.save();for(const part of layer.parts)applyYokoPart(ctx,part,pose);
  if(ctx.globalAlpha>0)ctx.drawImage(image,layer.bounds.x,layer.bounds.y,layer.bounds.width,layer.bounds.height);
  ctx.restore();
 }
 ctx.shadowBlur=blur;ctx.restore();return true;
}
