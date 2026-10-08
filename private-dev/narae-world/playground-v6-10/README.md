# 나래반 놀이터 V6.10 — DIRECT PLAY / CURRENT CANON DEV

**Status:** PUBLICATION_HOLD / NOT RELEASED

## Source lineage
- Base runtime: `나래반_놀이터_WORLD_V6_3_SEARCH_HOTFIX.html`
- V6.4: real multi-object visual search loop
- V6.10: direct-play entry + CURRENT visual canon NPC replacement + overlap/UX fixes
- Drive dev artifact: `나래반_놀이터_WORLD_V6_10_DIRECTPLAY_CANON_DEV.html`
- Drive file id: `1M8qm9k4pauwdqMMeNl3jYIUiS5_3QC7w`

## Fixes in V6.10
- Removed the large explanation/landing screen from the first playable frame.
- The world opens immediately; “오늘은 뭐 하고 놀까?” is only a short transient cue.
- Replaced Nuri / Yeoreum / Garam gameplay art from approved CURRENT visual-canon sources rather than regenerating faces.
- Nuri swaps to an approved magnifying-glass observation pose while the search request is active.
- Nuri now asks for one of four existing playground objects at random.
- A wrong object does not complete the request; it gives a retry response.
- A correct object triggers pickup/success and completion.
- Yeoreum flag play and Garam sequence play remain optional and independently completable.
- Removed exposed labels such as “보물찾기 / 깃발놀이 / 기억미션” from NPC nameplates.
- Clicking a friend from a distance now stops Sol beside the friend instead of on the same world coordinate, reducing character overlap.
- PC/mobile/landscape layouts use the same world while camera scaling/panning is viewport-aware.

## QA run
- JavaScript syntax: `node --check` PASS.
- Headless Chromium actual render: 1440×900, 390×844, 844×390 PASS.
- No horizontal/vertical document overflow in tested viewports.
- Mobile left/right pointer movement: PASS.
- NPC click-to-walk stop offset: target 458, settled near 451 for Nuri.
- Nuri wrong-object retry: PASS; wrongCount increments and mission remains active.
- Nuri correct-object completion: PASS.
- Garam sequence (blue shovel → red bucket → truck): PASS.
- Yeoreum rule switch and completion: PASS.
- Runtime page/console errors in tested flows: none observed.

## Visual QA note
The screenshots that triggered this revision were treated as error reports, not design references. V6.10 removes the sticker-like/awkward V6.1 staging by grounding the approved friend art, and the Nuri mission visibly changes Nuri into a searching pose instead of relying on a floating “!” alone.

## Publication rule
Do **not** link this build from `main`, the existing 13 games, or GitHub Pages until explicit user approval.
