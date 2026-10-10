from pathlib import Path
from playwright.sync_api import sync_playwright
import json
P=Path(__file__).resolve().parents[1]
OUT=Path('/mnt/data/일단써봄_개발환경형_v2_QA');OUT.mkdir(exist_ok=True)
html=(P/'preview/index.html').read_text()
checks=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,768,1280]:
  for role in ['guest','student','parent','therapist']:
   pg=b.new_page(viewport={'width':width,'height':880},device_scale_factor=1,accept_downloads=True)
   errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   pg.goto('about:blank');pg.set_content(html,wait_until='load');pg.locator('#oneLogin').wait_for();pg.locator(f'button[data-role="{role}"]').click()
   assert pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'),(role,width,'horizontal overflow')
   if role=='guest':
    assert pg.locator('#oneLogin').count()==1
   else:
    pg.locator('.workspace-sidebar .workspace-link').first.wait_for(timeout=6000)
    assert pg.locator('.workspace-sidebar .workspace-link').count()==(3 if role=='therapist' else 2 if role=='parent' else 4),(role,width,pg.locator('.workspace-sidebar .workspace-link').count(),pg.locator('main').inner_text()[:240])
    assert pg.locator('[data-workspace-view]:visible').count()==1
    if role=='student':
     assert pg.locator('textarea[name="event"]').is_visible()
     assert pg.locator('textarea[name="thought"]').is_hidden()
     assert pg.locator('[data-workspace-view="coding"]').is_hidden()
     pg.locator('textarea[name="event"]').fill('가상 상황: 발표를 마쳤다.')
     pg.locator('#entryForm').locator('button[type="submit"],button#saveEntry').click()
     pg.wait_for_timeout(120)
     assert pg.locator('[data-workspace-view="history"]').is_visible()
     assert '발표를 마쳤다' in pg.locator('#recordsHere').inner_text()
     pg.locator('button[data-workspace-target="situation"]').click()
     assert pg.locator('[data-workspace-view="situation"]').is_visible()
     pg.locator('button[data-scenario="fact"]').click()
     assert '사실' in pg.locator('#situationOutput').inner_text()
     pg.locator('button[data-workspace-target="coding"]').click()
     assert pg.locator('[data-workspace-view="coding"]').is_visible()
     pg.locator('#codingSelect').select_option('rain')
     pg.locator('#runCode').click()
     assert '실내 활동' in pg.locator('#codeResult').inner_text()
     pg.locator('button[data-workspace-target="write"]').click()
     assert pg.locator('textarea[name="event"]').is_visible()
    elif role=='parent':
     assert pg.locator('textarea[name="observation"]').is_visible()
     pg.locator('textarea[name="observation"]').fill('가상 관찰 기록')
     pg.locator('#entryForm button.button').click()
     pg.wait_for_timeout(120)
     assert '가상 관찰 기록' in pg.locator('#recordsHere').inner_text()
    elif role=='therapist':
     assert pg.locator('#filterStudent').is_visible()
     pg.locator('button[data-workspace-target="accounts"]').click()
     assert pg.locator('#inviteForm').is_visible()
     pg.locator('button[data-workspace-target="drive"]').click()
     assert pg.locator('#driveSync').is_disabled()
     pg.locator('button[data-workspace-target="inbox"]').click()
     assert pg.locator('#csv').is_visible()
   assert not errors, (role,width,errors)
   checks.append(f'{role}_{width}')
   if width in [390,1280]:
    if role=='student' and pg.locator('[data-workspace-view="history"]').is_visible():pg.locator('button[data-workspace-target="write"]').click()
    if role=='parent':pg.locator('button[data-workspace-target="write"]').click()
    pg.screenshot(path=str(OUT/f'{role}_{width}.png'),full_page=True)
   pg.close()
 b.close()
print(json.dumps({'passed':len(checks),'scenarios':checks,'output':str(OUT)},ensure_ascii=False))
