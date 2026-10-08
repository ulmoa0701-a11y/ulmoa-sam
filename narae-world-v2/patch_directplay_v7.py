#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Narae playground V7 direct-play patch.
- Never overwrites V6 source.
- Produces a sibling V7 HTML.
- PUBLICATION_HOLD: do not link to GitHub Pages.
"""
from pathlib import Path
import argparse, hashlib, sys

SOURCE_NAME = "나래반_놀이터_WORLD_V6_1_FREEPLAY.html"
OUTPUT_NAME = "나래반_놀이터_WORLD_V7_DIRECTPLAY_DEV.html"

REPLACEMENTS = [
    ('<section id="title" class="screen active">','<section id="title" class="screen">'),
    ('<section id="game" class="screen">','<section id="game" class="screen active">'),
    ('<span class="tag">🌤️ FREE PLAY V6 · 솔 움직임 기준본</span>','<span class="tag">🌤️ FREE PLAY V7 · DEV ONLY</span>'),
    ('누리 · 보물찾기','누리'),
    ('여름 · 깃발놀이','여름'),
    ('가람 · 기억미션','가람'),
    ('<h3>오늘의 부탁</h3><p>하고 싶은 것만 해도 돼. 완료 순서도 자유야.</p>',
     '<h3>친구들이 뭐 하고 있지?</h3><p>궁금한 친구에게 가서 말을 걸어봐.</p>'),
    ('<b>누리의 부탁</b><small>놀이터에서 파란 양동이 찾기</small>',
     '<b>누리</b><small>뭔가를 찾고 있는 것 같아</small>'),
    ('<b>여름의 부탁</b><small>중간에 바뀌는 깃발 규칙</small>',
     '<b>여름</b><small>깃발을 들고 같이 놀 친구를 기다려</small>'),
    ('<b>가람의 부탁</b><small>순서대로 물건 가져오기</small>',
     '<b>가람</b><small>모래밭에서 뭔가를 살펴보고 있어</small>'),
    ("누리:['🔎','보물찾기 할래?','내가 아까 모래밭에서 <b>파란 양동이</b>를 봤는데 어디였는지 기억이 안 나. 같이 찾아줄래?']",
     "누리:['🔎','같이 찾아볼래?','아까 여기서 놀다가 <b>파란 양동이</b>를 두고 왔는데 어디였지? 나랑 놀이터를 같이 둘러봐 줄래?']"),
    ("여름:['🏃','깃발게임 한 판!','놀이터를 달리면서 규칙에 맞는 깃발을 잡는 거야. 근데 중간에 규칙이 바뀔 수도 있어!']",
     "여름:['🏃','나랑 깃발 잡으러 갈래?','내가 말하는 깃발을 찾아서 같이 달려가 보자. 놀다 보면 내가 다른 깃발을 말할 수도 있어!']"),
    ("가람:['🧠','내가 필요한 게 세 개야','순서를 한번만 보여줄게. 충분히 보고 기억해서 모래밭에서 차례대로 가져와 봐.']",
     "가람:['🪣','같이 챙겨줄래?','모래놀이에 쓸 게 세 개 있어. 내가 보여주는 걸 보고 모래밭에서 같이 찾아와 줄래?']"),
    ("function startNuri(){flash('파란 양동이를 직접 찾아가 봐!');say('놀이터에서 파란 양동이를 찾아봐.');document.getElementById('objGlow').classList.remove('show')}",
     "function startNuri(){flash('누리랑 같이 둘러보자 👀');say('누리랑 놀이터를 둘러보며 파란 양동이를 찾아보자.');document.getElementById('objGlow').classList.remove('show');setTimeout(()=>{if(activeMission==='누리'&&missionStep===1)flash('모래밭 쪽도 천천히 살펴봐 👀')},8000)}"),
    ("document.getElementById('startBtn').onclick=()=>{show('game');setTimeout(()=>{setPlayerPos();fitCamera();flash('자유롭게 돌아다녀 봐 🌤️')},60)};",
     "document.getElementById('startBtn').onclick=()=>{show('game');setTimeout(()=>{setPlayerPos();fitCamera();flash('오늘은 뭐 하고 놀까? 🌤️')},60)};\nshow('game');setTimeout(()=>{setPlayerPos();fitCamera();flash('오늘은 뭐 하고 놀까? 🌤️')},180);"),
    ("document.getElementById('backBtn').onclick=()=>show('title');",
     "document.getElementById('backBtn').onclick=()=>{if(history.length>1){history.back()}else{flash('놀이터에서 더 놀아볼까? 🌿')}};"),
]

def find_source(explicit: str | None) -> Path:
    if explicit:
        p = Path(explicit).expanduser().resolve()
        if p.is_file():
            return p
        raise FileNotFoundError(p)
    candidates = [
        Path.cwd() / SOURCE_NAME,
        Path.home() / "Downloads" / SOURCE_NAME,
    ]
    for p in candidates:
        if p.is_file():
            return p
    for p in (Path.home() / "Downloads").rglob(SOURCE_NAME):
        return p
    raise FileNotFoundError(SOURCE_NAME)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", nargs="?")
    args = ap.parse_args()
    src = find_source(args.source)
    raw = src.read_text(encoding="utf-8")
    if "나래반 놀이터 WORLD V6" not in raw:
        raise RuntimeError("V6 source signature not found; aborting safely.")
    out = raw
    applied = []
    missing = []
    for old, new in REPLACEMENTS:
        if old in out:
            out = out.replace(old, new, 1)
            applied.append(old[:50])
        else:
            missing.append(old[:50])
    if "#title{display:none!important}" not in out:
        out = out.replace("</style>", "\n/* V7 direct-play / PUBLICATION_HOLD */\n#title{display:none!important}\n</style>", 1)

    # QA gates
    checks = {
        "game_active": '<section id="game" class="screen active">' in out,
        "title_not_active": '<section id="title" class="screen active">' not in out,
        "title_hidden": "#title{display:none!important}" in out,
        "direct_start": "show('game');setTimeout(()=>{setPlayerPos();fitCamera();flash('오늘은 뭐 하고 놀까? 🌤️')},180);" in out,
        "nuri_context": "누리랑 놀이터를 둘러보며 파란 양동이를 찾아보자." in out,
        "clinical_labels_removed": all(x not in out for x in ("누리 · 보물찾기","여름 · 깃발놀이","가람 · 기억미션")),
    }
    if not all(checks.values()):
        raise RuntimeError(f"QA failed: {checks}")

    dst = src.with_name(OUTPUT_NAME)
    if dst.exists():
        # Preserve previous V7 rather than overwrite it.
        i = 2
        while src.with_name(f"나래반_놀이터_WORLD_V7_DIRECTPLAY_DEV_{i}.html").exists():
            i += 1
        dst = src.with_name(f"나래반_놀이터_WORLD_V7_DIRECTPLAY_DEV_{i}.html")
    dst.write_text(out, encoding="utf-8")
    digest = hashlib.sha256(dst.read_bytes()).hexdigest()
    print(f"SOURCE={src}")
    print(f"OUTPUT={dst}")
    print(f"BYTES={dst.stat().st_size}")
    print(f"SHA256={digest}")
    print(f"APPLIED={len(applied)}/{len(REPLACEMENTS)}")
    print(f"MISSING={len(missing)}")
    for k,v in checks.items():
        print(f"QA_{k.upper()}={'PASS' if v else 'FAIL'}")
    print("PUBLICATION_HOLD=TRUE")

if __name__ == "__main__":
    main()
