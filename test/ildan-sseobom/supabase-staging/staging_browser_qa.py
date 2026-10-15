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
    route.fulfill(status=200,content_type='application/json',body=json.dumps({'role':role,'expiresAt':'2026-11-01T00:00:00Z','requiresDeviceSetup':False,'registrationOpen':True,'needsSeparateVerificationCode':True}))
   page.route('**/functions/v1/ildan-api/invite-preview',mock_route)
   page.goto(url+'#invite='+token,wait_until='domcontentloaded',timeout=35000)
   page.locator('#inviteRoleTitle').get_by_text(label+' 전용 초대입니다.').wait_for(timeout=25000)
   assert len(preview)==1,('link preview called',len(preview))
   assert page.locator('#inviteAccept').count()==1
   assert page.locator('#verificationCode').count()==1
   assert page.locator('#verifiedInviteForm').count()==1
   assert page.locator('#inviteAccept').is_enabled(), 'explicit second-code flow should be available after preview'
   assert page.locator('#verificationCode').get_attribute('required') is not None, 'identity check code must be required'
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
  signups=[]
  logins=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def fake_signup(route):
   if route.request.method=='OPTIONS':
    route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8829','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'apikey,content-type,authorization'})
    return
   payload=route.request.post_data_json
   signups.append(payload)
   route.fulfill(status=409,content_type='application/json',headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8829'},
    body=json.dumps({'error':'이미 사용 중인 아이디입니다.'},ensure_ascii=False))
  def fake_login(route):
   if route.request.method=='OPTIONS':
    route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8829','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'apikey,content-type,authorization'})
    return
   logins.append(True)
   route.fulfill(status=400,content_type='application/json',headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8829'},
    body='{"error":"invalid_grant","error_description":"Invalid login credentials"}')
  page.route('**/functions/v1/ildan-api/test-therapist-signup',fake_signup)
  page.route('**/auth/v1/token**',fake_login)
  page.goto(url,wait_until='domcontentloaded',timeout=35000)
  page.locator('#trialSignupForm').wait_for(timeout=25000)
  assert page.locator('#firstLogin').is_visible()
  assert page.locator('#trialSignupForm input[name="username"]').count()==1
  assert page.locator('#trialSignupForm input[name="password"][type="password"]').count()==1
  assert page.locator('#clinicianFirstForm').count()==0,'No email verification forms on trial site'
  assert page.locator('input[type="email"]').count()==0,'No email needed'
  assert not page.locator('#returnLogin').is_visible()
  page.locator('#trialSignupForm input[name="username"]').fill('test_sandbox1')
  page.locator('#trialSignupForm input[name="password"]').fill('trialPassword2026')
  page.locator('#trialSignupForm button[type="submit"]').click()
  page.locator('#toast').get_by_text('이미 사용 중인 아이디',exact=False).wait_for(timeout=10000)
  assert len(signups)==1,'Staging server signup called exactly once'
  assert signups[0]['username']=='test_sandbox1'
  assert signups[0]['password']=='trialPassword2026'
  page.locator('#returnChoice').click()
  assert page.locator('#returnLogin').is_visible()
  page.locator('#trialLoginForm input[name="username"]').fill('test_sandbox1')
  page.locator('#trialLoginForm input[name="password"]').fill('trialPassword2026')
  page.locator('#trialLoginForm button[type="submit"]').click()
  page.locator('#toast').get_by_text('아이디 또는 비밀번호',exact=False).wait_for(timeout=10000)
  assert len(logins)==1,'Auth password login requested exactly once'
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+3'),('overflow',width)
  assert not errors,('unexpected page JavaScript error',width,errors)
  checks.append(f'{width}px: therapist alias/password signup and returning login, no email or OTP, no overflow')
  page.close()
 browser.close()
server.shutdown()
print(json.dumps({'status':'PASS','cases':checks},ensure_ascii=False))
