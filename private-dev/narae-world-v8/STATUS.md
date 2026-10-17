# 모아모아 나래반 V8 — PRIVATE DEV STATUS

Status: **PUBLICATION_HOLD / NOT RELEASED**

## Development line
- Branch: `feat/narae-v8-private-20261017`
- Base: latest `main` at `b2c20a89529679f7d893576a84898e8fe1a1b865` (2026-10-17)
- Existing public games / GitHub Pages: **untouched**
- V7.x: frozen as rejected prototype / comparison only

## Current artifact
- `나래반_놀이터_WORLD_V8_6_NURI_JOINT_PLAY_DEV.html`
- Private Drive DEV_HOLD file id: `1byzV8chE61TvD6dIIIROOn3Ou19W150W`
- SHA-256: `1da5b4772a2f82ecbd3cc4fa2da6c424ca5b029e6bc2fc6e0bf303b256926bae`

## Structural rebuild completed
- 1D x-only movement -> true x/y movement.
- A* grid pathfinding + obstacle avoidance.
- World-object interaction uses 2D distance/hit testing.
- Click/tap-to-move is primary; walk/run button removed and gait switches automatically by route length.
- Mission chrome (`오늘의 부탁 0/3`, exclamation marks, therapy labels) removed.
- Browser SpeechSynthesis/TTS removed; no device adult-voice dependency.
- No-cost generated WebAudio ambience/effects.
- Foreground overlays added for better world depth/occlusion.
- Character/world draw order follows world y position.
- Nuri mission begins in-world, not from a mission menu.
- Search target is hidden before the player approaches; the cue is brief and the hiding position is randomized.
- Hints use the actual hidden zone rather than a fixed generic hint.
- Wrong choices trigger character reactions, not X/failure penalties.
- Nuri now moves and looks around during search instead of remaining a static quest marker.
- Nuri search uses an additional pose derived from the approved FINAL character sheet; no regenerated face/eyes.
- Yeoreum's energetic approved pose is tied to a hop-play/chalk context rather than random idle placement.
- Sandbox Garam remains context-bound to sand play.
- Free-play reactions exist for slide, flowers/butterfly, sandbox, bench, toy truck, climbing wall and bridge.
- Success is joint play: player and Nuri move toward the sandbox before building.
- The dinosaur sand house uses the existing world sand texture and remains as a world-state change.
- Memory is captured after the success frame is rendered; in-session fallback works when storage is unavailable.
- Camera has normal / friend / success framing modes.
- Desktop and mobile canvas are responsive with no document overflow in tested viewport.

## QA verified for V8.6
- JavaScript syntax: PASS.
- Chromium runtime: PASS.
- Runtime exceptions: 0.
- Actual pointer-driven x/y movement: PASS.
- Nuri target initially hidden: PASS.
- Nuri autonomous search movement: PASS.
- Wrong-object retry keeps search active: PASS.
- Correct target -> carrying state: PASS.
- Joint handoff -> sandbox move -> world change -> completion: PASS.
- Memory save after rendered world change: PASS.
- Desktop 1440×900 render: PASS; no document overflow.
- Mobile 390×844 render: PASS; no document overflow.
- Success camera no longer exposes a black/uncovered canvas band.

## Publication rule
V8.6 is still a private vertical slice. It must **not** be linked from `main`, the existing cognitive games, or GitHub Pages until the user explicitly approves publication.

## Remaining release gate
The major V7.5 structural failures are replaced in V8.6. Full commercial-quality character motion still requires a fixed-master rig/animation pipeline for all seven characters; do not multiply content to all seven characters until the Nuri slice passes the user's visual/gameplay approval.

## V8.7 candidate follow-up — 2026-10-17 (NOT RELEASED)
- V8.6 Drive original and V7.5 rejected comparison file remain unchanged.
- Latest NEW V8.7 camera-and-motion candidate (separate private Drive file): `1Z04BlOCSBm35F-NxHotj8QkEky-I1Q84` in `모아모아 나래반_DEV_HOLD`.
- File: `나래반_놀이터_WORLD_V8_7_NURI_FIXED_MASTER_CAMERA_QA_HOLD.html`; SHA-256: `b3d46273cef5c4fce2cd5af82d29066c35e4a389e9f65e8000c4d2826bda496a`.
- Working local V8.7.1 is the same gameplay logic, with only an updated build identifier / badge; SHA-256: `f9a2272419ed26589aaec3a0886a18354519f2845a0d25ae07d5b9a1a07d8c16` (not published).
- All 24 embedded image assets were byte-compared against V8.6 and remain unchanged, including the approved Nuri face, eyes, clothes and hair.
- Implemented first procedural fixed-master cutout motion: walking leg swing, idle bob, looking / greeting / celebration body tilt; removed abrupt 198→128 px search-pose swap; changed NPC speed to elapsed-time units.
- Fixed no-path callback proximity edge case and modeled mobile success-camera framing so the house, player and Nuri project inside 390×844 viewport.
- **QA confirmed:** extracted JavaScript passes `node --check`; mocked-DOM / Canvas JavaScript VM at 30/60/120 FPS passes movement, hidden target, search, wrong-item retry, carrying, house build, and memory state. Modeled 390×844 mobile house/characters anchors remain on-screen.
- **QA NOT confirmed:** real Chromium screenshot/real-device animation fluidity. Local Chromium refused file:// and localhost navigation; the 9 MB set_content fallback timed out. Mocked browser state is not visual acceptance.
- **Preview security:** an older AppDeploy V8.6 URL exists (app id `v8-6-dev-h4hbx9`), but its static frontend has no observed viewer authentication. An unlisted URL is not access-controlled. No V8.7 deployment performed.
- **Git caveat:** repo visibility is public; this feature branch is NOT an access-controlled private Git branch. Do not commit unpublished binary/HTML assets to this repo. On inspection `main` had advanced 20 commits beyond the V8 branch's merge base; DO NOT force-push or merge blindly.
- **Gate:** PUBLICATION_HOLD remains; no change to GitHub Pages, public homepage menu, or existing games. Godot/real rig, browser visual QA, and user approval outstanding.


## V8.9.2 local + owner-only Drive QA candidate — 2026-10-17 (PUBLICATION_HOLD)
- New source (not committed to this public repository): `나래반_놀이터_WORLD_V8_9_2_SAFE_PATH_QA_PRIVATE_HOLD.html`, 9,702,448 bytes, SHA-256 `04347989e63b722793bc04276a439c90f71656d393fad3ce55b1543673e0ac62`.
- Owner-only Drive DEV_HOLD file: `1yGSUm7g5R8q6iov1BQ5Wd8qB2TmcwDp8` (metadata: shared=false, sole owner permission). Do NOT share publicly.
- Source preserves the 24 embedded sprites from the V8.8.1 cleaned-Nuri working copy byte-for-byte; additional `sandcastle_v89` artwork is separate non-character art.
- Picture-based three-choice Nuri repeat loop: green shovel, blue bucket, toy truck; scene additions and per-round small JPEG memory captures.
- Revised sandy castle render and responsive phone sizing, cleaned confusing chalk squares, fixed short speech bubbles, short visible object transfer FX.
- Replaced collision-unsafe A* direct fallback with collision-aware grid starts/ends and best-reachable fallback. Random 400 start/end path inspection: 0 intersections, safe fallback 1; no paths through barriers observed in these tests.
- Chromium actual PC 1440x900 and touch-emulated mobile 390x844: each completed 4 consecutive rounds (8/8), album 4/4 saved, no DOM overflow and zero JavaScript runtime errors.
- QA limit: target-nearby movement and handoff proximity were sometimes shortened in automated tests using internal position setup. These tests do not prove full real-child free navigation or 5-10 minute clinical engagement. No user/device physical acceptance.
- Outstanding: polished articulated fixed-master Nuri hands/gaze/blinking with approved frames, real-depth castle material, varied interactions beyond finding objects, physical-phone/human-child exploratory QA, all-seven-character approval.
- Security: GitHub repo and branches are public. AppDeploy old V8.6 unauthenticated preview remains independently unapproved. V8.9.2 has NOT been deployed to public web, linked in main, merged, or used to overwrite V7.x/V8.6.
- Git rule: STATUS-only commit on the old feature branch; no main changes, no artifacts in public GitHub, no forced merge or rebase.
