/* 부위 선택 — 외부 의존성, 개인정보 저장, 서버 요청 없음 */
(() => {
  'use strict';
  const regions = {
    frontal: {
      position:'01 · 이마 뒤쪽',
      title:'전두엽',
      summary:'계획을 세우고, 주의를 조절하고, 상황에 따라 행동을 바꾸는 일에 중요하게 관여해요.',
      example:'“먼저 양치하고 가방을 챙기자”처럼 여러 일을 순서대로 처리하거나, 하고 싶은 행동을 잠깐 멈출 때 여러 뇌 영역과 함께 작동해요.',
      caution:'계획을 놓치거나 충동적으로 행동한다고 해서 전두엽이 손상됐다는 뜻은 아니에요. 발달 단계, 수면, 정서, 지시 이해와 상황도 함께 살펴야 합니다.'
    },
    parietal: {
      position:'02 · 머리 위쪽',
      title:'두정엽',
      summary:'몸에서 오는 감각을 받아들이고, 공간과 위치를 파악하는 일에 중요한 역할을 해요.',
      example:'몸이 어디에 있는지 느끼거나, 물체 사이의 위치를 살피고 수량을 다룰 때 여러 영역과 협력해요.',
      caution:'좌우를 헷갈리거나 숫자를 어려워하는 행동만으로 두정엽 이상을 알 수는 없어요. 여러 능력과 경험이 함께 관여합니다.'
    },
    temporal: {
      position:'03 · 귀 주변',
      title:'측두엽',
      summary:'소리를 처리하고 말소리를 이해하는 과정, 새로운 경험을 기억하는 과정에 관여해요.',
      example:'친구 이야기를 듣고 뜻을 파악하거나 어제 있었던 일을 떠올릴 때 관여해요. 특히 측두엽 안쪽의 해마는 새로운 사건 기억을 형성하는 데 중요해요.',
      caution:'말을 다시 물어보거나 지시를 잊는 이유는 듣기, 언어 이해, 주의, 기억 등 다양할 수 있어요. 한 부위의 문제로 단정하지 않습니다.'
    },
    occipital: {
      position:'04 · 뒤통수 쪽',
      title:'후두엽',
      summary:'눈에서 들어온 시각 정보를 초기 단계에서 분석하는 데 중요한 역할을 해요.',
      example:'글자와 그림의 선·방향·형태를 보는 데 관련돼요. 그것이 무엇인지 알아보고 뜻을 읽는 과정에는 다른 영역도 함께 필요해요.',
      caution:'글자를 자꾸 헷갈리는 이유가 모두 후두엽 때문은 아니에요. 시력, 시각주의, 글자 학습 경험, 언어 등도 관련될 수 있습니다.'
    },
    cerebellum: {
      position:'05 · 뇌 뒤쪽 아래',
      title:'소뇌',
      summary:'몸의 균형을 잡고 움직임의 정확도와 타이밍을 맞추는 데 중요한 역할을 해요.',
      example:'걷는 동안 균형을 조절하고, 공을 잡으려고 팔을 움직이거나 작은 물건을 조작할 때 움직임을 세밀하게 맞춰요.',
      caution:'공을 잘 못 잡거나 글씨를 천천히 쓴다고 바로 소뇌의 문제는 아니에요. 연습 경험, 감각, 계획과 근력 등도 영향을 줍니다.'
    },
    brainstem: {
      position:'06 · 뇌의 아래쪽',
      title:'뇌줄기',
      summary:'호흡·심장박동 같은 기본적인 생명 유지와 잠에서 깨어 있는 상태의 조절에 중요해요.',
      example:'우리가 의식적으로 생각하지 않아도 숨을 쉬고 몸의 기본 상태를 유지하도록 돕는 중요한 통로예요.',
      caution:'피곤해 보이거나 집중이 잘 안 된다고 뇌줄기 문제라고 해석할 수는 없어요. 이 그림은 뇌의 위치와 역할을 이해하기 위한 자료입니다.'
    }
  };
  function init() {
    const buttons = Array.from(document.querySelectorAll('.region-choice[data-region]'));
    const map = document.getElementById('brainMap');
    if (!map || buttons.length !== 6) return;
    const shapes = Array.from(map.querySelectorAll('[data-brain-region]'));
    const position = document.getElementById('detailPosition');
    const title = document.getElementById('detailTitle');
    const summary = document.getElementById('detailSummary');
    const example = document.getElementById('detailExample');
    const caution = document.getElementById('detailCaution');
    if (![position,title,summary,example,caution].every(Boolean)) return;
    const select = (id) => {
      const item = regions[id];
      if (!item) return;
      position.textContent = item.position;
      title.textContent = item.title;
      summary.textContent = item.summary;
      example.textContent = item.example;
      caution.textContent = item.caution;
      buttons.forEach((button) => {
        const selected = button.dataset.region === id;
        button.classList.toggle('active',selected);
        button.setAttribute('aria-pressed',String(selected));
      });
      shapes.forEach((shape) => {
        if (shape.dataset.brainRegion === id) {
          shape.setAttribute('data-active','true');
          shape.setAttribute('aria-pressed','true');
        } else {
          shape.removeAttribute('data-active');
          shape.setAttribute('aria-pressed','false');
        }
      });
    };
    buttons.forEach((button)=>button.addEventListener('click',()=>select(button.dataset.region)));
    shapes.forEach((shape)=>{
      shape.addEventListener('click',()=>select(shape.dataset.brainRegion));
      shape.addEventListener('keydown',(event)=>{
        if(event.key === 'Enter' || event.key === ' '){
          event.preventDefault();
          select(shape.dataset.brainRegion);
        }
      });
    });
    select('frontal');
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
