(() => {
  const gameFix = document.createElement('style');
  gameFix.textContent = `
    .guide-panel>img{position:static!important;left:auto!important;bottom:auto!important;grid-column:1!important;grid-row:1!important;align-self:center!important;justify-self:center!important}
    .guide-copy{grid-column:2!important;grid-row:1!important;min-width:0!important;width:auto!important}
    .guide-copy h3{word-break:keep-all!important;overflow-wrap:normal!important;max-width:none!important}
    .guide-copy p{word-break:keep-all!important;overflow-wrap:break-word!important;max-width:none!important}
    @media(max-width:560px){.guide-panel>img{position:static!important}.guide-copy{grid-column:2!important}.guide-panel{min-height:0!important}}
  `;
  document.head.appendChild(gameFix);

  const previews = {
    rescue: `<div class="cp-rescue-radio">📡 <b>노란 큰 오리 발견!</b></div><div class="cp-rescue-field"><span class="tree">🌳</span><span class="target">🦆</span><span class="bush">🌿</span><span class="other">🐷</span><span class="van">🚐</span></div>`,
    memory: `<div class="cp-mission">이 순서대로 기억해요!</div><div class="cp-sequence"><i class="c-red">🌸</i><i class="c-blue">🌼</i><i class="c-yellow">🌻</i><i class="c-purple">🌷</i></div><div class="cp-arrow">▼</div><div class="cp-slots"><i>?</i><i>?</i><i>?</i><i>?</i></div>`,
    spacing: `<div class="cp-mission">붙어 있는 문장에서 띄울 곳을 찾아요</div><div class="cp-glued">오늘은학교에가요</div><div class="cp-space-arrow">톡! ↓</div><div class="cp-spaced"><span>오늘은</span><span>학교에</span><span>가요</span></div>`,
    spelling: `<div class="cp-mission">맞는 표현을 골라 간판을 고쳐요</div><div class="cp-sign">숙제를 <b>?</b></div><div class="cp-answer-row"><span class="is-bad">✕ 햇어요</span><span class="is-good">✓ 했어요</span></div>`,
    sameShape: `<div class="cp-mission">색이 달라도 같은 모양을 찾아요</div><div class="cp-target-shape">★</div><div class="cp-choice-row shape"><span style="color:#ffd45b">●</span><span class="is-good" style="color:#6bb7ff">★</span><span style="color:#69c77d">▲</span><span style="color:#9b83e8">◆</span></div>`,
    flower: `<div class="cp-mission">꽃만 쏙쏙 찾아요</div><div class="cp-choice-row"><span class="is-good">🌷</span><span>🍃</span><span class="is-good">🌼</span><span>🪨</span><span class="is-good">🌸</span></div>`,
    hide: `<div class="cp-mission">잎사귀 아래 숨은 친구를 찾아요</div><div class="cp-leaves"><span>🍃</span><span class="is-open">🐞</span><span>🍃</span><span>🍃</span><span>🍃</span><span>🍃</span></div>`,
    path: `<div class="cp-mission">반짝이는 길을 순서대로 따라가요</div><div class="cp-path"><i class="done">🌱</i><i class="ready">🌼</i><i>🍃</i><i>🌸</i><i>🌿</i></div><div class="cp-runner">🦋</div>`,
    calm: `<div class="cp-mission">초록불이 켜지면 톡!</div><div class="cp-signal"><span class="red">🔴<small>기다려요</small></span><b>→</b><span class="green">🟢<small>지금!</small></span></div>`,
    inside: `<div class="cp-mission">울타리 안에만 별을 심어요</div><div class="cp-field"><div><i>⭐</i><i>⭐</i><i>⭐</i></div></div>`,
    targets: `<div class="cp-mission">동그라미를 하나씩 모두 깨워요</div><div class="cp-targets"><i class="awake">🌼</i><i>○</i><i>○</i><i class="awake">🌼</i><i>○</i><i>○</i></div>`,
    paint: `<div class="cp-mission">정원길 안쪽을 쓱싹 채워요</div><div class="cp-paint">${Array.from({length:18}, (_, i) => `<i class="${i < 9 ? 'painted' : ''}"></i>`).join('')}</div>`,
    resetRescue: `<div class="cp-mission">📻 토끼를 찾아요! 로봇이 고양이를 추천했어요.</div><div class="cp-choice-row"><span>🐰</span><span>↔</span><span>🤖🐱</span><span class="is-good">✋</span></div><div class="cp-arrow">멈추고 다시 확인해요 🌱</div>`,
    classroomMove: `<div class="cp-mission">📚 책상 왼쪽에 가방 놓기</div><div class="cp-choice-row"><span class="is-good">🎒</span><span>🪑</span><span>▫</span><span>→</span><span>✅</span></div><div class="cp-arrow">공간을 보고 실제 물건을 배치해요</div>`,
    festivalPlan: `<div class="cp-mission">🎪 친구들의 단서로 순서를 정해요</div><div class="cp-choice-row"><span>🌱</span><span>→</span><span>💧</span><span>→</span><span>🌸</span></div><div class="cp-arrow">순서 계획을 세워 축제 준비!</div>`,
    rulePost: `<div class="cp-mission">💨 배달 규칙이 바뀌었어요!</div><div class="cp-choice-row"><span>✉️⭐</span><span>→</span><span class="is-good">📮🟨</span><span>📮🍀</span></div><div class="cp-arrow">지금은 색깔로 배달해요</div>`,
    mirrorPond: `<div class="cp-mission">🌊 거울에 비친 그림은?</div><div class="cp-choice-row"><span>🐸</span><span>🌼</span><span>✦</span><span>🌼</span><span>🐸</span></div><div class="cp-arrow">↔ 거울연못을 건너요</div>`,
    sceneDetect: `<div class="cp-mission">🌳 숲에서 무엇이 바뀌었을까요?</div><div class="cp-choice-row"><span>🌳</span><span>🐰</span><span>→</span><span>🌳</span><span class="is-good">🐱</span></div><div class="cp-arrow">👀 단서를 기억해요</div>`,
    slowScan: `<div class="cp-mission">🌼 꽃을 빠뜨리지 않고 찾아요</div><div class="cp-choice-row"><span>🍃</span><span class="is-good">🌼</span><span>🌱</span><span class="is-good">🌼</span><span>🪨</span></div>`,
    slowPlace: `<div class="cp-mission">같은 위치에 꽃을 심어요</div><div class="cp-choice-row"><span>🌼</span><span>▫</span><span>▫</span><span>→</span><span class="is-good">🌼</span></div>`,
    slowBlock: `<div class="cp-mission">같은 블록 모양의 정원을 만들어요</div><div class="cp-choice-row"><span>🧱</span><span>🧱</span><span>→</span><span class="is-good">🧱</span><span>🧱</span></div>`,
    slowName: `<div class="cp-mission">보고 생각한 뒤 말해요</div><div class="cp-choice-row"><span>🐰</span><span>🐶</span><span>🐱</span></div>`,
    slowMemory: `<div class="cp-mission">어느 칸에 꽃이 피었을까요?</div><div class="cp-sequence"><i>🌼</i><i>▫</i><i>🌸</i><i>▫</i></div><div class="cp-arrow">잠깐 기억해요 ↓</div><div class="cp-slots"><i>?</i><i>?</i><i>?</i><i>?</i></div>`,
    slowEveryday: `<div class="cp-mission">가방에 넣을 연필을 찾아요</div><div class="cp-choice-row"><span>📖</span><span class="is-good">✏️</span><span>📏</span><span>🧽</span></div>`,
    water: `<div class="cp-mission">시든 꽃에만 물을 주세요</div><div class="cp-choice-row"><span>🌷<small>✓</small></span><span class="is-good">🥀<small>💧</small></span><span>🌻<small>✓</small></span><span class="is-good">🥀<small>💧</small></span></div>`
  };

  document.querySelectorAll('.library-card[data-open]').forEach((card) => {
    const id = card.dataset.open;
    if (!previews[id] || card.querySelector('.card-live-preview')) return;
    const preview = document.createElement('div');
    preview.className = `card-live-preview preview-${id}`;
    preview.setAttribute('aria-hidden', 'true');
    preview.innerHTML = previews[id];
    card.appendChild(preview);
    const cta = card.querySelector('strong');
    if (cta) cta.textContent = '게임 열기 →';
  });

  const applyGameChrome = () => {
    const game = document.getElementById('gameScreen');
    if (!game) return;
    const title = document.getElementById('gameTitle')?.textContent || '';
    game.dataset.gameTitle = title;
  };
  const observer = new MutationObserver(applyGameChrome);
  const gameTitle = document.getElementById('gameTitle');
  if (gameTitle) observer.observe(gameTitle, {childList:true, subtree:true, characterData:true});
  applyGameChrome();
})();