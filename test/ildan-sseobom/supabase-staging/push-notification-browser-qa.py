"""Synthetic browser test for therapist and student Web Push opt-in flows."""
from pathlib import Path
from threading import Thread
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
import json, os

root=Path(__file__).resolve().parents[3]
server=ThreadingHTTPServer(('127.0.0.1',8877),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:8877/test/ildan-sseobom/supabase-staging/push-notification-qa.html'
results=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROME_BIN') or '/usr/bin/google-chrome',args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (390,1440):
   for role in ('therapist','student'):
    page=browser.new_page(viewport={'width':width,'height':900})
    issues=[]
    page.on('pageerror',lambda e:issues.append(str(e)))
    page.goto(base+'?role='+role,wait_until='domcontentloaded',timeout=30000)
    page.wait_for_function("window.__ready===true || !!window.__bootError",timeout=20000)
    assert not page.evaluate('window.__bootError'), page.evaluate('window.__bootError')
    if role=='therapist':
     page.locator('#pushEnable').wait_for(state='visible',timeout=10000)
     assert '꺼져' in page.locator('#pushStatus').inner_text()
     page.locator('#pushEnable').click()
     page.wait_for_function("window.__calls.some(x=>x.path==='push-subscribe')",timeout=10000)
     page.wait_for_function("!document.querySelector('#pushTest').hidden",timeout=10000)
     assert page.evaluate("window.__lastToast.includes('알림을 켰어요')")
     page.locator('#pushTest').click()
     page.wait_for_function("window.__calls.some(x=>x.path==='push-test')",timeout=10000)
     page.locator('#pushDisable').click()
     page.wait_for_function("window.__calls.some(x=>x.path==='push-unsubscribe')",timeout=10000)
     page.wait_for_function("window.__state.teacherLinked===false",timeout=10000)
     results.append(f'{width}px therapist: enable → server subscription → test → disable PASS')
    else:
     page.locator('#studentReminderEnable').wait_for(state='visible',timeout=10000)
     assert '꺼져' in page.locator('#studentReminderStatus').inner_text()
     page.locator('#studentReminderEnable').click()
     page.wait_for_function("window.__calls.some(x=>x.path==='student-reminder-subscribe')",timeout=10000)
     page.wait_for_function("!document.querySelector('#studentReminderTest').hidden",timeout=10000)
     assert page.evaluate("window.__state.student.enabled===true")
     assert page.evaluate("window.__lastToast.includes('알림을 켰어')")
     page.locator('#studentReminderTest').click()
     page.wait_for_function("window.__calls.some(x=>x.path==='student-reminder-test')",timeout=10000)
     page.locator('#studentReminderDisable').click()
     page.wait_for_function("window.__calls.some(x=>x.path==='student-reminder-unsubscribe')",timeout=10000)
     page.wait_for_function("window.__state.student.enabled===false && window.__state.student.subscriptions.length===0",timeout=10000)
     results.append(f'{width}px student: enable → daily time save → test → disable PASS')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+3'),('horizontal overflow',width,role)
    assert not issues,issues
    page.close()
  browser.close()
 print(json.dumps({'result':'PASS','checks':results},ensure_ascii=False))
finally:
 server.shutdown()
