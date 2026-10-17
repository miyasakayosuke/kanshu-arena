// The old schematic source is vendored byte-for-byte for a reproducible comparison.
// It contains no original Fenrir raster pixels.
import * as old from './baseline-rig.mjs';
import * as corrected from './rig.mjs';
export function comparisonFrameSvg(ms,{playback='PAUSED'}={}){
 const t=corrected.clamp(ms,0,1500),oldRise=-70-old.skeletonAt(500).p.hip[1],newRise=-70-corrected.skeletonAt(500).p.hip[1];
 const text=(x,y,s,size=18,c='#dbe9f2')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}">${s}</text>`;
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="1680" height="1000" viewBox="0 0 1680 1000" font-family="DejaVu Sans,sans-serif"><rect width="1680" height="1000" fill="#091725"/>';
 s+=text(28,36,'MOONLIT BITE / OLD vs 1.5x HIGHER JUMP',25)+text(28,66,`${playback} | ${t.toFixed(1)} / 1500 ms | Same scale, camera, bones and contact times.`,18,'#aacddd');
 for(const [x,model,label,rise] of [[28,old,'OLD FROZEN PROXY',oldRise],[852,corrected,'CORRECTED PROXY',newRise]]){
  s+=text(x,106,`${label} | root apex rise ${rise} units`,22,x===28?'#e1ae7b':'#8fe5c2');
  s+=`<g transform="translate(${x} 120)">${model.panelSvg(t,'large')}</g>`;
  s+=`<g transform="translate(${x} 690)">${model.panelSvg(t,'native')}</g>`;
  s+=text(x+380,730,`Hip/root y: ${model.skeletonAt(t).p.hip[1].toFixed(2)}`,18);
  s+=text(x+380,761,'Standing anchor y = -70',16);
  s+=text(x+380,792,`Apex rise = ${rise} units`,16);
  s+=text(x+380,823,x===28?'Known load knee/ground intersection.':'Whole actor ink/ground audited.',15,x===28?'#edbf84':'#8fe5c2');
  s+=text(x+380,854,'800 ms bite / 1500 ms total',16);
  s+=text(x+380,885,'142px native view at left',16,'#a5bfd0');
 }
 s+=text(28,982,'Temporary mechanics comparison. No original artwork embedded. Offline librsvg/Cairo render; no browser/game acceptance.',17,'#adbfcd');
 return s+'</svg>';
}
