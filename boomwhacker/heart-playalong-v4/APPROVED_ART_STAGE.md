# V4 approved background artwork integration (pending binary assets)
 
This branch includes a safe fall-back implementation which switches the **forest** stage to the exact user-approved illustrated scene if both images are deployed.

## Required files (not uploaded to GitHub yet)
- `boomwhacker/heart-playalong-v4/assets/approved-nightforest-desktop.webp` (1440×820, WebP)
- `boomwhacker/heart-playalong-v4/assets/approved-nightforest-mobile.webp` (820×1040, WebP)

Both are already prepared and saved separately. Do **not** merge this branch or claim the illustration is deployed until the binary images are committed to this branch, reviewed visually, and the public Pages runtime loads them.

## Expected behavior
- For forest stage, draw the artwork without replacing the real heart-score canvas, Moa or firefly beat guide.
- Preserve original scores in `boomwhacker/performance-views/scores.js`.
- Keep old SVG forest background as fallback when an image is not yet available, and preserve V1/V2/V3.
- Do not render old SVG foliage and grass on top of photographic artwork: it would create mismatched duplicate plants.
- Decorative lantern breathing may occur while running, but individual flowers/leaves within an unsegmented background are **static**. A separate matching alpha-layer authoring phase is required to animate leaves without distorting the art.
- Before merging, verify both image paths return HTTP 200, check at desktop and mobile widths, capture playback frames, and assert exact image selection and beat/meter regression.
- Never treat a passing source-level QA or fallback SVG test as evidence that the user-approved artwork is live.
