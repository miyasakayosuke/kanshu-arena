#!/usr/bin/env python3
"""Render new SVG proxy with preinstalled system libraries. No browser or network."""
import ctypes as C
import ctypes.util
import json
import os
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
BASE = Path(__file__).resolve().parent.parent
OUT = BASE / 'evidence'
RS=C.CDLL(ctypes.util.find_library('rsvg-2'));CA=C.CDLL(ctypes.util.find_library('cairo'));GO=C.CDLL(ctypes.util.find_library('gobject-2.0'))
class Rect(C.Structure):
    _fields_=[('x',C.c_double),('y',C.c_double),('width',C.c_double),('height',C.c_double)]
RS.rsvg_handle_new_from_data.argtypes=[C.c_char_p,C.c_size_t,C.c_void_p];RS.rsvg_handle_new_from_data.restype=C.c_void_p
RS.rsvg_handle_render_document.argtypes=[C.c_void_p,C.c_void_p,C.POINTER(Rect),C.c_void_p];RS.rsvg_handle_render_document.restype=C.c_int
CA.cairo_image_surface_create.argtypes=[C.c_int,C.c_int,C.c_int];CA.cairo_image_surface_create.restype=C.c_void_p
CA.cairo_create.argtypes=[C.c_void_p];CA.cairo_create.restype=C.c_void_p
CA.cairo_surface_write_to_png.argtypes=[C.c_void_p,C.c_char_p];CA.cairo_surface_write_to_png.restype=C.c_int
CA.cairo_destroy.argtypes=[C.c_void_p];CA.cairo_surface_destroy.argtypes=[C.c_void_p];GO.g_object_unref.argtypes=[C.c_void_p]
def render(svg):
    data=svg.read_bytes();root=ET.fromstring(data);w,h=int(root.attrib['width']),int(root.attrib['height'])
    handle=RS.rsvg_handle_new_from_data(data,len(data),None)
    if not handle:raise RuntimeError(f'SVG parse failed: {svg}')
    surface=CA.cairo_image_surface_create(0,w,h);context=CA.cairo_create(surface)
    try:
        if not RS.rsvg_handle_render_document(handle,context,C.byref(Rect(0,0,w,h)),None):raise RuntimeError(f'Render failed: {svg}')
        if CA.cairo_surface_write_to_png(surface,os.fsencode(svg.with_suffix('.png'))):raise RuntimeError('PNG write failed')
    finally:
        CA.cairo_destroy(context);CA.cairo_surface_destroy(surface);GO.g_object_unref(handle)
for svg in sorted(OUT.glob('*.svg'))+sorted((OUT/'render-frames').glob('*.svg')):render(svg)
manifest=json.loads((OUT/'render-manifest.json').read_text())
names={'normal':'normal-1500ms-60fps.mp4','slow':'slow-6000ms-60fps.mp4','review':'full-motion-review-60fps.mp4'}
for key,frames in manifest['clips'].items():
    ordered=OUT/f'ordered-{key}';ordered.mkdir(exist_ok=True)
    for i,name in enumerate(frames):
        target=ordered/f'{i:04d}.png'
        if not target.exists():os.link(OUT/'render-frames'/name,target)
    subprocess.run(['ffmpeg','-y','-v','error','-framerate','60','-i',str(ordered/'%04d.png'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/names[key])],check=True)
print('Rendered PNGs and three 60fps MP4s with system librsvg/Cairo. Browser not executed.')
