import {neutralFenrirPose,storybookFenrirSvg,type FenrirPose} from './storybookFenrir';
export type RigPart='root'|'tail'|'rearFar'|'frontFar'|'torso'|'rearNear'|'mane'|'frontNear'|'chain0'|'chain1'|'chain2'|'head'|'earFar'|'earNear'|'eyeNear'|'eyeFar'|'jaw';
export type Bounds={x:number;y:number;width:number;height:number};
export type FenrirLayer={id:string;parts:RigPart[];bounds:Bounds;svg:string};
const bounds:Record<RigPart,Bounds>={
 root:{x:0,y:0,width:330,height:265},tail:{x:225,y:65,width:92,height:113},rearFar:{x:202,y:136,width:71,height:108},frontFar:{x:104,y:132,width:48,height:113},
 torso:{x:88,y:84,width:175,height:109},rearNear:{x:187,y:130,width:64,height:118},mane:{x:52,y:84,width:113,height:117},frontNear:{x:40,y:138,width:82,height:111},
 chain0:{x:46,y:206,width:31,height:31},chain1:{x:31,y:216,width:31,height:29},chain2:{x:12,y:220,width:38,height:34},
 head:{x:25,y:52,width:135,height:102},earFar:{x:105,y:15,width:46,height:73},earNear:{x:51,y:14,width:54,height:72},eyeNear:{x:59,y:83,width:35,height:29},eyeFar:{x:98,y:77,width:34,height:29},jaw:{x:32,y:102,width:87,height:54},
};
let compiled:readonly FenrirLayer[]|undefined;
/** Compile once outside animation frames. Dynamic groups become cached static layers. */
export function compileFenrirLayers():readonly FenrirLayer[]{
 if(compiled)return compiled;
 const source=storybookFenrirSvg(neutralFenrirPose(),{id:'fenrir-layer'});
 const doc=new DOMParser().parseFromString(source,'image/svg+xml');
 const defs=doc.querySelector('defs')!.outerHTML;
 const root=doc.querySelector('[data-rig="root"]')!;
 const layers:FenrirLayer[]=[];
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
   layers.push({id:`fenrir-part-${layers.length}`,parts:[...nextParts],bounds:{...b},svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${b.width*2}" height="${b.height*2}" viewBox="${b.x} ${b.y} ${b.width} ${b.height}" fill="none">${defs}${content}</svg>`});pending=[];
  }
  for(const child of [...node.children]){
   if(child.hasAttribute('data-rig')||child.querySelector('[data-rig]')){flush();visit(child,wrappers,nextParts);}
   else pending.push(child.outerHTML);
  }
  flush();
 }
 visit(root,[],[]);
 if(layers.length>20)throw new Error('Fenrir rig exceeds its bounded layer budget');
 if(layers.reduce((sum,l)=>sum+l.bounds.width*l.bounds.height*16,0)>8*1024*1024)throw new Error('Fenrir rig exceeds its decoded layer budget');
 compiled=Object.freeze(layers.map(layer=>Object.freeze({...layer,parts:Object.freeze(layer.parts) as unknown as RigPart[]})));
 return compiled;
}
export type CachedFenrirLayer={layer:FenrirLayer;image:HTMLImageElement};
/** One cache per mounted arena, shared by every Fenrir unit. Never allocated per frame. */
export class FenrirRigCache {
 private entries:CachedFenrirLayer[]=[];
 private cleanups:Array<()=>void>=[];
 private disposed=false;
 private started=false;
 private failed=false;
 private loaded=new Set<HTMLImageElement>();
 get ready(){return !this.disposed&&!this.failed&&this.started&&this.entries.length>0&&this.loaded.size===this.entries.length;}
 get layers():readonly CachedFenrirLayer[]{return this.entries;}
 get decodedBytes(){return this.entries.reduce((sum,{layer})=>sum+layer.bounds.width*2*layer.bounds.height*2*4,0);}
 ensure(){
  if(this.started||this.disposed)return;
  this.started=true;
  try{
   const definitions=compileFenrirLayers();
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
export function applyFenrirPart(ctx:CanvasRenderingContext2D,part:RigPart,p:FenrirPose){
 switch(part){
  case 'root':break;
  case 'tail':rotation(ctx,p.tail,241,152);break;
  case 'rearFar':rotation(ctx,p.rearFar,225,152);break;
  case 'frontFar':rotation(ctx,p.frontFar,131,143);break;
  case 'torso':ctx.translate(166,216);ctx.scale(1,p.bodyY);ctx.translate(-166,-216);break;
  case 'rearNear':rotation(ctx,p.rearNear,222,151);break;
  case 'mane':rotation(ctx,p.mane,120,114);break;
  case 'frontNear':rotation(ctx,p.frontNear,103,153);break;
  case 'chain0':rotation(ctx,p.chain[0],69,214);break;
  case 'chain1':rotation(ctx,p.chain[1],55,224);break;
  case 'chain2':rotation(ctx,p.chain[2],39,232);break;
  case 'head':ctx.translate(0,p.headY);rotation(ctx,p.headAngle,119,116);break;
  case 'earNear':rotation(ctx,p.earNear,81,69);break;
  case 'earFar':rotation(ctx,p.earFar,126,69);break;
  case 'eyeNear':ctx.translate(77,94);ctx.scale(1,Math.max(.055,1-p.blink));ctx.translate(-77,-94);break;
  case 'eyeFar':ctx.translate(115,91);ctx.scale(1,Math.max(.055,1-p.blink));ctx.translate(-115,-91);break;
  case 'jaw':rotation(ctx,p.jaw,103,117);break;
 }
}
export function drawFenrirRig(ctx:CanvasRenderingContext2D,cache:FenrirRigCache,pose:FenrirPose,target:Bounds):boolean{
 if(!cache.ready)return false;
 ctx.save();ctx.translate(target.x,target.y);ctx.scale(target.width/350,target.height/286);ctx.translate(18,10);
 // Existing arena shadow stays on the floor; never stamp a separate shadow per part.
 const blur=ctx.shadowBlur;ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 for(const {layer,image} of cache.layers){
  ctx.save();for(const part of layer.parts)applyFenrirPart(ctx,part,pose);
  if(ctx.globalAlpha>0)ctx.drawImage(image,layer.bounds.x,layer.bounds.y,layer.bounds.width,layer.bounds.height);
  ctx.restore();
 }
 ctx.shadowBlur=blur;ctx.restore();return true;
}
