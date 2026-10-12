const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parseArgs } = require('node:util');
const { values } = parseArgs({ options: {
  baseline: { type: 'string', default: 'http://localhost:43131/' },
  current: { type: 'string', default: 'http://localhost:43132/' },
  output: { type: 'string', default: '.scratch/duel-performance.json' },
  chrome: { type: 'string' },
  'page-cap': { type: 'string', default: '1000' },
  race: { type: 'boolean', default: false },
} });
const resultPath = path.resolve(values.output);
const root = path.dirname(resultPath);
fs.mkdirSync(root, { recursive: true });
const pageCap = Number(values['page-cap']);
assert.ok(Number.isInteger(pageCap) && pageCap > 0);
const raceOnly = values.race;

const initial = require(path.resolve('.scratch/test-build/seed.js')).getInitialState();
const owner = '11111111-1111-4111-8111-111111111111';
const guest = '22222222-2222-4222-8222-222222222222';
const duelId = '33333333-3333-4333-8333-333333333333';
const user = { id: owner, email: 'performance-owner@local.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const duel = { id: duelId, owner_id: owner, guest_id: guest, owner_name: 'Perf Owner', guest_name: 'Perf Guest', owner_color: 'blue', guest_color: 'purple', invite_code: '44444444-4444-4444-8444-444444444444' };
const results = { measuredAt: new Date().toISOString(), pageCap, method: 'Production copies configured only for a Playwright-routed localhost Supabase mock. 2500 CheckIns, 50ms per HTTP response, real Phoenix subscriptions/events, no live database or auth. Counts verify reload amplification, not hosted latency.', variants: {} };

function makeRows() {
  const checks = [];
  const today = new Date();
  for (let day = 1; day <= 125; day++) {
    const d = new Date(today); d.setDate(d.getDate() - day);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    for (const h of initial.habits) checks.push({ id: `${h.id}-${date}`, habitId: h.id, playerId: h.playerId, date, pointsEarned: h.points, completedAt: `${date}T12:00:00Z` });
  }
  return { duel_habits: initial.habits, duel_check_ins: checks, duel_stakes: [], duel_reactions: [], duel_rest_days: [] };
}

async function until(page, predicate, label) {
  const end = Date.now() + 10000;
  while (!predicate()) {
    if (Date.now() > end) throw new Error('Timeout ' + label);
    await page.waitForTimeout(10);
  }
}

async function verify(browser, name, url) {
  const context = await browser.newContext({ timezoneId: 'Europe/London', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const rows = makeRows();
  const queries = [];
  const writes = [];
  const subscriptions = [];
  const errors = [];
  let phase = 'initial';
  let active = 0;
  let lastQueryAt = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ user, token }) => {
    localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: token, refresh_token: 'local-mock-refresh', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now()/1000)+86400, user }));
    localStorage.setItem('do_it_sound_enabled', 'false');
    localStorage.setItem('do_it_app_data_v2', 'local-history-sentinel');
  }, { user, token: 'eyJhbGciOiJub25lIn0.' + Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now()/1000)+86400, role: 'authenticated' })).toString('base64url') + '.local-mock' });

  await page.route('http://127.0.0.1:54321/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split('/').pop();
    const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' };
    if (table === 'duels') return route.fulfill({ status: 200, headers, body: JSON.stringify([duel]) });
    if (url.pathname === '/auth/v1/user') return route.fulfill({ status: 200, headers, body: JSON.stringify(user) });
    if (!(table in rows)) throw new Error('Unexpected mock request ' + url.pathname);
    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      for (const row of Array.isArray(body) ? body : [body]) {
        assert.equal(row.duel_id, duelId);
        const index = rows[table].findIndex(entry => entry.id === row.id);
        if (index === -1) rows[table].push(row.data); else rows[table][index] = row.data;
        writes.push({ table, method: 'POST', row });
      }
      return route.fulfill({ status: 201, headers, body: '' });
    }
    assert.equal(url.searchParams.get('duel_id'), 'eq.' + duelId);
    if (request.method() === 'DELETE') {
      const id = url.searchParams.get('id').slice(3);
      rows[table] = rows[table].filter(entry => entry.id !== id);
      writes.push({ table, method: 'DELETE', id });
      return route.fulfill({ status: 204, headers, body: '' });
    }
    assert.equal(request.method(), 'GET');
    assert.equal(url.searchParams.get('select'), 'data');
    assert.equal(url.searchParams.get('order'), 'id.asc');
    const start = Number(url.searchParams.get('offset') || 0);
    const limit = Number(url.searchParams.get('limit') || 1000);
    const sorted = [...rows[table]].sort((a,b) => a.id.localeCompare(b.id));
    const selected = sorted.slice(start, start + Math.min(limit, pageCap)).map(data => ({ data }));
    const exact = request.headers().prefer?.includes('count=exact') ?? false;
    queries.push({ phase, table, start, limit, exact, rows: selected.length });
    lastQueryAt = Date.now();
    active++;
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      headers['content-range'] = `${start}-${Math.max(start, start + selected.length - 1)}/${exact ? sorted.length : '*'}`;
      await route.fulfill({ status: 200, headers, body: JSON.stringify(selected) });
    } finally { active--; }
  });

  await page.routeWebSocket('ws://127.0.0.1:54321/**', socket => {
    socket.onMessage(raw => {
      const [joinRef, ref, topic, event, payload] = JSON.parse(String(raw));
      if (event === 'phx_join') {
        const filters = (payload.config?.postgres_changes ?? []).map((filter, index) => ({ ...filter, id: index + 1 }));
        subscriptions.push({ socket, topic, joinRef, filters });
        socket.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: filters } }]));
      } else if (event === 'heartbeat' || event === 'phx_leave') {
        socket.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }]));
      }
    });
  });

  function notify(count) {
    const subscription = subscriptions.find(entry => entry.topic === 'realtime:duel-' + duelId);
    assert.ok(subscription, 'Duel subscription must exist');
    const filter = subscription.filters.find(entry => entry.table === 'duel_check_ins');
    assert.ok(filter);
    for (let i = 0; i < count; i++) {
      subscription.socket.send(JSON.stringify([subscription.joinRef, null, subscription.topic, 'postgres_changes', { ids: [filter.id], data: { schema: 'public', table: 'duel_check_ins', commit_timestamp: new Date().toISOString(), type: 'UPDATE', errors: [], columns: [], record: {}, old_record: {} } }]));
    }
  }

  try {
    await page.goto(url);
    await page.getByText('Daily Ritual', { exact: true }).waitFor();
    await until(page, () => active === 0 && Date.now() - lastQueryAt > 250 && subscriptions.some(s => s.topic === 'realtime:duel-' + duelId), 'initial load');
    const initialQueries = queries.filter(q => q.phase === 'initial');
    const checkPages = Math.ceil(2500 / pageCap);
    assert.equal(initialQueries.filter(q => q.table === 'duel_check_ins').length, checkPages);
    assert.equal(initialQueries.filter(q => q.exact).length, name === 'current' ? 5 : checkPages + 4);
    assert.equal(await page.evaluate(() => localStorage.getItem('do_it_app_data_v2')), 'local-history-sentinel');

    if (raceOnly) {
      phase = 'race';
      await page.evaluate(() => {
        window.raceTrace = [];
        let checkedBefore = false;
        let last;
        window.raceObserver = new MutationObserver(() => {
          const checked = Boolean(document.querySelector('button[aria-label="Mark Gym & Strength uncompleted for today"]'));
          if (checked) checkedBefore = true;
          if (checkedBefore && checked !== last) window.raceTrace.push({ checked, ms: performance.now() });
          last = checked;
        });
        window.raceObserver.observe(document.body, { subtree: true, childList: true, attributes: true });
      });
      notify(1);
      await until(page, () => queries.some(q => q.phase === 'race'), 'race read starts');
      await page.getByRole('button', { name: 'Mark Gym & Strength completed', exact: true }).click();
      await until(page, () => writes.some(w => w.method === 'POST'), 'race write');
      notify(1);
      await until(page, () => active === 0 && Date.now() - lastQueryAt > 250, 'race quiescence');
      const trace = await page.evaluate(() => { window.raceObserver.disconnect(); return window.raceTrace; });
      assert.equal(rows.duel_check_ins.length, 2501);
      const finalChecked = await page.getByRole('button', { name: 'Mark Gym & Strength uncompleted for today', exact: true }).count() === 1;
      assert.equal(finalChecked, true);
      assert.equal(trace.some(entry => !entry.checked), name === 'baseline');
      assert.deepEqual(errors, []);
      return { queries: queries.filter(q => q.phase === 'race'), trace, finalChecked, errors };
    }

    phase = 'burst';
    notify(20);
    await until(page, () => queries.some(q => q.phase === 'burst'), 'burst first request');
    await until(page, () => active === 0 && Date.now() - lastQueryAt > 250, 'burst completion');
    const burst = queries.filter(q => q.phase === 'burst');
    assert.equal(burst.filter(q => q.table === 'duel_check_ins' && q.start === 0).length, name === 'current' ? 1 : 20);
    assert.equal(burst.filter(q => q.exact).length, name === 'current' ? 5 : 20 * (checkPages + 4));

    phase = 'during-load';
    notify(1);
    await until(page, () => queries.some(q => q.phase === 'during-load'), 'follow-up first request');
    notify(5);
    await until(page, () => queries.filter(q => q.phase === 'during-load' && q.table === 'duel_check_ins' && q.start === 0).length >= 2, 'follow-up request');
    await until(page, () => active === 0 && Date.now() - lastQueryAt > 250, 'follow-up completion');
    const during = queries.filter(q => q.phase === 'during-load');
    assert.equal(during.filter(q => q.table === 'duel_check_ins' && q.start === 0).length, name === 'current' ? 2 : 6);

    phase = 'mutation';
    await page.getByRole('button', { name: 'Mark Gym & Strength completed', exact: true }).click();
    await until(page, () => writes.some(w => w.method === 'POST'), 'check-in write');
    const entry = rows.duel_check_ins.find(c => c.habitId === 'maciek-gym' && c.date === new Date().toLocaleDateString('en-CA'));
    assert.equal(entry?.pointsEarned, 40);
    await page.getByRole('button', { name: 'Mark Gym & Strength uncompleted for today', exact: true }).click();
    await until(page, () => writes.some(w => w.method === 'DELETE'), 'undo write');
    assert.equal(rows.duel_check_ins.length, 2500);
    assert.equal(await page.evaluate(() => localStorage.getItem('do_it_app_data_v2')), 'local-history-sentinel');

    fs.writeFileSync(path.join(root, `authenticated-${name}-before-activity.txt`), await page.locator('body').innerText());
    await page.screenshot({ path: path.join(root, `authenticated-${name}-before-activity.png`), fullPage: true });
    await page.getByRole('tab', { name: 'Activity', exact: true }).click({ timeout: 5000 });
    await page.waitForFunction(() => document.body.innerText.includes('The timeline'), null, { timeout: 5000 });
    assert.equal(await page.getByText('2500', { exact: true }).count() > 0, true);
    assert.deepEqual(errors, []);
    return { initialQueries, burst, during, writes: writes.map(w => ({ table: w.table, method: w.method })), errors, localHistoryUntouched: true, visibleHistory: 2500 };
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(values.chrome ? { executablePath: values.chrome } : {}) });
  results.browser = browser.version();
  try {
    for (const [name, url] of [['baseline', values.baseline], ['current', values.current]]) {
      results.variants[name] = await verify(browser, name, url);
      console.log(JSON.stringify({ name, passed: true }));
      fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
    }
  } catch (error) { results.failure = error.message; throw error; }
  finally { fs.writeFileSync(resultPath, JSON.stringify(results, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
