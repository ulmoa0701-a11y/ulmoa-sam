(()=>{
  const btn=document.querySelector('#shuffleBtn');
  if(!btn)return;
  const targets=[...document.querySelectorAll('[data-random-target]')];
  btn.addEventListener('click',()=>{
    if(!targets.length)return;
    const pick=targets[Math.floor(Math.random()*targets.length)];
    if(pick.matches('a')){pick.click();return;}
    pick.click();
  });
})();