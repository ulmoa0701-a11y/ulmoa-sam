# 붐웨커 준비박 한국어 안내 음성

이 폴더에는 붐웨커 시작 안내를 위해 사전 합성한 WAV 파일이 있습니다.

- 음원: `bright-{hana,dul,set,net}.wav`, `soft-{hana,dul,set,net}.wav`
- 단어: **하나, 둘, 셋, 넷** (박자에 맞춰 반복)
- 생성 경로: `boomwhacker/generate-voice-cues.py` (GitHub Actions에서 무료 합성·후처리)
- 오픈 가중치: [Supertone / supertonic-2](https://huggingface.co/Supertone/supertonic-2) / [OpenRAIL-M 사용조건](https://huggingface.co/Supertone/supertonic-2/blob/main/LICENSE)
- 코드: [Supertone Supertonic](https://github.com/supertone-inc/supertonic) / MIT.
- 모델 출력은 실제 어린이의 녹음이 아닌 AI 합성 음성입니다. 사용자에게 아동의 실녹음처럼 안내하지 않습니다.
- 사람 음성 녹음이나 사용자의 개인정보를 서버에 업로드하지 않습니다.
- WAV 파일은 모델 자체 및 모델 가중치가 아닌 합성된 결과물입니다. 모델 개발사의 인물·성우 보증을 의미하지 않습니다.

## 품질 검증 범위

GitHub Actions `Boomwhacker audible samples QA`는 음성이 사라지지 않았는지, WAV를 디코딩하는지, WebAudio 같은 박자에 재생 가능한지, 전주/박자 안내와 음량이 있는지 점검합니다. **실제 어린이 목소리처럼 들리는지, 아동 수업에서 더 선호되는지 등의 청감·현장 검증은 자동 검사로 확정할 수 없습니다.**

저작권/사용조건: 모델 사용 시 저작자 및 라이선스 페이지 참조. 모델 가중치 및 학습데이터는 이 저장소에 재배포하지 않습니다.
