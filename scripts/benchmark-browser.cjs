const { chromium } = require('playwright');
const { parseArgs } = require('node:util');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const { values } = parseArgs({ options: {
  baseline: { type: 'string', default: 'http://localhost:43127/' },
  current: { type: 'string', default: 'http://localhost:43130/' },
  mode: { type: 'string', default: 'first-open' },
  samples: { type: 'string', default: '5' },
  output: { type: 'string', default: '.scratch/browser-performance.json' },
  chrome: { type: 'string' },
  mobile: { type: 'boolean', default: false },
  cpu: { type: 'string', default: '1' },
} });
assert.ok(['first-open', 'interactions', 'offline'].includes(values.mode));
const samples = Number(values.samples);
const cpu = Number(values.cpu);
assert.ok(Number.isInteger(samples) && samples > 0);
assert.ok(Number.isFinite(cpu) && cpu >= 1);
const output = path.resolve(values.output);
fs.mkdirSync(path.dirname(output), { recursive: true });
const results = { measuredAt: new Date().toISOString(), mode: values.mode, samples, cpu, mobile: values.mobile,
  method: 'Production builds, 730 prior days across 20 seeded habits (14600 CheckIns), same Chrome process with isolated contexts. First opens follow document reload with HTTP cache retained. Interactions alternate build order, include one observed localStorage write and two animation frames, and parse its value after timing. CPU throttling simulates slower execution; it is not physical mobile hardware.', variants: {} };

async function seed(page) {
  await page.getByRole('dialog', { name: 'Select Profile' }).waitFor();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('do_it_app_data_v2'));
    const today = new Date();
    state.checkIns = [];
    for (let day = 1; day <= 730; day++) {
      const d = new Date(today); d.setDate(d.getDate() - day);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      for (const h of state.habits) state.checkIns.push({ id: `${h.id}-${date}`, habitId: h.id, playerId: h.playerId, date,
        pointsEarned: h.points, completedAt: `${date}T12:00:00Z`, ...(h.isQuantitative ? { quantity: h.maxQuantity } : {}) });
    }
    state.activePlayerId = 'maciek'; state.soundEnabled = false;
    localStorage.setItem('do_it_sound_enabled', 'false');
    localStorage.setItem('do_it_app_data_v2', JSON.stringify(state));
  });
  await page.reload();
  await page.getByText('Daily Ritual', { exact: true }).waitFor();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function openFeature(page, feature) {
  return page.evaluate(async ({ feature, mobile }) => {
    const start = performance.now();
    if (feature === 'Shortcuts') window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    else {
      const button = feature === 'Settings' ? document.querySelector('button[aria-label="Open profile and settings"]')
        : feature === 'Proof' ? document.querySelector('button[aria-label="Mark Clean Space completed"]')
        : feature === 'Activity' ? Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'Activity')
        : Array.from(document.querySelectorAll(mobile ? 'nav[aria-label="Main navigation"] button' : 'aside button')).find(b => b.innerText.includes(feature));
      if (!button) throw new Error('Missing trigger ' + feature);
      button.click();
    }
    const ready = () => feature === 'Duel' ? document.body.innerText.includes('WEEKLY WAGER')
      : feature === 'Activity' ? document.body.innerText.includes('The timeline')
      : feature === 'Proof' ? Boolean(document.querySelector('#proof-modal-title'))
      : feature === 'Shortcuts' ? Boolean(document.querySelector('#shortcuts-modal-title'))
      : document.querySelector('h1')?.innerText === feature;
    await new Promise((resolve, reject) => {
      const deadline = performance.now() + 10000;
      function check() {
        if (ready()) resolve();
        else if (performance.now() > deadline) reject(new Error('Content timeout ' + feature));
        else setTimeout(check, 5);
      }
      check();
    });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { feature, ms: performance.now() - start };
  }, { feature, mobile: values.mobile });
}

async function checkIn(page, undo) {
  return page.evaluate(async undo => {
    const label = undo ? 'Mark Gym & Strength uncompleted for today' : 'Mark Gym & Strength completed';
    const button = document.querySelector(`button[aria-label="${label}"]`);
    if (!button) throw new Error('Missing action ' + label);
    const original = Storage.prototype.setItem;
    let timeout;
    const persisted = new Promise((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('Persistence timeout')), 10000);
      Storage.prototype.setItem = function(key, value) {
        original.call(this, key, value);
        if (this === localStorage && key === 'do_it_app_data_v2') resolve(value);
      };
    });
    const start = performance.now();
    let saved;
    try {
      button.click();
      saved = await persisted;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    } finally {
      Storage.prototype.setItem = original;
      clearTimeout(timeout);
    }
    const elapsed = performance.now() - start;
    const state = JSON.parse(saved);
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const entry = state.checkIns.find(c => c.habitId === 'maciek-gym' && c.date === today);
    return { action: undo ? 'undo' : 'check-in', ms: elapsed, checks: state.checkIns.length, points: entry?.pointsEarned ?? null };
  }, undo);
}

async function pair(page) {
  const checked = await checkIn(page, false);
  assert.equal(checked.checks, 14601); assert.equal(checked.points, 40);
  const undone = await checkIn(page, true);
  assert.equal(undone.checks, 14600); assert.equal(undone.points, null);
  return [checked, undone];
}

async function offline(variant) {
  const { context, page } = variant;
  for (const feature of ['Progress', 'Duel', 'Settings']) {
    await page.goto(variant.url); await page.getByText('Daily Ritual', { exact: true }).waitFor();
    await openFeature(page, feature);
  }
  await page.goto(variant.url); await page.getByText('Daily Ritual', { exact: true }).waitFor();
  await context.setOffline(true);
  try {
    assert.equal(await page.evaluate(() => navigator.onLine), false);
    await pair(page);
    await openFeature(page, 'Progress');
    const today = page.getByRole('button', { name: values.mobile ? 'Today' : 'Today 1', exact: true });
    await today.click();
    await page.getByText('Daily Ritual', { exact: true }).waitFor();
    await openFeature(page, 'Duel');
    await today.click();
    await page.getByText('Daily Ritual', { exact: true }).waitFor();
    await openFeature(page, 'Settings');
    assert.equal(await page.getByRole('heading', { name: 'Settings', exact: true }).isVisible(), true);
    return { localMutationAndUndo: true, warmedViews: ['Progress', 'Duel', 'Settings'] };
  } finally { await context.setOffline(false); }
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(values.chrome ? { executablePath: values.chrome } : {}) });
  results.browser = browser.version();
  const live = {};
  try {
    for (const [name, url] of [['baseline', values.baseline], ['current', values.current]]) {
      const context = await browser.newContext({ viewport: values.mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, timezoneId: 'Europe/London', reducedMotion: 'reduce' });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(url); await seed(page);
      live[name] = { context, page, url };
      results.variants[name] = { samples: [], errors };
      if (values.mode === 'interactions') { await pair(page); await page.waitForTimeout(650); }
    }
    if (values.mode === 'interactions') {
      for (let sample = 1; sample <= samples; sample++) {
        for (const name of (sample % 2 ? ['baseline', 'current'] : ['current', 'baseline'])) {
          results.variants[name].samples.push(...(await pair(live[name].page)).map(row => ({ ...row, sample })));
        }
        await live.current.page.waitForTimeout(550);
      }
    } else {
      for (const [name, variant] of Object.entries(live)) {
        if (values.mode === 'offline') results.variants[name].offline = await offline(variant);
        else for (const feature of ['Progress', 'Duel', 'Settings', 'Activity', 'Proof', 'Shortcuts']) {
          for (let sample = 1; sample <= samples; sample++) {
            await variant.page.goto(variant.url); await variant.page.getByText('Daily Ritual', { exact: true }).waitFor();
            results.variants[name].samples.push({ ...await openFeature(variant.page, feature), sample });
          }
        }
      }
    }
    for (const [name, variant] of Object.entries(live)) {
      await variant.page.goto(variant.url); await variant.page.getByText('Daily Ritual', { exact: true }).waitFor();
      const checkCount = await variant.page.evaluate(() => JSON.parse(localStorage.getItem('do_it_app_data_v2')).checkIns.length);
      assert.equal(checkCount, 14600);
      assert.deepEqual(results.variants[name].errors, []);
      results.variants[name].persistedAfterReload = checkCount;
    }
  } catch (error) { results.failure = error.message; throw error; }
  finally { fs.writeFileSync(output, JSON.stringify(results, null, 2)); await browser.close(); }
  console.log(JSON.stringify({ output, passed: true }));
})().catch(error => { console.error(error); process.exitCode = 1; });
