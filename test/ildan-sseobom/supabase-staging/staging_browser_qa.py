"""Non-destructive invite-link smoke: mock preview role; NO Auth registration or real messages."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from playwright.sync_api import sync_playwright
import json,os
root=Path(__file__).resolve().parents[3]
server=ThreadingHTTPServer(('127.0.0.1',8829),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:8829/test/ildan-sseobom/supabase-staging/'
token='c'*64
checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROME_BIN') or '/usr/bin/google-chrome',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [390,1440]:
  for role,label in [('parent','보호자'),('student','학생')]:
   page=browser.new_page(viewport={'width':width,'height':860})
   errors=[]
   preview=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def mock_route(route):
    data=route.request.post_data_json
    assert data.get('code')==token
    preview.append(True)
    route.fulfill(status=200,content_type='application/json',body=json.dumps({'role':role,'expiresAt':'2026-11-01T00:00:00Z','requiresDeviceSetup':True}))
   page.route('**/functions/v1/ildan-api/invite-preview',mock_route)
   page.goto(url+'#invite='+token,wait_until='domcontentloaded',timeout=35000)
   page.locator('#inviteRoleTitle').get_by_text(label+' 전용 초대입니다.').wait_for(timeout=25000)
   assert len(preview)==1,('link preview called',len(preview))
   assert page.locator('#inviteAccept').count()==1
   assert page.locator('#inviteCopy').is_visible()
   assert page.locator('#emailRequestForm').count()==0,'should not request guardian email'
   assert page.locator('[data-login-role]').count()==0,'role spoofing UI'
   assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+3'),('horizontal overflow',width)
   assert not errors,('page error',width,role,errors)
   assert page.evaluate('location.hash')=='#invite='+token,'invite must survive until explicit confirmation for other browser'
   checks.append(f'{width}px {role}: verified one-time link preview, no email, no auto enrollment, no overflow')
   page.close()
  page=browser.new_page(viewport={'width':width,'height':860})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='domcontentloaded',timeout=35000)
  page.locator('#loginPasskey').wait_for(timeout=25000)
  assert page.locator('#loginPasskey').is_visible()
  assert page.locator('.email-doctor-only').count()==1
  assert page.locator('#emailRequestForm input[name="email"]').is_hidden()
  assert page.locator('input[name="code"]').count()==0
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+3')
  assert not errors,errors
  checks.append(f'{width}px return visit: passkey entry and optional clinician email')
  page.close()
 browser.close()
server.shutdown()
print(json.dumps({'status':'PASS','cases':checks},ensure_ascii=False))
