"""Local inline browser smoke with fake WebAuthn/API, not server or device verification."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
P=Path(__file__).resolve().parents[1]/'public'
html=(P/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="/style.css">','<style>'+ (P/'style.css').read_text()+'</style>')
html=html.replace('<script type="module" src="/app.js"></script>','<script>'+ (P/'app.js').read_text()+'</script>')
mock='''
window.fetch=async(url,opt={})=>{
 const key=String(url).replace('/api/','');
 const role=window.TEST_ROLE||'student';
 const json={
 me:{error:'not logged in'},therapists:{therapists:[{id:'teacher01',display_name:'치료사 샘'}]},
 'passkeys/login/options':{options:{challenge:'Y2hhbGxlbmdl',rpId:'example.com',userVerification:'required'}},
 'passkeys/enroll/options':{options:{challenge:'Y2hhbGxlbmdl',rp:{id:'example.com',name:'일단써봄'},user:{id:'dGVzdA',name:'테스터',displayName:'테스터'},pubKeyCredParams:[{type:'public-key',alg:-7}]}},
 'passkeys/login/verify':{user:{id:'u1',nickname:'테스터',role}},
 'passkeys/enroll/verify':{user:{id:'u1',nickname:'테스터',role}},
 records:{records:[]},students:{students:[]},accounts:{accounts:[]},'drive/status':{connected:false,configured:false,folderUrl:null}
 }[key]||{};
 return new Response(JSON.stringify(json),{status:key==='me'?401:200,headers:{'Content-Type':'application/json'}});
};
Object.defineProperty(window,'isSecureContext',{value:true,configurable:true});
Object.defineProperty(navigator,'credentials',{value:{
 get:async()=>({id:'mock',type:'public-key',toJSON:()=>({id:'mock',type:'public-key',response:{clientDataJSON:'dGVzdA'}})}),
 create:async()=>({id:'mock',type:'public-key',toJSON:()=>({id:'mock',type:'public-key',response:{clientDataJSON:'dGVzdA'}})})
},configurable:true});
window.PublicKeyCredential=class PublicKeyCredential {static parseRequestOptionsFromJSON(x){return x} static parseCreationOptionsFromJSON(x){return x}};
'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 passed=[]
 for role in ['student','parent','therapist']:
  for width in [320,390,1280]:
   pg=b.new_page(viewport={'width':width,'height':800})
   errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
   pg.goto('about:blank')
   pg.evaluate("() => {"+mock+"window.TEST_ROLE="+json.dumps(role)+";}")
   pg.set_content(html,wait_until='load')
   pg.wait_for_selector('#oneLogin',timeout=3500)
   assert pg.locator('#loginForm').count()==0
   pg.locator('#oneLogin').click()
   pg.wait_for_selector('#entryForm' if role!='therapist' else '#inviteForm',timeout=3500)
   assert not errs,errs
   assert pg.evaluate('document.documentElement.scrollWidth-window.innerWidth')<=1
   passed.append(role+' '+str(width))
   pg.close()
 pg=b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
 pg.goto('about:blank');pg.evaluate("() => {"+mock+";}");pg.set_content(html,wait_until='load')
 pg.get_by_text('처음 사용하거나 기기를 바꿨나요?').click();pg.locator('#newAccount').click();pg.locator('[name=selectedTherapistId]').select_option('teacher01');pg.locator('[name=invite]').fill('a'*32);pg.locator('#registerForm [name=nickname]').fill('테스트닉네임');pg.locator('#registerForm button').click();pg.wait_for_selector('#entryForm',timeout=3500)
 assert not errs,errs;passed.append('registration')
 print(json.dumps({'passed':len(passed),'cases':passed},ensure_ascii=False))
 b.close()
