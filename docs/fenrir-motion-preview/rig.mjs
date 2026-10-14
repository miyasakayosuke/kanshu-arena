/** Original-texture candidate. No image synthesis, raster repainting or production import. */
export const SOURCE={width:1312,height:1199};
export const DURATION=6;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
function pulse(t,a,b,c,d){return smooth(a,b,t)*(1-smooth(c,d,t))}
export function samplePose(time,reduced=false){
 const t=((time%DURATION)+DURATION)%DURATION;
 if(reduced)return {load:0,brace:0,breath:0,tail:0,phase:'静止'};
 const load=pulse(t,.65,1.8,3.25,4.6);
 const brace=pulse(t,2.1,2.42,2.72,3.3);
 return {load,brace,breath:Math.sin(t*Math.PI/3)*2,tail:Math.sin(t*Math.PI/3)*.025+load*.035,phase:t<.65?'構え':t<2.1?'体重を前へ':t<3.3?'踏ん張り':t<4.6?'戻り':'構え'};
}
function rigid(x,y,px,py,angle,dx=0,dy=0){const c=Math.cos(angle),s=Math.sin(angle);return [px+c*(x-px)-s*(y-py)+dx,py+s*(x-px)+c*(y-py)+dy]}
export function deformPoint(x,y,p){
 const load=p.load, brace=p.brace;
 const bodyX=-20*load-6*brace;
 const bodyY=78*load-22*brace+p.breath;
 const grounded=1-smooth(710,1060,y);
 let dx=bodyX*grounded,dy=bodyY*grounded;
 // Elbows flex back as the shoulders advance; metacarpals and toes retain contact.
 const elbow=Math.sin(clamp((y-610)/450)*Math.PI);
 const fore=1-smooth(540,640,x);
 dx+=26*load*elbow*fore;
 // Hind knees absorb the same weight shift, with less travel than the shoulders.
 dx-=24*load*elbow*smooth(590,680,x);
 dy*=mix(1,.65,smooth(560,960,x));
 let q=[x+dx,y+dy];
 // Keep the entire face and ears a rigid painted shape. Blend below the mane only.
 const head=1-smooth(350,630,y);
 if(x<640&&head>0){const h=rigid(x,y,380,420,-.045*load-.025*brace,bodyX-8*load,bodyY);const w=head*(1-smooth(470,640,x));q=[mix(q[0],h[0],w),mix(q[1],h[1],w)];}
 // Lower near foreleg, cuff and dangling chain move together. Chain links never
 // receive an independent scale or procedurally generated replacement shape.
 const chainBand=smooth(395,440,x)*(1-smooth(590,760-150*smooth(900,1050,y),x))*smooth(600,810,y);
 const forearmBand=smooth(275,310,x)*(1-smooth(455,620,x))*smooth(600,810,y)*(1-smooth(1020,1080,y));
 const w=Math.max(chainBand,forearmBand);
 if(w>0){const leg=rigid(x,y,350,1080,.035*load,0,0);q=[mix(q[0],leg[0],w),mix(q[1],leg[1],w)];}
 // Preserve tail brush silhouette using one rigid rotation, blended at the root.
 const tail=smooth(865,1000,x)*(1-smooth(705,810,y));
 if(tail>0){const h=rigid(x,y,960,670,p.tail,bodyX*.7,bodyY*.65);q=[mix(q[0],h[0],tail),mix(q[1],h[1],tail)];}
 return q;
}
export function createRenderer(canvas,image){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true});
 if(!gl)throw new Error('WebGLが利用できません。静止画をご確認ください。');
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 uv;varying vec2 tex;void main(){tex=uv;gl_Position=vec4(position,0.,1.);}'));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 tex;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,tex);}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const columns=66,rows=60,points=[];const uv=[],indices=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){points.push([i*SOURCE.width/columns,j*SOURCE.height/rows]);uv.push(i/columns,j/rows)}
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const n=j*(columns+1)+i;indices.push(n,n+1,n+columns+1,n+1,n+columns+2,n+columns+1)}
 const pos=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pos);gl.bufferData(gl.ARRAY_BUFFER,points.length*8,gl.DYNAMIC_DRAW);const pl=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pl);gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
 const ub=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ub);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uv),gl.STATIC_DRAW);const ul=gl.getAttribLocation(program,'uv');gl.enableVertexAttribArray(ul);gl.vertexAttribPointer(ul,2,gl.FLOAT,false,0,0);
 const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const positions=new Float32Array(points.length*2);
 return {render(time,{reduced=false,width=canvas.width,height=canvas.height,spriteWidth=width*.91,bottom=height*.96}={}){
  const p=samplePose(time,reduced),scale=spriteWidth/SOURCE.width,left=(width-spriteWidth)/2,top=bottom-SOURCE.height*scale;
  for(let i=0;i<points.length;i++){const q=deformPoint(...points[i],p);positions[2*i]=(left+q[0]*scale)/width*2-1;positions[2*i+1]=1-(top+q[1]*scale)/height*2;}
  gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.bindBuffer(gl.ARRAY_BUFFER,pos);gl.bufferSubData(gl.ARRAY_BUFFER,0,positions);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);return p;
 },points,indices};
}
