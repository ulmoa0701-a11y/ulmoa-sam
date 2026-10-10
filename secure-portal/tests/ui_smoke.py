from pathlib import Path
from playwright.sync_api import sync_playwright
import os, json, urllib.parse
base=Path(__file__).resolve().parents[1]
url='https://ildan-test.invalid/'
users={
 'student':{'id':'s1','nickname':'coder01','role':'student','therapistId':'t1','studentId':None},
 'parent':{'id':'p1','nickname':'family01','role':'parent','therapistId':'t1','studentId':'s1'},
 'therapist':{'id':'t1','nickname':'teacher01','role':'therapist','therapistId':None,'studentId':None},
 'admin':{'id':'a1','nickname':'admin01','role':'admin','therapistId':None,'studentId':None},
}
results=[];shot=base/'qa';shot.mkdir(exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for role in users:
  for width in [320,390,1280] if role!='admin' else [1280]:
   page=browser.new_page(viewport={'width':width,'height':840},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.set_content((base/'public'/'index.html').read_text())
   page.add_style_tag(content=(base/'public'/'style.css').read_text())
   fixtures={'me':{'user':users[role]},'records':{'records':[]},'students':{'students':[{'id':'s1','nickname':'coder01'}]},'drive/status':{'connected':False,'configured':False,'folderUrl':None},'accounts':{'accounts':[{'id':'s1','nickname':'coder01','role':'student'}]},'therapists':{'therapists':[{'id':'t1','display_name':'담당 치료사'}]},'invites':{'invite':'demo-code'},'login':{'user':users[role]}}
   page.evaluate("fixtures=>{window.fetch=async(u,options)=>{let key=String(u).replace(/^\/api\//,'');let data=fixtures[key]||{error:'unexpected API: '+key};return new Response(JSON.stringify(data),{status:data.error?404:200,headers:{'content-type':'application/json'}})};}",fixtures)
   page.evaluate((base/'public'/'app.js').read_text())
   page.wait_for_function("document.querySelector('.hero')!==null")
   if role=='student':
    assert page.get_by_text('한 장 기록하기').count()==1
    assert page.get_by_text('작은 코딩 실험실').count()==1
    page.locator('textarea[name="event"]').fill('오늘 연습해본 것이 있어요')
    page.locator('#codingSelect').select_option('rain')
    page.locator('#runCode').click()
    assert '실내 활동' in page.locator('#codeResult').inner_text()
   elif role=='parent':
    assert page.get_by_text('생활 관찰·전달사항').count()==1
    assert page.get_by_text('작은 코딩 실험실').count()==0
   elif role=='therapist':
    assert page.get_by_text('담당 학생의 공유 기록').count()>=1
    assert page.locator('#googleConnect').is_disabled()
    page.locator('#inviteRole').select_option('parent')
    assert not page.locator('#studentPicker').is_hidden()
   elif role=='admin':
    assert page.get_by_text('계정 운영').count()==1
    assert page.get_by_text('작성한 기록').count()==0
   overflow=page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
   page.screenshot(path=str(shot/f'{role}_{width}.png'),full_page=True)
   assert not errors,errors
   assert not overflow,(role,width,'horizontal overflow')
   results.append({'role':role,'width':width,'errors':0,'overflow':False,'ui':'pass'})
   page.close()
 browser.close()
(shot/'ui_results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print('PASS',len(results),'mock-auth browser render cases (320/390/1280).')
