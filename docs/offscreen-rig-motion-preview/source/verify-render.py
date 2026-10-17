#!/usr/bin/env python3
"""Decode actual movies completely; preserve selected decoded evidence without resizing."""
from pathlib import Path
import subprocess,json,hashlib
from PIL import Image,ImageDraw,ImageFont
BASE=Path(__file__).resolve().parent.parent;OUT=BASE/'evidence';DEC=OUT/'decoded';DEC.mkdir(exist_ok=True)
manifest=json.loads((OUT/'render-manifest.json').read_text());names={'normal':'normal-1500ms-60fps.mp4','slow':'slow-6000ms-60fps.mp4','review':'full-motion-review-60fps.mp4','comparison':'comparison-review-60fps.mp4'};records=[]
for key,name in names.items():
    p=OUT/name
    data=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(p)]));v=data['streams'][0];expected=len(manifest['clips'][key]);assert int(v['nb_read_frames'])==expected;assert v['r_frame_rate']=='60/1';assert (v['width'],v['height'])==((1680,1000) if key=='comparison' else (1280,800))
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(p),'-f','framemd5',str(p)+'.framemd5'],check=True)
    records.append({'file':name,'frames':expected,'fps':60,'width':v['width'],'height':v['height'],'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'fullDecode':True})
    if key in ['normal','slow','comparison']:
        folder=DEC/key;folder.mkdir(exist_ok=True);subprocess.run(['ffmpeg','-y','-v','error','-i',str(p),str(folder/'%04d.png')],check=True)
    else:subprocess.run(['ffmpeg','-y','-v','error','-i',str(p),'-vf',f'select=eq(n\\,{expected-1})','-frames:v','1',str(DEC/'review-end.png')],check=True)
# Lossless source panel-border checks cover every unique generated frame.
border_checks=0
for frame in manifest['frames']:
    im=Image.open(OUT/'render-frames'/frame['file'].replace('.svg','.png')).convert('RGB')
    panels=[(28,120,800,540),(852,120,800,540),(28,690,360,260),(852,690,360,260)] if frame['comparison'] else [(28,125,800,540),(856,125,360,260)]
    for x,y,w,h in panels:
        for px,py in [(x,y),(x+w-1,y),(x,y+h-1),(x+w-1,y+h-1)]:assert im.getpixel((px,py))==(108,152,173),(frame['file'],px,py,im.getpixel((px,py)))
        border_checks+=1
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
def frame(key,index):return Image.open(DEC/key/f'{index+1:04d}.png').convert('RGB')
def sheet(name,items,cols,crop,title):
    w,h=crop[2]-crop[0],crop[3]-crop[1];cw,ch=w+20,h+34;im=Image.new('RGB',(20+cw*cols,62+ch*((len(items)+cols-1)//cols)),(9,23,37));d=ImageDraw.Draw(im);d.text((20,15),title,fill=(220,236,246),font=font)
    for i,(key,index,label) in enumerate(items):
        x=20+(i%cols)*cw;y=56+(i//cols)*ch;d.text((x,y),label,fill=(220,236,246),font=font);im.paste(frame(key,index).crop(crop),(x,y+27))
    im.save(OUT/name)
sheet('decoded-normal-native-all.png',[('normal',i,f'{i*1000/60:.1f} ms / frame {i}') for i in range(90)],6,(856,125,1216,385),'ACTUAL DECODED NORMAL 1x / all 90 frames / native pixels unchanged')
normal=[0,12,18,21,25,26,27,28,36,37,39,40,41,42,44,46,47,48,50,54,56,58,65,89]
sheet('decoded-normal-enlarged-phases.png',[('normal',i,f'{i*1000/60:.1f} ms / frame {i}') for i in normal],4,(28,125,828,665),'ACTUAL DECODED NORMAL 1x / exit, return, bite, landing / enlarged pixels unchanged')
slow=[104,108,112,144,148,152,156,160,164,168,176,180,184,188,190,192,194,196,200,208,214,216,224,232,236,240,264,359]
sheet('decoded-slow-enlarged-phases.png',[('slow',i,f'{i*1000/240:.2f} ms / frame {i}') for i in slow],4,(28,125,828,665),'ACTUAL DECODED 0.25x / exit-return and dense bite-landing / enlarged pixels unchanged')
# Both native panels from actual comparison movie, stacked in each cell, no resize.
selected=[30,57,60,66,70,74,78,84,88,119,167];w,h=360,260;cw,ch=380,580;im=Image.new('RGB',(20+cw*4,65+ch*3),(9,23,37));d=ImageDraw.Draw(im);d.text((20,15),'ACTUAL DECODED SAME-CLOCK COMPARISON / prior above, new below / native pixels unchanged',font=font,fill=(220,236,246))
for j,i in enumerate(selected):
    x=20+(j%4)*cw;y=60+(j//4)*ch;t=1500 if i==167 else max(0,(i-30)*1000/60);d.text((x,y),f'{t:.1f} ms / frame {i}',font=font,fill=(220,236,246));f=frame('comparison',i);im.paste(f.crop((28,690,388,950)),(x,y+27));im.paste(f.crop((852,690,1212,950)),(x,y+297))
im.save(OUT/'decoded-comparison-native.png')
result={'pass':True,'movies':records,'losslessPanelBorderChecks':border_checks,'decodedSheets':['decoded-normal-native-all.png','decoded-normal-enlarged-phases.png','decoded-slow-enlarged-phases.png','decoded-comparison-native.png'],'exactEndpointDecoded':{'reviewLastFrame':len(manifest['clips']['review'])-1,'comparisonLastFrame':167,'ms':1500},'nativeResizing':False,'browserExecuted':False,'limits':['Decoded frame inspection is not real-time human playback.','Lossy movie frames differ from lossless SVG source pixels.']};(OUT/'render-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
