(()=>{
  const btn=document.querySelector('#randomSpark');
  if(!btn)return;
  const picks=[
    ()=>document.querySelector('.planet-game')?.click(),
    ()=>document.querySelector('.clock-orbit')?.click(),
    ()=>document.querySelector('.paper-memo')?.click(),
    ()=>document.querySelector('#musicPrototype')?.scrollIntoView({behavior:'smooth',block:'center'}),
    ()=>document.querySelector('.thought-bubble')?.click()
  ];
  btn.addEventListener('click',()=>picks[Math.floor(Math.random()*picks.length)]());
})();
