#!/usr/bin/env python3
"""Render the entire actor without a panel clip/background/ground mask.
Audit actual alpha pixels, including all body and leg ink, beyond ground and panel.
Uses preinstalled librsvg/Cairo only. No browser, server, network or original art.
"""
import ctypes as C,ctypes.util,json,hashlib
from pathlib import Path
from PIL import Image
BASE=Path(__file__).resolve().parent.parent;OUT=BASE/'evidence'
RS=C.CDLL(ctypes.util.find_library('rsvg-2'));CA=C.CDLL(ctypes.util.find_library('cairo'));GO=C.CDLL(ctypes.util.find_library('gobject-2.0'))
class Rect(C.Structure):_fields_=[('x',C.c_double),('y',C.c_double),('width',C.c_double),('height',C.c_double)]
RS.rsvg_handle_new_from_data.argtypes=[C.c_char_p,C.c_size_t,C.c_void_p];RS.rsvg_handle_new_from_data.restype=C.c_void_p
RS.rsvg_handle_render_document.argtypes=[C.c_void_p,C.c_void_p,C.POINTER(Rect),C.c_void_p];RS.rsvg_handle_render_document.restype=C.c_int
CA.cairo_image_surface_create.argtypes=[C.c_int,C.c_int,C.c_int];CA.cairo_image_surface_create.restype=C.c_void_p
CA.cairo_create.argtypes=[C.c_void_p];CA.cairo_create.restype=C.c_void_p
CA.cairo_surface_flush.argtypes=[C.c_void_p]
CA.cairo_image_surface_get_stride.argtypes=[C.c_void_p];CA.cairo_image_surface_get_stride.restype=C.c_int
CA.cairo_image_surface_get_data.argtypes=[C.c_void_p];CA.cairo_image_surface_get_data.restype=C.POINTER(C.c_ubyte)
CA.cairo_destroy.argtypes=[C.c_void_p];CA.cairo_surface_destroy.argtypes=[C.c_void_p];GO.g_object_unref.argtypes=[C.c_void_p]
def render(data,w,h):
    data=data.encode();handle=RS.rsvg_handle_new_from_data(data,len(data),None);assert handle
    surface=CA.cairo_image_surface_create(0,w,h);context=CA.cairo_create(surface)
    try:
        assert RS.rsvg_handle_render_document(handle,context,C.byref(Rect(0,0,w,h)),None)
        CA.cairo_surface_flush(surface);stride=CA.cairo_image_surface_get_stride(surface)
        raw=C.string_at(CA.cairo_image_surface_get_data(surface),stride*h)
        return Image.frombytes('RGBA',(w,h),raw,'raw','BGRA',stride)
    finally:CA.cairo_destroy(context);CA.cairo_surface_destroy(surface);GO.g_object_unref(handle)
def nonzero(im):return sum(im.histogram()[1:])
inp=json.loads((OUT/'pixel-audit-input.json').read_text());records=[];selected=[]
for name,cfg in inp['panels'].items():
    left=32;top=420 if name=='large' else 112;bottom=32
    w,h=cfg['width']+2*left,cfg['height']+top+bottom;ox,oy=cfg['origin'];scale=cfg['physicalWidth']/240
    max_ground=0;max_side=0;max_bottom=0;max_top=0;min_container_margin=10**9;full=[];cross=[]
    for frame in inp['frames']:
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}"><g transform="translate({ox+left} {oy+top}) scale({scale})">{frame["actor"]}</g></svg>'
        image=render(svg,w,h);a=image.getchannel('A');bbox=a.getbbox();assert bbox
        container_margin=min(bbox[0],bbox[1],w-bbox[2],h-bbox[3]);min_container_margin=min(min_container_margin,container_margin);assert container_margin>=4,('Overscan itself crops actor',name,frame['ms'],bbox)
        ground=nonzero(a.crop((0,oy+top,w,h)));side=nonzero(a.crop((0,0,left,h)))+nonzero(a.crop((left+cfg['width'],0,w,h)));under=nonzero(a.crop((0,top+cfg['height'],w,h)));above=nonzero(a.crop((0,0,w,top)))
        max_ground=max(max_ground,ground);max_side=max(max_side,side);max_bottom=max(max_bottom,under);max_top=max(max_top,above)
        assert ground==0 and side==0 and under==0,('Forbidden ground or side/bottom ink',name,frame['ms'],ground,side,under)
        if above:cross.append(frame['ms']);assert 420<frame['ms']<800,('Top clipping outside flight',name,frame['ms'])
        visible=nonzero(a.crop((left,top,left+cfg['width'],top+cfg['height'])))
        if visible==0:full.append(frame['ms']);assert bbox[3]<=top,('Not offscreen by top exit',name,frame['ms'])
        if (name=='large' and frame['ms'] in [500,800,930]) or (name=='native' and frame['ms']==500):
            p=OUT/f'unmasked-{name}-{int(frame["ms"])}ms.png';image.save(p);selected.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'ms':frame['ms'],'alphaBounds':bbox,'visibleActorPixels':visible,'pixelsAboveViewport':above,'groundPixels':ground})
    assert full and full[-1]-full[0]>100
    records.append({'view':name,'samples':len(inp['frames']),'scale':scale,'overscan':{'left':left,'top':top,'bottom':bottom},'maxPixelsBelowGround':max_ground,'maxSidePixels':max_side,'maxBottomPixels':max_bottom,'maxIntentionalTopPixels':max_top,'overscanMinInkMarginPx':min_container_margin,'firstTopCrossingMs':cross[0],'lastTopCrossingMs':cross[-1],'firstFullyAboveMs':full[0],'lastFullyAboveMs':full[-1],'fullyAboveDurationMs':full[-1]-full[0]})
result={'pass':True,'method':'Unmasked full-actor alpha rendering with large top overscan; no viewport clip, background, ground cover, target or labels. All actor pixels retained in audit canvas.','timeCoverage':'Every integer millisecond 0-1500 plus every distinct normal/slow frame timestamp rounded to 1e-6 ms.','views':records,'selectedUnmaskedImages':selected,'browserExecuted':False,'limits':['Sampled raster evidence, not a continuous-time proof.','Top clipping is intentional only during flight.','No physical collision or runtime performance validation.']}
(OUT/'pixel-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='selectedUnmaskedImages'},indent=2))
