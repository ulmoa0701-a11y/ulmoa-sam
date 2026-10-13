"""Synthetic-only browser regression test of the separate secure portal's public UI.
Run after: pip install playwright. Uses system Chrome; does NOT call a real Netlify DB/Google API.
"""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
page_html=(root/'public/index.html').read_text(encoding='utf8')
page_html=page_html.replace('<link rel="stylesheet" href="/style.css">','<style>'+(root/'public/style.css').read_text(encoding='utf8')+'</style>')
page_html=page_html.replace('<script type="module" src="/app.js"></script>','<script>'+(root/'public/app.js').read_text(encoding='utf8')+'</script>')
setup_script=r"""
window.__caseRecords=[];window.__caseSessions=[];
window.fetch=async(url,opt={})=>{
 const raw=String(url),endpoint=raw.startsWith('/api/')?raw.slice(5):raw;
 let data={},status=200;
 const role=window.TEST_ROLE||'student',method=opt.method||'GET';
 const entry=opt.body?JSON.parse(opt.body):{};
 const match=(kind)=>kind===role||(role==='therapist'&&kind.shared);
 if(endpoint==='me'){data={error:'test guest'};status=401}
 else if(endpoint==='therapists')data={therapists:[{id:'t-1',display_name:'가상 치료사'}]};
 else if(endpoint==='passkeys/login/options')data={options:{challenge:'Y2hhbGxlbmdl',rpId:'localhost',userVerification:'required'}};
 else if(endpoint==='passkeys/login/verify')data={user:{id:'fake-'+role,nickname:'가상 '+role,role}};
 else if(endpoint==='students')data={students:[{id:'fake-student',nickname:'가상 학생'}]};
 else if(endpoint==='accounts')data={accounts:[]};
 else if(endpoint==='drive/status')data={connected:true,configured:true,backupEnabled:false,folderUrl:null};
 else if(endpoint==='records'&&method==='GET')data={records:window.__caseRecords.filter(r=>role==='therapist'?r.shared:r.kind===role).map(r=>role==='therapist'?{...r,entry:r.sharedEntry}:r)};
 else if(endpoint==='records'&&method==='POST'){
  const e=entry.entry||{};const r={id:'record-'+(window.__caseRecords.length+1),kind:role,student:'가상 학생',author:'가상 '+role,createdAt:new Date().toISOString(),entry:e,shared:entry.share===true,sharedEntry:{}};
  if(r.shared)for(const k of entry.sharedFields||[])if(e[k])r.sharedEntry[k]=e[k];
  window.__caseRecords.unshift(r);data={record:r};status=201;
 }
 else if(endpoint==='share'&&method==='POST'){
  const r=window.__caseRecords.find(x=>x.id===entry.recordId);if(!r)status=403;else{r.shared=true;r.sharedEntry=Object.fromEntries((entry.sharedFields||[]).map(k=>[k,r.entry[k]]).filter(x=>x[1]));data={ok:true}}
 }
 else if(endpoint==='unshare'&&method==='POST'){const r=window.__caseRecords.find(x=>x.id===entry.recordId);if(!r){status=403;data={error:'wrong author'}}else{r.shared=false;r.sharedEntry={};data={ok:true,remoteCopyStatus:'pending'}}}
 else if(endpoint==='session-notes'&&method==='GET')data={notes:window.__caseSessions};
 else if(endpoint==='session-notes'&&method==='POST'){window.__caseSessions.unshift({studentNickname:'가상 학생',createdAt:new Date().toISOString(),entry:entry.entry});data={ok:true};status=201}
 else data={ok:true};
 return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
};
Object.defineProperty(window,'isSecureContext',{value:true,configurable:true});
Object.defineProperty(navigator,'credentials',{value:{get:async()=>({id:'mock',type:'public-key',toJSON:()=>({id:'mock',type:'public-key',response:{clientDataJSON:'Y2hhbGxlbmdl'}})}),create:async()=>({id:'mock',type:'public-key',toJSON:()=>({id:'mock',type:'public-key',response:{clientDataJSON:'Y2hhbGxlbmdl'}})})},configurable:true});
window.PublicKeyCredential=class PublicKeyCredential{static parseRequestOptionsFromJSON(x){return x}};
"""
cases=[]
with sync_playwright() as pw:
 chrome=os.environ.get('CHROME_BIN','/usr/bin/google-chrome')
 browser=pw.chromium.launch(headless=True,executable_path=chrome,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [390,1280]:
  for role in ['student','parent','therapist']:
   page=browser.new_page(viewport={'width':width,'height':860})
   page.set_default_timeout(9500)
   errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
   page.goto('http://127.0.0.1:8990/')
   page.evaluate('() => {'+setup_script+'window.TEST_ROLE='+json.dumps(role)+';}')
   page.set_content(page_html,wait_until='load')
   page.locator('button[data-login-role="'+role+'"]').click()
   page.locator('#oneLogin').click()
   target='#inviteForm' if role=='therapist' else '#entryForm'
   page.locator(target).wait_for()
   assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+3'),('overflow',role,width)
   if role=='student':
    assert page.locator('form.student-journal').get_attribute('data-journal-mode')=='quick'
    assert page.locator('input[name="share"]').is_checked() is False
    page.locator('textarea[name="note"]').fill('가상 학생의 자유 기록 '+'안전한 글. '*20+'끝')
    page.locator('button[data-journal-mode="detail"]').click()
    page.locator('details.student-reflect > summary').click()
    page.locator('textarea[name="thought"]').fill('상세 비공개 생각')
    page.locator('button[data-journal-mode="quick"]').click()
    page.locator('input[name="share"]').check()
    assert page.locator('input[name="shareField"][value="thought"]').is_disabled()
    page.locator('input[name="shareField"][value="note"]').check()
    page.locator('#saveEntry').click()
    page.locator('#shareReviewDialog').wait_for(state='visible')
    assert '끝' in page.locator('#shareReviewDialog pre').inner_text()
    assert '상세 비공개 생각' not in page.locator('#shareReviewDialog pre').inner_text()
    page.locator('#shareReviewDialog [data-approve]').click()
    page.locator('[data-unshare]').wait_for()
    page.once('dialog',lambda d:d.accept())
    page.locator('[data-unshare]').click()
    page.wait_for_function('window.__caseRecords.length===1 && !window.__caseRecords[0].shared')
    cases.append(f'{width}:student choice, full-text consent, unshare')
   elif role=='parent':
    assert page.locator('select[name="origin"]').count()==1
    assert page.locator('textarea[name="childWords"]').count()==1
    assert not page.locator('textarea[name="childWords"]').is_visible()
    page.locator('textarea[name="observation"]').fill('가상 보호자 관찰')
    page.locator('select[name="origin"]').select_option('직접 관찰')
    page.locator('details.parent-more > summary').click()
    page.locator('textarea[name="childWords"]').fill('아이가 실제로 한 말')
    page.locator('input[name="share"]').check()
    page.locator('input[name="shareField"][value="childWords"]').check()
    page.locator('input[name="shareField"][value="origin"]').check()
    page.locator('#saveEntry').click()
    page.locator('#shareReviewDialog').wait_for(state='visible')
    assert '아이가 실제로 한 말' in page.locator('#shareReviewDialog pre').inner_text()
    page.locator('#shareReviewDialog [data-approve]').click()
    page.wait_for_function('window.__caseRecords.length===1 && window.__caseRecords[0].shared')
    assert page.evaluate('window.__caseRecords[0].sharedEntry.childWords')=='아이가 실제로 한 말'
    cases.append(f'{width}:parent source & actual words selected disclosure')
   else:
    assert page.locator('details.clinician-extra').count()==3
    assert all(not x for x in page.locator('details.clinician-extra').evaluate_all('(els)=>els.map(x=>x.open)'))
    page.locator('[data-workspace-target="session"]').click()
    page.locator('textarea[name="studentReport"]').fill('가상 학생 진술')
    page.locator('textarea[name="parentReport"]').fill('가상 보호자 보고')
    page.locator('textarea[name="workingHypothesis"]').fill('잠정 가설')
    page.locator('#sessionForm button[type="submit"]').click()
    page.wait_for_function('window.__caseSessions.length===1')
    assert page.evaluate('window.__caseSessions[0].entry.workingHypothesis')=='잠정 가설'
    page.locator('[data-workspace-target="drive"]').click()
    assert page.locator('#driveSync').is_disabled()
    cases.append(f'{width}:clinician separated memo and backup opt-out')
   assert not errs,(role,width,errs)
   page.close()
 browser.close()
print(json.dumps({'result':'PASS','count':len(cases),'cases':cases},ensure_ascii=False))
