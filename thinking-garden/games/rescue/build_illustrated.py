#!/usr/bin/env python3
"""Convert the four independent illustrated characters into transparent, recolored game sprites.
Input originals are temporarily downloaded in GitHub Actions; not shipped in the site.
Each species stays the same identity across the four task colors."""
from pathlib import Path
from PIL import Image, ImageOps
import numpy as np

ROOT=Path(__file__).parent
SOURCES=ROOT/"import-sources"
DEST=ROOT/"art"/"illustrated"
DEST.mkdir(parents=True,exist_ok=True)
TARGET_H={"yellow":38,"blue":146,"green":77,"red":0}
COLOR_RGB={"yellow":(255,210,90),"blue":(99,178,247),"green":(114,210,141),"red":(251,131,135)}

for species in ("rabbit","pig","cow","duck"):
    file=SOURCES/f"{species}.png"
    if not file.exists(): raise RuntimeError(f"missing source {file}")
    original=Image.open(file).convert("RGBA")
    bbox=original.getchannel('A').getbbox()
    if bbox is None: raise RuntimeError(f"transparent image source {file}")
    im=original.crop(bbox)
    # Preserve clear silhouette and margins; avoid object-cropping from combined backgrounds.
    im.thumbnail((340,340),Image.Resampling.LANCZOS)
    canvas=Image.new("RGBA",(384,384),(0,0,0,0))
    canvas.alpha_composite(im,((384-im.width)//2,(384-im.height)//2))
    rgb=np.array(canvas.convert("RGB")).astype(np.uint8)
    hsv=np.array(canvas.convert("RGB").convert("HSV")).astype(np.uint8)
    alpha=np.array(canvas.getchannel("A"))
    # Main fur is golden-yellow. Leave facial detail, pink noses, hooves, horns and eyes intact.
    mask=(alpha>36)&(hsv[:,:,0]>=23)&(hsv[:,:,0]<=55)&(hsv[:,:,1]>=58)
    mask &= (rgb[:,:,0].astype(int)>rgb[:,:,2].astype(int)+32)
    mask &= (rgb[:,:,1].astype(int)>rgb[:,:,2].astype(int)+13)
    for color,hue in TARGET_H.items():
        if color=="yellow":
            output=canvas.copy()
        else:
            converted=hsv.copy()
            converted[:,:,0][mask]=hue
            converted[:,:,1][mask]=np.clip(converted[:,:,1][mask].astype(float)*1.05+8,58,215).astype(np.uint8)
            converted[:,:,2][mask]=np.clip(converted[:,:,2][mask].astype(float)*0.97,0,255).astype(np.uint8)
            tinted=Image.fromarray(converted,mode="HSV").convert("RGB")
            output=Image.merge("RGBA",(*tinted.split(),Image.fromarray(alpha)))
        target=DEST/f"{species}-{color}.webp"
        output.save(target,format="WEBP",quality=90,method=6,exact=True)
        assert target.stat().st_size>2000, target
        print("ASSET",target.name,"bytes",target.stat().st_size,flush=True)
print("READY 16 independent raster sprites")
