#!/usr/bin/env python3
"""Freeze selected reproducible evidence, excluding large transient render inputs."""
from pathlib import Path
import json,hashlib,zipfile,os
BASE=Path(__file__).resolve().parent.parent;OUT=BASE/'evidence'
frozen=os.environ.get('FREEZE_UTC')
if not frozen:raise SystemExit('Set FREEZE_UTC to a verified UTC timestamp.')
for name in ['tests.json','playback-tests.json','pixel-audit.json','render-verification.json']:
    assert json.loads((OUT/name).read_text())['pass'],name
files=['README.md','BUILDER-REPORT.md','index.html','provenance.json']+[str(p.relative_to(BASE)) for p in sorted((BASE/'source').iterdir()) if p.is_file()]
files += ['evidence/'+n for n in ['tests.json','playback-tests.json','pixel-audit.json','render-manifest.json','render-verification.json']]
files += [str(p.relative_to(BASE)) for p in sorted(OUT.glob('*.mp4'))]+[str(p.relative_to(BASE)) for p in sorted(OUT.glob('*.mp4.framemd5'))]
files += [str(p.relative_to(BASE)) for p in sorted(OUT.glob('decoded-*.png'))]+[str(p.relative_to(BASE)) for p in sorted(OUT.glob('unmasked-*.png'))]
files += [f'evidence/paused-{t}ms.{ext}' for t in [500,800] for ext in ['svg','png']]
assert len(files)==len(set(files))
def entry(rel):
    data=(BASE/rel).read_bytes();return {'path':rel,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'gitBlob':hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()}
manifest={'title':'Moonlit Bite offscreen-leap temporary comparison','frozenUtc':frozen,'scope':'One bounded composition. No authoring after freeze for independent review. Not final artwork, browser/runtime verification, integration or release.','fileCount':len(files),'selectedBinaryCount':sum(f.endswith(('.mp4','.png')) for f in files),'files':[entry(f) for f in sorted(files)],'regenerableExcluded':['evidence/render-frames/','evidence/decoded/','evidence/ordered-*/','evidence/pixel-audit-input.json'],'originalImageIncluded':False,'browserExecuted':False,'baselineCommit':'3f5f401f079c077d17c842f1aef7d0341bd9c522'}
(BASE/'FREEZE-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
archive=BASE/'moonlit-bite-offscreen-leap-proxy.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for f in sorted(files+['FREEZE-MANIFEST.json']):
        item=zipfile.ZipInfo(f,date_time=(2026,10,17,0,0,0));item.compress_type=zipfile.ZIP_DEFLATED;item.external_attr=0o100644<<16;z.writestr(item,(BASE/f).read_bytes())
print(json.dumps({'files':len(files),'selectedBinaryCount':manifest['selectedBinaryCount'],'manifestSha256':entry('FREEZE-MANIFEST.json')['sha256'],'archiveBytes':archive.stat().st_size,'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'mainMovieSha256':entry('evidence/full-motion-review-60fps.mp4')['sha256'],'comparisonMovieSha256':entry('evidence/comparison-review-60fps.mp4')['sha256']},indent=2))
