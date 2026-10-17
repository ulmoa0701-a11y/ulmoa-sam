# 모아모아 나래반 V8 — PRIVATE DEV STATUS

Status: **PUBLICATION_HOLD / NOT RELEASED**

## Development line
- Branch: `feat/narae-v8-private-20261017`
- Base: latest `main` at `b2c20a89529679f7d893576a84898e8fe1a1b865` (2026-10-17)
- Existing public games / GitHub Pages: **untouched**
- V7.x: frozen as rejected prototype / comparison only

## Current artifact
- `나래반_놀이터_WORLD_V8_3_STRUCTURAL_REBUILD_DEV.html`
- Private Drive DEV_HOLD file id: `1r9bakD-y36lcKqp_AYCISQzmz-wk7szL`
- SHA-256: `b86935324c4762149570259aff146f2403f812a9cfd963d6dde61c2bb093db8a`

## Structural rebuild completed in V8
- 1D x-only movement replaced by true x/y movement.
- A* grid pathfinding + obstacle avoidance.
- World-object hit testing uses 2D distance/interaction, not x-only proximity.
- Click/tap-to-move is the primary control; no walk/run button.
- Walk/run changes automatically by route length.
- Mission chrome (`오늘의 부탁 0/3`, exclamation marks, therapy-like labels) removed.
- Browser SpeechSynthesis/TTS removed.
- No adult device voice dependency.
- Generated no-cost environmental WebAudio ambience/effects.
- Nuri mission starts from in-world interaction, not a mission menu.
- Target is not spawned before the search begins.
- Nuri target cue is brief rather than permanently displayed.
- Wrong choices produce character responses rather than X/failure penalties.
- Success continues into a world-state change (dinosaur house remains in the sandbox).
- Memory album now captures the played scene; in-session fallback works when storage is unavailable.
- Camera has normal / friend / success framing modes.
- Free-play reactions added for slide, flowers/butterfly, sandbox, bench, and toy truck.
- Character/world draw order follows world y position.
- PC and mobile canvas are responsive with no document overflow in tested viewport.

## QA verified
- JavaScript syntax: PASS.
- Chromium runtime load through DevTools document injection: PASS.
- Runtime exceptions: 0.
- Actual pointer-driven 2D movement: PASS (both x and y changed).
- Slide free-play interaction: PASS.
- Flower/butterfly free-play FX: PASS.
- Nuri search start: PASS.
- Wrong-object retry: PASS; mission remains active.
- Correct target -> carrying state: PASS.
- Handoff -> house/world change -> completion: PASS.
- Memory-card creation and album open: PASS even with localStorage blocked (session fallback).
- Desktop viewport render: PASS.
- Mobile 390×844 render + body overflow check: PASS.

## Still not publication-approved
V8.3 is a structural vertical slice, not a release candidate. Character rigging/animation is still limited by the currently approved fixed-pose art, so this build must not be linked from `main` or GitHub Pages before explicit user approval.
