/* 해봄노트 용어별 원본 벡터 삽화 30종 — 잘라낸 이미지/래스터 스프라이트 미사용 */
(function(){
"use strict";
var ink="#49362d",stroke=' stroke="'+ink+'" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';
function R(x,y,w,h,fill,rx,extra){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(rx||10)+'" fill="'+fill+'"'+stroke+(extra?' '+extra:'')+'/>';}
function C(x,y,r,fill,extra){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'"'+(extra===false?'':stroke)+'/>';}
function E(x,y,rx,ry,fill,extra){return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'"'+(extra===false?'':stroke)+'/>';}
function P(d,fill,color,width){return '<path d="'+d+'" fill="'+(fill||'none')+'" stroke="'+(color||ink)+'" stroke-width="'+(width||4)+'" stroke-linecap="round" stroke-linejoin="round"/>';}
function L(x1,y1,x2,y2,color,width){return P('M'+x1+' '+y1+' L'+x2+' '+y2,'none',color,width);}
function F(x,y,k){k=k||1;return '<g transform="translate('+x+' '+y+') scale('+k+')"><circle cx="-9" cy="-2" r="3.4" fill="'+ink+'"/><circle cx="9" cy="-2" r="3.4" fill="'+ink+'"/><path d="M-8 8 Q0 17 8 8" fill="none" stroke="'+ink+'" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="-18" cy="7" rx="6" ry="3.5" fill="#ed9e98" opacity=".75"/><ellipse cx="18" cy="7" rx="6" ry="3.5" fill="#ed9e98" opacity=".75"/></g>';}
function B(x,y,c){return '<path d="M'+x+' '+(y-8)+' Q'+(x+7)+' '+y+' '+x+' '+(y+8)+' Q'+(x-7)+' '+y+' '+x+' '+(y-8)+'Z" fill="'+c+'" opacity=".65"/>';}
function H(x,y,s,c){return '<path d="M'+x+' '+(y-11*s)+' Q'+(x+12*s)+' '+(y-18*s)+' '+(x+17*s)+' '+(y-5*s)+' Q'+(x+24*s)+' '+(y+7*s)+' '+x+' '+(y+19*s)+' Q'+(x-24*s)+' '+(y+7*s)+' '+(x-17*s)+' '+(y-5*s)+' Q'+(x-12*s)+' '+(y-18*s)+' '+x+' '+(y-11*s)+'Z" fill="'+c+'"'+stroke+'/>';}
function star(x,y,color,size){size=size||12;return '<path d="M'+x+' '+(y-size)+' L'+(x+size*.28)+' '+(y-size*.28)+' L'+(x+size)+' '+y+' L'+(x+size*.28)+' '+(y+size*.28)+' L'+x+' '+(y+size)+' L'+(x-size*.28)+' '+(y+size*.28)+' L'+(x-size)+' '+y+' L'+(x-size*.28)+' '+(y-size*.28)+'Z" fill="'+color+'"'+stroke+'/>';}
function wave(x,y,c){return P('M'+x+' '+y+' q12 -14 24 0 t24 0', 'none',c,5);}
function note(x,y,fill){return R(x,y,86,69,fill,10)+F(x+43,y+35,.64);}
function clock(x,y){return C(x,y,29,"#e4f3fc")+C(x,y,22,"#fffdf4",false)+P('M'+x+' '+(y-14)+'v15l11 7','none',ink,4)+C(x,y,3,ink,false);}
function ear(x,y){return P('M'+(x+8)+' '+(y+55)+' C'+(x-10)+' '+(y+62)+' '+(x-10)+' '+(y+39)+' '+(x+2)+' '+(y+31)+' C'+(x+9)+' '+(y+23)+' '+(x+2)+' '+(y+7)+' '+(x-9)+' '+(y+11)+' C'+(x-31)+' '+(y+19)+' '+(x-17)+' '+(y+45)+' '+(x-28)+' '+(y+47)+' C'+(x-41)+' '+(y+55)+' '+(x-41)+' '+(y+10)+' '+(x-14)+' '+(y-3)+' C'+(x+18)+' '+(y-19)+' '+(x+37)+' '+(y+9)+' '+(x+28)+' '+(y+35)+' C'+(x+20)+' '+(y+55)+' '+(x+9)+' '+(y+43)+' '+(x+8)+' '+(y+55)+'Z',"#f7b884");}
function bubble(x,y,w,h,fill){return P('M'+(x+12)+' '+y+'h'+(w-24)+'q12 0 12 12v'+(h-26)+'q0 12-12 12h-23l-12 12 2-12h-'+(w-24-23)+'q-12 0-12-12v-'+(h-26)+'q0-12 12-12Z',fill);}
function brain(x,y){return P('M'+(x+8)+' '+(y+48)+' C'+(x-10)+' '+(y+47)+' '+(x-13)+' '+(y+28)+' '+(x+1)+' '+(y+21)+' C'+(x-2)+' '+(y+2)+' '+(x+18)+' '+(y-1)+' '+(x+25)+' '+(y+9)+' C'+(x+36)+' '+(y-2)+' '+(x+53)+' '+(y+9)+' '+(x+52)+' '+(y+20)+' C'+(x+67)+' '+(y+30)+' '+(x+58)+' '+(y+48)+' '+(x+45)+' '+(y+48)+'Z','#f4b5b5')+P('M'+(x+27)+' '+(y+12)+'v35 M'+(x+9)+' '+(y+28)+'q14-9 18 4 M'+(x+28)+' '+(y+30)+'q9-11 19-5 M'+(x+12)+' '+(y+42)+'q7-11 15-3','none','#c46c78',2.5);}
function paper(x,y){return R(x,y,58,78,"#fffdf4",8)+L(x+12,y+23,x+46,y+23,'#bd9d8d',3)+L(x+12,y+34,x+42,y+34,'#bd9d8d',3)+L(x+12,y+45,x+40,y+45,'#bd9d8d',3);}
var ids=[
"memo-working-memory","memo-short-term-memory","memo-processing-speed","memo-attention","memo-attention-types","memo-executive","memo-inhibition","memo-flexibility","memo-self-regulation","memo-memory","memo-encoding","memo-consolidation","memo-retrieval","memo-visual","memo-auditory","memo-receptive-expressive","memo-semantics","memo-morphosyntax","memo-pragmatics","memo-articulation-phonology","memo-phonological-awareness","memo-aac","memo-joint-attention","memo-generalization","memo-prompting","memo-time-delay","memo-reinforcement","memo-task-analysis","memo-visual-supports","memo-modeling"
];
var labels=["작업기억","단기기억","처리속도","주의","선택주의와 지속주의","실행기능","억제통제","인지적 유연성","자기조절","기억","부호화","공고화","인출","시각주의와 시지각","청력과 청각처리","수용언어와 표현언어","의미론","형태론과 구문론","화용언어","조음과 음운","음운인식","AAC","공동주의","일반화와 유지","촉구 · 프롬프트","시간지연","강화","과제분석","시각지원","모델링"];
var shapes=[
function(){return R(54,57,83,58,"#c6dff6",10,'transform="rotate(-12 95 86)"')+R(59,47,83,58,"#c3e6d4",10,'transform="rotate(-5 100 76)"')+R(64,37,83,58,"#f7b6c0",10)+note(72,27,"#fff0ab")+P('M171 42q32 13 11 43l-16 12','none','#4f91ca',8)+P('M166 79l-1 18 17-5','none','#4f91ca',7)+B(38,40,"#ffc760");},
function(){return note(43,38,"#ffe9a0")+clock(148,42)+L(27,44,18,33,"#f4ba4b",6)+L(36,29,32,17,"#f4ba4b",6);},
function(){return C(108,77,49,"#9ccaf5")+C(108,77,37,"#fffdf4",false)+P('M108 56v23l21-14','none',ink,5)+C(108,77,6,"#f2b2ad")+R(93,19,30,12,"#8cb1d6",4)+P('M157 91l17 14 26-38','none','#78b474',13)+P('M157 91l17 14 26-38','none',ink,3)+L(48,62,32,62,'#f69b84',5)+L(48,76,23,76,'#f69b84',5);},
function(){return P('M91 16v27q-32 12-35 43h72q-3-31-35-43V16Z',"#ffeb9e",'#ebc56b',3)+R(72,9,36,30,"#58534f",17)+C(92,95,26,"#ffde65")+F(92,96,.72)+[35,61,120,149,173].map(function(x,i){return C(x,112+(i%2?12:-8),10,"#d7d2cb");}).join('');},
function(){return C(64,77,39,'#d7e7fc')+C(64,77,25,'#fffdf6')+C(64,77,12,'#fac5be')+C(64,77,3,ink,false)+clock(156,73)+P('M91 47Q115 24 133 45','none','#74b8b0',5)+star(107,27,'#f6cc71',7);},
function(){return R(59,38,94,74,'#fffaf1',10)+R(66,89,31,27,'#beddf7',6)+R(96,76,31,40,'#bde4c8',6)+R(126,63,31,53,'#f8bbc2',6)+P('M157 63v-30l19 4-19 11','none','#ed8b93',5)+P('M78 58l7 6 10-15 M111 58l7 6 10-15','none','#79ba8b',4)+star(183,83,"#ffcc59",9);},
function(){return P('M93 122l-13-13V76q0-8 9-8q7 0 7 8V49q0-8 9-8q8 0 8 8v19-28q0-8 9-8q8 0 8 8v28-20q0-8 8-8q8 0 8 8v38q12-12 20-3q7 8-4 19l-23 24Z',"#ffd0a6")+C(59,52,22,'#ffd9d4')+P('M48 52h23','none','#e2636e',8)+L(34,20,22,9,'#ffc36e',6);},
function(){return R(35,55,52,52,'#b9dcf4',9)+C(61,81,12,'#fffaf2')+P('M135 53l25 49h-50Z','#f9c5bc')+P('M86 42q44-35 82 4','none','#73bcb1',7)+P('M154 37l14 9 4-17','none','#73bcb1',6)+P('M141 119q-46 26-90-2','none','#e6a865',7)+P('M63 109l-12 8 4-17','none','#e6a865',6);},
function(){return C(108,75,47,'#ffe6b1')+F(108,76,1.25)+H(168,46,.67,'#f5a9aa')+P('M49 44q-23 28-5 53','none','#81c6bf',7)+P('M46 44l-12 4 18 7','none','#81c6bf',5)+P('M170 109q-20 22-44 17','none','#82b9d6',6)+star(47,27,'#f6ca6d',8);},
function(){return paper(18,45)+P('M82 78h31m-10-9 10 9-10 9','none','#658fc0',5)+brain(114,37)+P('M178 79h19m-9-9 9 9-9 9','none','#658fc0',5)+R(175,96,34,29,'#ffe19b',6)+F(192,110,.36);},
function(){return paper(34,37)+P('M94 75h28m-10-10 10 10-10 10','none','#79a8ce',6)+brain(125,49)+star(170,27,'#ffd66e',9);},
function(){return P('M55 60l56-39 56 39v64H55Z','#f8e4b7')+brain(81,52)+R(113,83,29,28,"#c5e9d5",8)+P('M118 83v-10a10 10 0 0 1 20 0v10','none','#6f9f8c',4)+B(185,44,'#f4b3a6');},
function(){return brain(36,44)+P('M108 82h41m-13-12 13 12-13 12','none','#7aaacb',6)+R(154,44,42,65,'#fce5b3',6)+L(164,62,187,62,'#b89d78',3)+L(164,72,181,72,'#b89d78',3)+star(174,93,'#facb63',6);},
function(){return P('M27 78q41-55 91 0-50 55-91 0Z','#fffaf2')+C(74,78,17,'#b4dbec')+C(74,78,9,'#544238')+C(78,73,4,'#fff',false)+C(151,49,15,'#f5bec7')+P('M181 58l15 26h-30Z','#b7daf8')+R(139,92,29,29,'#c6e4c7',4)+star(202,38,"#ffd46f",7);},
function(){return ear(83,40)+P('M121 55q20 18 0 36 M137 41q35 31 0 64','none','#5d9ccb',6)+bubble(150,52,54,48,'#e4f0fa')+P('M163 75h24','none','#98a9bb',5)+B(37,36,'#ffd46a');},
function(){return ear(57,43)+P('M100 75h27m-10-9 10 9-10 9','none','#5f9ccc',5)+bubble(133,48,68,50,'#ecf3fc')+F(168,72,.50)+P('M164 122q13 9 25 0','none','#e99d86',4);},
function(){return R(22,34,67,77,"#d8e6fa",7)+L(39,54,72,54,'#8da4b5',4)+L(39,67,67,67,'#8da4b5',4)+P('M91 73h31m-10-9 10 9-10 9','none','#6d9cc7',5)+R(133,45,56,55,'#ffe8a9',12)+C(160,67,13,'#f5b5ae')+F(160,68,.37);},
function(){return R(16,61,53,42,'#bfe3d4',9)+R(83,42,53,42,'#ffdf9a',9)+R(151,61,53,42,'#bedbf6',9)+P('M70 79h13m-7-6 7 6-7 6 M136 65h15m-7-6 7 6-7 6','none','#668fad',4)+C(43,82,9,'#fffaf3')+C(110,63,9,'#fffaf3')+C(178,82,9,'#fffaf3')+star(109,21,'#f7bd75',9);},
function(){return C(57,95,25,'#f6c1a3')+C(156,95,25,'#f6c1a3')+bubble(18,27,87,51,'#e5f3fc')+bubble(116,28,87,51,'#fce2d8')+F(57,95,.59)+F(156,95,.59)+L(47,50,80,50,'#78a8c4',4)+C(148,52,4,'#766c64',false)+C(161,52,4,'#766c64',false)+C(174,52,4,'#766c64',false);},
function(){return P('M33 78q35-35 70 0-35 36-70 0Z','#ffbfae')+P('M45 78q23 20 47 0Z','#8a4a4c')+P('M49 79h37','none','#fff2e0',7)+P('M113 80h40m-11-10 11 10-11 10','none','#659ecc',6)+C(176,56,9,'#f6d0ba')+C(187,80,9,'#f2c9d3')+C(176,104,9,'#bddef5');},
function(){return ear(76,39)+P('M110 73q21-20 36 0t36 0','none','#5a94c4',6)+C(154,40,11,'#ffe1a5')+C(173,70,11,'#f9b9b8')+C(154,100,11,'#c9e9d3')+star(194,31,'#fed077',7);},
function(){return R(36,25,147,102,"#9bb9dd",13)+R(47,36,125,79,"#fffdf6",8)+R(57,47,49,28,'#ffdf9a',6)+R(114,47,49,28,'#f9b6bd',6)+R(57,81,49,26,'#c3e9c7',6)+R(114,81,49,26,'#c6def4',6)+C(81,61,8,'#fffaf2')+H(137,58,.45,'#ed6f83')+P('M72 97l9-9 9 9','none','#5da47c',3)+bubble(123,87,31,17,'#fffaf2');},
function(){return C(48,96,22,'#ffd2b4')+C(173,96,22,'#ffd2b4')+F(48,96,.48)+F(173,96,.48)+star(111,48,'#ffdb73',26)+P('M74 84l28-24 M146 84l-25-24','none','#5c98c0',5)+star(110,111,'#aee0bc',9);},
function(){return P('M29 70l43-33 43 33v51H29Z','#c4e4d2')+P('M130 67l37-31 37 31v54h-74Z','#c7def5')+R(47,84,25,37,'#f9dda4',5)+R(145,85,28,24,'#ffe9a6',5)+star(99,70,'#ffce6a',9)+P('M82 103q20-15 39 0m-9-8 9 8-9 5','none','#e69b81',5);},
function(){return P('M19 100q30-29 56-24l24-12q12-4 13 7 0 6-12 11l-14 8 28-1q10 0 9 10t-13 7l-34 5q-30 5-57-11Z','#f9c4a2')+R(133,44,66,65,'#fffdf4',9)+C(167,76,21,'#ffdca8')+F(167,78,.53)+L(40,64,54,48,'#ffd271',6);},
function(){return clock(72,74)+R(125,40,66,68,'#ffebac',10)+F(158,73,.66)+P('M108 100q11 16 22 1','none','#88b4ce',6)+star(197,28,'#ffc76c',8);},
function(){return star(102,69,'#ffd75d',51)+F(102,72,.90)+B(34,40,'#fdbf55')+B(183,42,'#fdbf55')+P('M33 115q70 25 136 0','none','#e9a5a6',6);},
function(){return R(30,88,42,36,'#bfdff9',7)+R(72,68,42,56,'#cceace',7)+R(114,48,42,76,'#ffd9a1',7)+R(156,28,30,96,'#f3b4bd',7)+P('M43 105l9 9 10-15 M83 87l9 9 10-15 M127 64l9 9 10-15','none','#6aab82',4)+star(190,26,'#ffd36a',7);},
function(){return R(27,23,75,105,'#fffef7',9)+R(41,38,23,23,'#ffdfa2',6)+R(41,70,23,23,'#bde3d7',6)+R(73,39,21,21,'#f5b1b9',6)+R(73,71,21,21,'#bdd9f0',6)+P('M112 75h24m-9-9 9 9-9 9','none','#83a8c8',5)+R(146,47,51,58,'#fff7e8',8)+F(171,75,.59)+star(171,27,'#fbd16c',8);},
function(){return C(64,65,21,'#ffd0af')+C(155,65,21,'#ffd0af')+P('M34 120q7-38 30-38t30 38Z','#b9e4cc')+P('M125 120q7-38 30-38t30 38Z','#bcd8f6')+P('M91 57h37m-10-10 10 10-10 10','none','#eda58c',6)+L(54,65,74,65,'#614638',3)+L(145,65,165,65,'#614638',3)+star(109,26,'#ffd77a',10);}
];
var bg=['#fff0df','#e4f2ff','#e5f1fd','#fff1d7','#e5f3e7','#fff1d9','#ffe6e5','#f0e8fa','#e7f4e6','#f6e7e5','#fff0d9','#e9f1df','#eff0ff','#fff2e4','#e3f0ff','#f7e8ed','#f2edff','#e4f3e7','#ffeae1','#ffefe4','#e4f0fa','#e7f0fc','#fff4df','#e8f5e7','#ffece1','#eaf0ff','#fff0e3','#e8f5ed','#eaf2fb','#eaf3e3'];
function makeSvg(index){
var circle= '<ellipse cx="113" cy="76" rx="97" ry="64" fill="'+bg[index]+'" opacity=".68"/>';
var shadow='<ellipse cx="110" cy="131" rx="79" ry="9" fill="#cfbfa8" opacity=".25"/>';
var deco= '<path d="M17 38l8 5m176 61-9-5" stroke="#f9c46d" stroke-width="5" stroke-linecap="round" fill="none"/>';
return '<svg class="glossary-art-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 154" role="img" aria-label="'+labels[index]+' 그림"><g>'+circle+shadow+deco+shapes[index]()+ '</g></svg>';
}
function init(){
var count=0;
ids.forEach(function(id,i){
  var item=document.getElementById(id);
  if(!item)return;
  var summary=item.querySelector('summary');
  var icon=summary&&summary.querySelector('.term-icon');
  if(!summary || !icon)return;
  var wrap=document.createElement('span');
  wrap.className='glossary-illustration';
  wrap.setAttribute('aria-hidden','true');
  wrap.innerHTML=makeSvg(i);
  icon.parentNode.insertBefore(wrap,icon);
  item.classList.add('has-card-art');
  count++;
});
if(count===ids.length){document.documentElement.classList.add('glossary-illustrated');}
else{console.warn('용어 삽화 연결 수가 일치하지 않습니다:',count,ids.length);}
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}
else{init();}
})();
