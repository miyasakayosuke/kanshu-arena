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
inp=json.loads((OUT/'pixel-audit-input.json').read_text());pad=inp['padding'];records=[];selected={0,165,180,200,220,240,360,500,760,800,889,890,900,930,969,970,980,1500};samples=[]
for name,cfg in inp['panels'].items():
    w,h=cfg['width']+2*pad,cfg['height']+2*pad;ox,oy=cfg['origin'];scale=cfg['physicalWidth']/240
    worst_ground=0;worst_outside=0;min_margin=10**9
    def one(frame):
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}"><g transform="translate({ox+pad} {oy+pad}) scale({scale})">{frame["actor"]}</g></svg>'
        image=render(svg,w,h);alpha=image.getchannel('A');bbox=alpha.getbbox();assert bbox
        ground=nonzero(alpha.crop((0,oy+pad,w,h)))
        outside=nonzero(alpha.crop((0,0,w,pad)))+nonzero(alpha.crop((0,pad+cfg['height'],w,h)))+nonzero(alpha.crop((0,pad,pad,pad+cfg['height'])))+nonzero(alpha.crop((pad+cfg['width'],pad,w,pad+cfg['height'])))
        margin=min(bbox[0]-pad,bbox[1]-pad,pad+cfg['width']-bbox[2],pad+cfg['height']-bbox[3])
        return image,{'ms':frame['ms'],'groundPixels':ground,'outsidePanelPixels':outside,'alphaBounds':list(bbox),'panelMarginPx':margin}
    for frame in inp['frames']:
        image,row=one(frame);worst_ground=max(worst_ground,row['groundPixels']);worst_outside=max(worst_outside,row['outsidePanelPixels']);min_margin=min(min_margin,row['panelMarginPx'])
        assert row['groundPixels']==0,(name,'ground penetration',row)
        assert row['outsidePanelPixels']==0,(name,'panel clipping',row)
        assert row['panelMarginPx']>=4,(name,'panel margin',row)
        if frame['ms'] in selected:
            p=OUT/f'unmasked-{name}-{int(frame["ms"])}ms.png';image.save(p);samples.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),**row})
    old_im,old=one(inp['oldPositiveControl']);assert old['groundPixels']>0,('Positive control failed',name,old)
    p=OUT/f'unmasked-old-{name}-200ms.png';old_im.save(p)
    records.append({'view':name,'fixedScale':scale,'testedTimestamps':len(inp['frames']),'maxPixelsBelowGround':worst_ground,'maxPixelsOutsidePanel':worst_outside,'minPanelMarginPx':min_margin,'oldPositiveControl':old})
result={'pass':True,'method':'Actual unmasked full-actor alpha pixels rendered by system librsvg/Cairo on a 64-pixel overscan canvas; no clipping region, ground cover, labels, background or original raster.','timeCoverage':'Every integer ms 0–1500 plus every unique normal/slow video time rounded to 1e-6 ms. Geometry additionally sampled every .25 ms.','views':records,'selectedUnmaskedImages':samples,'browserExecuted':False,'limits':['Raster coverage is sampled, not a continuous-time proof.','Alpha ink geometry test is not anatomical self-collision or physically realistic weight validation.']}
(OUT/'pixel-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='selectedUnmaskedImages'},indent=2))
