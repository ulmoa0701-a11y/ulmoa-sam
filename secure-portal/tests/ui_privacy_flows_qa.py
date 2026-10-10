from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
html=(root/'preview/index.html').read_text()
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1280,'height':800},accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.goto('about:blank');page.set_content(html);page.locator('#oneLogin').wait_for()
 def role(name):
  page.locator('button[data-role="'+name+'"]').click()
  page.wait_for_function('(v)=>document.querySelector("#account .role-chip")?.textContent===v',arg={'student':'학생','parent':'학부모','therapist':'치료사'}.get(name,name))
 def write(field,text,share=False):
  page.locator('button[data-workspace-target="write"]').click()
  page.locator(f'textarea[name="{field}"]').fill(text)
  if share:page.locator('input[name="share"]').check()
  page.locator('#entryForm button.button').click()
  page.wait_for_timeout(100)
 role('student')
 write('event','가상 학생 개인 기록')
 assert '가상 학생 개인 기록' in page.locator('#recordsHere').inner_text()
 role('therapist')
 assert '가상 학생 개인 기록' not in page.locator('#inboxResults').inner_text();checks.append('private note hidden to therapist')
 role('student')
 write('event','가상 학생 공유 기록',True)
 role('therapist')
 assert '가상 학생 공유 기록' in page.locator('#inboxResults').inner_text()
 assert '가상 학생 개인 기록' not in page.locator('#inboxResults').inner_text();checks.append('shared note visible to assigned therapist only in preview')
 role('parent')
 write('observation','가상 학부모 전달 기록',True)
 assert '가상 학생 개인 기록' not in page.locator('#recordsHere').inner_text();checks.append('parent only sees own notes')
 role('therapist')
 assert '가상 학생 공유 기록' in page.locator('#inboxResults').inner_text()
 assert '가상 학부모 전달 기록' in page.locator('#inboxResults').inner_text()
 page.locator('#filterKind').select_option('parent')
 assert '가상 학생 공유 기록' not in page.locator('#inboxResults').inner_text()
 assert '가상 학부모 전달 기록' in page.locator('#inboxResults').inner_text();checks.append('therapist author type filter')
 page.locator('#filterKind').select_option('student')
 assert '가상 학생 공유 기록' in page.locator('#inboxResults').inner_text()
 assert '가상 학부모 전달 기록' not in page.locator('#inboxResults').inner_text();checks.append('therapist student type filter')
 # CSV is downloadable only from the therapist view
 with page.expect_download() as dl:
  page.locator('#csv').click()
 assert dl.value.suggested_filename.endswith('.csv');checks.append('CSV download works')
 assert not errors,errors
 b.close()
print(json.dumps({'passed':len(checks),'cases':checks},ensure_ascii=False))
