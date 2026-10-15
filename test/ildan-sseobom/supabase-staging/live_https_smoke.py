"""Read-only live HTTPS smoke on the deployed GitHub Pages UI; synthetic DOM checks only."""
import json, os
from playwright.sync_api import sync_playwright

URL = "https://ulmoa0701-a11y.github.io/ulmoa-sam/test/ildan-sseobom/supabase-staging/"
checks = []
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True, executable_path=os.environ.get("CHROME_BIN") or "/usr/bin/google-chrome",
        args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    for width in (390, 1440):
        page = browser.new_page(viewport={"width": width, "height": 850})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        response = page.goto(URL, wait_until="domcontentloaded", timeout=40000)
        assert response and response.status == 200, ("live HTTP", response.status if response else None)
        page.locator("#trialSignupForm input[name=username]").wait_for(timeout=30000)
        assert page.locator("#firstLogin").is_visible(), "first visit must show account setup"
        assert page.locator("#trialSignupForm input[name=password][type=password]").count() == 1, "test user password is required"
        assert page.locator("input[type=email]").count() == 0, "email verification must not be required"
        assert page.locator("#inviteList").count() == 0, "guest must never see invitation management"
        assert "실제 학생·보호자 상담정보 입력 금지" in page.locator("body").inner_text()
        live_js=page.evaluate("fetch('./app.js',{cache:'no-store'}).then(r=>r.ok?r.text():Promise.reject(new Error('app.js '+r.status)))")
        assert "학생 이름 또는 별칭" in live_js, "deployed page must include student name label"
        assert "student-list-summary" in live_js, "deployed page must include registered student list"
        assert "보호자 접속 링크 만들기" in live_js, "deployed page must distinguish guardian invitation"
        page.locator("#returnChoice").click()
        assert page.locator("#trialLoginForm").is_visible()
        page.locator("#firstChoice").click()
        assert page.locator("#trialSignupForm input[name=username]").is_visible()
        assert not page.locator("#trialLoginForm").is_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 3"), "horizontal overflow"
        assert not errors, ("uncaught page errors", errors)
        checks.append(f"live HTTPS Chrome {width}px sandbox signup/relogin UI, real HTTPS assets loaded, no overflow")
        page.close()
    browser.close()
print(json.dumps({"status": "PASS", "checks": checks}, ensure_ascii=False))
