#!/usr/bin/env python3
"""Read-only Ulmoa QA/deploy status collector. Standard library; no AI API costs."""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PAGES = {
    "홈": "index.html",
    "하트악보": "heart-score/index.html",
    "악보 AI": "heart-score/ai/index.html",
    "붐웨커": "boomwhacker/index.html",
    "생각정원": "thinking-garden/index.html",
}
QA = {
    "Heart Score OMR QA",
    "Thinking Garden Rhythm Touch QA",
    "Boomwhacker QA",
}


def fetch(url, token=None, max_bytes=500_000):
    headers = {"User-Agent": "ulmoa-readonly-qa/1.0", "Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    with urlopen(Request(url, headers=headers), timeout=15) as response:
        return response.status, response.read(max_bytes)


def add(checks, kind, target, status, detail):
    checks.append({"kind": kind, "target": target, "status": status, "detail": detail})


def inspect(root, base_url, repo, live=False, github=False, token=None, getter=fetch):
    checks = []
    for label, relative in PAGES.items():
        p = root / relative
        if not p.is_file():
            add(checks, "file", relative, "FAIL", "HTML file not found")
            continue
        content = p.read_text(encoding="utf-8", errors="replace")
        if "<html" not in content.lower() or "<title" not in content.lower():
            add(checks, "file", relative, "FAIL", "HTML / title missing")
        else:
            add(checks, "file", relative, "PASS", f"HTML and title found ({len(content)} chars); not browser-tested")
    if live:
        for label, relative in PAGES.items():
            url = base_url.rstrip("/") + "/" + relative
            try:
                status, body = getter(url, max_bytes=100_000)
                if status == 200 and b"<html" in body.lower():
                    add(checks, "live", url, "PASS", "HTTP 200 and HTML visible; interactions untested")
                else:
                    add(checks, "live", url, "FAIL", f"HTTP {status}; HTML not verified")
            except (HTTPError, URLError, TimeoutError, OSError) as e:
                add(checks, "live", url, "FAIL", type(e).__name__ + ": " + str(e)[:150])
    if github:
        url = f"https://api.github.com/repos/{repo}/actions/runs?branch=main&per_page=75"
        try:
            status, body = getter(url, token=token, max_bytes=1_500_000)
            rows = json.loads(body).get("workflow_runs", [])
            deployments = [r for r in rows if r.get("name") == "pages build and deployment" and r.get("status") == "completed"]
            if deployments:
                last = deployments[0]
                result = "PASS" if last.get("conclusion") == "success" else "FAIL"
                add(checks, "deployment", "GitHub Pages (last completed)", result,
                    f"{last.get('conclusion')} at {last.get('created_at')} commit={last.get('head_sha','')[:12]} run={last.get('html_url')}")
            else:
                add(checks, "deployment", "GitHub Pages", "WARN", "No completed deployment in recent runs")
            for name in sorted(QA):
                matching = [r for r in rows if r.get("name") == name and r.get("status") == "completed"]
                if not matching:
                    add(checks, "workflow", name, "WARN", "No completed run found in recent history; NOT a QA pass")
                    continue
                last = matching[0]
                add(checks, "workflow", name,
                    "PASS" if last.get("conclusion") == "success" else "FAIL",
                    f"{last.get('conclusion')} at {last.get('created_at')} branch={last.get('head_branch')} run={last.get('html_url')}; result applies only to that run")
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError) as e:
            add(checks, "github", "GitHub Actions API", "WARN", "Could not verify: " + str(e)[:150])
    report = {
        "generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "repo": repo,
        "scope": "Read-only file, HTTP, and historical CI/deployment checks. NOT browser UX, AI quality, accessibility, or real-child testing.",
        "checks": checks,
        "counts": {s: sum(c["status"] == s for c in checks) for s in ("PASS", "WARN", "FAIL")},
    }
    return report


def markdown(report):
    lines = ["# 울모아 무료 QA 운영본부 — 상태 보고", "",
             f"- 생성: {report['generated_utc']}", f"- 대상: {report['repo']}",
             f"- 검증 범위: {report['scope']}",
             f"- 결과: PASS {report['counts']['PASS']} / WARN {report['counts']['WARN']} / FAIL {report['counts']['FAIL']}", "",
             "| 상태 | 유형 | 대상 | 근거 |", "|---|---|---|---|"]
    for c in report["checks"]:
        safe = lambda x: str(x).replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {safe(c['status'])} | {safe(c['kind'])} | {safe(c['target'])} | {safe(c['detail'])} |")
    lines += ["", "## 중요한 제한", "", "이 보고서의 PASS는 실제 모바일 조작성이나 AI 인식 정확도의 통과를 의미하지 않습니다.",
              "GitHub Actions 기존 실행 기록을 읽기만 하며 배포·게시·파일 수정·이메일 발송을 하지 않습니다.",
              "GitHub Pages 결과와 테스트 결과가 모두 PASS여도 사람이 실제 제품을 검토한 것은 아닙니다."]
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--repo", default=os.getenv("GITHUB_REPOSITORY", "ulmoa0701-a11y/ulmoa-sam"))
    parser.add_argument("--site", default="https://ulmoa0701-a11y.github.io/ulmoa-sam")
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--github", action="store_true")
    parser.add_argument("--out", type=Path, default=Path("ops-report"))
    args = parser.parse_args()
    report = inspect(args.root, args.site, args.repo, args.live, args.github, os.getenv("GITHUB_TOKEN"))
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "status.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.out / "status.md").write_text(markdown(report), encoding="utf-8")
    print(f"PASS={report['counts']['PASS']} WARN={report['counts']['WARN']} FAIL={report['counts']['FAIL']}")
    for c in report["checks"]:
        print(f"{c['status']}: {c['kind']} {c['target']}: {c['detail']}")
    return 1 if report["counts"]["FAIL"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
