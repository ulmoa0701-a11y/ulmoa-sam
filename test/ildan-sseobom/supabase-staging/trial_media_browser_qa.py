"""Synthetic end-to-end trial photos, canvas drawing and private device draft archive."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from playwright.sync_api import sync_playwright
from urllib.parse import urlsplit
import os, json, time, base64, zlib, struct

root=Path(__file__).resolve().parents[3]
server=ThreadingHTTPServer(('127.0.0.1',8829),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:8829/test/ildan-sseobom/supabase-staging/'
user_id='10000000-0000-4000-8000-000000000002'
def make_png(w=24,h=24):
 raw=b''.join(b'\0'+b'\x78\xae\xd0'*w for _ in range(h))
 def chunk(tag,data):
  return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
photo=make_png()
checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROME_BIN') or '/usr/bin/google-chrome',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,role in [(390,'student'),(1440,'student'),(390,'parent')]:
  page=browser.new_page(viewport={'width':width,'height':900})
  errors=[]; remote_writes=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  session={'access_token':'fake.qa.media.token','refresh_token':'fake.qa.refresh','token_type':'bearer',
           'expires_in':3600,'expires_at':int(time.time())+3600,
           'user':{'id':user_id,'email':'synthetic-media@example.invalid','aud':'authenticated',
                   'role':'authenticated','app_metadata':{},'user_metadata':{},'created_at':'2026-10-15T00:00:00Z'}}
  page.add_init_script("(()=>{const session="+json.dumps(session)+";localStorage.setItem('ildanPersonalDevice','yes');localStorage.setItem('sb-miohovwmhmtcvkurjamm-auth-token',JSON.stringify(session))})()")
  def mock_api(route):
   method=route.request.method;path=urlsplit(route.request.url).path
   h={'Access-Control-Allow-Origin':'http://127.0.0.1:8829','Access-Control-Allow-Methods':'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers':'content-type,authorization,apikey'}
   if method=='OPTIONS':route.fulfill(status=204,headers=h);return
   if method=='POST':remote_writes.append(path)
   if path.endswith('/me'):data={'user':{'id':user_id,'role':role,'nickname':'가상 연습 계정'}}
   elif path.endswith('/records'):data={'records':[]}
   else:data={'error':'synthetic missing endpoint '+path}
   route.fulfill(status=200,headers=h,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
  page.route('**/functions/v1/ildan-api/**',mock_api)
  page.goto(url,wait_until='domcontentloaded',timeout=35000)
  page.locator('#photoUpload').wait_for(timeout=25000)
  assert page.locator('#saveEntry').inner_text().strip()=='💾 이 기기에 저장하기','save button promises device storage, not sharing'
  assert not page.locator('.trial-sharing-hidden').is_visible(),'Unavailable remote share UI must not block save'
  assert '내 기록' in page.locator('.trial-storage-note').inner_text()
  assert page.locator('#showDrawing').count()==1, 'drawing is always discoverable'
  assert page.locator('#photoCapture').get_attribute('capture')=='environment'
  assert page.locator('#photoUpload').get_attribute('multiple') is not None
  page.locator('#photoUpload').set_input_files([
   {'name':'practice1.png','mimeType':'image/png','buffer':photo},
   {'name':'practice2.png','mimeType':'image/png','buffer':photo}
  ])
  page.locator('.photo-thumbnail img').first.wait_for(timeout=15000)
  assert page.locator('.photo-thumbnail').count()==2
  assert page.locator('.photo-thumbnail img').first.get_attribute('src').startswith('data:image/jpeg;base64,'),'decoded and metadata-stripped JPEG'
  page.locator('[data-remove-photo="0"]').click()
  assert page.locator('.photo-thumbnail').count()==1,'can remove one photo'
  page.locator('#showDrawing').click()
  assert page.locator('#noteCanvas').is_visible()
  bb=page.locator('#noteCanvas').bounding_box()
  page.mouse.move(bb['x']+20,bb['y']+25)
  page.mouse.down()
  page.mouse.move(bb['x']+130,bb['y']+80,steps=8)
  page.mouse.up()
  if role=='parent':
   page.locator('#entryForm input[name=date]').fill('2026-10-15')
  # Photo+sketch only: do not fill text or share with therapist.
  page.locator('#saveEntry').click()
  page.locator('[data-workspace-view=history] .device-only-record').wait_for(timeout=15000)
  assert page.locator('.device-only-record .saved-photo-grid img').count()==1
  assert page.locator('.device-only-record .sketch-record canvas').count()==1
  assert not remote_writes,'No real clinical media should reach Supabase records'
  page.reload(wait_until='domcontentloaded')
  page.locator('[data-workspace-target=history]').wait_for(timeout=15000)
  page.locator('[data-workspace-target=history]').click()
  assert page.locator('.device-only-record .saved-photo-grid img').count()==1,'photo survives reload on same device'
  page.once('dialog',lambda dialog:dialog.accept())
  page.locator('[data-delete-practice]').click()
  page.locator('.device-only-record').wait_for(state='detached',timeout=15000)
  assert not errors,('uncaught errors',role,width,errors)
  checks.append(f'{role} {width}px: photo import/preview/remove + touch-capable canvas + on-device archive/reload/delete, no remote write')
  page.close()
 browser.close()
server.shutdown()
print(json.dumps({'status':'PASS','checks':checks},ensure_ascii=False))
