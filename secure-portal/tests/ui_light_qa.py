from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
P=Path(__file__).resolve().parents[1]/'public'
OUT=Path('/mnt/data/일단써봄_밝은화면_QA');OUT.mkdir(exist_ok=True)
html=(P/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="/style.css">','<style>'+(P/'style.css').read_text()+'</style>')
html=html.replace('<script type="module" src="/app.js"></script>','<script>'+(P/'app.js').read_text()+'</script>')
mock=Path(__file__).with_name('ui_passkey_inline_smoke.py').read_text().split("mock='''")[1].split("'''\nwith sync_playwright")[0]
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for role in ['guest','student','parent','therapist']:
  for width in [320,390,768,1280]:
   pg=b.new_page(viewport={'width':width,'height':850},device_scale_factor=1)
   pg.set_default_timeout(6000)
   errors=[];pg.on('pageerror',lambda e: errors.append(str(e)))
   pg.goto('about:blank');pg.evaluate('() => {'+mock+'window.TEST_ROLE='+json.dumps(role)+';}')
   pg.set_content(html,wait_until='load')
   pg.locator('#oneLogin').wait_for()
   assert pg.locator('#oneLogin').is_visible()
   assert pg.locator('#oneLogin').bounding_box()['height']>=48
   if role!='guest':
    pg.locator('#oneLogin').click()
    pg.locator('#inviteForm' if role=='therapist' else '#entryForm').wait_for()
   assert pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'),(role,width,'overflow')
   if role=='student':
    assert pg.locator('textarea[name=event]').is_visible()
    assert pg.locator('textarea[name=thought]').is_hidden()
    assert pg.locator('details#activities').get_attribute('open') is None
    assert pg.locator('#saveEntry').inner_text().find('나만 보기')>=0
    pg.locator('.optional-fields summary').click()
    assert pg.locator('textarea[name=thought]').is_visible()
    pg.locator('input[name=share]').check()
    assert '공유' in pg.locator('#saveEntry').inner_text()
    pg.locator('input[name=share]').uncheck()
    assert '나만 보기' in pg.locator('#saveEntry').inner_text()
    pg.locator('details#activities > summary').click()
    pg.locator('#codingSelect').select_option('rain')
    pg.locator('#runCode').click()
    assert '실내 활동' in pg.locator('#codeResult').inner_text()
    pg.locator('button[data-scenario=fact]').click()
    assert '사실' in pg.locator('#situationOutput').inner_text()
    # screenshot at default collapsed state, not post-click
    pg.reload() if False else None
   elif role=='parent':
    assert pg.locator('textarea[name=observation]').is_visible()
    assert pg.locator('details#activities').count()==0
   elif role=='therapist':
    assert pg.locator('#inviteForm').is_visible()
    assert pg.locator('#googleConnect').is_disabled()
    assert pg.locator('#driveSync').is_disabled()
   assert not errors,(role,width,errors)
   results.append(role+' '+str(width))
   if width in [390,1280]:
    if role=='student':
     # return options collapsed for main screenshot
     pg.locator('details#activities > summary').click();pg.locator('.optional-fields summary').click()
    pg.screenshot(path=str(OUT/(role+'_'+str(width)+'.png')),full_page=(role!='student'))
   pg.close()
 print(json.dumps({'passed':len(results),'cases':results,'screenshots':str(OUT)},ensure_ascii=False))
 b.close()
