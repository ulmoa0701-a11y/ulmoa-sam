"""Browser mock: photo+sketch upload, online practice records, opt-in share, cross-device view."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import os,time,json,base64,struct,zlib
root=Path(__file__).resolve().parents[3]
srv=ThreadingHTTPServer(('127.0.0.1',8829),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=srv.serve_forever,daemon=True).start()
url='http://127.0.0.1:8829/test/ildan-sseobom/supabase-staging/'
student='10000000-0000-4000-8000-000000000015'
therapist='10000000-0000-4000-8000-000000000016'
bucket='ildan-practice-media'
stored=[];uploaded=[];remote_clinical=[]
def png():
 raw=b''.join(b'\0'+b'\xe1\x93\x65'*24 for _ in range(24))
 def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',24,24,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
def init(page,role):
 uid=therapist if role=='therapist' else student
 session={'access_token':'fake.browser.qa.jwt','refresh_token':'test','token_type':'bearer','expires_in':3600,'expires_at':int(time.time())+3600,
 'user':{'id':uid,'email':'qa@example.invalid','aud':'authenticated','role':'authenticated','app_metadata':{},'user_metadata':{},'created_at':'2026-10-15T00:00:00Z'}}
 page.add_init_script("(()=>{const s="+json.dumps(session)+";localStorage.setItem('sb-miohovwmhmtcvkurjamm-auth-token',JSON.stringify(s));localStorage.setItem('ildanPersonalDevice','yes')})()")
 def route_api(route):
  path=urlsplit(route.request.url).path
  method=route.request.method
  headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8829','Access-Control-Allow-Headers':'apikey,authorization,content-type',
  'Access-Control-Allow-Methods':'POST,GET,OPTIONS'}
  if method=='OPTIONS':route.fulfill(status=204,headers=headers);return
  payload=route.request.post_data_json if method=='POST' else {}
  name=path.split('/ildan-api/')[-1];code=200;data={}
  if name=='me':data={'user':{'id':uid,'role':role,'nickname':'연습계정','trial':True}}
  elif name=='practice-records' and method=='GET':
   data={'records':[{'id':row['id'],'kind':'student','student':'가상 학생','studentId':student,'author':'연습 학생',
    'createdAt':'2026-10-15T10:00:00Z','shared':row['shared'],'practice':True,
    'entry':{**row['entry'],'photos':['https://miohovwmhmtcvkurjamm.supabase.co/storage/v1/object/sign/'+bucket+'/'+p+'?token=test' for p in row['entry'].get('photos',[])]}}
    for row in stored if role!='therapist' or row['shared']]}
  elif name=='practice-media-sign':
   n=len(uploaded)+1
   data={'path':student+'/00000000-0000-4000-8000-'+str(n).zfill(12)+'.jpg','bucket':bucket,'token':'qa-upload','maxBytes':2097152}
  elif name=='practice-records' and method=='POST':
   stored.append({'id':'00000000-0000-4000-8000-000000000057','entry':payload['entry'],'shared':payload['share']})
   code=201;data={'record':{'id':stored[-1]['id'],'shared':payload['share']}}
  elif name=='practice-share':
   stored[0]['shared']=True;data={'ok':True,'shared':True}
  elif name=='practice-unshare':
   stored[0]['shared']=False;data={'ok':True,'shared':False}
  elif name=='practice-delete':
   stored.clear();data={'ok':True,'deleted':True}
  elif name=='students':data={'students':[{'id':student,'nickname':'가상 학생'}]}
  elif name=='accounts':data={'accounts':[]}
  elif name=='drive/status':data={'connected':False,'configured':False,'backupEnabled':False}
  elif name=='invites':data={'invites':[]}
  elif name=='session-notes':data={'notes':[]}
  else:
   if method=='POST':remote_clinical.append(name)
   data={'records':[]}
  route.fulfill(status=code,headers=headers,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
 def route_storage(route):
  method=route.request.method
  if method in ('PUT','POST'):uploaded.append(method)
  headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8829','Access-Control-Allow-Headers':'apikey,authorization,content-type,x-upsert',
  'Access-Control-Allow-Methods':'POST,GET,PUT,OPTIONS'}
  if method=='OPTIONS':route.fulfill(status=204,headers=headers);return
  if method=='GET':route.fulfill(status=200,headers=headers,content_type='image/png',body=png());return
  route.fulfill(status=200,headers=headers,content_type='application/json',body='{"Key":"test"}')
 page.route('**/functions/v1/ildan-api/**',route_api)
 page.route('**/storage/v1/object/**',route_storage)
checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROME_BIN') or '/usr/bin/google-chrome',args=['--no-sandbox'])
 for width in [390,1440]:
  page=browser.new_page(viewport={'width':width,'height':900})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  init(page,'student');page.goto(url,wait_until='domcontentloaded',timeout=30000)
  page.locator('#photoUpload').wait_for(timeout=20000)
  assert page.locator('#saveEntry').inner_text().strip()=='💾 연습 기록 저장하기'
  assert page.locator('input[name=practiceShare]').count()==1
  page.locator('textarea[name=note]').fill('가상의 연습 기록입니다.')
  page.locator('input[name=practiceShare]').check()
  page.locator('#photoUpload').set_input_files({'name':'sample.png','mimeType':'image/png','buffer':png()})
  page.locator('.photo-thumbnail img').wait_for(timeout=10000)
  page.locator('#showDrawing').click()
  canvas=page.locator('#noteCanvas');bb=canvas.bounding_box()
  page.mouse.move(bb['x']+10,bb['y']+15);page.mouse.down();page.mouse.move(bb['x']+90,bb['y']+65,steps=8);page.mouse.up()
  page.locator('#saveEntry').click()
  page.locator('.practice-cloud-record').wait_for(timeout=18000)
  assert len(stored)>=1 and stored[-1]['shared']==True
  assert len(stored[-1]['entry']['photos'])==1 and uploaded
  assert 'sketch' in stored[-1]['entry']
  assert page.locator('.practice-cloud-record .saved-photo-grid img').count()>=1
  assert not errors,('page errors',width,errors)
  page.close()
  # A totally new context/device sees server-synced record without previous IndexedDB.
  page=browser.new_page(viewport={'width':width,'height':900})
  init(page,'student');page.goto(url,wait_until='domcontentloaded',timeout=30000)
  page.locator('[data-workspace-target=history]').click()
  page.locator('.practice-cloud-record').wait_for(timeout=12000)
  assert '가상의 연습 기록' in page.locator('.practice-cloud-record').inner_text()
  page.close()
  teacher=browser.new_page(viewport={'width':width,'height':900})
  init(teacher,'therapist');teacher.goto(url,wait_until='domcontentloaded',timeout=30000)
  teacher.locator('#inboxResults .record').first.wait_for(timeout=18000)
  assert '가상의 연습 기록' in teacher.locator('#inboxResults').inner_text() or '학생 공유 기록' in teacher.locator('#inboxResults').inner_text()
  teacher.close()
  checks.append(f'{width}px practice save with drawing/photo, cross-device reload, therapist share, no clinical write')
  stored.clear()
 assert not remote_clinical,('unexpected non-practice clinical POST',remote_clinical)
 browser.close()
srv.shutdown()
print(json.dumps({'status':'PASS','checks':checks},ensure_ascii=False))
