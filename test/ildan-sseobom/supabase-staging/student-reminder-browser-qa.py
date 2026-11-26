"""Student alarm UI smoke test. Synthetic data only; no push permission or network to Supabase."""
from pathlib import Path
from threading import Thread
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
import json,os
root=Path(__file__).resolve().parents[3]
server=ThreadingHTTPServer(('127.0.0.1',8876),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:8876/test/ildan-sseobom/supabase-staging/student-reminder-qa.html'
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROME_BIN') or '/usr/bin/google-chrome',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (390,1440):
  page=browser.new_page(viewport={'width':width,'height':840})
  issues=[]
  page.on('pageerror',lambda e:issues.append(str(e)))
  page.goto(url,wait_until='domcontentloaded',timeout=30000)
  page.get_by_role('heading',name='내 알림 시간').wait_for(timeout=20000)
  assert page.get_by_role('heading',name='🔔 알림함').is_visible()
  assert '2026-11-20' in page.locator('#studentReminderHistory').inner_text()
  assert page.locator('#studentReminderTime').input_value()=='19:00'
  assert page.locator('#studentReminderEnable').count()==1
  assert page.locator('#studentReminderDisable').count()==1
  assert page.locator('#studentReminderTest').count()==1
  page.locator('#studentReminderTime').fill('20:30')
  page.locator('#studentReminderSave').click()
  page.wait_for_function("window.__reminderCalls.some(x=>x.method==='POST')")
  assert page.evaluate("window.__reminderCalls.some(x=>x.method==='POST'&&x.body.time==='20:30'&&x.body.enabled===false)")
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+3'),('horizontal overflow',width)
  assert not issues,issues
  # No popup permission is requested by page load or by merely saving time.
  assert page.evaluate('window.__reminderCalls.every(x=>x.path==="student-reminder-settings")')
  results.append(f'{width}px: student inbox, time save, no auto permission, no external calls')
  page.close()
 browser.close()
server.shutdown()
print(json.dumps({'result':'PASS','checks':results},ensure_ascii=False))
