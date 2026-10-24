/* Fail-safe, user-readable OMR guidance. Diagnosis uses measured evidence,
 * NOT any particular song, expected event count, or hidden reference score.
 * Causes beyond optical proof are always described as uncertainty, not fact.
 */
const issue=(code,title,reason,action,detail='')=>({code,title,reason,action,detail});
export function diagnoseScoreIssue(m={}){
 const stage=m.stage||'recognition';
 if(stage==='unsupported')return issue('UNSUPPORTED_FILE','이 파일은 바로 읽을 수 없어요',
   '현재 JPG·PNG·WebP 이미지와 PDF 악보를 지원해요.',
   '사진을 JPG 또는 PNG로 저장한 뒤 다시 올려 주세요.');
 if(stage==='pdf-limit')return issue('PDF_PAGE_LIMIT','PDF 페이지가 너무 많아요',
   '현재 AI 인식 시험판은 PDF 4쪽까지만 한 번에 처리해요.',
   '악보를 4쪽 이하의 PDF로 나누어 올려 주세요.');
 if(stage==='load-error')return issue('FILE_READ_ERROR','파일을 열지 못했어요',
   '이미지가 손상되었거나 브라우저에서 읽을 수 없는 형식일 수 있어요.',
   '원본 파일을 확인하고 JPG·PNG 또는 PDF로 다시 저장해 올려 주세요.');
 if(stage==='engine-error')return issue('ENGINE_ERROR','악보 인식 중 문제가 생겼어요',
   '인식 엔진을 불러오거나 실행하는 중 오류가 발생했어요. 사진의 문제라고 단정할 수 없어요.',
   '인터넷 연결을 확인하고 새로고침한 다음 다시 시도해 주세요.');
 const w=Number(m.width)||0,h=Number(m.height)||0,
       spacing=Number(m.staffSpacing)||0,
       skew=Math.abs(Number(m.skewDegrees)||0),
       skewReliable=Number(m.skewConfidence)>=1.35,
       correction=Number(m.correctionAvg),
       rawExact=Number(m.rawExactRatio),
       modelDisagreed=Number(m.modelDisagreementRatio);
 if((w>0&&h>0)&&(w<700||h<450))return issue('LOW_IMAGE_RESOLUTION','사진 크기가 너무 작아요',
   '이미지의 픽셀 수가 적어 음표머리·점·쉼표를 구별하기 어려울 수 있어요.',
   '메신저로 줄인 사진 말고 원본 사진이나 선명한 스캔 파일을 올려 주세요.',
   `${w} × ${h}px`);
 if(m.staffDetected===false||stage==='no-staff')return issue('STAFF_NOT_FOUND','오선 5줄을 찾지 못했어요',
   'AI가 악보의 가로 오선을 안정적으로 찾지 못했어요. 악보 밖 배경·그림자·잘림 등이 영향을 줄 수 있어요.',
   '악보를 정면에서 밝게 촬영하고, 오선이 끝까지 나오도록 다시 찍어 주세요.');
 if(stage==='staff-split')return issue('STAFF_UNSTABLE','악보 줄을 구분하지 못했어요',
   '오선 일부를 찾았지만 악보 줄의 시작과 끝이 명확하지 않아요.',
   '악보 한 페이지를 평평하게 놓고 오선 양쪽 끝까지 보이게 촬영해 주세요.');
 if(skewReliable&&skew>=3.5)return issue('IMAGE_TILTED','사진 기울기가 커요',
   '오선의 기울기가 감지됐고 자동 보정 후에도 인식 결과가 정확하지 않았어요.',
   '휴대폰을 종이와 평행하게 두고 악보가 정면에서 보이도록 다시 찍어 주세요.',
   `오선 기울기 약 ${skew.toFixed(1)}°`);
 if(spacing>0&&spacing<8)return issue('SMALL_STAFF_SYMBOLS','음표가 너무 작게 보여요',
   '오선 간격이 좁아 점음표·쉼표·음표 기둥을 확실하게 구분하지 못했어요.',
   '원본 고화질 사진이나 PDF를 올려 주세요. 멀리서 찍었다면 악보가 화면을 더 크게 차지하게 촬영해 주세요.',
   `오선 간격 약 ${spacing.toFixed(1)}px`);
 if(Number.isFinite(correction)&&correction>.20||Number.isFinite(rawExact)&&rawExact<.65)
   return issue('RHYTHM_UNCERTAIN','음표 길이가 서로 맞지 않아요',
     '모델이 읽은 음표 길이와 마디 박자 보정 결과가 크게 달라요. 박자가 맞더라도 실제 음표는 틀릴 수 있어요.',
     '점음표·꼬리·쉼표가 선명한 원본 이미지로 다시 시도해 주세요.',
     Number.isFinite(correction)?`평균 박자 보정 ${correction.toFixed(2)}박`:'' );
 if(Number.isFinite(modelDisagreed)&&modelDisagreed>.2)
   return issue('DECODER_DISAGREEMENT','음표 판독 결과가 서로 달라요',
     '서로 다른 판독에서 음표 종류나 위치가 일치하지 않아 정확하다고 확인할 수 없어요.',
     '빛 반사·흐림·잘림이 없는 원본 파일로 다시 시도해 주세요.');
 if(m.notEnough)return issue('NOTES_UNCERTAIN','음표를 충분히 찾지 못했어요',
   '오선은 감지했지만 악보에 있는 음표를 충분히 읽지 못했어요.',
   '악보와 음표가 또렷하게 보이도록 가까이에서 촬영해 주세요.');
 if(m.lowConfidence)return issue('LOW_CONFIDENCE','음표를 정확히 읽었다고 판단하기 어려워요',
   '인식 결과의 신뢰도가 낮아 자동 변환을 진행하지 않았어요.',
   '흔들림이나 그림자가 없는 원본 악보를 올려 주세요.');
 return issue('NOTATION_UNCERTAIN','악보를 정확하게 읽지 못했어요',
   '오선과 일부 음표는 찾았지만 음높이·길이·쉼표를 모두 신뢰할 수 있는 상태는 아니에요.',
   '원본 사진이나 PDF를 다시 올려 주세요. 결과가 같다면 더 선명한 악보를 사용해 주세요.');
}
