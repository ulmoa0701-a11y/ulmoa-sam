"""Browser mock: photo+sketch upload, online practice records, opt-in share, cross-device view."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
import re
import os,time,json,base64,struct,zlib
from datetime import datetime,timezone
root=Path(__file__).resolve().parents[3]
srv=ThreadingHTTPServer(('127.0.0.1',8829),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=srv.serve_forever,daemon=True).start()
url='http://127.0.0.1:8829/test/ildan-sseobom/supabase-staging/'
student='10000000-0000-4000-8000-000000000015'
therapist='10000000-0000-4000-8000-000000000016'
bucket='ildan-practice-media'
stored=[];uploaded=[];remote_clinical=[];api_calls=[];browser_requests=[]
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
  name=path.split('/ildan-api/')[-1];api_calls.append((name,method));code=200;data={}
  if name=='me':data={'user':{'id':uid,'role':role,'nickname':'연습계정','trial':True}}
  elif name=='practice-records' and method=='GET':
   data={'records':[{'id':row['id'],'kind':'student','student':'가상 학생','studentId':student,'author':'연습 학생',
    'createdAt':row.get('createdAt',datetime.now(timezone.utc).isoformat()),'updatedAt':row.get('updatedAt',datetime.now(timezone.utc).isoformat()),'shared':row['shared'],'practice':True,
    'photoPaths':row['entry'].get('photos',[]) if role!='therapist' else [],
    'entry':{**row['entry'],'photos':['https://miohovwmhmtcvkurjamm.supabase.co/storage/v1/object/sign/'+bucket+'/'+p+'?token=test' for p in row['entry'].get('photos',[])]}}
    for row in stored if role!='therapist' or row['shared']]}
  elif name=='practice-media-sign':
   n=len(uploaded)+1
   data={'path':student+'/00000000-0000-4000-8000-'+str(n).zfill(12)+'.jpg','bucket':bucket,'token':'qa-upload','maxBytes':2097152}
  elif name=='practice-records' and method=='POST':
   new_id=f'00000000-0000-4000-8000-{57+len(stored):012d}'
   stored.append({'id':new_id,'entry':payload['entry'],'shared':payload['share'],'updatedAt':datetime.now(timezone.utc).isoformat()})
   code=201;data={'record':{'id':stored[-1]['id'],'shared':payload['share']}}
  elif name=='practice-update':
   if not stored or payload['recordId']!=stored[0]['id']:
    code=403;data={'error':'수정 대상 없음'}
   elif payload['expectedUpdatedAt']!=stored[0]['updatedAt']:
    code=409;data={'error':'다른 기기에서 수정된 기록'}
   else:
    stored[0]['entry']=payload['entry'];stored[0]['shared']=payload['share'];stored[0]['updatedAt']='2026-10-15T11:11:00Z'
    data={'ok':True,'record':{'id':stored[0]['id'],'updatedAt':stored[0]['updatedAt'],'shared':stored[0]['shared']}}
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
  if method=='GET' and 'token=expired' in route.request.url:route.fulfill(status=403,headers=headers,body='expired');return
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
  page.on('request',lambda req:browser_requests.append((req.method,urlsplit(req.url).path)) if ('miohovwmhmtcvkurjamm' in req.url) else None)
  init(page,'student');page.goto(url,wait_until='domcontentloaded',timeout=30000)
  page.locator('#photoUpload').wait_for(timeout=20000)
  assert page.locator('#saveEntry').inner_text().strip()=='💾 연습 기록 저장하기'
  assert page.locator('input[name=practiceShare]').count()==1
  page.locator('textarea[name=note]').fill('가상의 연습 기록입니다.')
  page.locator('input[name=practiceShare]').check()
  page.locator('#photoUpload').set_input_files({'name':'sample.png','mimeType':'image/png','buffer':png()})
  page.locator('.photo-thumbnail img').wait_for(timeout=10000)
  page.locator('#showDrawing').click()
  canvas=page.locator('#noteCanvas');canvas.scroll_into_view_if_needed();bb=canvas.bounding_box()
  page.mouse.move(bb['x']+10,bb['y']+15);page.mouse.down();page.mouse.move(bb['x']+90,bb['y']+65,steps=8);page.mouse.up()
  assert page.locator('#noteCanvas').evaluate("canvas=>{const ctx=canvas.getContext('2d');const rgba=ctx.getImageData(25,35,1,1).data;return rgba[0]<250||rgba[1]<250||rgba[2]<250}")
  page.locator('#saveEntry').click()
  try:page.locator('.practice-cloud-record').wait_for(timeout=12000)
  except Exception as e:
   print('PHOTO_SYNC_FAILURE',{'uploaded':uploaded,'stored':stored,'errors':errors,
     'toast':page.locator('#toast').inner_text() if page.locator('#toast').count() else None,
     'status':page.locator('#photoProgress').inner_text() if page.locator('#photoProgress').count() else None,
     'bodyTail':page.locator('body').inner_text()[-450:], 'apiCalls':api_calls[-15:],'requests':browser_requests[-15:]})
   raise
  assert len(stored)>=1 and stored[-1]['shared']==True
  assert len(stored[-1]['entry']['photos'])==1 and uploaded
  assert 'sketch' in stored[-1]['entry']
  assert page.locator('.practice-cloud-record .saved-photo-grid img').count()>=1
  # Edit the SAME record and re-upload a replacement photo; keep same record ID.
  original=stored[0]['id'];old_photo=stored[0]['entry']['photos'][0]
  page.locator('[data-practice-edit]').click()
  page.locator('#saveEntry').get_by_text('수정 내용 저장하기').wait_for(timeout=10000)
  assert page.locator('textarea[name=note]').input_value()=='가상의 연습 기록입니다.'
  assert page.locator('.photo-thumbnail').count()==1, 'old photo must remain editable'
  assert page.locator('input[name=practiceShare]').is_checked(), 'share consent retained'
  assert page.locator('#drawPanel').is_visible(), 'previous drawing should reopen'
  page.locator('textarea[name=note]').fill('수정한 가상 기록 - 편집 완료')
  page.locator('[data-remove-photo="0"]').click()
  page.locator('#photoUpload').set_input_files({'name':'replacement.png','mimeType':'image/png','buffer':png()})
  page.locator('.photo-thumbnail img').wait_for(timeout=10000)
  assert page.locator('.photo-thumbnail').count()==1
  page.locator('#saveEntry').click()
  page.locator('.practice-cloud-record').wait_for(timeout=12000)
  assert len(stored)==1 and stored[0]['id']==original, 'update cannot create a duplicate'
  assert stored[0]['entry']['note']=='수정한 가상 기록 - 편집 완료'
  assert len(stored[0]['entry']['photos'])==1 and stored[0]['entry']['photos'][0]!=old_photo, 'photo replaced'
  assert stored[0]['shared'] and 'sketch' in stored[0]['entry'], 'drawing and sharing preserved'
  assert '수정한 가상 기록' in page.locator('.practice-cloud-record').inner_text()
  # Old IndexedDB records in the same student's browser also support edit-in-place.
  page.evaluate("""async(uid)=>{
   const m=await import('./trial-media.mjs');
   await m.savePracticeRecord(uid,'student',{date:'2026-10-15',note:'이전 기기 기록'});
  }""",student)
  page.reload(wait_until='domcontentloaded')
  page.locator('[data-workspace-target="history"]').click()
  page.locator('.device-only-record').wait_for(timeout=15000)
  page.locator('.device-only-record [data-practice-edit]').click()
  page.locator('#saveEntry').get_by_text('이 기기에 수정 저장하기').wait_for(timeout=10000)
  assert page.locator('textarea[name=note]').input_value()=='이전 기기 기록'
  assert not page.locator('.practice-sync-box').is_visible(),'no server share for old local note'
  page.locator('textarea[name=note]').fill('이 기기에 수정된 기록')
  previous_api=len([x for x in api_calls if x==('practice-update','POST')])
  page.locator('#saveEntry').click()
  page.locator('.device-only-record').wait_for(timeout=13000)
  assert page.locator('.device-only-record').count()==1,'device edit must not create duplicate'
  assert '이 기기에 수정된 기록' in page.locator('.device-only-record').inner_text()
  assert len([x for x in api_calls if x==('practice-update','POST')])==previous_api,'local edit must not be uploaded'
  page.locator('[data-workspace-target="writingCalendar"]').click()
  assert page.locator('#writingCalendar .writing-summary').is_visible(), 'student calendar must open'
  page.locator('[data-workspace-target="history"]').click()
  page.once('dialog',lambda d:d.accept())
  page.locator('.device-only-record [data-practice-transfer]').click()
  page.locator('.practice-cloud-record').first.wait_for(timeout=15000)
  page.wait_for_timeout(700)
  assert len(stored)==2, ('one cloud copy',stored)
  assert stored[-1]['shared'] is False, 'transfer must stay private'
  synced=page.evaluate("""async(uid)=>{const m=await import('./trial-media.mjs');return (await m.listPracticeRecords(uid)).filter(x=>x.syncedTo&&x.transferState==='done').length}""",student)
  assert synced==1, 'verified transfer retains a device original'
  page.locator('[data-workspace-target="writingCalendar"]').click()
  assert int(page.locator('#writingCalendar .writing-summary strong').nth(1).inner_text())==2, 'transferred local original must not count twice'
  assert not errors,('page errors',width,errors)
  page.close()
  # A totally new context/device sees server-synced record without previous IndexedDB.
  page=browser.new_page(viewport={'width':width,'height':900})
  init(page,'student');page.goto(url,wait_until='domcontentloaded',timeout=30000)
  page.locator('[data-workspace-target=history]').click()
  page.locator('.practice-cloud-record').wait_for(timeout=12000)
  assert '수정한 가상 기록' in page.locator('.practice-cloud-record').inner_text()
  page.close()
  teacher=browser.new_page(viewport={'width':width,'height':900})
  init(teacher,'therapist');teacher.goto(url,wait_until='domcontentloaded',timeout=30000)
  teacher.locator('#inboxResults .shared-clinician-record').first.wait_for(timeout=18000)
  assert teacher.locator('.shared-clinician-content').count()==1
  teacher.locator('[data-workspace-target="writingCalendar"]').click()
  assert teacher.locator('#writingCalendar .writing-summary').is_visible(), 'shared-only calendar accessible'
  assert int(teacher.locator('#writingCalendar .writing-summary strong').nth(1).inner_text())==1, 'private copy cannot show in therapist calendar'
  teacher.locator('[data-workspace-target="inbox"]').click()
  assert '수정한 가상 기록' in teacher.locator('.shared-clinician-content').inner_text(), 'full shared text must be visible without a detail click'
  assert teacher.locator('.shared-clinician-content .saved-photo-grid img').count()==1, 'shared photo must be immediately visible'
  assert teacher.locator('.shared-clinician-content .sketch-record').count()==1, 'shared drawing must be immediately visible'
  expect(teacher.locator('.shared-clinician-content .saved-photo-grid img').first).to_have_js_property('naturalWidth',24,timeout=12000)
  teacher.locator('#filterKind').select_option('parent')
  assert teacher.locator('#inboxResults .shared-clinician-record').count()==0, 'author filter must work'
  teacher.locator('#filterKind').select_option('all')
  assert teacher.locator('#inboxResults .shared-clinician-record').count()==1
  before_refresh=len([x for x in api_calls if x==('practice-records','GET')])
  teacher.locator('.shared-clinician-content .saved-photo-grid img').first.evaluate("img=>{img.src=img.src.replace('token=test','token=expired')}")
  expect(teacher.locator('.shared-clinician-content .saved-photo-grid img').first).to_have_attribute('src',re.compile(r'token=test'),timeout=12000)
  assert len([x for x in api_calls if x==('practice-records','GET')])>before_refresh, 'expired signed photo URL must trigger an authorized re-read'
  assert teacher.locator('.shared-clinician-content .saved-photo-grid img').first.evaluate('img=>img.complete&&img.naturalWidth>0'), 'photo should recover after renewal'
  teacher.close()
  checks.append(f'{width}px practice save with drawing/photo, cross-device reload, therapist share, no clinical write')
  stored.clear()
 assert not remote_clinical,('unexpected non-practice clinical POST',remote_clinical)
 browser.close()
srv.shutdown()
print(json.dumps({'status':'PASS','checks':checks},ensure_ascii=False))
