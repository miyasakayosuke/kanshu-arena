#!/usr/bin/env python3
"""Freeze a lean reproducible local archive after tests and rendering complete."""
import gzip,hashlib,json,zipfile,os
from pathlib import Path
BASE=Path(__file__).resolve().parent.parent
frozen_utc=os.environ.get('FREEZE_UTC')
if not frozen_utc:raise SystemExit('Set FREEZE_UTC to a verified UTC timestamp before freezing.')
raw=BASE/'evidence/landmarks-1ms.json';packed=raw.with_suffix('.json.gz')
packed.write_bytes(gzip.compress(raw.read_bytes(),compresslevel=9,mtime=0))
files=['README.md','index.html','provenance.json']
files += [str(p.relative_to(BASE)) for p in sorted((BASE/'source').glob('*')) if p.is_file()]
files += ['evidence/'+name for name in ['tests.json','playback-tests.json','render-manifest.json','render-verification.json','landmarks-1ms.json.gz','native-142px-sequence.svg','native-142px-sequence.png','enlarged-420px-sequence.svg','enlarged-420px-sequence.png','normal-1500ms-60fps.mp4','slow-6000ms-60fps.mp4','full-motion-review-60fps.mp4','normal-1500ms-60fps.mp4.framemd5','slow-6000ms-60fps.mp4.framemd5','full-motion-review-60fps.mp4.framemd5']]
files += [f'evidence/paused-{t}ms.{ext}' for t in [0,360,760,800,890,930,970,1500] for ext in ['svg','png']]
def entry(rel):
    data=(BASE/rel).read_bytes();return {'path':rel,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'gitBlob':hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()}
manifest={'title':'Moonlit Bite full-action motion proxy','frozenUtc':frozen_utc,'scope':'One complete contact-constrained mechanics proposal. No authoring after independent visual review.','fileCount':len(files),'files':[entry(f) for f in sorted(files)],'regenerableLocalIntermediates':['evidence/render-frames/','evidence/ordered-normal/','evidence/ordered-slow/','evidence/ordered-review/','non-selected paused SVG/PNG views','raw evidence/landmarks-1ms.json'],'compressedLandmarks':{'path':'evidence/landmarks-1ms.json.gz','uncompressedBytes':raw.stat().st_size,'uncompressedSha256':hashlib.sha256(raw.read_bytes()).hexdigest()},'originalImageIncluded':False,'browserExecuted':False}
(BASE/'FREEZE-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
with zipfile.ZipFile(BASE/'moonlit-bite-full-motion-proxy.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for f in sorted(files+['FREEZE-MANIFEST.json']):
        item=zipfile.ZipInfo(f,date_time=(2026,10,17,0,0,0));item.compress_type=zipfile.ZIP_DEFLATED;item.external_attr=0o100644<<16;z.writestr(item,(BASE/f).read_bytes())
print(json.dumps({'files':len(files),'archiveBytes':(BASE/'moonlit-bite-full-motion-proxy.zip').stat().st_size,'archiveSha256':hashlib.sha256((BASE/'moonlit-bite-full-motion-proxy.zip').read_bytes()).hexdigest(),'mainMovieSha256':entry('evidence/full-motion-review-60fps.mp4')['sha256']},indent=2))
