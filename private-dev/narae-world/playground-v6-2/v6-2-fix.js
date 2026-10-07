/* 모아모아 나래반 놀이터 V6.2 — PRIVATE DEV RUNTIME PATCH
   PUBLICATION_HOLD: do not attach to main / GitHub Pages without explicit approval.
   Goal: make Nuri's mission a real object-search loop and remove the "walk to a known blue bucket" auto-success.
   Assumes V6.1 globals: player, objectPos, npcPos, A, interact, nearNpc, activeMission,
   missionStep, frame(), flash(), say(), complete(), npcDialog(), updateNearby(), interactNow(), startNuri().
*/
(() => {
  'use strict';

  const labels = {
    blue_bucket: '파란 양동이',
    red_bucket: '빨간 양동이',
    blue_shovel: '파란 삽',
    truck: '장난감 자동차'
  };
  const options = Object.keys(labels);
  let target = null;
  let candidate = null;
  let wrongCount = 0;

  const ensureUi = () => {
    const world = document.getElementById('world');
    if (!world) return;

    if (!document.getElementById('nuriSearchHint')) {
      const hint = document.createElement('div');
      hint.id = 'nuriSearchHint';
      hint.className = 'nuri-search-hint';
      hint.innerHTML = '<img alt=""><span><b>누리가 찾는 것</b><small></small></span>';
      document.getElementById('game')?.appendChild(hint);
    }

    if (!document.getElementById('nuriSpeech')) {
      const speech = document.createElement('div');
      speech.id = 'nuriSpeech';
      speech.className = 'nuri-speech';
      world.appendChild(speech);
    }

    if (!document.getElementById('searchPulse')) {
      const pulse = document.createElement('div');
      pulse.id = 'searchPulse';
      pulse.className = 'nuri-search-pulse';
      world.appendChild(pulse);
    }
  };

  const positionNpcContext = () => {
    const presets = {
      npcNuri: { left: 560, top: 748, width: 126, height: 190 },
      npcYeoreum: { left: 842, top: 742, width: 122, height: 186 },
      npcGaram: { left: 1290, top: 800, width: 190, height: 126 }
    };
    for (const [id, p] of Object.entries(presets)) {
      const el = document.getElementById(id);
      if (!el) continue;
      Object.assign(el.style, {
        left: p.left + 'px',
        top: p.top + 'px',
        width: p.width + 'px',
        height: p.height + 'px'
      });
    }
    // Keep proximity logic aligned with the art.
    if (typeof npcPos !== 'undefined') {
      Object.assign(npcPos.누리, { x: 560, y: 748 });
      Object.assign(npcPos.여름, { x: 842, y: 742 });
      Object.assign(npcPos.가람, { x: 1290, y: 800 });
    }
  };

  ensureUi();
  positionNpcContext();

  const oldUpdateNearby = updateNearby;
  updateNearby = function patchedUpdateNearby() {
    // Let V6.1 handle NPCs and other missions first.
    oldUpdateNearby();

    if (activeMission !== '누리' || missionStep !== 1) {
      candidate = null;
      document.getElementById('searchPulse')?.classList.remove('show');
      return;
    }

    let nearest = null;
    let best = Infinity;
    for (const [id, p] of Object.entries(objectPos)) {
      const d = Math.abs(player.x - p.x);
      if (d < best) {
        best = d;
        nearest = id;
      }
    }

    // Override V6.1's fixed blue-bucket interaction.
    if (nearest && best < 92) {
      candidate = nearest;
      nearNpc = 'nuri_search_object';
      interact.textContent = '🔎 이 물건 살펴보기';
      interact.classList.add('show');

      const pulse = document.getElementById('searchPulse');
      if (pulse) {
        pulse.style.left = objectPos[nearest].x + 'px';
        pulse.style.top = (objectPos[nearest].y + 10) + 'px';
        pulse.classList.add('show');
      }
    } else {
      candidate = null;
      nearNpc = null;
      interact.classList.remove('show');
      document.getElementById('searchPulse')?.classList.remove('show');
    }
  };

  startNuri = function patchedStartNuri() {
    ensureUi();
    target = options[Math.floor(Math.random() * options.length)];
    candidate = null;
    wrongCount = 0;

    const hint = document.getElementById('nuriSearchHint');
    const img = hint?.querySelector('img');
    const small = hint?.querySelector('small');
    if (img && A?.thumbs?.[target]) img.src = A.thumbs[target];
    if (small) small.textContent = labels[target] + ' · 모래밭에서 찾아봐';
    hint?.classList.add('show');

    const speech = document.getElementById('nuriSpeech');
    if (speech) {
      speech.style.left = (npcPos.누리.x + 46) + 'px';
      speech.style.top = (npcPos.누리.y - 210) + 'px';
      speech.textContent = labels[target] + ' 어디 있었지?';
      speech.classList.add('show');
    }

    document.getElementById('objGlow')?.classList.remove('show');
    flash(labels[target] + '을(를) 찾아봐!');
    say(labels[target] + '을 찾아봐. 가까이 가서 직접 살펴보자.');
  };

  const oldInteractNow = interactNow;
  interactNow = function patchedInteractNow() {
    if (nearNpc !== 'nuri_search_object') {
      return oldInteractNow();
    }
    if (!candidate || !target) return;

    document.getElementById('searchPulse')?.classList.remove('show');
    const speech = document.getElementById('nuriSpeech');

    if (candidate === target) {
      frame('pickup');
      if (speech) speech.textContent = '맞아! 그거였어!';
      say('맞아! 그거였어!');
      setTimeout(() => {
        document.getElementById('nuriSearchHint')?.classList.remove('show');
        document.getElementById('nuriSpeech')?.classList.remove('show');
        frame('cheer');
        complete('누리');
      }, 420);
    } else {
      wrongCount += 1;
      frame('point');
      if (speech) speech.textContent = '이건 아니야. 다른 것도 찾아보자!';
      flash('다른 물건이야. 다시 찾아보자!');
      say('이건 아니야. 다른 것도 찾아보자.');
      setTimeout(() => {
        if (player.state === 'point') frame('idle');
      }, 520);
    }
  };

  // Reword Nuri's mission card after V6.1 renders it so the answer isn't spoiled.
  const oldNpcDialog = npcDialog;
  npcDialog = function patchedNpcDialog(name) {
    oldNpcDialog(name);
    if (name !== '누리') return;
    const panel = document.getElementById('panel');
    if (!panel) return;
    const h2 = panel.querySelector('h2');
    const p = panel.querySelector('p');
    if (h2) h2.textContent = '같이 찾아줄래?';
    if (p) p.innerHTML = '모래밭 쪽에서 내가 찾던 물건을 놓친 것 같아. <b>시작하면 어떤 물건인지 보여줄게.</b> 같이 찾아보자!';
  };

  window.__naraeV62 = {
    version: '6.2-search-rebuild',
    get target() { return target; },
    get candidate() { return candidate; },
    get wrongCount() { return wrongCount; }
  };
})();