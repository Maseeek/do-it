// Measures section switches (Today, Duel, Progress, Settings) in a production
// build through the Chrome DevTools Protocol. Each switch is timed in the page
// from the pointerdown event to the first frame painted after the destination
// view's content is visible. See docs/performance/2026-11-23/README.md.
let chromium;
try { ({ chromium } = require('playwright-core')); } catch { ({ chromium } = require('playwright')); }
const { parseArgs } = require('node:util');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const { values } = parseArgs({ options: {
  url: { type: 'string', multiple: true },
  name: { type: 'string', multiple: true },
  samples: { type: 'string', default: '5' },
  profile: { type: 'string', default: 'desktop' },
  idle: { type: 'string', default: '1000' },
  output: { type: 'string', default: '.scratch/navigation.json' },
  trace: { type: 'string' },
  chrome: { type: 'string' },
} });

// Network and CPU follow Lighthouse's desktop and mobile throttling presets.
const PROFILES = {
  desktop: { viewport: { width: 1280, height: 800 }, mobile: false, cpu: 1, latency: 40, down: 10 * 1024 * 1024 / 8, up: 10 * 1024 * 1024 / 8 },
  mobile: { viewport: { width: 390, height: 844 }, mobile: true, cpu: 4, latency: 150, down: 1.6 * 1024 * 1024 / 8, up: 750 * 1024 / 8 },
};
const profile = PROFILES[values.profile];
assert.ok(profile, `Unknown profile ${values.profile}`);
const urls = values.url ?? ['http://localhost:43201/'];
const names = values.name ?? urls.map((_, index) => `build-${index + 1}`);
assert.equal(names.length, urls.length);
const samples = Number(values.samples);
const idle = Number(values.idle);
const output = path.resolve(values.output);
fs.mkdirSync(path.dirname(output), { recursive: true });

// Every section and sub-section: first visits, then the return trips players
// repeat during a session. `target` is the control tapped for each step.
const NAV = { today: 'Today', duel: 'Duel', progress: 'Progress' };
const CHECK_IN_HABIT = 'Personal Project';
const ROUTE = [
  { step: 'feed', target: ['main [role="tablist"][aria-label="Today views"] button', 'Activity'] },
  { step: 'ritual', target: ['main [role="tablist"][aria-label="Today views"] button', 'Ritual'] },
  { step: 'duel' },
  { step: 'month', target: ['main [role="tablist"][aria-label="Leaderboard timeframe"] button', 'Month'] },
  { step: 'week', target: ['main [role="tablist"][aria-label="Leaderboard timeframe"] button', 'Week'] },
  { step: 'battles', target: ['main [role="tablist"][aria-label="Duel sections"] button', 'Battles'] },
  { step: 'categories', target: ['main [role="tablist"][aria-label="Duel sections"] button', 'Categories'] },
  { step: 'progress' },
  { step: 'today' },
  { step: 'duel' },
  { step: 'settings', target: ['button[aria-label="Open profile and settings"]'] },
  { step: 'today' },
  // Hidden sections re-render after data changes; Check-ins must stay fast.
  { step: 'check-in', target: [`main button[aria-label="Mark ${CHECK_IN_HABIT} completed"]`] },
  { step: 'undo', target: [`main button[aria-label="Mark ${CHECK_IN_HABIT} uncompleted for today"]`] },
];

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
}

// Installed before any app script runs, so the first interaction is observed.
function installProbe() {
  window.__nav = { events: [], frames: [], resources: [] };
  addEventListener('pointerdown', event => { window.__nav.pointerdown = event.timeStamp; }, { capture: true });
  try {
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__nav.events.push({ name: e.name, start: e.startTime, duration: e.duration, processingStart: e.processingStart, processing: e.processingEnd - e.processingStart, interactionId: e.interactionId }); })
      .observe({ type: 'event', durationThreshold: 0, buffered: true });
  } catch {}
  try {
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__nav.frames.push({ start: e.startTime, duration: e.duration, blocking: e.blockingDuration }); })
      .observe({ type: 'long-animation-frame', buffered: true });
  } catch {}
  // Startup: document start to the first frame painted with Today visible.
  const startup = new MutationObserver(() => {
    if (window.__nav.todayAt !== undefined || !window.__navReady('today')) return;
    window.__nav.todayAt = performance.now();
    startup.disconnect();
    requestAnimationFrame(() => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => { window.__nav.todayPaintedAt = performance.now(); };
      channel.port2.postMessage(null);
    });
  });
  startup.observe(document, { childList: true, subtree: true, attributes: true });
  window.__navReady = view => {
    const main = document.querySelector('main');
    if (!main) return false;
    const visible = el => Boolean(el && el.checkVisibility());
    const scoreboard = main.querySelector('section[aria-label="Scoreboard"]');
    switch (view) {
      case 'duel': return visible(scoreboard);
      case 'month': return visible(scoreboard) && scoreboard.querySelector('p')?.textContent === 'Monthly duel';
      case 'week': return visible(scoreboard) && scoreboard.querySelector('p')?.textContent === 'Weekly duel';
      case 'battles': return visible(main.querySelector('section[aria-label="Daily battles this week"]'));
      case 'categories': return visible(main.querySelector('section[aria-label="Category breakdown"]'));
      case 'feed': return visible(main.querySelector('[role="feed"][aria-label="Activity timeline"]'));
      case 'ritual': return visible(main.querySelector('#pending-heading')) || visible(main.querySelector('#done-heading'));
      case 'check-in': return visible(main.querySelector('button[aria-label="Mark Personal Project uncompleted for today"]'));
      case 'undo': return visible(main.querySelector('button[aria-label="Mark Personal Project completed"]'));
      default: {
        const heading = { today: 'Today', progress: 'Progress', settings: 'Settings' }[view];
        return Array.from(main.querySelectorAll('h1')).some(h => h.textContent.trim() === heading && visible(h));
      }
    }
  };
}

async function armView(page, view) {
  await page.evaluate(view => {
    window.__navWait = new Promise((resolve, reject) => {
      let done = false;
      const stop = () => { done = true; observer.disconnect(); clearInterval(safety); };
      const check = () => {
        if (done) return;
        if (window.__navReady(view)) {
          const contentAt = performance.now();
          stop();
          // Wait for the frame that shows the content, then read the time in a
          // task queued after that frame paints.
          requestAnimationFrame(() => {
            const channel = new MessageChannel();
            channel.port1.onmessage = () => resolve({ contentAt, paintedAt: performance.now() });
            channel.port2.postMessage(null);
          });
        } else if (performance.now() > deadline) {
          stop();
          reject(new Error(`Timed out waiting for ${view}`));
        }
      };
      const deadline = performance.now() + 15000;
      const observer = new MutationObserver(check);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
      const safety = setInterval(check, 250);
    });
  }, view);
}

async function targetPoint(page, { step, target }) {
  const [selector, text] = target ?? [profile.mobile ? 'nav[aria-label="Main navigation"] button' : 'aside nav button', NAV[step]];
  const locator = page.locator(selector, text ? { hasText: text } : {}).filter({ visible: true });
  // In-page controls can sit below the fold or under the fixed navigation.
  if (target) await locator.evaluate(el => el.scrollIntoView({ block: 'center' }));
  const box = await locator.boundingBox();
  assert.ok(box, `Missing trigger for ${step}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Raw DevTools Protocol input skips Playwright's actionability checks, which
// would otherwise run on the page's main thread right before the tap.
async function sendInput(page, cdp, { x, y }) {
  if (profile.mobile) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return;
  }
  // A pointer rests on a control for a moment before clicking it.
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await page.waitForTimeout(150);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function measureSwitch(page, cdp, from, route, visit) {
  const to = route.step;
  const point = await targetPoint(page, route);
  await page.evaluate(() => { window.__nav.pointerdown = undefined; window.__nav.events = []; window.__nav.frames = []; performance.clearResourceTimings(); });
  await armView(page, to);
  await sendInput(page, cdp, point);
  const { contentAt, paintedAt } = await page.evaluate(() => window.__navWait);
  // Let Event Timing and Long Animation Frame entries for this switch arrive.
  await page.waitForTimeout(60);
  return page.evaluate(({ from, to, visit, contentAt, paintedAt }) => {
    const start = window.__nav.pointerdown;
    const interaction = window.__nav.events.filter(e => e.interactionId && e.start >= start - 1);
    const resources = performance.getEntriesByType('resource')
      .filter(r => r.startTime >= start - 1)
      .map(r => ({ url: new URL(r.name).pathname, start: Math.round(r.startTime - start), duration: Math.round(r.duration), bytes: r.transferSize }));
    return {
      from, to, visit,
      ms: paintedAt - start,
      contentMs: contentAt - start,
      inpMs: interaction.length ? Math.max(...interaction.map(e => e.duration)) : null,
      inputDelayMs: interaction.length ? Math.round(Math.min(...interaction.map(e => e.processingStart - e.start))) : null,
      clickProcessingMs: Math.round(interaction.find(e => e.name === 'click')?.processing ?? 0),
      longFrames: window.__nav.frames.filter(f => f.start >= start - 1 && f.start <= paintedAt).map(f => ({ duration: Math.round(f.duration), blocking: Math.round(f.blocking) })),
      resources,
    };
  }, { from, to, visit, contentAt, paintedAt });
}

function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(values.chrome ? { executablePath: values.chrome } : { channel: 'chrome' }) });
  const results = {
    measuredAt: new Date().toISOString(), browser: browser.version(), profile: values.profile, throttling: profile, samples, idleMs: idle,
    method: 'Production build, local mode with 730 prior days across 20 seeded Habits (14,600 Check-ins). Each sample reloads the document with the HTTP cache retained, waits for Today and an idle period, then switches sections with DevTools Protocol touch (mobile) or mouse input (desktop, hovering 150 ms first). Time runs from the pointerdown event to the first frame painted after the destination content is visible.',
    variants: {},
  };
  const variants = [];
  try {
    for (const [index, url] of urls.entries()) {
      const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.mobile, hasTouch: profile.mobile, deviceScaleFactor: profile.mobile ? 3 : 1, timezoneId: 'Europe/London', reducedMotion: 'reduce' });
      await context.addInitScript(installProbe);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await seed(page);
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: profile.latency, downloadThroughput: profile.down, uploadThroughput: profile.up });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
      variants.push({ name: names[index], url, context, page, cdp, errors, rows: [] });
    }
    // Builds alternate order every sample, so background load affects both.
    // Sample 0 is unmeasured: it fills the HTTP cache like a returning player.
    for (let sample = 0; sample <= samples; sample++) {
      for (const variant of sample % 2 ? variants : [...variants].reverse()) {
        const { page, cdp, url, rows, name } = variant;
        await page.goto(url);
        const loadMs = await (await page.waitForFunction(() => window.__nav.todayPaintedAt)).jsonValue();
        if (sample > 0) rows.push({ from: 'load', to: 'today', visit: 1, ms: loadMs, sample });
        await page.waitForTimeout(idle);
        if (values.trace && sample === 1) await browser.startTracing(page, { path: `${values.trace}-${name}.json`, screenshots: true });
        let from = 'today';
        const visits = {};
        for (const route of ROUTE) {
          visits[route.step] = (visits[route.step] ?? 0) + 1;
          const row = await measureSwitch(page, cdp, from, route, visits[route.step]);
          if (sample > 0) rows.push({ ...row, sample });
          from = route.step;
        }
        if (values.trace && sample === 1) await browser.stopTracing();
      }
    }
    for (const { name, url, errors, rows, context } of variants) {
      await context.close();
      const summary = {};
      for (const row of rows) {
        const key = row.from === 'load' ? 'start→today (page load)' : `${row.from}→${row.to}${row.visit > 1 ? ' (again)' : ''}`;
        (summary[key] ??= []).push(row.ms);
      }
      results.variants[name] = {
        url,
        errors,
        medians: Object.fromEntries(Object.entries(summary).map(([key, list]) => [key, Math.round(median(list) * 10) / 10])),
        worst: Math.round(Math.max(...rows.filter(row => row.from !== 'load').map(row => row.ms)) * 10) / 10,
        samples: rows,
      };
      assert.deepEqual(errors, [], `${name} reported page errors`);
    }
  } finally {
    fs.writeFileSync(output, JSON.stringify(results, null, 2));
    await browser.close();
  }
  const steps = Object.keys(Object.values(results.variants)[0]?.medians ?? {});
  console.log(`\n${values.profile}: median ms over ${samples} samples`);
  console.table(Object.fromEntries(steps.map(step => [step, Object.fromEntries(Object.entries(results.variants).map(([name, variant]) => [name, variant.medians[step]]))])));
  console.log(Object.entries(results.variants).map(([name, variant]) => `${name} worst switch: ${variant.worst} ms`).join('\n'));
})().catch(error => { console.error(error); process.exitCode = 1; });
