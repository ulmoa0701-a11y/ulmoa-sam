"""Read-only staging browser QA: no OTP emails, no real accounts, no private data."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from playwright.sync_api import sync_playwright
import json,os,time
root=Path(__file__).resolve().parents[3]
server=ThreadingHTTPServer(('127.0.0.1',8829),partial(SimpleHTTPRequestHandler,directory=str(root)))
thread=Thread(target=server.serve_forever,daemon=True);thread.start()
url='http://127.0.0.1:8829/test/ildan-sseobom/supabase-staging/'
checks=[]
with sync_playwright() as p:
 exe=os.environ.get('CHROME_BIN') or '/usr/bin/google-chrome'
 browser=p.chromium.launch(headless=True,executable_path=exe,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [390,1440]:
  page=browser.new_page(viewport={'width':width,'height':860})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='domcontentloaded',timeout=30000)
  page.locator('#emailRequestForm').wait_for(timeout=25000)
  assert '실제 학생' in page.locator('[role="status"]').first.inner_text()
  assert page.locator('#emailRequestForm input[name="email"]').is_visible()
  assert page.locator('#emailRequestForm button[type="submit"]').is_enabled()
  assert page.locator('input[name="code"]').count()==0
  assert page.locator('[data-login-role]').count()==0
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+3'),('horizontal overflow',width)
  assert not errors,('browser JavaScript error',width,errors)
  assert page.evaluate('window.ILDAN_SUPABASE_CONFIG.url')=='https://miohovwmhmtcvkurjamm.supabase.co'
  checks.append(f'{width}px visible login form, no role spoofing, no overflow')
  page.close()
 browser.close()
server.shutdown()
print(json.dumps({'status':'PASS','cases':checks},ensure_ascii=False))
