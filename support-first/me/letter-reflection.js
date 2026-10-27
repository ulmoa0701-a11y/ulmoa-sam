/* Locally composed reflections from explicit choices, never a personality score or diagnosis. */
(function(root){
'use strict';
const pace={
 wait:{title:'생각할 여유가 있는 대화',meaning:'대답을 고를 시간을 갖는 방식이 편하다고 했어.',warm:'말이 바로 나오지 않아도, 네 안에 할 이야기가 없는 건 아니야.',step:'다음 대화에서 “조금 생각하고 말해도 될까요?”라고 전해보기.'},
 write:{title:'내 생각을 내 방식으로 전하기',meaning:'고르거나 글로 이야기하는 방식이 편하다고 했어.',warm:'목소리로 말하지 않아도, 고른 답과 적은 말은 네 표현이야.',step:'다음에 전하고 싶은 말을 한 문장 적거나, 보기 하나를 골라 보여주기.'},
 play:{title:'함께 해보며 시작하는 이야기',meaning:'같이 무언가 하면서 대화를 시작하고 싶다고 했어.',warm:'처음부터 많은 이야기를 꺼내지 않아도 돼. 함께하는 일부터 골라도 좋아.',step:'다음 만남에서 함께 해보고 싶은 간단한 활동 하나를 제안하기.'},
 talk:{title:'말로 나누며 알아가는 나',meaning:'말로 이야기하는 방식이 편하다고 했어.',warm:'잘 정리된 문장이어야 네 이야기가 되는 건 아니야.',step:'다음 대화를 시작할 때 “먼저 이것부터 이야기하고 싶어요”라고 전해보기.'}
};
const spark={
 game:'게임이나 영상에 빠지는 시간을 편하거나 재미있는 순간으로 골랐어.',
 create:'무언가 만들거나 해보는 시간을 편하거나 재미있는 순간으로 골랐어.',
 rest:'혼자 조용히 쉬는 시간을 편한 순간으로 골랐어.',
 friend:'좋아하는 사람과 함께 있는 시간을 편한 순간으로 골랐어.'
};
const moments={
 school:{arrival:'학교에 들어가는 일이 부담스럽다면, 어떤 순간이 가장 어려운지 믿을 만한 어른과 한 장면씩 살펴봐도 좋아.',lesson:'과제를 시작하는 순간에는 설명을 다시 듣고 싶은지, 할 일을 나누고 싶은지 함께 확인해볼 수 있어.',people:'학교에서 누구와 어떤 방식으로 있을 때 조금 더 편한지 함께 찾아봐도 좋아.',expect:'기대나 평가가 신경 쓰인다는 말을 먼저 전해도 돼. 바로 해결책을 정할 필요는 없어.'},
 people:{begin:'말을 먼저 꺼내기 어렵다는 마음부터 전해도 돼. 대화를 시작하는 방식을 함께 정할 수 있어.',reply:'질문을 받을 때 바로 답해야 하는지, 기다려주면 좋은지 상대에게 알려줘도 돼.',alone:'함께 있어도 혼자인 느낌을 골랐구나. 함께 있고 싶은지, 잠깐 따로 있고 싶은지부터 살펴봐도 좋아.',trouble:'오해가 생긴 장면은 내 뜻과 상대 반응을 나누어 살펴볼 수 있어. 혼자 결론내리지 않아도 돼.'},
 mood:{wake:'아침에 어려운 점이 잠에서 깨기인지, 하루를 시작하는 부담인지 다음에 더 이야기해봐도 좋아.',start:'시작하기 어려운 순간에 무엇이 걸리는지, 함께 첫 단계 하나만 살펴봐도 좋아.',night:'밤에 떠오르는 생각이 있다면 다음에 이야기할 말 하나로 남겨봐도 좋아.',unexpected:'기분의 이름이나 이유를 바로 찾지 못해도 돼. 언제 그랬는지부터 함께 살펴볼 수 있어.'},
 day:{talk:'집에서 대화할 때 어떤 반응이 편한지, 네 말을 끝까지 들어주길 바라는지 알려줘도 돼.',plan:'해야 할 일을 시작하기 어렵다면, 누군가와 첫 단계 하나를 정해봐도 좋아.',change:'예상과 달라진 일이 있었다면, 다음에 무엇을 하면 되는지 함께 확인해봐도 좋아.',alone:'혼자 해결하기 어려운 일을 함께 확인해달라고 요청해도 돼.'}
};
function compose(records){
 const a=id=>records[id]||{};
 const p=pace[a('pace').choice];
 const selectedSpark=spark[a('spark').choice];
 const scene=moments[a('topic').choice]?.[a('moment').choice];
 const parts=[];
 if(selectedSpark)parts.push({label:'내가 편해지는 순간',text:selectedSpark+(a('spark').detail?' 특히 “'+a('spark').detail+'”를 골랐어.':'')});
 if(p)parts.push({label:'나에게 맞는 대화 조건',text:p.meaning+(a('pace').detail?' “'+a('pace').detail+'”를 원한다는 것도 함께 전할 수 있어.':'')});
 if(scene)parts.push({label:'함께 살펴볼 장면',text:scene});
 if(!parts.length)parts.push({label:'아직 남겨둔 이야기',text:'지금 고른 답만으로 너를 설명하지 않을게. 직접 적은 말이 있다면 아래에서 다시 볼 수 있어. 말하지 않은 부분은 나중에 이야기해도 돼.'});
 let step=p?.step||'다음에 이야기하고 싶은 것이 떠오르면, 단어 하나만 남겨보기.';
 if(a('wish').choice==='interest')step='좋아하는 것 하나를 떠올리고, 다음 만남에서 말하거나 보여주기.';
 if(a('wish').choice==='scene')step='다음에 함께 살펴볼 장면 하나를 고르기. 자세한 설명은 만나서 해도 돼.';
 if(a('wish').choice==='together')step='함께 해보고 싶은 게임이나 활동 하나를 다음 만남에서 제안하기.';
 if(['unsure','pass','unknown'].includes(a('wish').choice)||!a('wish').choice)step='지금은 정하지 않아도 돼. 다음에 편한 순간이 오면 다시 골라보자.';
 return {title:p?.title||(selectedSpark?'내가 편한 순간에서 시작하기':'아직 알아가는 중인 나'),parts,warm:p?.warm||(selectedSpark?'네가 편한 순간도, 어려운 순간만큼 함께 알아갈 중요한 이야기야.':'오늘 다 말하지 않아도 괜찮아. 다음 이야기는 네가 준비됐을 때 이어가자.'),step};
}
root.MoaLetterReflection={compose};
})(typeof window==='undefined'?globalThis:window);
