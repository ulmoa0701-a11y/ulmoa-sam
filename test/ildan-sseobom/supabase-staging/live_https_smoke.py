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
        assert "from './trial-media.mjs'" in live_js, "public app must load actual photo module"
        assert "api('practice-records')" in live_js, "practice cloud read must be deployed"
        assert "api('practice-records',{method:'POST'" in live_js, "practice cloud save must be deployed"
        assert "uploadToSignedUrl" in live_js, "private signed photo uploads must be deployed"
        media_js=page.evaluate("fetch('./trial-media.mjs',{cache:'no-store'}).then(r=>r.ok?r.text():Promise.reject(new Error('photo media script HTTP '+r.status)))")
        assert "사진 추가" in media_js and "사진 촬영" in media_js and "그림 그리기" in media_js, "actual photo and drawing module deployed"
        assert "indexedDB.open" in media_js, "on-device archive implementation deployed"
        assert "convertPhoto(file)" in media_js, "original photos should be recompressed and stripped"
        assert "publicInviteApi('invite-register',code)" in live_js, "Invite link alone triggers access"
        assert "retry.onclick=connect;await connect()" in live_js, "Link opens and connects automatically"
        assert "이 링크 하나로 계속 접속할 수 있어요." in live_js, "Repeated link access described"
        assert "verificationCodeOutput" not in live_js, "No independent verification code UI"
        assert "verifiedInviteForm" not in live_js, "No extra PIN form"
        assert "invite-recipient-card" in live_js, "student-specific invite cards must be deployed"
        assert "targetUserId||i.usedBy" in live_js, "student invocations must resolve linked recipient"
        assert "practice-sync-box" in live_js, "sync status and consent must be visible"
        assert "💾 연습 기록 저장하기" in live_js, "cloud practice save must be explicit"
        assert "name=\"practiceShare\"" in live_js, "therapist share must be opt-in"
        assert "data-practice-share" in live_js and "data-practice-unshare" in live_js, "share and revoke UI must exist"
        assert "practice-cloud-record" in live_js, "synced record archive must exist"
        assert "data-practice-edit" in live_js, "author edit action must exist"
        assert "api('practice-update'" in live_js, "save must update existing encrypted record"
        assert "expectedUpdatedAt:old.updatedAt" in live_js, "edit must include revision guard"
        assert "populatePracticeEditor" in live_js and "cancelPracticeEdit" in live_js, "preloaded editor and cancel"
        assert "uploadPracticePhotos(old)" in live_js, "edits preserve/replace existing photos"
        assert "setPracticePhotos" in media_js, "existing photos must be preloaded for editing"




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
