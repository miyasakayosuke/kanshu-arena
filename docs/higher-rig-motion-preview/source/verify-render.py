#!/usr/bin/env python3
"""Decode every movie frame and inspect fixed panel-border pixels."""
import hashlib,json,subprocess
from pathlib import Path
from PIL import Image
BASE=Path(__file__).resolve().parent.parent;OUT=BASE/'evidence';manifest=json.loads((OUT/'render-manifest.json').read_text());results=[]
for name,key in [('normal-1500ms-60fps.mp4','normal'),('slow-6000ms-60fps.mp4','slow'),('full-motion-review-60fps.mp4','review'),('comparison-normal-1500ms-60fps.mp4','comparison'),('comparison-review-60fps.mp4','comparisonReview')]:
    p=OUT/name;probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,nb_read_frames,r_frame_rate,duration','-of','json',str(p)]))['streams'][0]
    assert int(probe['nb_read_frames'])==len(manifest['clips'][key]);assert probe['r_frame_rate']=='60/1';assert (probe['width'],probe['height'])==((1680,1000) if key.startswith('comparison') else (1280,800))
    md5=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','framemd5','-']).decode();(OUT/(name+'.framemd5')).write_text(md5)
    assert len([x for x in md5.splitlines() if x and not x.startswith('#')])==len(manifest['clips'][key])
    results.append({'file':name,**probe,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'decodedAllFrames':True})
# Actual lossless PNG pixel checks at all four panel boundaries, away from labels.
checked=0
for entry in manifest['frames']:
    im=Image.open(OUT/'render-frames'/entry['file'].replace('.svg','.png')).convert('RGB')
    panels=[(28,120,800,540),(852,120,800,540),(28,690,360,260),(852,690,360,260)] if entry.get('comparison') else [(28,125,800,540),(856,125,360,260)]
    for x0,y0,w,h in panels:
        # The model must not reach a 4px interior border. Avoid rounded corners.
        expected=(18,39,55)
        for x in [x0+4,x0+w-5]:
            for y in range(y0+36,y0+h-35):assert im.getpixel((x,y))==expected,('side border ink',entry['file'],x,y)
        for y in [y0+4,y0+h-5]:
            for x in range(x0+16,x0+w-16):assert im.getpixel((x,y))==expected,('top/bottom border ink',entry['file'],x,y)
        checked+=1
audit=json.loads((OUT/'pixel-audit.json').read_text());assert audit['pass']
result={'pass':True,'unmaskedPixelAudit':'pixel-audit.json','movies':results,'losslessPanelBordersChecked':checked,'boundsMethod':'Analytical stroked primitive bounds sampled every 0.25ms; actual lossless rendered panel-border pixels checked for every unique movie frame.','browserExecuted':False,'limitations':['No real-time human playback claimed. Independent visual decoded-frame review is separate.','Video compression is lossy; static PNGs preserve exact native pixel scale.']}
(OUT/'render-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
