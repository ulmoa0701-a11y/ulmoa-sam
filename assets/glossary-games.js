/* 알아봄 · 상황으로 이해해봄
 * 교육용 가상 사례를 여러 관점에서 살펴보는 활동. 진단·평가·치료 처방 아님.
 * 보호자의 응답은 브라우저 메모리에서만 사용하며 저장·전송하지 않는다.
 * 상황/출처 데이터는 기존 알아봄 사전과 연결해 단일 원문을 재사용한다.
 */
(function(){
"use strict";
const CASES=[
  {id:"noise",scene:"distracted",level:"start",term:"memo-attention",
    ask:"소리가 날 때 멈춘 모습에서 어떤 점이 궁금하세요?",
    look:[["주변 소리","어떤 소리에서 멈췄고 조용할 때는 어떻게 참여하는지 비교해요."],["활동의 흥미","좋아하는 활동이나 익숙한 활동에서도 비슷한지 살펴봐요."],["피로와 컨디션","잠을 충분히 잤는지, 활동 시간이 길지는 않았는지도 단서가 돼요."]],
    help:[["환경을 조금 바꾸기","주변 소리를 줄인 뒤 참여가 달라지는지 살펴볼 수 있어요."],["활동을 짧게 나누기","오래 집중해야 하는 활동이라면 쉬는 시간을 사이에 둘 수 있어요."],["눈에 보이는 안내","지금 할 일 한 가지를 그림이나 말로 짧게 알려주는 방법도 있어요."]],
    follow:"언제, 어떤 소리에서, 얼마나 자주 멈추는지 구체적으로 남겨볼까요?",
    talk:"어떤 환경에서 참여가 편해지고 어려워지는지 같이 살펴보고 싶어요.",
    guard:"소리에 반응했다는 사실만으로 주의력 문제라고 할 수 없어요."},
  {id:"instructions",scene:"instructions",level:"start",term:"memo-working-memory",
    ask:"여러 지시 중 하나를 놓친 상황, 무엇을 더 알고 싶나요?",
    look:[["지시 길이","한 가지씩 말할 때와 두세 가지를 이어 말할 때를 비교해요."],["말 이해","지시에 쓰인 낱말과 표현을 정확히 이해했는지도 확인해요."],["듣는 환경","TV 소리나 다른 활동이 있었는지 함께 살펴봐요."]],
    help:[["지시를 나눠 말하기","한 번에 하나씩 전달하고 다음 단계로 이어갈 수 있어요."],["그림·순서표 보여주기","해야 할 순서를 눈에 보이게 제시할 수도 있어요."],["이해를 확인하기","다시 설명해 달라고 하기보다 무엇을 해야 하는지 행동으로 확인해볼 수 있어요."]],
    follow:"하나씩 알려주면 가능한지, 말 대신 그림을 보여주면 달라지는지 살펴봐요.",
    talk:"여러 지시 중 어떤 단계에서 놓치는지 함께 확인해보고 싶어요.",
    guard:"실행하지 않은 이유가 반드시 작업기억 때문인 것은 아니에요."},
  {id:"change",scene:"switch",level:"start",term:"memo-flexibility",
    ask:"놀이 규칙이 갑자기 바뀌었을 때, 어떤 관점이 떠오르나요?",
    look:[["변화를 미리 알았나요?","예고가 있었을 때와 갑작스러운 변화일 때의 반응을 비교해요."],["규칙을 이해했나요?","새 규칙을 알고도 어렵게 느끼는지, 규칙 자체를 모르는지도 달라요."],["감정·상황","기대하던 활동이 끝나서 속상했을 가능성도 살펴볼 수 있어요."]],
    help:[["바뀔 것을 예고하기","그림이나 짧은 말로 다음 규칙을 먼저 알릴 수 있어요."],["한 부분만 바꾸기","여러 규칙을 한꺼번에 바꾸지 않고 단계적으로 시도해 볼 수 있어요."],["감정을 인정하기","당황하거나 아쉬웠는지 먼저 확인하고 선택할 시간을 줄 수도 있어요."]],
    follow:"어떤 종류의 변경에서 특히 어려워하는지 구분해봐요.",
    talk:"변화를 미리 알려주었을 때와 갑작스러울 때 어떤 차이가 있을까요?",
    guard:"규칙을 따르기 어려운 것이 곧 고집이나 의지 부족을 뜻하지 않아요."},
  {id:"story",scene:"story",level:"start",term:"memo-narrative-discourse",
    ask:"오늘 일을 설명하다가 순서가 뒤섞였다면 어떤 점을 볼까요?",
    look:[["시간 순서","무슨 일이 먼저 일어났는지 떠올리는 데 도움이 필요한지 봐요."],["언어 표현","일은 알고 있지만 문장으로 이어 말하기 어려운지도 살펴봐요."],["이야기 상대","질문이 너무 빠르거나 길지는 않았는지도 중요해요."]],
    help:[["사진이나 그림 놓기","처음·중간·끝에 맞는 그림을 함께 배열해볼 수 있어요."],["짧게 한 가지씩 묻기","‘누가 있었어?’처럼 질문 하나로 시작해 이어갈 수 있어요."],["말할 시간 주기","답을 재촉하지 않고 떠올릴 시간을 줄 수도 있어요."]],
    follow:"그림이 있을 때와 말로만 이야기할 때 차이가 있는지 살펴봐요.",
    talk:"경험을 떠올리는 것과 이야기를 이어 말하는 것을 나눠 살펴보고 싶어요.",
    guard:"이야기를 순서대로 말하기 어려워도 경험을 이해하지 못했다는 뜻은 아니에요."},
  {id:"asking",scene:"asking",level:"start",term:"memo-aac",
    ask:"어른 손을 이끄는 행동이 보였어요. 어떤 점을 먼저 알아볼까요?",
    look:[["원하는 것","어디로 데려가려고 하는지, 무엇이 필요한지 살펴봐요."],["표현 방법","말뿐 아니라 눈길, 손짓, 그림 등 사용하는 표현도 살펴봐요."],["주변의 반응","요청했을 때 주변에서 어떻게 반응했는지도 알아볼 수 있어요."]],
    help:[["의미를 확인하고 응답","무엇이 필요한지 확인하고 가능한 범위에서 요청에 반응해요."],["선택할 표현 제공","그림, 몸짓, 말 등 이용할 수 있는 방법을 함께 마련할 수 있어요."],["익숙한 상황에서 연습","자주 필요로 하는 도움을 요청하는 경험을 반복해볼 수 있어요."]],
    follow:"같은 요청을 누구에게, 어떤 방식으로 전달하는지 살펴봐요.",
    talk:"지금 아이가 편하게 사용하는 의사소통 방법을 함께 찾고 싶어요.",
    guard:"말이 아니어도 소통일 수 있어요. 그림이나 손짓을 억지로 없앨 필요는 없어요."},
  {id:"reading",scene:"reading",level:"start",term:"memo-inferential-comprehension",
    ask:"문장을 읽지만 이야기를 설명하기 어려워요. 무엇이 궁금한가요?",
    look:[["글자 읽기","낱말과 문장을 얼마나 정확하게 읽는지 살펴봐요."],["말뜻 이해","읽은 문장을 쉽게 풀어 말하면 이해하는지 살펴봐요."],["이야기 연결","인물의 이유나 마음을 짐작하는 질문이 특히 어려운지도 구분해봐요."]],
    help:[["짧은 글부터 보기","한 문장씩 읽고 누가 무엇을 했는지 확인할 수 있어요."],["그림과 함께 읽기","이야기의 상황을 그림으로 보여줄 수도 있어요."],["답의 단서 찾아보기","질문의 답을 알려주기 전, 글에서 단서를 함께 찾을 수 있어요."]],
    follow:"글자를 읽을 때의 어려움인지 내용 이해의 어려움인지 나눠 관찰해봐요.",
    talk:"읽기 정확도와 이야기 이해 중 어디에서 도움이 필요한지 궁금해요.",
    guard:"잘 읽는 모습이 곧 모든 내용을 이해한다는 뜻도, 질문에 답하지 못했다는 것이 이해 부족의 증거도 아니에요."},
  {id:"refusal",scene:"refusal",level:"more",term:"memo-abc-observation",
    ask:"쓰기 활동 앞에서 자리를 벗어났어요. 무엇을 더 살펴볼까요?",
    look:[["과제의 특성","쓰는 양, 난이도, 도구 사용이 부담스럽지는 않았는지 봐요."],["행동 전후의 상황","활동 안내 직전과 자리를 벗어난 뒤 무슨 일이 있었는지 기록해요."],["몸 상태·감정","피로, 통증, 불안, 휴식 필요 등도 배제하지 않아요."]],
    help:[["과제량과 난이도 조정","하기 쉬운 시작 단계부터 제시해 반응을 살펴볼 수 있어요."],["도움 요청 방법 마련","어려울 때 도움이나 잠깐 쉴 시간을 요청할 방법을 알려줄 수 있어요."],["상황을 반복 관찰","언제 반복되는지 기록하고 적절한 지원은 전문가와 함께 조정할 수 있어요."]],
    follow:"발생 전·행동·발생 후를 사실대로 여러 번 적고, 평소 가능한 상황도 함께 비교해봐요.",
    talk:"쓰기 자체의 부담인지, 주변 반응이나 다른 조건과 관련 있는지 같이 살펴보고 싶어요.",
    guard:"ABC 기록 한 번만으로 행동의 기능이나 의도를 결정하지 않아요. 위험 행동은 안전 확보가 우선이에요."},
  {id:"context",scene:"context",level:"more",term:"memo-pragmatics",
    ask:"상황에 따라 말뜻을 다르게 받아들였어요. 무엇을 구분할까요?",
    look:[["표현 자체의 뜻","비유·반어를 접해본 경험이 있는지 살펴봐요."],["맥락 단서","표정, 말투, 앞뒤 이야기를 함께 제공했을 때 달라지는지 봐요."],["이해 확인 방식","‘무슨 뜻이야?’라는 질문이 어려운 건 아닌지도 생각해봐요."]],
    help:[["상황 두 개 비교","같은 말을 다른 장면에서 사용해 보며 뜻을 비교할 수 있어요."],["말을 직접적으로 바꾸기","중요한 안내라면 오해하기 쉬운 표현을 피할 수 있어요."],["표정·그림 곁들이기","말투와 상황을 그림으로 함께 알려볼 수 있어요."]],
    follow:"어떤 말과 어떤 상황에서 어려움이 반복되는지 예시를 적어봐요.",
    talk:"말의 뜻을 모르는지, 상황에 따라 달라지는 의미가 어려운지 함께 보고 싶어요.",
    guard:"한 가지 농담을 이해하지 못했다고 특정 언어·사회성 문제로 단정할 수 없어요."},
  {id:"planning",scene:"planning",level:"more",term:"memo-planning-organization",
    ask:"준비물은 꺼냈지만 시작하지 못해요. 어디를 더 볼까요?",
    look:[["첫 단계가 분명한가요?","무엇부터 해야 할지 알고 있는지 확인해요."],["활동 요구가 적절한가요?","너무 어렵거나 긴 과제는 아닌지 살펴봐요."],["시작할 환경·시간","방해 자극이 많거나 충분한 준비 시간이 없는지도 봐요."]],
    help:[["첫 단계만 보여주기","‘첫 줄 쓰기’처럼 바로 시작할 수 있는 한 가지를 제시해볼 수 있어요."],["순서표 활용","해야 할 일을 눈에 보이는 몇 단계로 나눌 수 있어요."],["시작 전 확인하기","준비물과 목표를 함께 확인하고 필요한 시간을 줄 수 있어요."]],
    follow:"시작 전, 하는 중, 마무리 중 언제 가장 자주 멈추는지 봐요.",
    talk:"계획과 실행 중 어느 부분에서 막히는지 함께 확인하고 싶어요.",
    guard:"시작하지 못하는 것이 곧 게으름이나 의지가 부족하다는 뜻은 아니에요."},
  {id:"express",scene:"express",level:"more",term:"memo-aac",
    ask:"그림을 가리키며 물을 요청했어요. 어떤 점을 알아볼까요?",
    look:[["의사소통 의도","언제 그림을 사용하는지, 무엇을 전하려는지 살펴봐요."],["이해·선택의 편안함","그림 위치나 수가 현재 사용하기 적절한지 봐요."],["상대의 반응","그림으로 요청했을 때 상대가 알아듣고 반응하는지 봐요."]],
    help:[["요청에 반응하기","그림으로 전달한 뜻을 인정하고 적절히 반응할 수 있어요."],["필요한 그림을 정리하기","자주 쓰는 것을 손쉽게 찾을 수 있도록 배치할 수 있어요."],["다양한 소통 인정","말·그림·몸짓을 상황에 맞게 함께 사용할 수 있어요."]],
    follow:"필요할 때 스스로 표현하는지, 여러 사람과 상황에서 사용하는지 살펴봐요.",
    talk:"지금 가장 편하게 사용하는 의사소통 수단을 함께 살펴보고 싶어요.",
    guard:"AAC가 반드시 발화를 줄인다는 근거는 없으며 개인의 요구에 맞춘 지원이 중요해요."},
  {id:"recall",scene:"recall",level:"more",term:"memo-retrieval",
    ask:"첫 글자 힌트가 있으면 단어를 떠올려요. 무엇이 궁금한가요?",
    look:[["힌트의 효과","첫 글자·그림·선택지 중 무엇이 도움이 되는지 살펴봐요."],["처음 배울 때의 모습","배우는 단계에서 이해하고 반복할 기회가 있었는지 봐요."],["기억을 떠올리는 시간","기다렸을 때 스스로 답을 찾는 경우도 있는지 봐요."]],
    help:[["떠올릴 시간 주기","답을 바로 알려주기보다 잠깐 생각할 여유를 줄 수 있어요."],["단서 조금씩 제공","글자나 그림 등 필요한 정도의 단서를 줄 수 있어요."],["시간 간격 두고 다시 보기","배운 내용을 다른 날 다시 떠올리는 기회를 만들 수 있어요."]],
    follow:"단서가 있을 때와 없을 때, 시간이 지난 뒤 어떤 차이가 있는지 살펴봐요.",
    talk:"기억하는 과정과 다시 떠올리는 과정을 나누어 살펴보고 싶어요.",
    guard:"답이 바로 떠오르지 않았다고 전혀 배우지 못했다는 뜻은 아니에요."},
  {id:"access",scene:"access",level:"more",term:"memo-udl",
    ask:"말보다 그림이 있을 때 순서를 잘 따라요. 어떤 점이 중요할까요?",
    look:[["정보를 제시한 방법","말만 들었을 때와 그림을 함께 봤을 때 무엇이 다른지 비교해요."],["과제의 단계 수","순서가 여러 개라 기억할 부담이 큰 건 아닌지 봐요."],["스스로 참여한 정도","그림을 보는 것에서 실제 행동까지 연결되는지 살펴봐요."]],
    help:[["그림·말 함께 제시","같은 목표를 다양한 방법으로 안내할 수 있어요."],["단계를 나눠 보여주기","복잡한 순서를 한눈에 볼 수 있게 정리할 수 있어요."],["선호·필요 확인","그림이 누구에게나 답이라는 전제 없이 개인별로 맞춰볼 수 있어요."]],
    follow:"어떤 목표에서 어떤 안내 방식이 특히 도움이 되는지 살펴봐요.",
    talk:"목표는 그대로 두고 안내 방법을 바꾸면 참여가 어떻게 달라질까요?",
    guard:"시각 자료가 도움 된다는 사실만으로 청각처리 문제나 특정 장애를 추정할 수 없어요."}
];
/* 모든 발견과 반응은 이 사이트에서 만든 가상 이야기의 추가 장면이다.
   실제 아이의 행동이나 지원 효과를 예측하는 근거가 아니다. */
const STORY_BRANCHES={
 noise:{clues:[
  "이 가상 장면에서 TV 소리를 끄자 아이가 그림으로 다시 시선을 돌렸어요.",
  "좋아하는 만들기에서도 갑자기 문이 닫히는 소리가 나면 손을 멈췄어요.",
  "같은 그림 활동도 늦은 오후에는 조용할 때 자주 멈췄어요."
 ],outcomes:[
  "주변 소리를 줄인 뒤 다시 그리기 시작했지만, 잠시 후에는 다른 소리에도 반응했어요.",
  "그림 그리는 시간을 짧게 나눴더니 다음 활동까지 이어갔지만, 소리에 대한 반응은 남아 있었어요.",
  "한 가지씩 그림으로 안내하니 다음 행동을 시작했어요. 다만 소리가 왜 방해됐는지는 알 수 없었어요."
 ]},
 instructions:{clues:[
  "‘가방 놓아줘’라고 한 가지만 말했을 때는 곧바로 행동했어요.",
  "‘손 씻기’라는 말을 물었더니 뜻은 알지만 다음 순서를 말하기 어려워했어요.",
  "TV가 켜진 상태에서는 같은 짧은 지시도 여러 번 물어봤어요."
 ],outcomes:[
  "한 번에 한 가지를 말하자 이어서 해냈지만, 길어진 지시에서는 다시 한 단계를 놓쳤어요.",
  "그림으로 순서를 보여주니 다음 행동을 확인했어요. 혼자서도 계속 사용할지는 더 살펴봐야 해요.",
  "실제로 무엇을 해야 하는지 보여달라고 하니 첫 단계는 이해했지만 두 번째에서는 망설였어요."
 ]},
 change:{clues:[
  "바뀔 규칙을 1분 전 알려주자 이전보다 차분하게 참여했어요.",
  "새 규칙을 그림으로 설명하자 이해했지만 여전히 원래 놀이를 하고 싶어했어요.",
  "가장 좋아하던 차례가 끝나는 순간에 특히 속상해했어요."
 ],outcomes:[
  "미리 알려주니 새 규칙을 잠시 시도했지만, 예상보다 빨리 변경되면 다시 당황했어요.",
  "규칙을 한 가지만 바꾸자 시작할 수 있었어요. 다른 변화를 받아들이는지는 알 수 없어요.",
  "속상함을 들어주자 마음을 표현했어요. 이후 어떤 선택이 편했는지는 더 확인해봐야 해요."
 ]},
 story:{clues:[
  "사진을 보여주니 먼저 일어난 일을 가리킬 수 있었어요.",
  "사건을 그림으로 고를 수는 있지만 문장으로 이어 말할 때 멈췄어요.",
  "짧은 질문에는 답했지만 질문을 여러 개 이어 하면 말이 짧아졌어요."
 ],outcomes:[
  "사진 세 장으로 순서를 정하자 사건을 짚었어요. 문장 설명은 여전히 도움이 필요했어요.",
  "한 가지 질문부터 시작하니 짧게 답했지만 긴 이야기는 이어지지 않았어요.",
  "충분히 기다리자 다음 문장을 말했어요. 모든 상황에서 기다림만으로 충분하진 않을 수 있어요."
 ]},
 asking:{clues:[
  "손을 잡고 물통 앞으로 가서 뚜껑을 가리켰어요.",
  "원하는 것을 그림으로 고를 때도 있었고 손짓을 쓸 때도 있었어요.",
  "어른이 손짓을 알아듣고 도와주자 같은 방법으로 다시 요청했어요."
 ],outcomes:[
  "손짓의 뜻을 확인하고 반응하니 물통을 가리키며 다시 요청했어요.",
  "그림과 손짓을 함께 두니 이번에는 그림을 택했지만 다른 때에는 손짓을 썼어요.",
  "익숙한 도움 요청 상황에서는 스스로 그림을 골랐어요. 다른 장소에서의 사용은 확인이 필요해요."
 ]},
 reading:{clues:[
  "글자를 읽을 때 몇 낱말을 빠뜨렸어요.",
  "같은 내용을 쉬운 말로 들었을 때 등장인물은 정확히 알려줬어요.",
  "‘누가?’에는 답했지만 ‘왜?’라는 질문에는 장면을 다시 봐야 했어요."
 ],outcomes:[
  "한 문장을 나누어 읽자 누가 나오는지는 설명했지만 이유는 여전히 어려워했어요.",
  "그림을 보며 사건을 짚으니 순서는 떠올렸지만 글 내용의 숨은 뜻은 더 확인해야 했어요.",
  "문장 속 단서를 함께 찾자 이유를 추측했어요. 단서를 혼자 찾는지는 아직 알 수 없어요."
 ]},
 refusal:{clues:[
  "쓰기 양이 적고 쉬운 날에는 활동을 시작했어요.",
  "‘두 줄 쓰기’라고 안내한 직후 자리를 벗어난 날이 있었고, 돌아온 뒤에는 활동이 끝났어요.",
  "손이 아프다고 말한 날에도 같은 모습이 있었어요."
 ],outcomes:[
  "첫 글자만 써보자고 하니 시작했지만 긴 글쓰기에서는 다시 멈췄어요.",
  "도움 요청 그림을 준비하자 이번에는 그림을 보여줬어요. 자리 이탈이 줄어들지는 더 살펴봐야 해요.",
  "며칠의 상황을 나눠 적자 과제 길이와 피로 여부가 달랐어요. 행동 이유가 하나로 확정되진 않았어요."
 ]},
 context:{clues:[
  "표정과 말투를 함께 보자 농담임을 알아차린 장면도 있었어요.",
  "같은 문장을 실제와 다른 뜻으로 쓴 경험은 별로 없다고 했어요.",
  "‘무슨 뜻이야?’라고 물으면 침묵했지만 보기 두 개를 주면 고를 수 있었어요."
 ],outcomes:[
  "다른 장면 두 개에서 같은 말을 들으니 뜻이 달라질 수 있음을 알아차렸어요.",
  "중요한 안내를 직접적으로 말하자 바로 행동했지만 농담을 이해하는 문제와는 별개였어요.",
  "말투 그림을 함께 보자 한 장면을 해석했지만 새로운 상황에도 적용할지는 알 수 없었어요."
 ]},
 planning:{clues:[
  "‘첫 줄 쓰기’라고 알려주면 시작할 수 있었어요.",
  "문제 세 개는 할 수 있지만 열 개를 한 번에 보면 시작을 미뤘어요.",
  "주변에서 다른 활동이 진행되면 무엇을 할지 다시 물었어요."
 ],outcomes:[
  "첫 단계를 보여주니 시작했어요. 이어서 순서를 정하는 것은 다시 도움이 필요했어요.",
  "순서표를 보며 두 단계를 마쳤지만 긴 활동 전체를 혼자 하지는 못했어요.",
  "준비물과 목표를 함께 확인하자 시작했어요. 다음 날에도 같은지는 더 살펴봐야 해요."
 ]},
 express:{clues:[
  "물이 필요할 때 물 그림을 직접 찾아 눌렀어요.",
  "그림이 너무 많을 때는 원하는 그림을 찾는 데 시간이 걸렸어요.",
  "그림을 보여줬을 때 어른이 바로 이해한 경우와 놓친 경우가 있었어요."
 ],outcomes:[
  "그림 요청에 바로 반응하자 같은 그림을 다시 활용했어요. 말 사용 변화는 이 장면만으로 알 수 없어요.",
  "자주 쓰는 그림을 앞쪽에 두니 더 빨리 선택했지만 새로운 그림은 아직 찾기 어려워했어요.",
  "말과 그림 중 편한 방법을 고르게 하니 이번에는 그림을 택했어요. 다른 때는 달라질 수 있어요."
 ]},
 recall:{clues:[
  "첫 글자를 말해주니 그 단어를 금방 떠올렸어요.",
  "처음 배울 때 뜻을 설명할 수 있었지만 한참 후에는 망설였어요.",
  "대답을 재촉하지 않고 잠시 기다리면 스스로 말하는 경우가 있었어요."
 ],outcomes:[
  "생각할 시간을 주자 단어를 떠올렸지만 모든 단어에서 같지는 않았어요.",
  "첫 글자 단서를 주자 답했어요. 다른 단서 없이도 떠올릴지는 더 살펴봐야 해요.",
  "다음 날 다시 떠올려 보니 일부는 기억했고 일부는 힌트가 필요했어요."
 ]},
 access:{clues:[
  "말로만 알려줄 때는 순서를 두 번 물었고 그림이 있을 때는 한 번 보고 시작했어요.",
  "그림으로 보여줘도 단계가 많아지면 중간에 멈췄어요.",
  "원하는 그림을 고를 수 있었지만 모든 그림을 이해하는 것은 아니었어요."
 ],outcomes:[
  "말과 그림을 함께 보여주자 첫 단계를 시작했지만 긴 활동에서 다시 순서를 놓쳤어요.",
  "복잡한 일을 작은 단계로 나누니 다음 단계를 스스로 찾아봤어요. 도움의 양은 다시 조정해야 해요.",
  "선호하는 그림을 골라 안내하니 참여했어요. 그림이 항상 최선의 방법이라는 뜻은 아니에요."
 ]}
};

const MODE={
 observe:{title:"모아의 단서 찾기",tag:"단서 찾기",desc:"궁금한 단서를 열어보고, 상황을 새롭게 이해해봐요.",icon:"🔎"},
 support:{title:"모아의 도움 실험실",tag:"방법 실험",desc:"새로 발견한 단서를 바탕으로 도움 방법을 비교해봐요.",icon:"🌱"}
};
const LEVEL={start:"익숙한 장면 3개",more:"조금 더 생각할 장면 3개"};
function el(tag,cls,value){const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;}
function shuffle(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const k=Math.floor(Math.random()*(i+1));[b[i],b[k]]=[b[k],b[i]];}return b;}
function mount({host,byId,situations,openTerm}){
 if(!host)return null;
 const scenarioById=new Map(situations.map(s=>[s.id,s]));
 for(const c of CASES){
   const branch=STORY_BRANCHES[c.id];
   if(!scenarioById.has(c.scene)||!byId.has(c.term)||!branch||branch.clues.length!==3||branch.outcomes.length!==3||c.look.length!==3||c.help.length!==3)throw Error("상황 이야기 내용 누락: "+c.id);
 }
 let round=null;
 const previousByMode=new Map();
 const button=(str,cls,action)=>{const b=el("button",cls,str);b.type="button";b.addEventListener("click",action);return b;};
 const heading=str=>{const h=el("h3","gcat-game-title",str);h.tabIndex=-1;return h;};
 const focusHeading=()=>host.querySelector(".gcat-game-title")?.focus({preventScroll:true});
 const stage=name=>{host.dataset.gameStage=name;host.dataset.gameMode=round?round.mode:"hub";host.replaceChildren();};
 function hub(){
   round=null;stage("hub");
   const intro=el("div","gcat-game-hub-intro");
   intro.append(heading("모아와 함께 이야기를 살펴봐요"),el("p",null,"이번에는 직접 단서를 찾아보세요. 알게 된 정보에 따라 생각도 달라질 수 있어요."));
   const deck=el("div","gcat-game-deck");
   for(const mode of ["observe","support"]){
     const m=MODE[mode],card=el("article","gcat-game-mode-card");card.dataset.learningMode=mode;
     card.append(el("span","gcat-game-mode-icon",m.icon+" "+m.tag),el("h4",null,m.title),el("p",null,m.desc));
     const controls=el("div","gcat-game-mode-actions");
     for(const level of ["start","more"]){
       const b=button(LEVEL[level],"gcat-game-start"+(level==="more"?" secondary":""),()=>begin(mode,level));
       b.dataset.gameStart=mode;b.dataset.level=level;controls.append(b);
     }
     card.append(controls);deck.append(card);
   }
   host.append(intro,deck,el("p","gcat-game-note","이야기·단서·반응은 모두 가상으로 만든 예시예요. 실제 아이의 행동 원인이나 지원 효과를 예측하지 않으며, 진단이나 처방을 대신하지 않습니다. 답을 맞히거나 점수를 매기지 않고, 이용 내용도 저장·전송하지 않아요."));
 }
 function begin(mode,level){
   const key=mode+":"+level, pool=CASES.filter(c=>c.level===level),prev=previousByMode.get(key)||[];
   const items=shuffle(pool.filter(c=>!prev.includes(c.id))).concat(shuffle(pool.filter(c=>prev.includes(c.id)))).slice(0,3);
   previousByMode.set(key,items.map(x=>x.id));
   round={mode,level,items,pos:0,phase:mode==="observe"?"clues":"supports",opened:[],justOpened:0,selectedHelp:null,tried:[],memo:[],order:new Map()};
   render();focusHeading();
 }
 function current(){
   const c=round.items[round.pos];
   return {c,scene:scenarioById.get(c.scene),extra:STORY_BRANCHES[c.id]};
 }
 function resetCase(){
   round.phase=round.mode==="observe"?"clues":"supports";
   round.opened=[];round.justOpened=0;round.selectedHelp=null;round.tried=[];
 }
 function commonHeader(){
   const m=MODE[round.mode],{scene}=current();
   const status=el("div","gcat-game-progress");
   status.append(el("span",null,m.title+" · "+(round.level==="start"?"익숙한 장면":"더 생각하기")),el("strong",null,(round.pos+1)+" / "+round.items.length));
   host.append(status);
   const bar=el("div","gcat-game-progress-bar"),fill=el("span");
   fill.style.width=((round.pos+1)/round.items.length*100)+"%";bar.append(fill);host.append(bar);
   const question=el("section","gcat-game-question");
   question.dataset.gameQuestion=current().c.id;
   question.append(el("span","gcat-game-kicker","가상의 생활 장면"),el("p","gcat-game-scene",scene.title+" — "+scene.scene));
   return question;
 }
 function helperNote(text){
   return el("p","gcat-game-hint",text);
 }
 function clueButtons(card){
   const {c}=current(),grid=el("div","gcat-game-choices");
   const remaining=[0,1,2].filter(i=>!round.opened.includes(i));
   if(!round.order.has(c.id))round.order.set(c.id,shuffle([0,1,2]));
   for(const idx of round.order.get(c.id).filter(i=>remaining.includes(i))){
     const b=button("","gcat-game-choice",()=>uncover(idx));
     b.dataset.clueIndex=String(idx);
     b.append(el("span","gcat-game-choice-number","?"),el("span","gcat-game-choice-text",c.look[idx][0]));
     grid.append(b);
   }
   card.append(grid);
 }
 function uncover(idx){
   if(!round||round.opened.includes(idx)||round.opened.length>=2)return;
   round.opened.push(idx);round.justOpened=idx;round.phase="evidence";render();host.querySelector(".gcat-game-evidence")?.focus({preventScroll:true});
 }
 function clueQuestion(){
   const card=commonHeader(),{c}=current();
   card.append(heading(c.ask),helperNote("궁금한 것을 누르면 이 가상 이야기의 새로운 단서가 열려요."));
   clueButtons(card);
   if(round.mode==="support"){
     card.append(button("지금 단서로 도움 방법 비교하기 →","gcat-game-secondary",()=>{round.phase="supports";render();focusHeading();}));
   }
   host.append(card);
 }
 function evidence(){
   const card=commonHeader(),{c,extra}=current(),idx=round.justOpened;
   card.append(heading("새로운 단서를 발견했어요!"));
   const discovery=el("section","gcat-game-evidence");
   discovery.tabIndex=-1;discovery.setAttribute("role","status");
   discovery.append(el("span","gcat-game-evidence-label","발견한 단서 · "+c.look[idx][0]),el("p",null,extra.clues[idx]));
   card.append(discovery,el("p","gcat-game-interpret",c.look[idx][1]));
   const footer=el("div","gcat-game-flow-actions");
   if(round.opened.length<2){
     footer.append(button("다른 단서도 확인하기","gcat-game-secondary",()=>{round.phase="clues";render();focusHeading();}));
   }
   footer.append(button("이제 도움 방법 생각하기 →","gcat-game-next",()=>{round.phase="supports";render();focusHeading();}));
   card.append(footer);host.append(card);
 }
 function supportList(card){
   const {c}=current(),list=el("div","gcat-game-choices");
   if(!round.order.has(c.id+":supports"))round.order.set(c.id+":supports",shuffle([0,1,2]));
   for(const idx of round.order.get(c.id+":supports")){
     const [label,meaning]=c.help[idx];
     const b=button("","gcat-game-choice",()=>tryHelp(idx));
     b.dataset.supportIndex=String(idx);
     b.append(el("span","gcat-game-choice-number","→"),el("span","gcat-game-choice-text",label),el("span","gcat-game-choice-minor",meaning));
     if(round.tried.includes(idx))b.classList.add("gcat-game-already-tried");
     list.append(b);
   }
   card.append(list);
 }
 function supportQuestion(){
   const card=commonHeader(),{c,extra}=current();
   card.append(heading("어떤 도움을 먼저 시도해볼까요?"));
   const fact=el("section","gcat-game-known-clues");
   fact.append(el("strong",null,round.opened.length?"찾아본 단서":"시작할 때 알 수 있는 추가 단서"));
   const used=round.opened.length?round.opened:[0];
   for(const i of used)fact.append(el("p",null,extra.clues[i]));
   card.append(fact,helperNote("방법마다 살펴볼 점이 달라요. 선택한 뒤 가상 이야기의 다음 장면을 비교해봐요."));
   supportList(card);
   const footer=el("div","gcat-game-flow-actions");
   if(round.opened.length<2){
     footer.append(button("먼저 다른 단서 찾아보기","gcat-game-secondary",()=>{round.phase="clues";render();focusHeading();}));
   }
   card.append(footer);host.append(card);
 }
 function tryHelp(idx){
   if(!round)return;
   round.selectedHelp=idx;
   if(!round.tried.includes(idx))round.tried.push(idx);
   round.phase="outcome";render();host.querySelector(".gcat-game-outcome")?.focus({preventScroll:true});
 }
 function outcome(){
   const card=commonHeader(),{c,extra,scene}=current(),idx=round.selectedHelp;
   card.append(heading("방법을 골랐더니, 이야기가 이어졌어요"));
   const result=el("section","gcat-game-outcome");result.tabIndex=-1;result.setAttribute("role","status");
   result.append(el("span","gcat-game-evidence-label","내가 선택한 방법 · "+c.help[idx][0]),
     el("p",null,extra.outcomes[idx]));
   card.append(result);
   const lesson=el("div","gcat-game-takeaway");
   lesson.append(el("strong",null,"이 장면에서 새로 생각해볼 점"),el("p",null,c.help[idx][1]),
     el("p","gcat-game-caution",c.guard),
     el("span","gcat-game-disclaimer-inline","위 반응은 만든 이야기예요. 실제로 이렇게 된다는 뜻이 아니며, 아이의 반응을 직접 관찰해야 해요."));
   card.append(lesson);
   if(round.tried.length>1){
     const compare=el("div","gcat-game-perspectives");
     compare.append(el("strong","gcat-game-compare-title","선택해본 방법 비교"));
     for(const k of round.tried){
       const item=el("div","gcat-game-perspective");
       item.append(el("strong",null,c.help[k][0]),el("p",null,extra.outcomes[k]));compare.append(item);
     }
     card.append(compare);
   }
   const footer=el("div","gcat-game-flow-actions");
   if(round.tried.length<2){
     footer.append(button("다른 방법도 비교하기","gcat-game-secondary",()=>{round.phase="supports";render();focusHeading();}));
   }
   footer.append(button(round.pos===round.items.length-1?"함께 정리하기 →":"다음 장면으로 →","gcat-game-next",advance));
   card.append(footer);
   const more=el("details","gcat-game-reference");
   more.append(el("summary",null,"관련 개념·참고자료는 궁금할 때만 보기"));
   const links=el("div","gcat-game-reference-links");
   const ref=button("관련 용어·그림 살펴보기 ↗","gcat-game-ref",()=>openTerm(c.term,ref));
   ref.dataset.gameTermId=c.term;links.append(ref);
   if(scene.source?.[1]){
     const link=el("a","gcat-game-source",scene.source[0]+" ↗");link.href=scene.source[1];
     link.target="_blank";link.rel="noopener noreferrer";links.append(link);
   }
   more.append(links);card.append(more);host.append(card);
 }
 function advance(){
   if(!round||round.phase!=="outcome")return;
   const {c,extra}=current();
   round.memo.push({title:scenarioById.get(c.scene).title,clue:extra.clues[round.opened[0]??0],help:c.help[round.selectedHelp][0],question:c.follow,talk:c.talk});
   round.pos++;
   if(round.pos>=round.items.length){done();return;}
   resetCase();render();focusHeading();
 }
 function done(){
   stage("done");
   const block=el("section","gcat-game-done");
   block.append(el("span","gcat-game-kicker","모아의 탐색 노트"),
      heading("단서가 늘어나니 생각도 달라졌나요?"),
      el("p","gcat-game-score",round.items.length+"가지 가상 장면을 함께 살펴봤어요."),
      el("p","gcat-game-remark","정답이나 점수는 없어요. 기억할 만한 관찰 질문을 남겨볼까요?"));
   const recaps=el("div","gcat-game-recap");
   for(const x of round.memo){
     const item=el("div","gcat-game-recap-row");
     item.append(el("strong",null,x.title),el("p",null,"찾아본 단서: "+x.clue),
       el("p",null,"생각해본 도움: "+x.help),el("p",null,"나중에 확인할 점: "+x.question));
     recaps.append(item);
   }
   block.append(recaps);
   const actions=el("div","gcat-game-finish-actions");
   const {mode,level}=round;
   const replay=button("새로운 장면 3개 만나기","gcat-game-next",()=>begin(mode,level));
   replay.dataset.gameReplay="true";actions.append(replay);
   actions.append(button("다른 활동 고르기","gcat-game-secondary",()=>{hub();focusHeading();}));
   block.append(actions);host.append(block);focusHeading();
 }
 function render(){
   if(round===null){hub();return;}
   stage(round.phase);
   if(round.phase==="clues")clueQuestion();
   else if(round.phase==="evidence")evidence();
   else if(round.phase==="supports")supportQuestion();
   else if(round.phase==="outcome")outcome();
 }
 hub();
 return {reset:hub};
}
window.HabomGlossaryGames={mount,counts:{cases:CASES.length,activities:CASES.length*2}};
})();