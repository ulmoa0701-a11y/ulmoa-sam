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
        page.locator("#clinicianFirstForm input[type=email]").wait_for(timeout=30000)
        assert page.locator("#firstLogin").is_visible(), "first visit must show account setup"
        assert not page.locator("#loginPasskey").is_visible(), "do not prompt first-time users for passkey"
        assert page.locator("#inviteList").count() == 0, "guest must never see invitation management"
        assert "실제 학생·보호자 상담정보 입력 금지" in page.locator("body").inner_text()
        page.locator("#returnChoice").click()
        assert page.locator("#loginPasskey").is_visible()
        page.locator("#firstChoice").click()
        assert page.locator("#clinicianFirstForm input[type=email]").is_visible()
        assert not page.locator("#loginPasskey").is_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 3"), "horizontal overflow"
        assert not errors, ("uncaught page errors", errors)
        checks.append(f"live HTTPS Chrome {width}px first/repeat UI, runtime code loaded, no overflow")
        page.close()
    browser.close()
print(json.dumps({"status": "PASS", "checks": checks}, ensure_ascii=False))
