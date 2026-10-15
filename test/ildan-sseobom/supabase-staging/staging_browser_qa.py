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
   errors=[];preview=[];register=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def mock_preview(route):
    if route.request.method=='OPTIONS':
     route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8829','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'content-type,apikey,authorization'})
     return
    payload=route.request.post_data_json
    assert payload.get('code')==token
    preview.append(True)
    route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8829'},
     body=json.dumps({'role':role,'reusable':True,'registrationOpen':True,'needsSeparateVerificationCode':False}))
   def mock_register(route):
    if route.request.method=='OPTIONS':
     route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8829','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'content-type,apikey,authorization'})
     return
    payload=route.request.post_data_json
    assert payload=={'code':token},'No code/PIN/email is sent'
    register.append(True)
    route.fulfill(status=503,content_type='application/json',headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8829'},
     body=json.dumps({'error':'모의 연결 테스트'},ensure_ascii=False))
   page.route('**/functions/v1/ildan-api/invite-preview',mock_preview)
   page.route('**/functions/v1/ildan-api/invite-register',mock_register)
   page.goto(url+'#invite='+token,wait_until='domcontentloaded',timeout=35000)
   page.locator('#inviteRoleTitle').get_by_text(label+' 계정 연결').wait_for(timeout=25000)
   page.locator('#inviteRetry').wait_for(state='visible',timeout=15000)
   assert len(preview)==1 and len(register)==1,(role,preview,register)
   assert page.locator('#verificationCode').count()==0,'No separate PIN'
   assert page.locator('#verifiedInviteForm').count()==0,'No extra verification form'
   assert page.locator('input[type=email]').count()==0,'No email'
   assert '모의 연결 테스트' in page.locator('#inviteStatus').inner_text()
   assert page.locator('#inviteCopy').is_visible()
   assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+3'),('horizontal overflow',width)
   assert not errors,('page error',width,role,errors)
   assert page.evaluate('location.hash')=='#invite='+token,'Failed connection must preserve reusable link'
   checks.append(f'{width}px {role}: link alone starts access, no PIN/email, retry shown, no overflow')
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
 # Simulate an already signed-in therapist, with ALL account APIs mocked.
 # No user identity, record, invite or clinical data is created on Supabase.
 import time
 from urllib.parse import urlsplit
 for width in [390,1440]:
  page=browser.new_page(viewport={'width':width,'height':860})
  problems=[]
  page.on('pageerror',lambda e:problems.append(str(e)))
  account_id='00000000-0000-4000-8000-000000000001'
  session={'access_token':'fake.qa.browser.token','refresh_token':'fake-refresh','token_type':'bearer',
           'expires_in':3600,'expires_at':int(time.time())+3600,
           'user':{'id':account_id,'email':'fake-test@example.invalid','aud':'authenticated',
                   'role':'authenticated','app_metadata':{},'user_metadata':{},'created_at':'2026-10-15T00:00:00Z'}}
  page.add_init_script("(()=>{const session="+json.dumps(session)+";localStorage.setItem('ildanPersonalDevice','yes');localStorage.setItem('sb-miohovwmhmtcvkurjamm-auth-token',JSON.stringify(session))})()")
  members=[]
  def mock_therapist_api(route):
   path=urlsplit(route.request.url).path
   method=route.request.method
   headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8829','Access-Control-Allow-Methods':'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers':'content-type,authorization,apikey'}
   if method=='OPTIONS':
    route.fulfill(status=204,headers=headers)
    return
   if path.endswith('/me'):data={'user':{'id':account_id,'role':'therapist','nickname':'QA치료사','trial':True}}
   elif path.endswith('/records'):data={'records':[]}
   elif path.endswith('/students'):
    if method=='POST':
     alias=route.request.post_data_json['alias']
     assert alias=='가상 민수','Korean student name should pass unchanged to API'
     members.append({'id':'00000000-0000-4000-8000-000000000051','nickname':alias})
     data={'student':members[-1]};status=201
    else:data={'students':members}
   elif path.endswith('/accounts'):data={'accounts':[]}
   elif path.endswith('/drive/status'):data={'connected':False,'configured':False,'backupEnabled':False}
   elif path.endswith('/invites'):data={'invites':[]}
   elif path.endswith('/session-notes'):data={'notes':[]}
   else:data={'error':'Unknown synthetic endpoint: '+path};status=404
   status=locals().get('status',200)
   route.fulfill(status=status,headers=headers,content_type='application/json',body=json.dumps(data,ensure_ascii=False))
  page.route('**/functions/v1/ildan-api/**',mock_therapist_api)
  page.goto(url,wait_until='domcontentloaded',timeout=35000)
  page.locator('[data-workspace-target="accounts"]').wait_for(timeout=25000)
  page.locator('[data-workspace-target="accounts"]').click()
  page.locator('#createStudentForm').wait_for(timeout=15000)
  assert page.locator('#createStudentForm').get_by_text('학생 이름 또는 별칭',exact=False).count()==1
  assert page.locator('#inviteSubmit').is_disabled(),'Cannot invite before adding any students'
  assert '등록된 학생 (0명)' in page.locator('.student-list-summary').inner_text()
  page.locator('#createStudentForm input[name=alias]').fill('가상 민수')
  page.locator('#createStudentForm button[type=submit]').click()
  page.locator('.student-list-summary').get_by_text('등록된 학생 (1명)').wait_for(timeout=15000)
  assert '가상 민수' in page.locator('.student-list-summary').inner_text()
  assert page.locator('#inviteSubmit').is_enabled()
  assert page.locator('#inviteSubmit').inner_text()=='학생 접속 링크 만들기'
  page.locator('#inviteRole').select_option('parent')
  assert page.locator('#inviteSubmit').inner_text()=='보호자 접속 링크 만들기'
  page.locator('#inviteRole').select_option('student')
  assert page.locator('#inviteSubmit').inner_text()=='학생 접속 링크 만들기'
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+3'),'Account flow overflow'
  assert not problems,('client runtime error',width,problems)
  checks.append(f'{width}px: signed-in therapist can add Korean student display name; student/guardian invite steps work')
  page.close()

 browser.close()
server.shutdown()
print(json.dumps({'status':'PASS','cases':checks},ensure_ascii=False))
