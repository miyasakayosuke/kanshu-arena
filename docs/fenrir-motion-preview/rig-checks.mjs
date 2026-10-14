import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {samplePose,measurePose,transformPoint,solveLeg,DURATION,ANATOMY,LENGTHS,POSES,MASKS} from './rig.mjs';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const samples=Array.from({length:5001},(_,i)=>samplePose(i/1000));
test('selected original PNG remains byte-identical',async()=>{
 const png=await readFile(new URL('./original.png',import.meta.url));
 assert.equal(createHash('sha256').update(png).digest('hex'),'e072a556adb672e192065347486e674d091bb03892decfe0c84625c84ebd4137');
});
test('hidden-chest patch remains the reviewed binary asset',async()=>{
 const png=await readFile(new URL('./chest-patch.png',import.meta.url));
 assert.equal(createHash('sha256').update(png).digest('hex'),'db88301fac2c1c3ad7c82597ddef0ccc7daa3ed900285ba176fe2f9f84921a40');
});
test('five-second loop closes and reduced motion is source-neutral at every time',()=>{
 assert.equal(DURATION,5);assert.deepEqual(samplePose(0),samplePose(DURATION));
 for(const t of [-5,-.01,0,.5,1.1,1.5,2.45,3.5,4.75,5,51.2]){
  const p=samplePose(t,true);assert.equal(p.neutral,true);assert.deepEqual(p.contact,ANATOMY.contact);assert.deepEqual(p.matrices.body,[1,0,-0,1,0,0]);
 }
 near(dist(samplePose(5-1e-7).contact,samplePose(1e-7).contact),0);
});
test('fixed upper/lower bone lengths, bounded reach and no support-foot sliding',()=>{
 let minReachMargin=Infinity,maxError=0;
 for(const p of samples){const m=measurePose(p);maxError=Math.max(maxError,m.lengthError);minReachMargin=Math.min(minReachMargin,m.reachMargin);
  assert.ok(m.lengthError<1e-9);assert.equal(m.supportSlide,0);assert.ok(m.reachMargin>12);assert.ok(m.reach>Math.abs(LENGTHS.upper-LENGTHS.lower));
  assert.deepEqual(p.supports,ANATOMY.supports);
 }
 console.log(JSON.stringify({maximumBoneLengthError:maxError,minimumReachMargin:minReachMargin,supportSlide:0}));
 assert.throws(()=>solveLeg(ANATOMY.shoulder,[1000,1200]),/Unreachable/);
});
test('90px lift, 110px advance, plant first, then 40px rigid forward transfer',()=>{
 near(samplePose(POSES.lifted).lift,90);near(samplePose(POSES.planted).advance,110);
 near(samplePose(POSES.planted).bodyX,0);near(samplePose(POSES.braced).bodyX,-40);
 near(samplePose(POSES.braced).bodyY,40);
 for(const p of samples){assert.ok(p.lift>=0&&p.lift<=90+1e-8);assert.ok(p.advance>=0&&p.advance<=110+1e-8);
  if(p.time<1.5)near(p.bodyX,0);
  if(p.bodyX<-.00001){near(p.contact[0],210);near(p.contact[1],1165);assert.equal(p.contactLocked,true);}
 }
});
test('separate paw has a locked sole contact during both support intervals; recovery lifts',()=>{
 for(const p of samples){const m=measurePose(p);assert.ok(m.pawContactError<1e-9);
  if(p.contactLocked){near(p.contact[1],ANATOMY.contact[1]);near(p.pawAngle,0);}
  if(p.time>=1.5&&p.time<=2.95){near(p.contact[0],210);near(p.contact[1],1165);}
  if(p.time>=4.25){near(p.contact[0],320);near(p.contact[1],1165);}
 }
 near(samplePose(3.5).lift,90);near(samplePose(3.5).advance,75);near(samplePose(4.25).lift,0);
});
test('every visible plate has an orthonormal transform, preserving face, chest and chain dimensions',()=>{
 const pairs={head:[[245,201],[357,211]],body:[[590,450],[796,590]],upper:[ANATOMY.shoulder,ANATOMY.elbow],lower:[ANATOMY.elbow,ANATOMY.wrist],paw:[[250,1120],[405,1130]],chain:[[451,891],[560,1120]]};
 for(const p of samples){for(const [name,matrix]of Object.entries(p.matrices)){near(matrix[0]**2+matrix[1]**2,1);near(matrix[2]**2+matrix[3]**2,1);near(matrix[0]*matrix[2]+matrix[1]*matrix[3],0);near(matrix[0]*matrix[3]-matrix[1]*matrix[2],1);}
  for(const [name,[a,b]]of Object.entries(pairs))near(dist(transformPoint(p.matrices[name],a),transformPoint(p.matrices[name],b)),dist(a,b));
  near(measurePose(p).chainAnchorError,0);assert.ok(Math.abs(p.chainSway)<=.022+1e-8);
  assert.deepEqual(p.matrices.head,p.matrices.body);
 }
});
test('joint endpoints agree for the independently transformed original plates',()=>{
 for(const p of samples){near(dist(transformPoint(p.matrices.upper,ANATOMY.elbow),p.elbow),0);near(dist(transformPoint(p.matrices.lower,ANATOMY.elbow),p.elbow),0);near(dist(transformPoint(p.matrices.lower,ANATOMY.wrist),p.wrist),0);near(dist(transformPoint(p.matrices.paw,ANATOMY.wrist),p.wrist),0);}
});
test('hidden chest mask is bounded above the real transparent gap and cuff is not wrist',()=>{
 assert.ok(MASKS.patch.every(([x,y])=>x>=345&&x<=580&&y>=540&&y<=790));
 assert.ok(dist(ANATOMY.wrist,[400,890])>100);
 assert.notEqual(ANATOMY.supports[0][1],ANATOMY.supports[1][1]);
});
test('phase transitions are continuous, including all plate angles and chain pivot',()=>{
 for(const t of [.5,1.1,1.5,2.3,2.7,2.95,3.5,4.25,4.75]){
  const a=samplePose(t-1e-7),b=samplePose(t+1e-7);
  for(const key of ['shoulder','elbow','wrist','contact'])assert.ok(dist(a[key],b[key])<.0001,`${key} jumps at ${t}`);
  for(const key of ['upperAngle','lowerAngle','pawAngle','chainSway'])near(a[key],b[key],.0001);
 }
});
