# 모아모아 나래반 — private development status

- Status: PUBLICATION_HOLD
- Development line: feat/narae-world-game-v1-20261006
- Current private playable artifact: `나래반_놀이터_WORLD_V6_11_CONTEXT_POSES_DEV.html`
- Drive dev folder: `모아모아 나래반_DEV_HOLD`
- Drive file id: `1jqX7mtzRbpPK46YY_ITtj6i0pFxjM-4n`
- Artifact SHA-256: `077e80ff4829488db7035e5d2507c5e5037cca10f951214ce2090bab9fef9d60`
- Source/publication rule: do not link this build from GitHub Pages or the public site before explicit approval.

## Current V6.11 changes
- Direct-play first frame; no reading-first landing screen.
- “오늘은 뭐 하고 놀까?” is a brief cue only.
- Friend art is anchored to approved CURRENT/final character sheets; no new face/eye generation.
- Nuri changes into an approved magnifying-glass search pose during object finding.
- Yeoreum uses a context-appropriate approved idle wave, and the energetic full-body pose only during flag play.
- Garam uses an approved seated full-body pose at the sandbox.
- Mission-active top UI is simplified on mobile.
- Existing 13 games and public-site routes remain untouched.

## Verified QA
- JS syntax PASS.
- Chromium render PASS at 1440×900, 390×844, and 844×390.
- No tested runtime/console errors or document overflow.
- Player pointer movement PASS.
- Nuri wrong/correct search flows PASS.
- Yeoreum pose swap, rule switch, completion, and idle restore PASS.
- Garam three-item sequence completion PASS.

See: `private-dev/narae-world/playground-v6-11/README.md`.
