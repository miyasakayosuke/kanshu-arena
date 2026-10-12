/** Hit the rendered pixels, including each animated rig part, in reverse paint order. */
export type DrawMatrix = {a:number;b:number;c:number;d:number;e:number;f:number};
type Rect = {x:number;y:number;width:number;height:number};
export type EnemyImageDraw = {key:string;matrix:DrawMatrix;rect:Rect;image?:HTMLImageElement;alpha:number};
type Mask = {width:number;height:number;alpha:Uint8Array};
export type PixelReader = (image:HTMLImageElement, u:number, v:number)=>boolean | null;

/** Lazy, bounded alpha masks. No extra Image loads or readbacks in animation frames. */
export function createEnemyPixelReader(): PixelReader {
  const masks = new WeakMap<HTMLImageElement, Mask | null>();
  return (image, u, v) => {
    if (!image.complete || !(image.naturalWidth > 0) || !(image.naturalHeight > 0)) return null;
    if (!masks.has(image)) {
      try {
        const longest = Math.max(image.naturalWidth, image.naturalHeight);
        if (!(longest > 0)) return null;
        const ratio = Math.min(1, 256 / longest);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.ceil(image.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.ceil(image.naturalHeight * ratio));
        const context = canvas.getContext('2d', {willReadFrequently:true});
        if (!context) {masks.set(image,null);return null;}
        context.drawImage(image,0,0,canvas.width,canvas.height);
        const pixels = context.getImageData(0,0,canvas.width,canvas.height).data;
        const alpha = new Uint8Array(canvas.width * canvas.height);
        for(let i=0;i<alpha.length;i++) alpha[i]=pixels[i*4+3];
        masks.set(image,{width:canvas.width,height:canvas.height,alpha});
      } catch {masks.set(image,null);}
    }
    const mask = masks.get(image);
    if (!mask) return null;
    const x=Math.max(0,Math.min(mask.width-1,Math.floor(u*mask.width)));
    const y=Math.max(0,Math.min(mask.height-1,Math.floor(v*mask.height)));
    return mask.alpha[y*mask.width+x] >= 24;
  };
}

export function enemyAtPixel(draws:readonly EnemyImageDraw[], x:number, y:number, readPixel:PixelReader): string | undefined {
  for(let i=draws.length-1;i>=0;i--) {
    const draw=draws[i],m=draw.matrix,r=draw.rect;
    if(draw.alpha<.08)continue;
    const det=m.a*m.d-m.b*m.c;
    if(!Number.isFinite(det)||Math.abs(det)<1e-8||r.width<=0||r.height<=0)continue;
    const dx=x-m.e,dy=y-m.f;
    const localX=(m.d*dx-m.c*dy)/det, localY=(-m.b*dx+m.a*dy)/det;
    const u=(localX-r.x)/r.width,v=(localY-r.y)/r.height;
    if(u<0||u>=1||v<0||v>=1)continue;
    if(!draw.image) {if((u-.5)**2+(v-.5)**2<=.25)return draw.key;continue;}
    const painted=readPixel(draw.image,u,v);
    // A denied/unsupported read never falls through and selects a covered rear unit.
    if(painted===null)return undefined;
    if(painted)return draw.key;
  }
  return undefined;
}
