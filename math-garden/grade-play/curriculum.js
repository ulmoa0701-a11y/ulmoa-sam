/* 학년-학기-대단원-소단원 구조: 2022 개정 수학 성취 내용에 맞춘 자체 활동명.
   출판사·학교별 교과서 차례와 동일함을 뜻하지 않습니다. */
(function(root){'use strict';
const RAW={
'1-1':[
['9까지의 수','도토리 1~9 세기|count','큰 수와 작은 수 비교|compare','몇 번째 친구일까?|ordinal'],
['여러 가지 모양','상자·둥근기둥·공 모양|shape3d','사물에서 입체 모양 찾기|shape3dObject','입체 모양 분류하기|shape3dClass'],
['덧셈과 뺄셈','열매 합치기|add10','열매 덜어 내기|sub10','10 만들기|make10'],
['비교하기','길이가 더 긴 것|lengthCompare','더 많고 더 적은 것|compare','더 무거운 쪽|weightCompare'],
['50까지의 수','10개 묶음과 낱개|tens50','수의 순서 찾기|numberOrder50','수직선의 수 읽기|numberLine50']],
'1-2':[
['100까지의 수','10개씩 묶어 세기|tens100','수의 크기 비교|numberOrder100','빈 숫자 자리 채우기|numberLine100'],
['덧셈과 뺄셈 ①','받아올림 없는 두 자리 덧셈|noCarry','받아내림 없는 두 자리 뺄셈|noBorrow','자릿수 맞춰 계산하기|noCarry'],
['여러 가지 모양','동그라미·세모·네모|shape2d','같은 모양 연결|shapeMatch','모양 분류하기|shapeCount'],
['덧셈과 뺄셈 ②','세 수의 덧셈|sumThreeSmall','세 수의 뺄셈|subThreeSmall','10을 만드는 짝|make10'],
['시계 보기와 규칙 찾기','몇 시와 몇 시 30분|clock','수의 규칙 찾기|pattern','모양 규칙 이어가기|patternShapes'],
['덧셈과 뺄셈 ③','10을 만들며 더하기|addCarrySmall','10에서 빼기|subBorrowSmall','받아올림·받아내림 연결|tenBridge']],
'2-1':[
['세 자리 수','백·십·일의 자리|hundreds','세 자리 수 비교|numberOrder999','자리값 바꾸기|placeValue'],
['여러 가지 도형','도형 이름 고르기|shape2d','같은 도형 찾기|shapeMatch','변과 꼭짓점 찾기|polygonSides'],
['덧셈과 뺄셈','두 자리 수 덧셈|add100','받아내림 뺄셈|borrow','계산식 만들기|wordProblems'],
['길이 재기','cm 단위로 재기|length','길이 비교하기|lengthCompare','눈금자 읽기|ruler'],
['분류하기','같은 특징끼리 묶기|classify','분류 결과 세기|chart','표에서 수 읽기|tableRead'],
['곱셈','같은 수 묶기|groupMult','곱셈식으로 나타내기|times','몇 묶음인지 알아보기|multDigit']],
'2-2':[
['네 자리 수','천·백·십·일|thousands','네 자리 수 비교|numberOrder4','숫자의 자리값|placeValue4'],
['곱셈구구','2~5단 곱셈|times','6~9단 곱셈|times','곱셈 상황 만들기|groupMult'],
['길이 재기','m와 cm 관계|meter','두 길이의 합|length','단위가 다른 길이 비교|compareUnit'],
['시각과 시간','시계 바늘 읽기|clock','시간을 분으로|minutes','끝나는 시각 구하기|elapsed'],
['표와 그래프','그림그래프 읽기|chart','표에서 가장 큰 수|tableRead','그림표로 비교하기|pictograph'],
['규칙 찾기','커지는 수 규칙|pattern','빈칸에 들어갈 수|numberLine','모양 순서 규칙|patternShapes']],
'3-1':[
['덧셈과 뺄셈','세 자리 수 더하기|bigAdd','세 자리 수 빼기|bigAdd','생활 속 세 자리 계산|wordProblemsBig'],
['평면도형','직각 알아보기|rightAngle','직사각형·정사각형|quadrilateral','도형의 변과 꼭짓점|polygonSides'],
['나눗셈','똑같이 나누기|divide','몇 묶음 되는지|groupDiv','곱셈으로 몫 확인|divide'],
['곱셈','몇십 × 한 자리 수|multTens','두 자리 수 × 한 자리 수|multDigit','곱셈 이야기 해결|wordMultiply'],
['길이와 시간','길이 단위 바꾸기|meter','몇 분인지 알아보기|minutes','몇 분 뒤 시각|elapsed'],
['분수와 소수','전체의 몇 분의 몇|fractionParts','0.1이 몇 개인가|tenths','분수와 소수 연결|fracDecimal']],
'3-2':[
['곱셈','세 자리 수 × 한 자리 수|multTriple','두 자리 수 × 두 자리 수|times2','곱셈으로 문제 해결|wordMultiply2'],
['나눗셈','두 자리 수 나눗셈|divide','나머지가 있는 나눗셈|remainder','나눗셈 상황 이해|groupDiv'],
['원','원의 중심과 반지름|circleParts','반지름과 지름의 관계|circleDiameter','원에서 길이 비교|circleRadius'],
['분수','진분수와 가분수|fractionKinds','대분수와 가분수|fractionMix','분수 크기 비교|fracCompare'],
['들이와 무게','L와 mL 바꾸기|capacity','kg과 g 바꾸기|weight','들이·무게를 더하기|unitConvert'],
['자료의 정리','그림그래프 해석|chart','표에서 수량 읽기|tableRead','조사 결과 비교|pictograph']],
'4-1':[
['큰 수','만·억 단위 읽기|largeNumbers','큰 수의 자리값|placeValueBig','큰 수 크기 비교|numberOrderBig'],
['각도','예각·직각·둔각|angles','각도 크기 읽기|anglesMeasure','각의 합 구하기|angleSum'],
['곱셈과 나눗셈','세 자리 수 × 두 자리 수|multTriple2','두 자리 수로 나누기|longDiv','나머지 확인|remainder'],
['평면도형의 이동','평행 이동한 위치|transformation2d','뒤집은 모양|reflection','돌린 모양|rotation'],
['막대그래프','막대그래프 읽기|chart','자료 차이 구하기|barGraph','표를 그래프로|tableRead'],
['규칙 찾기','수 규칙 이어가기|pattern','대응하는 수 찾기|correspondence','규칙식 살펴보기|ruleEquation']],
'4-2':[
['분수의 덧셈과 뺄셈','분모 같은 분수 더하기|fracAdd','분모 같은 분수 빼기|fracSub','대분수 계산|fractionMix'],
['삼각형','삼각형의 각 알아보기|angleSum','삼각형의 종류|triangleClass','이등변·정삼각형|triangles'],
['소수의 덧셈과 뺄셈','소수 더하기|decimalAdd','소수 빼기|decimalSub','소수 자리값|decimalPlace'],
['사각형','직사각형·평행사변형|quadrilateral','사다리꼴과 마름모|shapeQuadrilaterals','사각형 성질|polygonSides'],
['꺾은선그래프','변화 그래프 읽기|lineChart','증가량과 감소량|lineChange','그래프 상황 이해|tableRead'],
['다각형','변의 수로 이름 찾기|polygonSides','정다각형 알아보기|regularPolygon','대각선 개수|diagonals']],
'5-1':[
['자연수의 혼합 계산','덧셈·뺄셈 섞인 식|mixedOps','곱셈·나눗셈 섞인 식|mixedMult','괄호가 있는 식|parentheses'],
['약수와 배수','약수 구하기|factors','배수 구하기|multiples','최대공약수 구하기|gcd'],
['약분과 통분','크기가 같은 분수|fracEquivalent','기약분수 만들기|simplify','분모 통분하기|lcmFractions'],
['대응 관계','표 속 규칙 찾기|correspondence','두 양의 대응 관계|ruleEquation','대응 관계 활용|pattern'],
['분수의 덧셈과 뺄셈','분모 다른 분수 더하기|fracUnlike','분모 다른 분수 빼기|fracUnlikeSub','분수 크기 비교|fracCompare'],
['다각형의 둘레와 넓이','직사각형의 둘레|perimeter','직사각형의 넓이|rectangleArea','삼각형의 넓이|triangleArea']],
'5-2':[
['수의 범위와 어림하기','이상·이하·초과·미만|inequalities','올림·버림·반올림|round','어림한 수 활용|roundUse'],
['분수의 곱셈','분수 × 자연수|fracMultN','진분수 × 진분수|fracMult','곱셈의 크기 생각|fractionParts'],
['합동과 대칭','겹치는 합동 도형|congruence','선대칭도형의 대칭축|symmetry','점대칭도형|pointSym'],
['소수의 곱셈','소수 × 자연수|decimalMult','소수 × 소수|decimalMulti','실생활 소수 곱셈|wordMultiply'],
['직육면체','직육면체의 면과 모서리|boxEdges','직육면체 전개도|netCube','정육면체 특징|prism'],
['평균과 가능성','평균 구하기|mean','가능성 판단하기|possibility','자료로 예상하기|tableRead']],
'6-1':[
['분수의 곱셈과 나눗셈','분수 곱셈 복습|fracMult','분수 ÷ 자연수|fracDivN','자연수 ÷ 자연수의 몫|fractionDivInt'],
['각기둥과 각뿔','각기둥·각뿔 구별|prism','면과 꼭짓점 수|faces','전개도 알아보기|netCube'],
['소수의 곱셈과 나눗셈','소수 곱셈|decimalMult','소수 ÷ 자연수|decimalDiv','몫의 소수점 찾기|decimalPoint'],
['비와 비율','두 양의 비|ratio','비율을 백분율로|percent','생활 속 비율 문제|proportion'],
['여러 가지 그래프','띠그래프 읽기|pieChart','원그래프 해석|pieChart','그래프 선택하기|graphChoice'],
['직육면체의 겉넓이와 부피','겉넓이 구하기|surfaceArea','부피 구하기|volume','cm³와 m³ 바꾸기|unitVolume']],
'6-2':[
['분수의 나눗셈','분모 같은 분수 나누기|fracDivF','분모 다른 분수 나누기|fracDivF','분수와 자연수의 나눗셈|divisionFraction'],
['공간과 입체','쌓기나무 개수|cubes','앞·위·옆에서 본 모양|shapeViews','보이지 않는 쌓기나무|hiddenCubes'],
['소수의 나눗셈','소수 ÷ 소수|decimalDivDecimal','자연수 ÷ 소수|decimalDivDecimal','몫을 반올림하기|roundQuotient'],
['비례식과 비례배분','비례식에서 빈칸|proportion','비의 성질|ratio','비례배분하기|split'],
['원의 둘레와 넓이','원의 둘레|circumference','원의 넓이|circleArea','지름과 반지름 연결|circleDiameter'],
['원기둥·원뿔·구','세 입체도형 구별|solids','원기둥의 면|solidProperties','입체도형의 특징|faces']]
};
const C={};for(const [term,units] of Object.entries(RAW)){C[term]=units.map(([name,...subtopics],unitIndex)=>({id:term+'-'+(unitIndex+1),name,subtopics:subtopics.map((line,i)=>{const [title,mode]=line.split('|');return {id:term+'-'+(unitIndex+1)+'-'+(i+1),title,mode}})}))}
const get=(g,t)=>C[g+'-'+t]||[];
// Grade-crossing prerequisite links: these are instructional suggestions,
// not claims that a child has mastered a grade based on a game result.
const PREREQUISITES=Object.freeze({
 '2-2-2':{g:2,t:1,u:5,s:0,label:'같은 수 묶기부터'},
 '3-1-4':{g:2,t:2,u:1,s:0,label:'곱셈구구부터'},
 '3-2-1':{g:3,t:1,u:3,s:1,label:'두 자리 수 × 한 자리 수부터'},
 '4-1-3':{g:3,t:2,u:0,s:1,label:'두 자리 수 × 두 자리 수부터'},
 '5-1-5':{g:4,t:2,u:0,s:0,label:'분모가 같은 분수 덧셈부터'},
 '5-2-4':{g:4,t:2,u:2,s:0,label:'소수 덧셈부터'},
 '6-1-1':{g:5,t:2,u:1,s:0,label:'분수의 곱셈부터'},
 '6-2-1':{g:6,t:1,u:0,s:1,label:'분수 ÷ 자연수부터'},
 '6-2-3':{g:6,t:1,u:2,s:1,label:'소수 ÷ 자연수부터'}
});
const prerequisiteFor=id=>PREREQUISITES[id]||null;
const counts={terms:Object.keys(C).length,units:Object.values(C).reduce((n,a)=>n+a.length,0),topics:Object.values(C).reduce((n,a)=>n+a.reduce((m,u)=>m+u.subtopics.length,0),0)};
root.MoaMathCurriculum=Object.freeze({C,get,counts,prerequisiteFor});
})(window);