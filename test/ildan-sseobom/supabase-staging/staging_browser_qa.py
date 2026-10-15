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
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/auth/v1/passkeys/authentication/options',lambda route: route.fulfill(status=404,content_type='application/json',body='{"code":"passkey_disabled"}'))
  page.goto(url,wait_until='domcontentloaded',timeout=35000)
  page.locator('#firstLogin').wait_for(timeout=25000)
  assert page.locator('#firstLogin').is_visible(),'first-visit onboarding must be primary'
  assert not page.locator('#loginPasskey').is_visible()
  assert page.locator('#clinicianFirstForm input[type="email"]').count()==1
  assert '운영자 승인' in page.locator('#firstLogin').inner_text()
  assert '학생·보호자' in page.locator('#firstLogin').inner_text()
  assert page.locator('input[type="tel"]').count()==0
  assert page.locator('#phoneRequestForm').count()==0
  assert page.locator('#phoneVerifyForm').count()==0
  page.locator('#returnChoice').click()
  page.locator('#passkeySupportStatus').get_by_text('아직 서버에서 준비되지 않았어요.',exact=False).wait_for(timeout=15000)
  assert page.locator('#loginPasskey').is_visible(),'returning users can reach registered passkey'
  assert page.locator('#loginPasskey').is_disabled(),'server-disabled passkeys must not invite failed login'
  assert page.locator('#returnEmail').is_visible(),'clinician email recovery offered'
  assert not page.locator('#firstLogin').is_visible()
  page.locator('#firstChoice').click()
  assert page.locator('#firstLogin').is_visible()
  # Simulate a real Auth 429 without ever requesting an actual email.
  otp_attempts=[]
  def mock_email_rate_limit(route):
   otp_attempts.append(1)
   route.fulfill(status=429,content_type='application/json',body='{"code":"over_email_send_rate_limit","msg":"For security purposes, you can only request this after 51 seconds."}')
  page.route('**/auth/v1/otp',mock_email_rate_limit)
  page.locator('#clinicianFirstForm input[type="email"]').fill('therapist-test@example.com')
  page.locator('#clinicianFirstForm button[type="submit"]').click()
  page.locator('#firstLoginStatus').get_by_text('발송 제한',exact=False).wait_for(timeout=10000)
  assert len(otp_attempts)==1,('OTP should only be requested once',len(otp_attempts))
  page.locator('#clinicianFirstForm button[type="submit"]').click()
  page.locator('#firstLoginStatus').get_by_text('최근에 요청했어요.',exact=False).wait_for(timeout=10000)
  assert len(otp_attempts)==1,'Retry should be suppressed locally for 65 seconds'
  assert not page.locator('#loginPasskey').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+3'),('overflow',width)
  assert not errors,errors
  checks.append(f'{width}px: therapist-first enrollment, passkey returning-only, no guardian email/phone, no overflow')
  page.close()
 browser.close()
server.shutdown()
print(json.dumps({'status':'PASS','cases':checks},ensure_ascii=False))
