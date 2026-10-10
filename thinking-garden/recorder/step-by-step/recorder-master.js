(()=>{'use strict';
const FRONT='https://upload.wikimedia.org/wikipedia/commons/f/f7/Soprano-recorder.jpg';
const BACK='https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Recorder_underside_annotated.JPG/960px-Recorder_underside_annotated.JPG';
const lessons=[
 {name:'검지',hole:'앞면 1번 구멍',title:'입구 아래 맨 위 구멍',text:'왼손 검지를 올리는 자리야.',y:445,gift:'🌱',zoom:'32 359 153 270'},
 {name:'중지',hole:'앞면 2번 구멍',title:'맨 위 구멍의 바로 아래',text:'검지는 그대로! 그 아래에 중지를 놓아봐.',y:508,gift:'🌷',zoom:'32 420 153 270'},
 {name:'약지',hole:'앞면 3번 구멍',title:'두 번째 구멍 바로 아래',text:'검지와 중지는 그대로 두고 약지를 놓아봐.',y:565,gift:'🌼',zoom:'32 475 153 270'},
 {name:'엄지',hole:'뒷면 엄지 구멍',title:'리코더 뒤쪽 구멍',text:'내 리코더를 뒤집어서 엄지 구멍을 찾아봐.',y:null,gift:'🌻',zoom:null}
];
const $=id=>document.getElementById(id);let step=0,complete=new Set(),attempted=new Set();
function lesson(i){step=i;const l=lessons[i],rear=i===3;
 document.querySelectorAll('[data-step]').forEach(b=>{let n=Number(b.dataset.step);b.classList.toggle('active',n===i);b.classList.toggle('done',complete.has(n));b.setAttribute('aria-current',n===i?'step':'false')});
 $('photoLabel').textContent=rear?'앞면 사진 · 뒷구멍은 보이지 않아요':'실제 소프라노 리코더 · 앞면';
 $('wholeImage').setAttribute('href',FRONT);$('wholeMark').setAttribute('visibility',rear?'hidden':'visible');$('wholeMark').setAttribute('y',String(rear?445:l.y-23));
 $('zoomImage').setAttribute('href',FRONT);$('zoomSvg').setAttribute('viewBox',l.zoom||'32 359 153 270');$('zoomMark').setAttribute('y',String(rear?422:l.y-23));
 $('zoomSvg').hidden=rear;$('backPhoto').hidden=!rear;
 $('zoomTitle').textContent=rear?'실제 뒷면 참고':'같은 사진, 구멍 확대';
 $('targetLabel').textContent=l.hole+' = 왼손 '+l.name+' 자리';
 $('levelLabel').textContent=(i+1)+' / 4 작은 미션';$('gift').textContent=l.gift;
 $('instruction').textContent=l.title;$('description').textContent=l.text;
 $('actionPrompt').textContent=rear?'🎵 내 리코더를 뒤집어서 같은 위치 찾아봐!':'🎵 내 리코더에서도 같은 구멍 찾아봐!';
 $('tried').disabled=false;$('notYet').disabled=false;
 $('feedback').textContent='진짜 리코더를 잡고 천천히 찾아봐.';
 $('next').hidden=true;$('next').textContent=i===3?'처음부터 다시 →':'다음 손가락 →';
}
function answer(did){if(did)attempted.add(step);complete.add(step);
 $('feedback').textContent=did?'멋져! 진짜 리코더에 손을 올려봤네.':'괜찮아! 같은 자리를 다시 봐도 좋아.';
 $('next').hidden=false;$('tried').disabled=true;$('notYet').disabled=true;
}
function next(){if(step===3){complete.clear();attempted.clear();lesson(0)}else lesson(step+1);}
document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>lesson(Number(b.dataset.step))));
$('tried').addEventListener('click',()=>answer(true));$('notYet').addEventListener('click',()=>answer(false));$('next').addEventListener('click',next);
const whole=$('wholeImage'),zoom=$('zoomImage');let warning=false;
function onImageError(){if(warning)return;warning=true;const box=document.createElement('p');box.className='photo-error';box.textContent='실제 사진을 불러오지 못했어요. 아래 사진 출처 링크로 원본을 확인할 수 있어요.';$('wholeWrap').appendChild(box);}
whole.addEventListener('error',onImageError);zoom.addEventListener('error',onImageError);
$('backImage').setAttribute('src',BACK);lesson(0);
})();