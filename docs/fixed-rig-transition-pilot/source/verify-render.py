#!/usr/bin/env python3
import ctypes as C,ctypes.util,json,subprocess,hashlib
from pathlib import Path
BASE=Path(__file__).resolve().parent.parent
OUT=BASE/'evidence'
RS=C.CDLL(ctypes.util.find_library('rsvg-2'));GO=C.CDLL(ctypes.util.find_library('gobject-2.0'))
class Rect(C.Structure):_fields_=[(s,C.c_double) for s in ['x','y','width','height']]
RS.rsvg_handle_new_from_data.argtypes=[C.c_char_p,C.c_size_t,C.c_void_p];RS.rsvg_handle_new_from_data.restype=C.c_void_p
RS.rsvg_handle_get_geometry_for_layer.argtypes=[C.c_void_p,C.c_char_p,C.POINTER(Rect),C.POINTER(Rect),C.POINTER(Rect),C.c_void_p];RS.rsvg_handle_get_geometry_for_layer.restype=C.c_int
GO.g_object_unref.argtypes=[C.c_void_p]
payload=json.loads(subprocess.check_output(['node',str(BASE/'source/geometry-samples.mjs')]))
samples=payload['samples']
minimum={};worst={}
for s in samples:
    data=s['svg'].encode();handle=RS.rsvg_handle_new_from_data(data,len(data),None);ink,logical=Rect(),Rect()
    try:
        assert RS.rsvg_handle_get_geometry_for_layer(handle,b'#actor',C.byref(Rect(0,0,s['width'],s['height'])),C.byref(ink),C.byref(logical),None)
    finally:GO.g_object_unref(handle)
    margin=min(ink.x,ink.y,s['width']-ink.x-ink.width,s['height']-ink.y-ink.height)
    key=f"{s['width']}x{s['height']} at {s['physicalWidth']}px"
    if margin<minimum.get(key,float('inf')):minimum[key]=margin;worst[key]={k:v for k,v in s.items() if k!='svg'}
    assert margin>0, f"Actor is clipped: {key}, {s['mode']}, {s['ms']}ms, margin={margin}"
assert min(minimum.values()) > payload['motionBound']['betweenSampleDisplacementBoundPx'] + .1
videos=[]
for filename,expected_count,expected_duration in [('comparison-60fps.mp4',324,5.4),('normal-300ms-60fps.mp4',18,.3),('slow-1200ms-60fps.mp4',72,1.2)]:
    result=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=width,height,r_frame_rate,nb_read_frames,duration','-of','json',str(OUT/filename)]))['streams'][0]
    assert result['width']==1280 and result['height']==1050
    assert result['r_frame_rate']=='60/1' and int(result['nb_read_frames'])==expected_count
    assert abs(float(result['duration'])-expected_duration)<1e-6
    # Decode every frame, not only container metadata.
    hashes=subprocess.check_output(['ffmpeg','-v','error','-i',str(OUT/filename),'-f','framemd5','-']).decode()
    rows=[r for r in hashes.splitlines() if r and not r.startswith('#')]
    assert len(rows)==expected_count
    unique=len(set(row.split(',')[-1].strip() for row in rows))
    if filename!='comparison-60fps.mp4':assert unique==expected_count
    (OUT/(filename+'.framemd5')).write_text(hashes)
    videos.append({'file':filename,**result,'decodedFrames':len(rows),'uniqueDecodedFrames':unique,'sha256':hashlib.sha256((OUT/filename).read_bytes()).hexdigest()})
report={'geometrySamples':len(samples),'sampleIntervalMs':0.25,'geometryTool':'librsvg actual stroked ink bounds','actorWithinEveryTestedViewport':True,'betweenSamplesMarginProof':payload['motionBound'],'minimumMarginsPx':minimum,'tightestSamples':worst,'videos':videos,'browserExecuted':False,'note':'Vector bounds and deterministic decoded media checks are not browser or production-game QA.'}
(OUT/'render-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
