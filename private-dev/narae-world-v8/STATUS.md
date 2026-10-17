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
