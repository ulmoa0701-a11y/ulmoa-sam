# 나래반 놀이터 V6.2 — PRIVATE DEV PATCH

**Status:** PUBLICATION_HOLD / NOT RELEASED

This patch is intentionally isolated from `main` and GitHub Pages.

## Bug confirmed from 2026-10-07 mobile screenshots
- 누리: dinosaur-showing pose reads as “showing a toy”, not searching.
- 여름: raised-leg/waving pose reads as dancing/posing.
- 가람: prone pose is visually clipped/awkward when placed on the sandbox edge.
- The V6.1 Nuri mission is not a true search loop: proximity to the known blue-bucket coordinate auto-completes the mission.

## V6.2 correction
1. No new AI faces. Existing approved character images remain unchanged.
2. Remove whole-NPC floating/bobbing that made characters look like stickers.
3. Restage Nuri / Yeoreum / Garam so their canonical poses fit the playground context better.
4. Nuri mission randomly asks for one of four **existing world objects**:
   - 파란 양동이
   - 빨간 양동이
   - 파란 삽
   - 장난감 자동차
5. The child must approach an object and choose **“이 물건 살펴보기”**.
6. Wrong object: Sol points/thinks and Nuri responds; the mission stays active.
7. Correct object: Sol uses pickup/success reaction and the request completes.
8. Persistent picture target card remains visible so a child who cannot read can still play.

## Integration
These two files are an overlay for `나래반_놀이터_WORLD_V6_1_FREEPLAY.html`.
They must be inlined/loaded **after** the V6.1 CSS/script.

- `v6-2-fix.css`
- `v6-2-fix.js`

## QA gate
Do **not** mark complete until:
- runtime integration is done against the exact latest V6.1 download,
- mobile portrait play test,
- desktop wide play test,
- all 4 Nuri target objects can be correct target,
- at least one wrong-object retry works,
- Yeoreum and Garam missions still work,
- player controls / camera / sound / back button regressions are checked.

The current patch does not claim final character animation quality. Fixed rig/model work remains the next art-production step.
