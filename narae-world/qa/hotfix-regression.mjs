import fs from 'node:fs';

const target = process.argv[2];
if (!target) {
  console.error('usage: node narae-world/qa/hotfix-regression.mjs <build.html>');
  process.exit(2);
}

const html = fs.readFileSync(target, 'utf8');
const checks = [
  ['legacy faded desktop controls removed', !html.includes('@media(min-width:900px){.controls{opacity:.2}}')],
  ['child-facing title copy present', html.includes('오늘은 뭐 하고 놀까?')],
  ['input reset exists', html.includes('function resetInput()')],
  ['run pointer-leave release exists', html.includes("runBtn.addEventListener('pointerleave',runOff)")],
  ['visibility reset exists', html.includes("document.addEventListener('visibilitychange'")],
  ['dialog cancels stale auto-walk', html.includes('player.targetX=null;panel.innerHTML')],
  ['player depth ordering exists', html.includes("playerEl.style.zIndex=String(20+Math.floor(player.y/100))")],
  ['publication build remains self-contained', (html.match(/data:image\/(?:png|jpeg|jpg|webp);base64,/g) || []).length >= 20],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} regression check(s) failed.`);
  process.exit(1);
}
console.log('\nAll Narae V6.2 hotfix regression checks passed.');
