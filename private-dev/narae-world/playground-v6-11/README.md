# 나래반 놀이터 V6.11 — CONTEXT POSES / DIRECT PLAY DEV

**Status:** PUBLICATION_HOLD / NOT RELEASED

## Source lineage
- V6.10: direct-play entry + CURRENT visual canon NPC replacement
- V6.11: context-matched friend poses + object-search UI cleanup
- Drive dev artifact: `나래반_놀이터_WORLD_V6_11_CONTEXT_POSES_DEV.html`
- Drive file id: `1jqX7mtzRbpPK46YY_ITtj6i0pFxjM-4n`
- SHA-256: `077e80ff4829488db7035e5d2507c5e5037cca10f951214ce2090bab9fef9d60`

## Fixes in V6.11
- Keeps direct-play entry. The large explanation/title page is not the first playable frame.
- Keeps “오늘은 뭐 하고 놀까?” only as a short transient cue.
- Uses only approved character-sheet source art for the friend-pose changes; no face/eye regeneration.
- Yeoreum no longer stands in a random high-kick pose while idle. Her idle world pose is an approved-sheet wave crop placed naturally by the sandbox.
- Yeoreum swaps back to the approved energetic full-body pose only while flag play is active, then returns to idle after completion.
- Garam uses an approved seated full-body crop with the dinosaur so he reads as a child sitting at the sandbox rather than a pasted/lying sticker.
- Nuri still swaps to the approved magnifying-glass search pose while object search is active.
- On mobile, the duplicated Nuri world speech bubble is hidden; the target card carries the object cue.
- While a mission is active, the “오늘의 부탁” chrome is hidden to reduce top-screen UI clutter.
- The short entry cue is moved below the top UI on mobile so it does not overlap the quest button.
- Exposed therapy-like labels remain removed from NPC nameplates.

## QA run
- JavaScript syntax: `node --check` PASS.
- Headless Chromium actual render: 1440×900, 390×844, 844×390 PASS.
- No horizontal/vertical document overflow in tested viewports.
- Runtime page/console errors: none observed.
- Mobile right/left pointer movement: PASS.
- Nuri wrong-object retry: PASS; mission remains active and wrongCount increments.
- Nuri correct-object completion + search-pose cleanup: PASS.
- Yeoreum idle → flag pose → idle transition: PASS.
- Yeoreum rule switch and completion: PASS.
- Garam sequence (blue shovel → red bucket → truck) completion: PASS.
- Mobile Nuri mission: target card visible, search pose visible, duplicate speech hidden, no document overflow.

## Visual QA conclusion
The user screenshots were treated as error reports. V6.11 specifically addresses the two visible failures: friends looking like unrelated generated poses, and Nuri’s object-finding activity not reading as an actual search. The remaining build is still a vertical-slice prototype and is not considered release-ready until user visual approval.

## Publication rule
Do **not** link this build from `main`, the existing 13 games, or GitHub Pages until explicit user approval.
