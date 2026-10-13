// Pure validation and sharing contract for the independent, undeployed secure portal.
// This is not a diagnostic algorithm. Only submitted, explicitly selected fields may be shared.
export const ENTRY_KEYS=Object.freeze(['date','event','thought','next','observation','message','note','category','mood','energy','body','action','response','impact','sketch','time','context','origin','place','signals','after','title','experience','experienceImpact','childWords']);
export const SESSION_KEYS=Object.freeze(['studentReport','parentReport','observation','question','plan','functionalImpact','familyResponse','workingHypothesis','alternatives','uncertainty','burdenReview','erpReview','erpTarget','erpSafety','cbitReview','cbitTarget','cbitContext']);
export const ORIGIN_CHOICES=Object.freeze(['직접 관찰','아이가 말함','가족에게 들음','그 밖의 사람에게 들음']);
export const BURDEN_CHOICES=Object.freeze(['학생이 별다른 부담을 말하지 않음','부담 또는 반복 확인이 보고됨','작성 축소·중단 또는 다른 방법을 합의함']);
export const REVIEW_CHOICES=Object.freeze(['적합성 평가가 필요함','별도의 치료계획에서 검토 중','이번 회기에 해당 없음']);
const trim=(value,max)=>value.trim().slice(0,max);
const isNonEmptyObject=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function validateEntry(e){
 if(!isNonEmptyObject(e))throw new Error('기록 내용을 확인해 주세요.');
 const out={};
 for(const k of ENTRY_KEYS){
  if(e[k]===undefined||e[k]===null)continue;
  if(typeof e[k]!=='string')throw new Error('문자 기록만 입력할 수 있어요.');
  const max=k==='sketch'?5500:k==='note'?4000:k==='title'?80:k==='experience'?900:k==='experienceImpact'?500:k==='place'?100:k==='signals'?120:k==='after'?600:k==='childWords'?450:1200;
  const val=trim(e[k],max);if(val)out[k]=val;
 }
 if(out.date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(out.date)||Number.isNaN(Date.parse(out.date+'T00:00:00Z'))||new Date(out.date+'T00:00:00Z').toISOString().slice(0,10)!==out.date)throw new Error('관찰 날짜를 확인해 주세요.');
 }
 if(out.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(out.time))throw new Error('관찰 시간을 확인해 주세요.');
 if(out.origin&&!ORIGIN_CHOICES.includes(out.origin))throw new Error('정보 출처를 확인해 주세요.');
 if(out.signals){
  const kinds=out.signals.split(' / '),allowed=['몸 움직임','소리·말','여러 번 한 행동','그 밖의 모습'];
  if(kinds.length>4||new Set(kinds).size!==kinds.length||kinds.some(k=>!allowed.includes(k)))throw new Error('관찰 모습 분류를 확인해 주세요.');
 }
 if(out.sketch){
  let paths;try{paths=JSON.parse(out.sketch)}catch{throw new Error('그림 내용이 올바르지 않습니다.')}
  if(!Array.isArray(paths)||paths.length>240)throw new Error('그림 내용이 너무 큽니다.');
  let points=0;
  for(const stroke of paths){
   if(!Array.isArray(stroke)||stroke.length>240)throw new Error('그림 내용이 올바르지 않습니다.');
   points+=stroke.length;
   for(const point of stroke){if(!Array.isArray(point)||point.length!==2||!point.every(Number.isInteger)||point[0]<0||point[0]>760||point[1]<0||point[1]>380)throw new Error('그림 내용이 올바르지 않습니다.');}
  }
  if(points>240)throw new Error('그림 내용이 너무 큽니다.');
 }
 if(!Object.values(out).some(Boolean))throw new Error('기록을 한 가지 이상 입력해 주세요.');
 if(JSON.stringify(out).length>14000)throw new Error('기록이 너무 깁니다.');
 return out;
}
export function sharedSelection(entry,requested,isParent=false){
 if(!isNonEmptyObject(entry)||!Array.isArray(requested)||requested.length<1||requested.length>ENTRY_KEYS.length||requested.some(k=>typeof k!=='string'||!ENTRY_KEYS.includes(k)))throw new Error('공유할 항목을 선택해 주세요.');
 const selected=Object.create(null);
 for(const k of new Set(requested)){if(entry[k])selected[k]=entry[k];}
 if(!Object.keys(selected).some(k=>!['date','time','origin','place','signals','title'].includes(k)))throw new Error('공유할 관찰 내용이나 전달사항을 선택해 주세요.');
 // Preserve the existing parent consent copy: observation date/time and, only when observation shared,
 // place and observation tags accompany the entry. Never attach free-text or unselected child words.
 if(isParent&&entry.date)selected.date=entry.date;
 if(isParent&&entry.time)selected.time=entry.time;
 if(isParent&&selected.observation){if(entry.place)selected.place=entry.place;if(entry.signals)selected.signals=entry.signals;}
 return {...selected};
}
export function validateSessionEntry(raw){
 if(!isNonEmptyObject(raw))throw new Error('메모를 확인해 주세요.');
 const out={};
 for(const k of SESSION_KEYS){
  if(raw[k]===undefined||raw[k]===null)continue;
  if(typeof raw[k]!=='string')throw new Error('올바르지 않은 메모 내용입니다.');
  const value=trim(raw[k],k==='erpTarget'||k==='cbitTarget'?1200:k==='studentReport'||k==='parentReport'||k==='observation'||k==='plan'||k==='question'?1200:1000);
  if(value)out[k]=value;
 }
 if(out.burdenReview&&!BURDEN_CHOICES.includes(out.burdenReview))throw new Error('기록 부담 검토 값을 확인해 주세요.');
 if(out.erpReview&&!REVIEW_CHOICES.includes(out.erpReview))throw new Error('ERP 검토 상태를 확인해 주세요.');
 if(out.cbitReview&&!REVIEW_CHOICES.includes(out.cbitReview))throw new Error('CBIT 검토 상태를 확인해 주세요.');
 if(!Object.keys(out).length)throw new Error('메모를 하나 이상 작성해 주세요.');
 if(JSON.stringify(out).length>22000)throw new Error('메모가 너무 깁니다.');
 return out;
}
export function drivePolicyEnabled(value){return value==='true';}
