/** Review-only rigid-plate rig. Source pixels are only clipped and rigidly transformed. */
export const SOURCE = Object.freeze({width: 1312, height: 1199});
export const DURATION = 5;
export const ANATOMY = Object.freeze({
  shoulder: [455, 565], elbow: [470, 740], wrist: [355, 1010], contact: [320, 1165],
  chainPivot: [451, 891],
  supports: [[170, 1112], [710, 1080], [1100, 1112]],
});
export const LENGTHS = Object.freeze({
  upper: Math.hypot(15, 175), lower: Math.hypot(-115, 270),
});
export const POSES = Object.freeze({neutral: 0, lifted: 1.1, planted: 1.5, braced: 2.45, recovery: 3.5, recovered: 4.75});
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => {const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u);};
const mix = (a, b, t) => a + (b - a) * t;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const angle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const rotate = ([x, y], a) => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];
export function rigidMatrix(source, destination, radians = 0) {
  const c = Math.cos(radians), s = Math.sin(radians);
  return [c, s, -s, c, destination[0] - c * source[0] + s * source[1], destination[1] - s * source[0] - c * source[1]];
}
export function transformPoint(matrix, point) {
  return [matrix[0] * point[0] + matrix[2] * point[1] + matrix[4], matrix[1] * point[0] + matrix[3] * point[1] + matrix[5]];
}
function multiply(a, b) {
  return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
}
/** A genuinely fixed-length two-bone solve. Out-of-reach targets fail instead of stretching. */
export function solveLeg(shoulder, wrist) {
  const d = distance(shoulder, wrist), {upper, lower} = LENGTHS;
  if (d > upper + lower + 1e-8 || d < Math.abs(upper - lower) - 1e-8) throw new Error(`Unreachable foreleg target: ${d.toFixed(3)}px`);
  const bend = Math.acos(clamp((upper*upper + d*d - lower*lower)/(2*upper*d), -1, 1));
  const a = angle(shoulder, wrist) - bend;
  return {elbow: [shoulder[0] + upper*Math.cos(a), shoulder[1] + upper*Math.sin(a)], reach: d, reachMargin: upper + lower - d};
}
export function samplePose(time, reduced = false) {
  const t = reduced ? 0 : ((time % DURATION) + DURATION) % DURATION;
  let px = 0, lift = 0, pawAngle = 0, bodyX = 0, bodyY = 0, phase = '構え', name = 'neutral', contactLocked = true;
  if (t >= .5 && t < 1.1) {
    const u = smooth(.5, 1.1, t); px = -35*u; lift = 90*u; pawAngle = .10*u; bodyY = 40*u;
    phase = '前脚を上げる'; name = 'lift'; contactLocked = false;
  } else if (t >= 1.1 && t < 1.5) {
    const u = smooth(1.1, 1.5, t); px = mix(-35, -110, u); lift = 90*(1-u); pawAngle = .10*(1-u); bodyY = 40;
    phase = '前へ運び、接地'; name = 'advance'; contactLocked = false;
  } else if (t >= 1.5 && t < 2.7) {
    px = -110; bodyY = 40; bodyX = -40*smooth(1.5, 2.3, t);
    phase = t < 2.3 ? '接地してから体重を前へ' : '踏ん張り'; name = t < 2.3 ? 'transfer' : 'brace';
  } else if (t >= 2.7 && t < 2.95) {
    px = -110; bodyY = 40; bodyX = -40*(1-smooth(2.7, 2.95, t)); phase = '体重を戻す'; name = 'unload';
  } else if (t >= 2.95 && t < 3.5) {
    const u = smooth(2.95, 3.5, t); px = mix(-110, -75, u); lift = 90*u; pawAngle = .10*u; bodyY = 40;
    phase = '前脚を上げて戻す'; name = 'recovery-lift'; contactLocked = false;
  } else if (t >= 3.5 && t < 4.25) {
    const u = smooth(3.5, 4.25, t); px = -75*(1-u); lift = 90*(1-u); pawAngle = .10*(1-u); bodyY = 40;
    phase = '元の位置へ接地'; name = 'recovery-return'; contactLocked = false;
  } else if (t >= 4.25 && t < 4.75) {
    bodyY = 40*(1-smooth(4.25, 4.75, t)); phase = '静かに構えへ'; name = 'settle';
  }
  const shoulder = [ANATOMY.shoulder[0]+bodyX, ANATOMY.shoulder[1]+bodyY];
  const contact = [ANATOMY.contact[0]+px, ANATOMY.contact[1]-lift];
  const pawOffset = rotate([ANATOMY.contact[0]-ANATOMY.wrist[0], ANATOMY.contact[1]-ANATOMY.wrist[1]], pawAngle);
  const wrist = [contact[0]-pawOffset[0], contact[1]-pawOffset[1]];
  const {elbow, reach, reachMargin} = solveLeg(shoulder, wrist);
  const upperAngle = angle(shoulder, elbow) - angle(ANATOMY.shoulder, ANATOMY.elbow);
  const lowerAngle = angle(elbow, wrist) - angle(ANATOMY.elbow, ANATOMY.wrist);
  const body = rigidMatrix([0, 0], [bodyX, bodyY]);
  const upper = rigidMatrix(ANATOMY.shoulder, shoulder, upperAngle);
  const lower = rigidMatrix(ANATOMY.elbow, elbow, lowerAngle);
  const paw = rigidMatrix(ANATOMY.wrist, wrist, pawAngle);
  // One original rigid chain assembly, never a variable link count or a generated replacement.
  // A small deterministic trailing sway is anchored at the cuff ring, not at the carpus.
  const chainSway = .022 * Math.sin(t*TAU/DURATION - .45) * (lift/90);
  const chain = multiply(lower, rigidMatrix(ANATOMY.chainPivot, ANATOMY.chainPivot, chainSway));
  return {time: t, reduced, phase: reduced ? '静止（動きを減らす）' : phase, name, contactLocked, bodyX, bodyY, lift, advance: -px,
    shoulder, elbow, wrist, contact, pawAngle, upperAngle, lowerAngle, chainSway, reach, reachMargin,
    supports: ANATOMY.supports.map(p => [...p]), matrices: {body, head: body, upper, lower, paw, chain, support: [1,0,0,1,0,0]},
    neutral: bodyX === 0 && bodyY === 0 && lift === 0 && px === 0};
}
export function measurePose(p) {
  const lengthError = Math.max(Math.abs(distance(p.shoulder,p.elbow)-LENGTHS.upper), Math.abs(distance(p.elbow,p.wrist)-LENGTHS.lower));
  const determinants = Object.fromEntries(Object.entries(p.matrices).map(([name,m]) => [name,m[0]*m[3]-m[1]*m[2]]));
  const pawContactError = distance(transformPoint(p.matrices.paw, ANATOMY.contact), p.contact);
  const supportSlide = Math.max(...p.supports.map((point,i) => distance(point,ANATOMY.supports[i])));
  const chainAnchorError = distance(transformPoint(p.matrices.chain,ANATOMY.chainPivot),transformPoint(p.matrices.lower,ANATOMY.chainPivot));
  return {time:p.time, name:p.name, lift:p.lift, advance:p.advance, bodyX:p.bodyX, bodyY:p.bodyY, contact:p.contact,
    contactLocked:p.contactLocked, lengthError, pawContactError, supportSlide, reach:p.reach, reachMargin:p.reachMargin,
    chainAnchorError, determinants};
}
// All masks are source-coordinate polygons. Nothing is repainted, stretched, or mesh-warped.
// Irregular 30–45px overlaps at the elbow and carpus preserve the original fur edges.
export const MASKS = Object.freeze({
  upper: [[361,554],[427,543],[488,563],[532,600],[558,640],[576,679],[575,716],[557,748],[548,769],[518,781],[483,770],[445,760],[407,767],[370,779],[354,753],[360,712],[359,669],[346,630]],
  lower: [[388,710],[430,697],[476,705],[520,724],[554,744],[578,767],[591,790],[581,809],[583,837],[568,861],[550,852],[546,874],[520,885],[501,901],[490,927],[465,951],[466,983],[464,1026],[440,1054],[421,1044],[387,1052],[344,1040],[295,1044],[301,1008],[310,970],[316,938],[303,921],[308,881],[318,840],[331,809],[337,778],[352,747]],
  paw: [[307,1000],[343,995],[385,1005],[460,1015],[465,1048],[440,1093],[439,1134],[425,1178],[393,1185],[354,1182],[314,1188],[275,1183],[235,1184],[203,1177],[203,1136],[218,1103],[251,1074],[283,1058]],
  chain: [[440,861],[464,864],[492,883],[524,904],[536,937],[543,970],[536,994],[558,1002],[583,1018],[602,1045],[610,1083],[607,1124],[585,1151],[550,1155],[519,1136],[499,1110],[485,1081],[482,1052],[475,1026],[464,1002],[454,976],[450,951],[451,927],[444,910],[430,899],[425,882]],
  farFore: [[126,644],[225,634],[291,681],[331,730],[344,785],[320,837],[290,903],[295,963],[279,1027],[267,1088],[245,1132],[173,1140],[95,1140],[14,1134],[10,1075],[57,1034],[111,1021],[137,1000],[153,959],[157,904],[151,848],[139,786],[129,730]],
  farRear: [[590,625],[682,622],[739,644],[771,690],[790,738],[810,785],[844,833],[863,877],[858,926],[838,969],[818,1014],[810,1057],[790,1099],[725,1110],[637,1111],[594,1097],[591,1045],[630,1014],[686,1000],[704,969],[711,927],[710,902],[684,870],[648,837],[613,806],[594,758]],
  nearRear: [[734,620],[817,620],[891,650],[957,699],[1001,743],[1017,781],[1035,809],[1090,831],[1105,861],[1172,893],[1184,984],[1198,1047],[1210,1095],[1195,1143],[1125,1153],[1060,1149],[1009,1127],[993,1082],[999,1039],[1020,1013],[1021,985],[1004,946],[963,920],[922,885],[866,863],[820,830],[787,792],[765,744],[748,695]],
  // This broad removal follows the source limb's ownership through the empty gaps.
  // It removes old cuff/chain fringe pixels that the narrower isolated plates do not own.
  nearForeCut: [[334,769],[605,769],[608,866],[625,982],[625,1199],[181,1199],[181,1126],[274,1067],[286,1007],[298,934],[299,872],[324,805]],
  // Upper roots remain under original chest/hip pixels. These are removal masks, not new anatomy.
  farForeCut: [[130,700],[147,712],[162,707],[173,730],[189,723],[202,746],[219,735],[237,755],[250,748],[266,769],[283,758],[303,780],[321,770],[344,789],[357,845],[347,1199],[0,1199],[0,735],[130,735]],
  farRearCut: [[590,747],[607,725],[618,730],[630,704],[643,711],[661,688],[675,699],[693,683],[710,698],[725,690],[742,717],[754,708],[775,740],[793,756],[812,788],[839,813],[875,858],[885,1199],[585,1199],[585,806]],
  nearRearCut: [[796,743],[813,769],[823,761],[840,790],[851,782],[870,811],[881,803],[904,830],[916,821],[943,847],[952,838],[982,865],[998,852],[1021,877],[1040,852],[1120,827],[1312,818],[1312,1199],[823,1199],[810,893],[797,829]],
  mane: [[0,0],[650,0],[650,470],[601,510],[565,535],[540,555],[518,581],[495,589],[502,616],[480,603],[466,626],[446,635],[423,650],[407,672],[384,663],[368,696],[343,712],[326,741],[303,738],[284,753],[253,750],[224,729],[195,716],[160,724],[138,694],[105,677],[94,632],[58,613],[40,560],[0,550]],
  // Only the hidden upper chest is filled. In particular there is no patch below y790.
  patch: [[351,552],[427,548],[489,568],[540,603],[565,652],[574,701],[561,744],[537,773],[502,788],[458,781],[416,762],[382,729],[358,685],[348,624]],
});
function path(ctx, points) {ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();}
function canvasFor(image, mask = null, remove = []) {
  const canvas = document.createElement('canvas'); canvas.width = SOURCE.width; canvas.height = SOURCE.height;
  const ctx = canvas.getContext('2d'); ctx.save(); if (mask) {path(ctx,mask); ctx.clip();} ctx.drawImage(image,0,0); ctx.restore();
  ctx.globalCompositeOperation = 'destination-out'; for (const polygon of remove) {path(ctx,polygon);ctx.fill();} ctx.globalCompositeOperation = 'source-over'; return canvas;
}
/** patchImage is optional only for neutral/reference rendering; motion refuses missing hidden anatomy. */
export function createRenderer(canvas, image, options = {}) {
  const patchImage = options?.patchImage ?? (options?.naturalWidth ? options : null);
  if (image.naturalWidth !== SOURCE.width || image.naturalHeight !== SOURCE.height) throw new Error('Original image dimensions must remain 1312 × 1199.');
  if (patchImage && (patchImage.naturalWidth !== SOURCE.width || patchImage.naturalHeight !== SOURCE.height)) throw new Error('Chest patch must be a registered 1312 × 1199 image.');
  const ctx = canvas.getContext('2d',{alpha:true}); if (!ctx) throw new Error('Canvas2D is unavailable.');
  const parts = {};
  // The foreground mane/head is removed from the body before being drawn last.
  // Its source alpha must not be composited twice at the same rigid transform.
  parts.body = canvasFor(image,null,[MASKS.upper,MASKS.lower,MASKS.paw,MASKS.chain,MASKS.nearForeCut,MASKS.farForeCut,MASKS.farRearCut,MASKS.nearRearCut,MASKS.mane]);
  for (const key of ['upper','lower','paw','farFore','farRear','nearRear','mane','chain']) parts[key] = canvasFor(image,MASKS[key],(key === 'lower'||key === 'paw') ? [MASKS.chain] : key === 'farFore' ? [MASKS.paw,MASKS.lower] : []);
  if (patchImage) parts.patch = canvasFor(patchImage,MASKS.patch);
  function plate(name,matrix) {ctx.save();ctx.transform(...matrix);ctx.drawImage(parts[name],0,0);ctx.restore();}
  return {render(time,{reduced=false,width=canvas.width,height=canvas.height,spriteWidth=width*.90,bottom=height*.96}={}) {
    const pose = samplePose(time,reduced);
    if (!pose.neutral && !parts.patch) throw new Error('Missing chest-patch.png: articulated motion is blocked until the hidden-chest patch is supplied.');
    const scale = spriteWidth/SOURCE.width, left=(width-spriteWidth)/2, top=bottom-SOURCE.height*scale;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.save();ctx.translate(left,top);ctx.scale(scale,scale);
    if (pose.neutral) ctx.drawImage(image,0,0);
    else {
      const m=pose.matrices;
      plate('farRear',m.support);plate('farFore',m.support);plate('nearRear',m.support);
      plate('body',m.body);plate('patch',m.body);
      plate('upper',m.upper);plate('lower',m.lower);plate('paw',m.paw);plate('chain',m.chain);
      plate('mane',m.body);
    }
    ctx.restore(); return pose;
  }, hasPatch:!!patchImage, technique:'rigid Canvas2D original-texture plates'};
}
