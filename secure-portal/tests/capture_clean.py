from pathlib import Path
from playwright.sync_api import sync_playwright
p=Path(__file__).resolve().parents[1]
h=(p/'preview/index.html').read_text()
out=Path('/mnt/data/일단써봄_개발환경형_v2_QA')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for role,view,width in [('student','write',390),('student','write',1280),('student','coding',1280),('student','coding',390),('parent','write',390),('therapist','inbox',1280),('therapist','drive',1280)]:
  page=b.new_page(viewport={'width':width,'height':900})
  page.goto('about:blank');page.set_content(h)
  page.locator('#oneLogin').wait_for()
  page.locator('button[data-role='+role+']').click()
  page.wait_for_function('(r)=>document.querySelector("#account .role-chip")?.textContent===r',arg={'student':'학생','parent':'학부모','therapist':'치료사'}[role])
  if view!='write' and view!='inbox':page.locator('button[data-workspace-target='+view+']').click()
  page.evaluate('window.scrollTo(0,0)')
  page.screenshot(path=str(out/f'clean_{role}_{view}_{width}.png'),full_page=True)
  page.close()
 b.close()
