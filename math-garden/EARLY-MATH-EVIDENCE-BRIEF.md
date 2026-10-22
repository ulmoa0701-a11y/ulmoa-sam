# 초기수학 교수법 근거 자료 조사 (Early-Math Instruction Evidence Brief)

**범위와 한계 먼저 밝힙니다.** 이 조사는 WebSearch로 얻은 요약 정보를 기반으로 했습니다(이 세션에서 원문 PDF를 직접 열어보는 WebFetch 도구가 네트워크 오류로 전혀 작동하지 않았습니다 — ies.ed.gov, dera.ioe.ac.uk, dash.harvard.edu, en.wikipedia.org 등 모든 도메인에서 동일한 DNS 오류가 발생했습니다). 따라서 아래 내용은 검색 엔진이 생성한 문서 요약에 의존하며, 일부 세부 수치나 정확한 문구는 원문 재확인이 필요합니다. 원문 확인이 필요한 부분은 각 항목에 표시했습니다.

**이 보고서가 증명하지 않는 것**: 이 보고서는 "모아의 숫자 숲" 게임 자체의 학습 효과를 증명하지 않습니다. 아래 원칙들은 인쇄물·교구·소그룹 교수 등 다양한 맥락에서 연구된 것이며, 이를 디지털 게임에 어떻게 반영할지는 설계 추론(design inference)이지 검증된 사실이 아닙니다. 두 가지를 섞지 않도록 각 절에서 "근거 있음 / 설계 아이디어 수준 / 미해결"을 구분합니다.

## 한눈에 보기

- **일대일 대응·기수성·subitizing(순간 수량 인식)**은 초기수학의 핵심 토대로, IES WWC(2013)와 Clements & Sarama의 학습궤적(Learning Trajectories) 연구 양쪽에서 가장 먼저 다뤄야 할 내용으로 꼽힙니다.
- **구체물(조작 가능한 교구) 사용**은 EEF(2020)와 WWC(2021) 모두에서 권고하지만, "디지털 교구가 실물 교구만큼 효과적인가"는 혼재된 결과이며 특히 발달장애 아동에게는 개인차가 큽니다.
- **명시적 교수(explicit instruction)는 비계획적 발견학습(unassisted discovery)보다 평균적으로 낫다**는 것이 가장 강한 메타분석 근거 중 하나입니다(Alfieri et al., 2011). 다만 "안내된" 발견학습(스캐폴딩·피드백 포함)은 오히려 더 나은 결과를 보이기도 합니다 — 즉 "직접교수 vs 발견학습"이 아니라 "비계 있는 교수 vs 비계 없는 방치"가 진짜 구분선입니다.
- **시간 제한 활동(timed activities)은 WWC(2021) 자체 권고안에 들어있지만 논쟁적입니다.** 같은 WWC 가이드 안에서도 비판이 있고, Boaler 등은 수학 불안과의 연관성을 주장하며, Math Learning Center 같은 기관은 명시적으로 반대합니다. 디지털 게임의 "자동 진행 타이머"에 그대로 적용하기엔 근거가 약합니다 — 아래 §6에서 상세히 다룹니다.
- **독립 수행(independent mastery) 판정 기준**은 교육 연구보다 응용행동분석(ABA) 실무에서 더 구체적으로 다뤄지며, "80% 정확도 × 3회 연속"이 가장 흔히 보고되는 기준입니다. 공식적인 "표준"은 없습니다.
- **일반화(generalization)는 자동으로 일어나지 않습니다** — 다양한 예시(multiple exemplars)로 직접 가르쳐야 전이가 늘어난다는 것이 ABA 연구의 일관된 결론이며, 이는 사용자의 "다른 그림에서도 해결하기" 설계와 정확히 일치합니다.

---

## ① 수량 이해 (Quantity Understanding)

**근거 있음 (강함):**
- **일대일 대응, 안정된 수세기 순서, 기수성(cardinality)**은 IES WWC "Teaching Math to Young Children" (Frye, Baroody, Burchinal, Carver, Jordan, McDowell; 2013)의 권고 1 "발달적 순서에 따라 수와 연산을 가르치라"의 핵심 내용입니다. 구체적 행동 지침: 작은 집합을 순간적으로 인식(subitize)하게 하고, 수세기를 연습시키고, 집합의 크기를 비교하게 하고, 숫자를 사용해 집합을 수량화하게 한 다음에야 간단한 연산으로 넘어가라고 명시합니다. (출처: [ies.ed.gov WWC 2013 practice guide](https://ies.ed.gov/ncee/wwc/Docs/PracticeGuide/wwc_empg_112513.epub); 요약: [SC Dept of Education PDF](https://www.ed.sc.gov/sites/scdoe/assets/File/instruction/early-learning-literacy/5%20Evidence-Based%20Recommendations%20for%20Teaching%20Math%20to%20Young%20Children(1).pdf))
- **Subitizing과 기수성의 관계**: Clements & Sarama의 학습궤적 연구는 subitizing(특히 "conceptual subitizing" — 작은 그룹으로 쪼개서 빠르게 세는 능력)이 기수성 이해와 이후의 연산·수감각 발달의 기반이 된다고 설명합니다. 이 궤적 접근은 수백 명의 교사·수천 명의 학생을 대상으로 한 종단연구와 무작위 통제 실험(RCT)에서 궤적을 따른 교수가 더 나은 학습 성과를 보였다고 보고됩니다. (출처: Clements & Sarama, *Learning and Teaching Early Math: The Learning Trajectories Approach*, 3rd ed., Routledge 2020; [Wikipedia 요약](https://en.wikipedia.org/wiki/Douglas_Clements) — 원문 접근 실패로 2차 출처only)
- **"세고 나서 다시 세는" 현상**: 아동이 정확히 수를 셌어도 "몇 개야?"라고 물으면 다시 세는 경우가 있는데, 이는 기수성 이해가 아직 "형성 중"임을 보여주는 신호로 연구에서 다뤄집니다. 한 번에 하나씩 공개하며 세게 하는 활동이 제안됩니다.

**설계 아이디어 수준 (근거는 약하지만 합리적):**
- **"크기·색·배열과 수량 분리하기" (수 보존 개념, conservation of number)**: Piaget의 원 실험은 4~5세 아동이 배열이 바뀌면 수량이 변했다고 착각한다고 보고했지만, 이후 연구(Mehler & Bever 등, 1960년대 후반)는 더 어린 2~3세 아동이 오히려 과제를 "성공"했다는 상반된 결과를 냈고, 이후 연구자들은 Piaget의 **과제 설계 자체**(질문 방식, 성인이 직접 배열을 바꾸는 것)가 아동의 답을 왜곡시켰을 가능성을 지적합니다 — 실험자 대신 곰 인형이 배열을 바꾸면 아동이 "수량이 같다"고 더 잘 답했다는 보고도 있습니다. **결론: "겉모습이 달라져도 수량은 같다"는 개념 자체는 가르칠 가치가 있지만, 정확히 몇 살에 어떻게 가르쳐야 하는지에 대한 현대적 합의는 이 조사에서 확인하지 못했습니다.** 사용자의 "모험 D: 변신하는 숫자 숲" 아이디어는 방향은 맞지만, "크기·배열이 수량 판단에 미치는 영향도 교육적으로 고려해야 한다"고 사용자 스스로 적은 부분이 정확히 이 지점의 미묘함입니다.

**미확인/추가 조사 필요:**
- Subitizing 자체의 원 실험 논문(이 조사에서 1차 문헌 접근 실패)과 "몇 개까지 순간 인식 가능한가"(통상 4개 이하로 알려짐)의 정확한 연령별 수치는 원문 확인이 필요합니다.

---

## ② 숫자-수량 연결 (Connecting Numerals and Quantity)

**근거 있음:**
- **구체물 ↔ 그림/점 배열 ↔ 손가락 ↔ 숫자의 다중 표상 연결**은 WWC(2021) 권고 3 "표상(Representations)"의 핵심이며, EEF(2020) 권고 3 "조작 교구와 표상을 활용해 이해를 구축하라"와도 일치합니다. EEF는 보드게임(예: 뱀과 사다리 게임)이 특히 수 이해 발달에 유용하다고 명시적으로 언급합니다. (출처: [EEF 권고 요약](https://greatermanchester-ca.gov.uk/media/4105/eef_maths_ey_ks1_guidance_report.pdf), [EEF 뉴스 발표](https://educationendowmentfoundation.org.uk/news/storybooks-and-board-games-can-boost-early-maths-skills-new-eef-guidance/))
- **0의 의미**: 2021년 연구(PMC8353124, Frontiers in Psychology)에 따르면 취학 전 아동은 "빈 집합으로 연산하기"는 양수 집합 연산과 비슷한 시기에 — 때로는 기수성 원리를 완전히 습득하기도 전에 — 할 수 있지만, **"0이 숫자다"라는 것을 받아들이는 것은 훨씬 어렵습니다.** 아동은 수를 "집합 안의 사물의 속성"으로 이해하는 경향이 있어서, 빈 집합(사물이 없음)은 수가 아니라고 느낀다는 가설이 제시됩니다. 5~6세에서도 숫자 '0'을 다른 작은 숫자들처럼 상징적으로는 처리하지만, 다른 숫자들 사이에서 0의 위치(서열)를 이해하는 데는 여전히 어려움을 보입니다. (Zamarian, Granà, Semenza, Girelli 연구 — 이탈리아, [rivisteweb.it](https://rivisteweb.it/doi/10.1421/24630)) 영국의 과제-인터뷰 연구(Sheffield Hallam, [shura.shu.ac.uk/19432](https://shura.shu.ac.uk/19432/))는 3~5세 아동이 빈 집합(empty set)에 대해 놀랄 만큼 다양하고 예측불가능한 반응을 보인다고 보고합니다.
- **"같은 수량을 여러 형태로 인식하기"**는 WWC(2013) 권고 1의 행동지침(숫자로 수량화하기 전에 세기·비교·순간인식을 먼저 연습)과 직접 연결됩니다.

**설계 아이디어 수준:**
- 0 개념은 연구 기반 자체가 "아직 작다"고 2021년 논문이 스스로 인정합니다(상징적 0에 대한 정량적 연구가 단 2건뿐이라고 명시). 게임에 0 개념을 넣을 때 "빈 바구니"처럼 조작적으로 경험하게 하는 것은 합리적이지만, "0이 작은 수들 사이 서열 어디에 있는지" 같은 더 추상적인 부분은 더 어린 연령에서는 신중하게 접근해야 합니다.

---

## ③ 연산의 기초 (Foundations of Operations)

**근거 있음:**
- **부분-전체 관계, 수 분해/합성, 5·10 프레임**: Van de Walle 등이 제안한 10-프레임(ten-frame) 접근은 "10과의 관계로 수를 자동으로 생각하게" 만드는 것이 목표이며, 유치원~초1 초반에는 5-프레임을 먼저 1주 정도 다루고 10-프레임으로 넘어가는 순서가 권장됩니다. 다만 이 조사에서 찾은 자료는 대부분 **교수법 실무 자료(NRICH 등)이지 통제된 실험 연구가 아닙니다** — "효과가 있다"는 통제 실험 근거는 확인하지 못했고, 교육 현장의 광범위한 합의(consensus practice) 수준으로 분류해야 합니다. (출처: [NRICH: Ten-ness of Ten](https://nrich.maths.org/content/id/10738/))
- **WWC(2021) 권고 2 "수학적 언어"와 권고 4 "수직선(Number Line)"**: 수직선을 활용해 수의 크기·순서·연산을 시각화하는 것이 권고안에 명시적으로 포함되어 있습니다. (원문 상세 미확인 — 요약 목록에서만 확인됨)

**미해결/논쟁:**
- **합치기·덜어내기(덧셈/뺄셈 기초)를 구체물 조작으로 먼저 경험시킨 뒤 상징(숫자식)으로 넘어가는 순서**는 WWC(2013) 권고 1에 명시되어 있고 광범위하게 지지되지만, 정확히 "몇 번의 구체물 경험 후 상징으로 넘어가야 하는가"는 아동별 편차가 크다는 것이 일관된 지적입니다.

---

## ④ 학습 중재 (Instructional Methods)

**근거 있음 (가장 강한 근거):**
- **명시적 교수(explicit instruction) vs 비계획적 발견학습**: Alfieri, Brooks, Aldrich & Tenenbaum (2011, *Journal of Educational Psychology*)의 메타분석(164개 연구, 580개 비교)은 **대부분의 조건에서 명시적 교수가 비계획적(순수) 발견학습보다 우수하다**는 결과를 보였습니다(효과크기 d=-0.38, 명시적 교수 쪽이 유리). 그러나 두 번째 메타분석(360개 비교)에서는 **"강화된/안내된" 발견학습(스캐폴딩·피드백·예시 포함)이 다른 교수법보다 오히려 더 나았습니다**(d=0.30). 결론: "그냥 알아서 탐색하게 두는 것"은 효과가 없지만, 피드백·예시·스캐폴딩·설명 유도가 포함된 "안내된" 학습은 효과적입니다. 이는 사용자의 "학습지가 아니라 게임처럼, 그러나 아무 설명 없이 방치하지는 않는" 방향과 정확히 일치합니다. (출처: [Alfieri et al. 2011 PDF](https://www.fisme.science.uu.nl/publicaties/literatuur/2011_alfieri_discovery_learning.pdf))
- **명시적 시범(모델링) → 안내된 연습 → 독립 수행**의 3단계 구조는 WWC(2021) 권고 1 "체계적 교수(Systematic Instruction)"의 핵심이며, 사용자가 이미 코드에 구현한 demo→guided→probe/practice/transfer 구조와 본질적으로 일치합니다.
- **촉진(prompt)의 점진적 소거(fading)**는 일반 교육 문헌보다 응용행동분석(ABA)/특수교육 문헌에서 더 구체적으로 다뤄지며, "I do, We do, You do" 모델이 가장 널리 쓰이는 틀입니다. 다만 2018년 발표 자료 하나는 "이 모델을 초기수학에 기계적으로(명시적 I-We-You 3단계를 모든 개념마다 적용) 적용하는 것은 초기수학 교수의 최선 실천과 맞지 않을 수 있다"고 지적합니다 — 즉 구조 자체는 유효하지만 너무 경직되게 적용하면 안 된다는 경고입니다.
- **다양한 예시를 통한 일반화(generalization via multiple exemplars)**: ABA 연구(자폐 범주성 장애 아동 대상)는 일관되게 **"한 가지 예시로만 연습하면 전이가 거의 일어나지 않고, 최소 2~3가지 이상의 다른 예시로 연습해야 전이가 늘어난다"**고 보고합니다. 2024년 한 연구(3~6세 ASD 아동 대상)는 "3개 예시 기준이 1개 예시 기준보다 더 많은 일반화를 가져왔지만, 두 조건 모두에서 일반화 자체는 제한적이었다"고 밝혀 — **일반화는 저절로 일어나지 않으며 명시적으로 설계해야 한다**는 것이 핵심 메시지입니다. 이는 사용자의 "다른 동물·다른 과일로 같은 개념을 다시 확인하기(transfer)" 설계를 직접 뒷받침합니다.
- **오류 수정**은 WWC(2021) 권고안 전반에 걸쳐 체계적 교수의 일부로 다뤄지며, "틀렸을 때 즉각적이고 구체적인 피드백을 주고 다시 시도하게 하라"는 원칙이 일관됩니다.

**설계 아이디어 수준:**
- **분산 연습(spaced/distributed practice)의 효과는 소규모 연구에서 일관되게 긍정적이지만("한 번에 몰아서" 연습보다 나음), 아동 대상 연구는 적습니다.** Rea & Modigliani(1985)의 초등 3학년 대상 연구는 분산 연습 조건이 즉시 테스트에서 70% vs 53%(몰아서 연습) 성취를 보였다고 보고하지만, 이는 1985년의 단일 소규모 실험입니다. 더 최근 연구(Petersen-Brown 등)는 "분산 연습이 몰아서 하는 것보다 낫다"는 것은 확인했지만 "고정 간격 vs 점점 넓어지는 간격" 중 어느 것이 더 나은지는 차이가 없었다고 보고합니다. **게임이 "오늘 한 번에 다 풀게" 하지 않고 여러 날에 걸쳐 짧게 반복 방문하도록 설계하는 것은 이 근거와 방향이 맞지만, 정확한 간격·빈도에 대한 강한 근거는 없습니다.**
- **구체물(교구) 효과의 디지털 전이**: 이 질문(§6)은 아래에서 별도로 다룹니다.

---

## ⑤ 디지털 게임·터치스크린 관련 특이사항

이 부분은 사용자의 특정 질문(디지터 게임, 발달 지연/언어·주의집중 어려움 아동)에 더 직접적으로 관련된 내용입니다.

- **가상(디지털) 교구 vs 실물 교구**: 혼재된 결과입니다. ASD 아동 대상 연구들에서 어떤 아동은 앱 기반(가상) 교구를 더 효율적으로 쓰고, 어떤 아동은 실물 교구를 더 잘 쓰는 등 **개인차가 크다**는 것이 일관된 보고입니다. 한 연구는 지적·발달 장애 아동에게 가상·실물 교구 모두 2단계 덧셈/뺄셈 문제에서 독립성을 높이는 데 도움이 됐지만, **교구 없이 전략을 일반화하는 데는 여전히 어려움을 겪었다**고 보고합니다 — 즉 "교구를 붙잡고 있는 동안은 잘 하지만, 교구를 떼면 어려워한다"는 흔한 문제가 디지털이든 실물이든 동일하게 나타날 수 있습니다.
- **정형 발달 아동 대상 소규모 연구(64명, 13일)**는 완전 디지털 게임 vs "디지털로 증강된 실물 블록" vs 통제군을 비교했을 때 **"손에 잡히는(tangible) 교구"가 수학 능력에 긍정적 영향을 줬다**고 결론지었습니다 — 디지털 단독보다 실물/혼합이 나을 수 있다는 시사점이지만, 이 역시 소규모 단일 연구이고 발달 지연 아동을 포함하지 않았습니다.
- **발달 지연/자폐 아동 대상 태블릿 중재**: 소규모 연구들에서 긍정적 결과가 보고되지만 표본이 매우 작습니다(3명 단위 단일사례 연구 등).
- **결론**: "디지털 게임이 실물 교구만큼 효과적이다"라고 단정할 근거는 약합니다. 다만 "디지털 게임이 전혀 효과가 없다"는 근거도 없습니다. 현실적 시사점은 **디지털 게임 안에서도 "조작감"(실제로 손으로 옮기는 듯한 느낌, 즉각적 시각 피드백)을 최대한 살리고, 가능하다면 게임 밖에서 같은 개념을 실물로 다시 경험할 기회(가정에서 보호자와 함께 블록 세기 등)를 안내 자료로 제공하는 것**이 근거와 방향이 맞습니다. 이는 이미 사용자의 1절 목표("가정에서도 혼자 또는 보호자와 함께")와 맞닿아 있습니다.

---

## ⑥ 직접적인 설계 질문에 대한 답변: 독립 수행 판정 기준 & 시간 압박/자동 진행

사용자의 게임 코드에는 현재 두 가지 실제 설계 쟁점이 있습니다: (1) "도움받은 성공"과 "독립적 성공"을 어떻게 구분할지, (2) 다른 AI 작업자(Codex)가 추가한 "성공 후 1.8~2.5초 뒤 자동으로 다음 장면으로 넘어가는" 타이머가 적절한지. 아래에서 근거를 바탕으로 직접 답합니다.

### (1) 독립 수행 판정 기준

- 일반 교육 연구 문헌에는 "정확히 몇 번 연속 정답이어야 독립 수행으로 인정하는가"에 대한 공식 표준이 없습니다. 이 질문은 오히려 **응용행동분석(ABA)/특수교육 실무**에서 더 구체적으로 다뤄지며, **가장 흔히 보고되는 기준은 "80% 정확도를 3회 연속 세션에서 달성"**입니다(BCBA 대상 설문 기반). 더 높은 기준(90%)을 쓴 연구는 더 나은 "유지(maintenance)" 성과를 보였다는 보고도 있습니다.
- **일반화 기준도 중요합니다**: 한 가지 자극/예시로만 통과하면 "false positive"(실제로는 습득 못 했는데 통과로 오판)가 발생할 수 있다는 연구가 있습니다(목표 수준 숙달 기준에서 20%가 과대 선택/오판). **즉, 단일 과제에서 한 번 맞혔다고 "독립적으로 이해했다"고 판정하는 것은 연구 근거상 위험합니다** — 최소 2~3개의 다른 예시(다른 동물, 다른 수량)에서 반복 확인하는 것이 안전합니다.
- **사용자의 기존 설계(코드의 `assess()` 함수 — probe/transfer 중 "도움 없이, 첫 시도에, 힌트 없이" 성공한 것만 clean으로 집계하고, clean이 2개 이상 + transfer 성공 시에만 "기준 충족"으로 판정)는 이 연구 방향과 합리적으로 일치합니다.** 다만 "정확히 2개"라는 숫자 자체가 연구에서 직접 도출된 것은 아니며(제가 찾은 자료 범위에서는), ABA 관행의 "80%/3회 연속"과 비교하면 더 느슨한 편입니다. 아동 수가 적다는 점과 "짧고 자주" 원칙을 고려하면 현재 기준이 실용적으로 합리적이라고 판단되지만, 이는 설계 추론이지 연구가 "2개면 충분하다"고 말한 것은 아님을 명확히 해야 합니다.

### (2) 시간 압박 / 자동 진행 타이머

**결론: 근거가 약하고 논쟁적이므로, 채택하지 않는 것이 더 안전한 선택입니다.**

- WWC(2021) 자체 권고안에는 "Timed Activities"(시간 제한 활동)가 6번째 권고로 포함되어 있어, 완전히 "근거 없음"이라고 할 수는 없습니다. 하지만:
  - 같은 가이드 내에서도 평가가 엇갈리며, Math Learning Center 같은 기관은 명시적으로 이 권고에 반대 입장을 냅니다 — "시간 제한 활동은 특히 수학에 어려움을 겪거나 기억에 어려움이 있는 학생들에게 불안을 유발한다"는 것이 반대 근거입니다.
  - Boaler(스탠퍼드)는 1·2학년 150명 대상 연구에서 1학년부터 수학 불안이 나타나며 이는 학년·읽기 수준·가정 소득과 무관하다고 보고하고, 뇌영상 연구(7~9세 46명)에서는 수학에 불안을 느끼는 아동이 공포 관련 뇌 영역의 활동이 더 높았다고 보고합니다. **다만 이 연구들은 "수학 불안이 존재한다"는 것을 보여줄 뿐, "시간 제한 활동이 그 불안의 원인이다"라는 인과관계를 직접 증명하지는 않습니다.**
  - "Science of Math" 그룹은 시간 제한 테스트가 불안을 유발한다는 근거가 부족하다고 반박하며, 실험적으로 이 가설을 직접 검증한 연구는 단 2건뿐이고 둘 다 "유발한다"는 결론을 내지 못했다고 주장합니다.
  - **즉 이 논쟁은 양쪽 다 결정적인 실험 근거가 부족한 상태입니다.**
- **중요한 구분**: WWC(2021)의 "Timed Activities" 권고는 "정확도를 이미 갖춘 뒤 속도(유창성, fluency)를 높이기 위한 짧은 타이머 연습"에 관한 것으로, **사용자의 게임에서 Codex가 추가한 "아동이 버튼을 안 눌러도 1.8~2.5초 후 자동으로 다음 장면으로 넘어가는" 방식과는 성격이 다릅니다.** 전자는 "아동이 선택하는 연습 형식"이고, 후자는 "아동의 반응 속도와 무관하게 화면이 아동을 기다려주지 않고 넘어가는 것"입니다. 후자에 대한 직접적인 연구 근거는 이번 조사에서 찾지 못했습니다.
- **아동용 학습 앱 업계 관행**: Studycat 같은 언어학습 앱 업체는 "타이머가 아동의 인지 자원 일부를 '타이머 관리'에 뺏는다"는 이유로 타이머를 제거했다고 밝히지만, 구체적 연구를 인용하지 않아 **근거라기보다는 업계 주장(마케팅 수준)으로 취급해야 합니다.**
- **사용자 본인의 브리핑 문서**에 이미 "실수하거나 느리게 반응해도 불필요하게 불안하거나 좌절하지 않는가?"가 명시적 설계 기준으로 들어있고, 대상에 "발달이 느리거나 언어·인지·주의집중 등에 어려움이 있는 아동"이 포함되어 있습니다. 이 인구집단에서는 처리 속도 편차가 크다는 것이 특수교육 문헌의 일반적 전제이므로, **"아동이 준비되기 전에 화면이 먼저 넘어가 버리는" 설계는 근거가 뒷받침하지 않는 리스크를 추가하는 선택**이라고 판단합니다.

**권고**: 명시적 "다음으로" 버튼(아동이 직접 누름)을 유지하되, 원한다면 "충분히 기다려도 괜찮다"는 느낌을 주기 위해 매우 긴 유예 시간(예: 10초 이상) 뒤에만 부드럽게 다음으로 안내하는 정도는 고려할 수 있습니다. 하지만 2초 내외의 짧은 자동 진행은 근거상 권장하기 어렵습니다.

---

## 출처 목록 (이 조사에서 확인된 링크)

- IES WWC, *Teaching Math to Young Children* (2013) — [ies.ed.gov PDF](https://ies.ed.gov/ncee/wwc/Docs/PracticeGuide/wwc_empg_112513.epub), [요약본](https://www.ed.sc.gov/sites/scdoe/assets/File/instruction/early-learning-literacy/5%20Evidence-Based%20Recommendations%20for%20Teaching%20Math%20to%20Young%20Children(1).pdf), 권고 4/5 상세: [education.ne.gov](https://www.education.ne.gov/wp-content/uploads/2020/05/Teaching-Math-to-Young-Children-Recommendation-4.pdf)
- IES WWC, *Assisting Students Struggling with Mathematics: Intervention in the Elementary Grades* (2021, WWC2021006) — [ies.ed.gov PDF](https://ies.ed.gov/ncee/WWC/Docs/PracticeGuide/WWC2021006-Math-PG.pdf), 비판: [Math Learning Center](https://mathlearningcenter.org/blog/humanizing-intervention-opening-problem-solving-and-ending-timed-activities)
- Education Endowment Foundation, *Improving Mathematics in the Early Years and Key Stage 1* — [guidance report](https://greatermanchester-ca.gov.uk/media/4105/eef_maths_ey_ks1_guidance_report.pdf), [발표 뉴스](https://educationendowmentfoundation.org.uk/news/storybooks-and-board-games-can-boost-early-maths-skills-new-eef-guidance/)
- Clements, D. & Sarama, J., *Learning and Teaching Early Math: The Learning Trajectories Approach* (3rd ed., Routledge, 2020)
- Alfieri, L., Brooks, P.J., Aldrich, N.J., & Tenenbaum, H.R. (2011). "Does discovery-based instruction enhance learning?" *Journal of Educational Psychology* — [PDF](https://www.fisme.science.uu.nl/publicaties/literatuur/2011_alfieri_discovery_learning.pdf)
- Skene et al. (2022). "Can guidance during play enhance children's learning and development in educational contexts? A systematic review and meta-analysis." *Child Development*, 93(4), 1162-1180 — [NCBI](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9545698/)
- 0 개념: [Frontiers in Psychology 2021, PMC8353124](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8353124/), [Sheffield Hallam 연구](https://shura.shu.ac.uk/19432/), Zamarian et al. [rivisteweb.it](https://rivisteweb.it/doi/10.1421/24630)
- Rea, C.P. & Modigliani, V. (1985). 분산연습 vs 몰아서 연습, 초등 3학년 곱셈 암기 — 2차 출처: [gwern.net PDF](https://Www.Gwern.net/doc/psychology/spaced-repetition/1985-rea.pdf)
- 교구 디지털 vs 실물: [Bouck Manipulatives 리뷰](https://simvilledev.ku.edu/sites/default/files/researc/Bouck_Manipulatives.pdf), [NCEO Accommodations Toolkit](https://publications.ici.umn.edu/nceo/accommodations-toolkit/manipulatives-research)
- 수학 불안·시간제한 테스트 논쟁: [NCTM/youcubed 자료](https://www.youcubed.org/wp-content/uploads/2017/03/nctm-timed-tests.pdf), [Hechinger Report](https://hechingerreport.org/proof-points-do-math-drills-help-children-learn/)
- 일반화/다중 예시 훈련(ABA): Pittsburg State 석사논문(2024, 3-6세 ASD 아동 대상, 원 저자명 미확인 — 2차 출처), [science.gov 요약](https://www.science.gov/topicpages/m/multiple+exemplar+training)

**원문 재확인이 특히 필요한 항목**: WWC 2013 권고 3의 전체 문구(진도 모니터링), WWC 2021 "Timed Activities" 권고의 공식 근거 수준(strong/moderate/minimal) 등급, subitizing의 1차 연구 문헌, Kirschner-Sweller-Clark(2006) 원문. 이번 조사에서는 네트워크 제약으로 모두 2차 출처(검색 엔진 요약)에 의존했습니다.
