#!/usr/bin/env python3
"""Print master for approved Ulmoa praise chart. All writing lines, numbers and labels are vector."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
import fitz, io, subprocess, os
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'resources'/'promise-praise-chart-20261017'
SRC=OUT/'우리의_약속_칭찬판_미리보기.jpg'
PDF=OUT/'우리의_약속_칭찬판_A4_벡터_인쇄용.pdf'
JPEG=OUT/'우리의_약속_칭찬판_선명한미리보기.jpg'
PNG=OUT/'우리의_약속_칭찬판_벡터_300dpi.png'
W,H=A4;Sx=W/1055;Sy=H/1491
def locate(fam, fallback):
 try:
  import subprocess
  v=subprocess.check_output(['fc-match','-f','%{file}',fam],text=True).strip()
  return v if v and Path(v).exists() else fallback
 except Exception:return fallback
fallback='/usr/share/fonts/truetype/nanum/NanumGothic.ttf'
normal=locate('NanumSquareRound:style=Regular',fallback)
bold=locate('NanumSquareRound:style=Bold','/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf')
pdfmetrics.registerFont(TTFont('K',normal))
pdfmetrics.registerFont(TTFont('KB',bold))
c=canvas.Canvas(str(PDF),pagesize=A4,pageCompression=1)
c.setTitle('우리의 약속 칭찬판 - 울모아쌤 A4 벡터 인쇄용')
def xy(x,y):return x*Sx,H-y*Sy
def rect(x,y,w,h,bg='#FFFFFF',line=None,r=0,stroke=1.5):
 c.setFillColor(HexColor(bg));c.setStrokeColor(HexColor(line or bg));c.setLineWidth(stroke*Sx)
 if r:c.roundRect(x*Sx,H-(y+h)*Sy,w*Sx,h*Sy,r*Sx,fill=1,stroke=int(line is not None))
 else:c.rect(x*Sx,H-(y+h)*Sy,w*Sx,h*Sy,fill=1,stroke=int(line is not None))
def text(s,x,y,n=23,ink='#2A2628',center=False,bold=True):
 c.setFillColor(HexColor(ink));c.setFont('KB' if bold else 'K',n*Sx)
 if center:c.drawCentredString(x*Sx,H-y*Sy,s)
 else:c.drawString(x*Sx,H-y*Sy,s)
def line(x,y,xx,yy,ink='#4B4D53',w=1.4,dash=False):
 c.setStrokeColor(HexColor(ink));c.setLineWidth(w*Sx);c.setDash([4*Sx,4*Sx] if dash else [])
 c.line(x*Sx,H-y*Sy,xx*Sx,H-yy*Sy);c.setDash([])
def circle(x,y,r,ink):
 c.setFillColor(HexColor(ink));c.circle(x*Sx,H-y*Sy,r*Sx,stroke=0,fill=1)
# Approved bear/rabbit artwork: crop ONLY decorative sections of approved JPEG.
# The old raster is never used for the writing table, numbers, headings, or rules.
approved=Image.open(SRC).convert('RGB').resize((1055,1491),Image.Resampling.LANCZOS)
def animal(region,x,y,w,h):
 art=approved.crop(region)
 mask=Image.new('L',art.size);d=ImageDraw.Draw(mask)
 d.rounded_rectangle((3,3,art.width-3,art.height-3),radius=22,fill=255)
 mask=mask.filter(ImageFilter.GaussianBlur(4))
 im=art.convert('RGBA');im.putalpha(mask)
 buf=io.BytesIO();im.save(buf,format='PNG');buf.seek(0)
 c.drawImage(ImageReader(buf),x*Sx,H-(y+h)*Sy,w*Sx,h*Sy,mask='auto')
rect(0,0,1055,1491)
animal((14,27,221,181),12,25,211,159)
animal((830,20,1034,186),827,19,211,171)
rect(209,35,632,119,'#FFF9EC','#F6C069',55,4)
text('우리의',225,120,63,'#704029')
text('약속',420,120,69,'#38945A')
text('칭찬판',578,120,69,'#F05A7B')
text('♥',805,119,58,'#F4577E')
rect(58,175,943,65,'#FFFDF8','#F5BD54',25,2.6)
text('이름 :',94,217,25);line(179,221,403,221)
line(487,185,487,229,'#EED7A5')
text('약속한 날짜 :',509,217,25)
line(673,221,763,221);text('년',766,217,19)
line(793,221,840,221);text('월',846,217,19)
line(869,221,919,221);text('일',922,217,19)
rect(20,256,1016,55,'#FFF0F4',r=23)
text('♥',62,292,24,'#F25B7B')
text('약속을 지킨 모습을 보면, 날짜와 칭찬해 준 사람의 이름을 적어요.',530,291,25,center=True)
text('♥',993,292,24,'#F25B7B')
rect(22,327,257,70,'#E9F5FD','#7DCDF5',12,2.3)
text('우리의 약속',152,358,27,center=True);text('(함께 정한 내용)',152,383,19,center=True)
rect(293,327,710,70,'#E9F5FD','#7DCDF5',12,2.3)
text('칭찬 기록 (날짜 / 칭찬해 준 사람)',648,365,24,center=True)
rows=[
('#FDE4E9','#F89AAE','#F45879','#FFF0F2'),
('#FFF1D9','#F6C566','#FFA926','#FFF8E9'),
('#E5F7E5','#84CC96','#31A46B','#F4FCF2'),
('#E5F4FF','#8CCEF9','#219CE8','#F4FAFF'),
('#F1E6FB','#C7A7E6','#9558C8','#FAF7FD')]
for i,(fill,border,accent,light) in enumerate(rows):
 y=408+163*i
 rect(22,y,257,153,fill,border,13,2)
 circle(57,y+34,27,accent)
 text(str(i+1),57,y+45,35,'#FFFFFF',center=True)
 line(86,y+65,265,y+65);line(86,y+112,265,y+112)
 for j in range(10):
  x=293+71*j
  rect(x,y,71,153,'#FFFFFF','#A8AFB5',4,1.6)
  rect(x+1,y+1,69,41,light,r=3)
  circle(x+35,y+25,17,fill)
  text(str(j+1),x+35,y+33,23,'#243444',center=True)
  text('/',x+35,y+81,22,'#55565F',center=True)
  line(x+9,y+104,x+61,y+104,'#777B82',1.2)
rect(22,1226,507,207,'#FFF7EA','#F3C978',28,2)
rect(542,1226,488,207,'#F4FBF3','#99CF9B',28,2)
text('칭찬 한마디',248,1273,31,'#53362E',center=True);text('♥',412,1273,26,'#F35F7E')
for y in (1322,1364,1406):line(182,y,497,y,'#B9B4AB',1.2,True)
text('목표 달성 기념',727,1273,29,'#285637',center=True)
rect(562,1293,327,123,'#FFFFFF','#9DCFA0',21,2)
animal((2,1243,190,1444),10,1280,147,150)
animal((840,1231,1043,1457),889,1286,136,144)
text('© 울모아쌤',915,1470,14,'#8A8585',bold=False)
c.showPage();c.save()
doc=fitz.open(str(PDF))
assert len(doc)==1 and abs(doc[0].rect.width-A4[0])<1
assert len(doc[0].get_text())>200
pix=doc[0].get_pixmap(matrix=fitz.Matrix(300/72,300/72),alpha=False)
pix.save(str(PNG))
im=Image.open(PNG).convert('RGB')
im.save(JPEG,'JPEG',quality=94,subsampling=0,optimize=True,dpi=(300,300))
assert im.size[0]>2400 and im.size[1]>3400
print('VECTOR_RELEASE_PASS',str(PDF),PDF.stat().st_size,im.size,'preview',JPEG.stat().st_size)
