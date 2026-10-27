'use strict';
// Genuine browser interactions: never call nextRound(), set state.round,
// or synthesize a completion. Reading the question bank supplies a test oracle,
// not a substitute for a child's independent response.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const BASE = process.env.GARDEN_BASE_URL || 'http://127.0.0.1:8765';
const OUT = 'qa/literacy-full-play-artifacts';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const sessions = [];
  try {
    for (const vp of [
      { name: 'mobile', width: 390, height: 844 },
      { name: 'desktop', width: 1280, height: 900 }
    ]) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: 'reduce'
      });
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        for (const id of ['spacing', 'spelling']) {
          for (const [level, count] of [['easy', 10], ['normal', 10], ['hard', 20]]) {
            const label = vp.name + '/' + id + '/' + level;
            await page.goto(BASE + '/thinking-garden/?game=' + id, { waitUntil: 'load' });
            assert.ok(await page.locator('#introScreen.active').isVisible(), label + ' intro missing');
            assert.ok(await page.locator('#literacyPracticeControls').isVisible(), label + ' level controls missing');
            await page.locator('#literacyPracticeControls [data-level="' + level + '"]').click();
            await page.locator('#literacyPracticeControls [data-count="' + count + '"]').click();
            assert.equal(await page.locator('#literacyPracticeControls [data-level="' + level + '"]').getAttribute('aria-pressed'), 'true');
            assert.equal(await page.locator('#literacyPracticeControls [data-count="' + count + '"]').getAttribute('aria-pressed'), 'true');
            await page.locator('#introStart').click();
            const session = await page.evaluate(() => ({
              game: state.game, level: state.practiceLevel, total: state.roundTotal,
              questions: state.practiceRounds.map(q => JSON.stringify(q))
            }));
            assert.deepEqual([session.game, session.level, session.total], [id, level, count], label + ' setup mismatch');
            assert.equal(new Set(session.questions).size, count, label + ' repeated question in one session');
            let recovered = false;
            for (let round = 0; round < count; round++) {
              const marker = label + ' round ' + (round + 1);
              assert.equal(await page.locator('#stageLabel').innerText(), (round + 1) + ' / ' + count, marker + ' stage');
              const q = await page.evaluate(() => state.practiceRounds[state.round]);
              if (id === 'spacing') {
                assert.ok(Array.isArray(q) && q.length >= 2, marker + ' invalid word bank entry');
                const positions = [];
                let at = 0;
                for (const word of q.slice(0, -1)) { at += word.length; positions.push(at); }
                const gapCount = await page.locator('.space-gap').count();
                assert.equal(gapCount, q.join('').length - 1, marker + ' gap buttons');
                if (round === 0) {
                  const wrong = Array.from({ length: gapCount }, (_, i) => i + 1).find(n => !positions.includes(n));
                  assert.ok(wrong, marker + ' no distractor');
                  await page.locator('.space-gap[data-pos="' + wrong + '"]').click();
                  assert.equal(await page.locator('.game-plank.built').count(), 0, marker + ' wrong gap built bridge');
                  recovered = true;
                }
                for (const pos of positions) {
                  await page.locator('.space-gap[data-pos="' + pos + '"]').click();
                }
                assert.equal(await page.locator('.game-plank.built').count(), positions.length, marker + ' incomplete bridge');
                assert.ok(await page.locator('.spacing-bridge.complete').isVisible(), marker + ' bridge success scene missing');
                assert.ok((await page.locator('.spacing-review').innerText()).includes(q[0]), marker + ' answer review missing');
              } else {
                assert.ok(q && typeof q.right === 'string' && q.right !== q.wrong, marker + ' invalid spelling bank');
                const choices = (await page.locator('.repair-choice').allTextContents()).map(x => x.trim());
                assert.equal(choices.length, 2, marker + ' must offer exactly two choices');
                assert.deepEqual(new Set(choices), new Set([q.right, q.wrong]), marker + ' displayed choices mismatch');
                if (round === 0) {
                  await page.locator('.repair-choice').nth(choices.indexOf(q.wrong)).click();
                  assert.equal(await page.locator('.shop-open').count(), 0, marker + ' wrong spelling opened shop');
                  recovered = true;
                }
                await page.locator('.repair-choice').nth(choices.indexOf(q.right)).click();
                assert.ok(await page.locator('.shop-open').isVisible(), marker + ' shop did not open');
                assert.ok((await page.locator('.spelling-review').innerText()).includes(q.right), marker + ' correction missing');
              }
              if (round === 0 || round === count - 1) {
                const dimensions = await page.evaluate(() => ({
                  scroll: document.documentElement.scrollWidth, width: innerWidth
                }));
                assert.ok(dimensions.scroll <= dimensions.width + 4, marker + ' horizontal overflow ' + JSON.stringify(dimensions));
              }
              await page.locator('.round-gate button').waitFor({ state: 'visible' });
              await page.locator('.round-gate button').click();
              if (round === count - 1) {
                await page.locator('#resultScreen.active').waitFor();
              } else if ((round + 1) % 5 === 0) {
                await page.locator('#practiceContinue').waitFor({ state: 'visible' });
                await page.locator('#practiceContinue').click();
                await page.waitForFunction(expected =>
                  document.querySelector('#stageLabel')?.textContent.trim() === expected,
                  (round + 2) + ' / ' + count
                );
              } else {
                await page.waitForFunction(expected =>
                  document.querySelector('#stageLabel')?.textContent.trim() === expected,
                  (round + 2) + ' / ' + count
                );
              }
            }
            assert.ok((await page.locator('#resultMessage').innerText()).includes(count + '문제'), label + ' incorrect result count');
            assert.equal(await page.evaluate(key =>
              JSON.parse(localStorage.getItem('moa-garden:completed') || '{}')[key] === true, id),
              true, label + ' completed flag not saved');
            assert.ok(recovered, label + ' error-retry scenario not exercised');
            sessions.push({ device: vp.name, game: id, level, rounds: count, completed: true, wrongThenCorrect: recovered });
            if (vp.name === 'mobile' && level === 'hard') {
              await page.screenshot({ path: OUT + '/' + id + '-mobile-result.png', fullPage: true });
            }
            await page.locator('#resultScreen [data-go="home"]').click();
          }
        }
        assert.deepEqual(errors, [], vp.name + ' uncaught browser errors');
      } finally {
        await context.close();
      }
    }
    const report = {
      scope: '2 literacy games only; actual UI clicks, not injected stage advances; no real children participated',
      sessions: sessions.length,
      rounds: sessions.reduce((sum, x) => sum + x.rounds, 0),
      passed: sessions.every(x => x.completed && x.wrongThenCorrect),
      details: sessions
    };
    fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2) + '\n');
    assert.equal(report.sessions, 12);
    assert.equal(report.rounds, 160);
    console.log('PASS literacy full-play ' + JSON.stringify({ sessions: report.sessions, rounds: report.rounds }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
