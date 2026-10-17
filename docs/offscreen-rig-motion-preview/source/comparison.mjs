import * as old from './baseline-rig.mjs';import * as now from './rig.mjs';
export function comparisonFrameSvg(ms,{playback='PAUSED'}={}){
 const text=(x,y,s,size=18,c='#dbe9f2')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}">${s}</text>`;let s='<svg xmlns="http://www.w3.org/2000/svg" width="1680" height="1000" font-family="DejaVu Sans,sans-serif"><rect width="100%" height="100%" fill="#091725"/>';
 s+=text(28,36,'MOONLIT BITE / PREVIOUS 1.5x vs OFFSCREEN LEAP',25)+text(28,66,`${playback} | ${ms.toFixed(1)} / 1500 ms | Same model dimensions, camera, clock and marked target.`,18,'#aacddd');
 for(const [x,model,label]of [[28,old,'PREVIOUS FROZEN 1.5x'],[852,null,'NEW OFFSCREEN LEAP']]){
  s+=text(x,106,label,22,x===28?'#e1ae7b':'#8fe5c2')+`<g transform="translate(${x} 120)">${now.panelSvg(ms,'large',model)}</g><g transform="translate(${x} 690)">${now.panelSvg(ms,'native',model)}</g>`;
  s+=text(x+380,730,'Camera / actor size unchanged',17)+text(x+380,765,'800 ms bite / 1500 ms total',17)+text(x+380,800,x===28?'Previous motion left untouched.':'Full exit, return, jaw contact.',16)+text(x+380,835,x===28?'Shared dummy added for comparison.':'Forepaws tuck clear of target.',15,'#a5bfd0')+text(x+380,870,'142px native view at left',16);
 }
 return s+text(28,982,'Temporary mechanics comparison only. Offline librsvg/Cairo render. No original art, browser execution or game integration.',16,'#adbfcd')+'</svg>';
}
