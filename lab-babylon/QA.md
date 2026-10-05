# 호텔 밖 정원 NEXT — QA

Babylon.js standalone next-generation prototype. This branch of the game is kept separate from the existing Godot build until browser QA passes.

## Child feedback mapped into NEXT
- 실제 3D 보스: procedural 3D WOODS / EYE / SMOG
- 낮/밤 변화: continuous day → sunset → night → dawn cycle
- 굵고 잘 보이는 글자: high-contrast 800–900 weight HTML UI
- 글씨가 너무 빨리 사라짐: dialog stays about 9–12 seconds
- 조작법: WASD/방향키 + E 말걸기 + Q 함정 + F 베기 + Space 점프 fixed guide
- SMOG가 너무 빨리 사라짐: persistent boss with repeated observation cycles
- EYE가 안 쫓아옴: active chase and dash behavior
- 게임이 너무 빨리 끝남: 7-minute session timer, free exploration continues after missions
- 등장인물이 사람처럼: procedural head/body/arms/legs human figures
- 현실적인 사물: hotel windows/door, pond, trees, bench, path as lightweight 3D objects

## Still prototype, not final art
Final sculpted/imported GLB characters, walk/idle animations, and PBR textures will be added only after runtime/performance QA passes.