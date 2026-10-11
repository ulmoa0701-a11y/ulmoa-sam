(() => {
'use strict';
const regions={
 frontal:{name:'전두엽',skills:'계획 · 집중 · 조절',icon:'💡',color:'#f1e3ff',
 summary:'계획을 세우고 주의를 조절하며 상황에 맞게 행동을 바꾸는 일에 여러 뇌 영역과 함께 관여해요.',
 example:'해야 할 일의 순서를 정하거나 하고 싶은 행동을 잠깐 멈추려고 노력할 때'},
 parietal:{name:'두정엽',skills:'공간 · 감각 · 수개념',icon:'✋',color:'#fff2cf',
 summary:'몸에서 오는 감각을 통합하고 물체와 공간의 위치를 파악하는 과정에 중요한 역할을 해요.',
 example:'퍼즐 조각의 위치를 맞추고, 몸과 물건이 어디에 있는지 살펴볼 때'},
 temporal:{name:'측두엽',skills:'언어 · 듣기 · 기억',icon:'💬',color:'#e0f6e6',
 summary:'소리를 처리하고 말의 뜻을 이해하는 일에 관여해요. 측두엽 안쪽의 해마는 새로운 사건 기억 형성에 중요해요.',
 example:'친구의 이야기를 듣고 뜻을 이해하거나 어제 있었던 일을 기억할 때'},
 occipital:{name:'후두엽',skills:'보기 · 시각처리',icon:'👁️',color:'#ffede5',
 summary:'눈으로 들어온 글자·그림의 선과 모양 같은 시각 정보를 초기 단계에서 분석해요.',
 example:'그림의 특징을 보고 글자의 모양을 구별할 때. 뜻을 이해하려면 다른 영역도 필요해요.'},
 cerebellum:{name:'소뇌',skills:'균형 · 움직임',icon:'🏃',color:'#e6f2ff',
 summary:'몸의 균형과 움직임의 정확도, 타이밍을 맞추는 과정에 중요한 역할을 해요.',
 example:'공을 잡으려고 팔을 뻗거나 걸을 때 몸의 균형을 유지할 때'},
 brainstem:{name:'뇌줄기',skills:'호흡 · 깨어있기',icon:'💗',color:'#f0edf7',
 summary:'호흡과 심장박동, 깨어 있는 상태처럼 생명 유지의 기본 기능에 중요한 역할을 해요.',
 example:'우리가 특별히 생각하지 않아도 숨을 쉬고 몸의 기본 상태를 유지할 때'}
};

const controls=[...document.querySelectorAll('[data-region]')];
const $=id=>document.getElementById(id);
const required=['detailName','detailSkills','detailSummary','detailExample','detailIcon','detailBanner'];
if(required.some(id=>!$(id)))return;
function selectRegion(key,fromUser=false){
  const region=regions[key];
  if(!region)return;
  $('detailName').textContent=region.name;
  $('detailSkills').textContent=region.skills;
  $('detailSummary').textContent=region.summary;
  $('detailExample').textContent=region.example;
  $('detailIcon').textContent=region.icon;
  $('detailBanner').style.backgroundColor=region.color;
  controls.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.region===key)));
  if(fromUser && window.matchMedia('(max-width:1060px)').matches){
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('brainExplainTitle').scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
  }
}
controls.forEach(button=>button.addEventListener('click',()=>selectRegion(button.dataset.region,true)));
selectRegion('frontal');
})();