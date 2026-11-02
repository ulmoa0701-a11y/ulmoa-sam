const menuButton=document.querySelector('.menu-toggle');
const menu=document.querySelector('.menu-panel');

function setMenu(open){
  menuButton.classList.toggle('open',open);
  menu.classList.toggle('open',open);
  menuButton.setAttribute('aria-expanded',String(open));
  menuButton.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');
  menu.setAttribute('aria-hidden',String(!open));
  menu.inert=!open;
  document.body.style.overflow=open?'hidden':'';
}

menuButton?.addEventListener('click',()=>setMenu(!menu.classList.contains('open')));
menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));

const observer=new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  });
},{threshold:.14,rootMargin:'0px 0px -5% 0px'});

document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

function addRipple(e){
  const target=e.currentTarget;
  const rect=target.getBoundingClientRect();
  const ink=document.createElement('span');
  ink.className='ripple-ink';
  ink.style.left=`${e.clientX-rect.left}px`;
  ink.style.top=`${e.clientY-rect.top}px`;
  target.appendChild(ink);
  setTimeout(()=>ink.remove(),650);
}

document.querySelectorAll('.ripple-target').forEach(el=>el.addEventListener('pointerdown',addRipple));

let ticking=false;
window.addEventListener('scroll',()=>{
  if(ticking) return;
  ticking=true;
  requestAnimationFrame(()=>{
    const y=Math.min(window.scrollY,700);
    document.documentElement.style.setProperty('--scroll-shift',`${y*.035}px`);
    ticking=false;
  });
},{passive:true});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && menu?.classList.contains('open')){
    setMenu(false);
    menuButton?.focus();
  }
});

// Anchor navigation: move keyboard focus to the destination without changing scroll behavior.
document.querySelectorAll('a[href^="#"]').forEach(link=>{
  link.addEventListener('click',()=>{
    const id=decodeURIComponent(link.hash.slice(1));
    const target=id?document.getElementById(id):null;
    if(!target)return;
    if(menu?.classList.contains('open'))setMenu(false);
    requestAnimationFrame(()=>{
      if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
      target.focus({preventScroll:true});
    });
  });
});

// Keep keyboard navigation inside the open full-screen menu.
document.addEventListener('keydown',event=>{
  if(event.key!=='Tab'||!menu?.classList.contains('open'))return;
  const links=[...menu.querySelectorAll('a[href]')];
  const last=links.at(-1);
  if(!last)return;
  if(event.shiftKey&&document.activeElement===menuButton){
    event.preventDefault();last.focus();
  }else if(!event.shiftKey&&document.activeElement===last){
    event.preventDefault();menuButton.focus();
  }
});
