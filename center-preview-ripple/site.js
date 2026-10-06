const menuButton=document.querySelector('.menu-toggle');
const menu=document.querySelector('.menu-panel');

function setMenu(open){
  menuButton.classList.toggle('open',open);
  menu.classList.toggle('open',open);
  menuButton.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-hidden',String(!open));
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
