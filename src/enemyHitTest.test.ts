// @vitest-environment happy-dom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {createEnemyPixelReader,enemyAtPixel,type EnemyImageDraw} from './enemyHitTest';
const identity={a:1,b:0,c:0,d:1,e:0,f:0};
const image=()=>({complete:true,naturalWidth:32,naturalHeight:16}) as HTMLImageElement;
const draw=(key:string,extra:Partial<EnemyImageDraw>={}):EnemyImageDraw=>({key,matrix:identity,rect:{x:0,y:0,width:100,height:100},image:image(),alpha:1,...extra});
afterEach(()=>vi.restoreAllMocks());
describe('visible body target pixels',()=>{
 it('chooses the frontmost opaque part, including repeated parts of the same rig',()=>{
  const reader=vi.fn(()=>true),back=draw('rear'),front=draw('front');
  expect(enemyAtPixel([back,front],50,50,reader)).toBe('front');expect(reader).toHaveBeenCalledTimes(1);
  expect(enemyAtPixel([back,front,{...front,rect:{x:10,y:10,width:15,height:15}}],50,50,reader)).toBe('front');
 });
 it('reaches a visible rear body through an actually transparent foreground gap',()=>{
  const back=draw('rear'),front=draw('front');
  expect(enemyAtPixel([back,front],50,50,img=>img===back.image)).toBe('rear');
  expect(enemyAtPixel([back,front],50,50,()=>false)).toBeUndefined();
 });
 it.each([null])('never selects through an unreadable foreground mask',result=>{
  expect(enemyAtPixel([draw('rear'),draw('front')],50,50,()=>result)).toBeUndefined();
 });
 it('inverts the exact camera, scale, DPR, rotation, shear and animated part transform',()=>{
  const m={a:0,b:3,c:-2,d:.5,e:123,f:67};const item=draw('rig-head',{matrix:m,rect:{x:-20,y:-10,width:80,height:40}});
  const local={x:12,y:7},reader=vi.fn(()=>true);
  expect(enemyAtPixel([item],m.a*local.x+m.c*local.y+m.e,m.b*local.x+m.d*local.y+m.f,reader)).toBe('rig-head');
  expect(reader).toHaveBeenCalledWith(item.image,.4,.425);
 });
 it('rejects empty foreground, degenerate matrices and invisible parts',()=>{
  expect(enemyAtPixel([draw('x')],101,50,()=>true)).toBeUndefined();
  expect(enemyAtPixel([draw('x',{matrix:{...identity,a:0}})],0,50,()=>true)).toBeUndefined();
  expect(enemyAtPixel([draw('x',{alpha:.01})],50,50,()=>true)).toBeUndefined();
 });
 it('keeps visible defeated bodies as frontmost barriers for the caller’s eligibility check',()=>{
  const hit=enemyAtPixel([draw('live-rear'),draw('dead-front',{alpha:.24})],50,50,()=>true);
  expect(hit).toBe('dead-front');expect(['live-rear'].includes(hit!)).toBe(false);
 });
 it('uses a conservative fallback glyph ellipse, not its transparent corners',()=>{
  const fallback=draw('glyph',{image:undefined});
  expect(enemyAtPixel([fallback],50,50,()=>true)).toBe('glyph');
  expect(enemyAtPixel([fallback],1,1,()=>true)).toBeUndefined();
 });
});
describe('lazy bounded cached transparency masks',()=>{
 function mockCanvas(mode:'pixels'|'missing'|'security'='pixels'){
  const pixels=new Uint8ClampedArray(256*128*4);pixels.fill(255);
  const context={drawImage:vi.fn(),getImageData:vi.fn(()=>{if(mode==='security')throw new DOMException('blocked','SecurityError');return {data:pixels};})};
  const spy=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(mode==='missing'?null:context as unknown as CanvasRenderingContext2D);
  return {context,spy};
 }
 it('does no work until a tap, bounds each mask and reads each image only once',()=>{
  const {context,spy}=mockCanvas();const reader=createEnemyPixelReader();const img={complete:true,naturalWidth:1024,naturalHeight:512} as HTMLImageElement;
  expect(spy).not.toHaveBeenCalled();expect(reader(img,.5,.5)).toBe(true);
  for(let i=0;i<100;i++)expect(reader(img,.4,.4)).toBe(true);
  expect(context.drawImage).toHaveBeenCalledExactlyOnceWith(img,0,0,256,128);
  expect(context.getImageData).toHaveBeenCalledExactlyOnceWith(0,0,256,128);
 });
 it.each(['missing','security'] as const)('returns safe card fallback and caches %s failure',mode=>{
  const {spy}=mockCanvas(mode);const reader=createEnemyPixelReader(),img=image();
  expect(reader(img,.5,.5)).toBeNull();expect(reader(img,.5,.5)).toBeNull();expect(spy).toHaveBeenCalledTimes(1);
 });
 it('does not allocate or cache an incomplete image and works once it loads',()=>{
  const {spy}=mockCanvas();const reader=createEnemyPixelReader(),img=image();Object.assign(img,{complete:false});
  expect(reader(img,.5,.5)).toBeNull();expect(spy).not.toHaveBeenCalled();Object.assign(img,{complete:true});expect(reader(img,.5,.5)).toBe(true);
 });
});
