import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { fetchDuelRows } from './duel-sync';

// Pagination uses the real HTTP client and must never open a realtime socket.
class HttpOnlyTransport extends EventTarget {
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  readonly readyState = 3;
  readonly url = '';
  readonly protocol = '';
  onopen: WebSocket['onopen'] = null;
  onmessage: WebSocket['onmessage'] = null;
  onclose: WebSocket['onclose'] = null;
  onerror: WebSocket['onerror'] = null;
  constructor() {
    super();
    throw new Error('Pagination must not open a realtime socket');
  }
  close() { throw new Error('Pagination must not use a realtime socket'); }
  send() { throw new Error('Pagination must not use a realtime socket'); }
}

describe('Duel history pagination', () => {
  function createClientFixture(options: {
    totalRows: number;
    pageCap?: number;
    laterPageCap?: number;
    capByOffset?: Record<number, number>;
    delayByOffset?: Record<number, number>;
    constantDelayMs?: number;
    omitCount?: boolean;
    omitCountHeader?: boolean;
    failAtOffset?: number;
  }) {
    const data = Array.from({ length: options.totalRows }, (_, index) => ({
      id: 'row-' + String(index).padStart(6, '0'),
      data: { id: 'item-' + index, name: 'Item ' + index },
    }));
    const queries: { offset: number; exactCount: boolean }[] = [];
    let inFlight = 0;
    let peakInFlight = 0;

    const client = createClient('http://localhost:54321', 'mock-publishable-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: HttpOnlyTransport },
      global: {
        fetch: async (input, init) => {
          inFlight++;
          peakInFlight = Math.max(peakInFlight, inFlight);
          try {
            const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
            assert.ok(['/rest/v1/duel_habits', '/rest/v1/duel_check_ins'].includes(url.pathname));
            assert.equal(init?.method, 'GET');
            assert.equal(url.searchParams.get('select'), 'data');
            assert.equal(url.searchParams.get('duel_id'), 'eq.duel-test');
            assert.equal(url.searchParams.get('order'), 'id.asc');
            const offset = Number(url.searchParams.get('offset') ?? 0);
            const limit = Number(url.searchParams.get('limit'));
            assert.equal(limit, 1000);
            const exactCount = new Headers(init?.headers).get('prefer')?.includes('count=exact') ?? false;
            queries.push({ offset, exactCount });

            if (options.delayByOffset && typeof options.delayByOffset[offset] === 'number') {
              await new Promise(resolve => setTimeout(resolve, options.delayByOffset![offset]));
            } else if (options.constantDelayMs) {
              await new Promise(resolve => setTimeout(resolve, options.constantDelayMs));
            }

            if (offset === options.failAtOffset) {
              return new Response(JSON.stringify({ message: 'Database unavailable', code: 'MOCK_FAILURE' }), { status: 400 });
            }
            const cap = options.capByOffset?.[offset] ?? (offset === 0 ? (options.pageCap ?? limit) : (options.laterPageCap ?? options.pageCap ?? limit));
            const page = data.slice(offset, offset + Math.min(limit, cap));
            const total = exactCount && !options.omitCount ? String(data.length) : '*';
            const range = page.length ? offset + '-' + (offset + page.length - 1) : '*';
            const headers = new Headers({ 'content-type': 'application/json' });
            if (!options.omitCountHeader) headers.set('content-range', range + '/' + total);
            return new Response(JSON.stringify(page), {
              headers,
            });
          } finally {
            inFlight--;
          }
        },
      },
    });
    return { client, queries, getPeakInFlight: () => peakInFlight };
  }

  it('loads an empty history with one exact-count request', async () => {
    const { client, queries, getPeakInFlight } = createClientFixture({ totalRows: 0 });
    assert.deepEqual(await fetchDuelRows(client, 'duel_habits', 'duel-test'), []);
    assert.deepEqual(queries, [{ offset: 0, exactCount: true }]);
    assert.equal(getPeakInFlight(), 1);
  });

  it('stops at the known count for exactly one full page', async () => {
    const { client, queries, getPeakInFlight } = createClientFixture({ totalRows: 1000 });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_habits', 'duel-test');
    assert.equal(rows.length, 1000);
    assert.equal(rows[0].id, 'item-0');
    assert.equal(rows[999].id, 'item-999');
    assert.deepEqual(queries, [{ offset: 0, exactCount: true }]);
    assert.equal(getPeakInFlight(), 1);
  });

  it('loads all pages while requesting the exact count only once', async () => {
    const { client, queries, getPeakInFlight } = createClientFixture({ totalRows: 2500, constantDelayMs: 5 });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_check_ins', 'duel-test');
    assert.equal(rows.length, 2500);
    assert.equal(rows[0].id, 'item-0');
    assert.equal(rows[2499].id, 'item-2499');
    assert.deepEqual(queries, [
      { offset: 0, exactCount: true },
      { offset: 1000, exactCount: false },
      { offset: 2000, exactCount: false },
    ]);
    assert.equal(getPeakInFlight(), 2);
  });

  it('retains full history when the backend caps each page below the requested limit', async () => {
    const { client, queries, getPeakInFlight } = createClientFixture({ totalRows: 1250, pageCap: 400, constantDelayMs: 5 });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_check_ins', 'duel-test');
    assert.equal(rows.length, 1250);
    assert.equal(rows[0].id, 'item-0');
    assert.equal(rows[1249].id, 'item-1249');
    assert.deepEqual(queries, [
      { offset: 0, exactCount: true },
      { offset: 400, exactCount: false },
      { offset: 800, exactCount: false },
      { offset: 1200, exactCount: false },
    ]);
    assert.equal(getPeakInFlight(), 3);
  });

  it('treats a nonnumeric total as unavailable and reads through the empty page', async () => {
    const { client, queries, getPeakInFlight } = createClientFixture({ totalRows: 2500, omitCount: true });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_check_ins', 'duel-test');
    assert.equal(rows.length, 2500);
    assert.deepEqual(queries, [
      { offset: 0, exactCount: true },
      { offset: 1000, exactCount: true },
      { offset: 2000, exactCount: true },
      { offset: 2500, exactCount: true },
    ]);
    assert.equal(getPeakInFlight(), 1);
  });

  it('retains capped history when count headers are missing', async () => {
    const { client, queries, getPeakInFlight } = createClientFixture({ totalRows: 1250, pageCap: 400, omitCountHeader: true });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_check_ins', 'duel-test');
    assert.equal(rows.length, 1250);
    assert.equal(new Set(rows.map(row => row.id)).size, 1250);
    assert.equal(rows[1249].id, 'item-1249');
    assert.deepEqual(queries.map(query => query.offset), [0, 400, 800, 1200, 1250]);
    assert.ok(queries.every(query => query.exactCount));
    assert.equal(getPeakInFlight(), 1);
  });

  it('propagates a later page failure instead of returning partial history', async () => {
    const { client, queries } = createClientFixture({ totalRows: 2500, failAtOffset: 1000 });
    await assert.rejects(fetchDuelRows(client, 'duel_check_ins', 'duel-test'), {
      message: 'Database unavailable', code: 'MOCK_FAILURE',
    });
    assert.deepEqual(queries.map(q => q.offset), [0, 1000, 2000]);
  });

  it('preserves strictly ordered output when parallel page responses arrive out of order', async () => {
    // Delay offset 1000 by 20ms and offset 2000 by 2ms, so offset 2000 arrives first
    const { client, queries, getPeakInFlight } = createClientFixture({
      totalRows: 2500,
      delayByOffset: { 1000: 20, 2000: 2 },
    });
    const rows = await fetchDuelRows<{ id: string; name: string }>(client, 'duel_check_ins', 'duel-test');
    assert.equal(rows.length, 2500);
    assert.equal(rows[0].id, 'item-0');
    assert.equal(rows[999].id, 'item-999');
    assert.equal(rows[1000].id, 'item-1000');
    assert.equal(rows[1999].id, 'item-1999');
    assert.equal(rows[2000].id, 'item-2000');
    assert.equal(rows[2499].id, 'item-2499');
    // Ensure all items are in exact monotonic index order
    for (let i = 0; i < 2500; i++) {
      assert.equal(rows[i].id, 'item-' + i);
    }
    assert.equal(getPeakInFlight(), 2);
    assert.equal(queries.filter(q => q.exactCount).length, 1);
  });

  it('enforces max inflight bound of 3 concurrent requests during large pagination', async () => {
    const { client, queries, getPeakInFlight } = createClientFixture({
      totalRows: 6000,
      constantDelayMs: 5,
    });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_check_ins', 'duel-test');
    assert.equal(rows.length, 6000);
    assert.equal(rows[0].id, 'item-0');
    assert.equal(rows[5999].id, 'item-5999');
    assert.equal(getPeakInFlight(), 3);
    assert.deepEqual(queries.map(q => q.offset), [0, 1000, 2000, 3000, 4000, 5000]);
    assert.equal(queries.filter(q => q.exactCount).length, 1);
  });

  it('safely recovers from a shrinking server cap by discarding speculative pages and continuing serially', async () => {
    // Initial page returns 400 rows, then cap drops to 200 rows.
    // Speculative batch fired for offsets 400, 800, 1200.
    // Offset 400 returns 200 rows. Offsets 800 and 1200 are discarded.
    // Fallback continues serially from 600: 600, 800, 1000, 1200.
    const { client, queries } = createClientFixture({
      totalRows: 1250,
      pageCap: 400,
      laterPageCap: 200,
    });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_check_ins', 'duel-test');
    assert.equal(rows.length, 1250);
    assert.equal(new Set(rows.map(r => r.id)).size, 1250);
    for (let i = 0; i < 1250; i++) {
      assert.equal(rows[i].id, 'item-' + i);
    }
    assert.deepEqual(queries.map(q => q.offset), [0, 400, 800, 1200, 600, 800, 1000, 1200]);
    assert.equal(queries.length, 8);
    // Exact count only requested on first page
    assert.deepEqual(queries.filter(q => q.exactCount).map(q => q.offset), [0]);
  });

  it('uses serial fallback immediately when the last speculative page grows', async () => {
    const { client, queries } = createClientFixture({
      totalRows: 2000, pageCap: 200, laterPageCap: 500,
      capByOffset: { 200: 200, 400: 200 },
    });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_check_ins', 'duel-test');
    assert.deepEqual(rows.map(row => row.id), Array.from({ length: 2000 }, (_, i) => 'item-' + i));
    assert.deepEqual(queries.map(query => query.offset), [0, 200, 400, 600, 1100, 1600]);
  });

  it('safely recovers from a growing server cap by discarding overlapping speculative pages and continuing serially', async () => {
    // Initial page returns 200 rows, then cap increases to 400 rows.
    // Speculative batch fired for offsets 200, 400, 600.
    // Offset 200 returns 400 rows (items 200..599).
    // Speculative pages at 400 and 600 would overlap, so they are discarded.
    // Fallback continues serially from 600: 600, 1000.
    const { client, queries } = createClientFixture({
      totalRows: 1250,
      pageCap: 200,
      laterPageCap: 400,
    });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_check_ins', 'duel-test');
    assert.equal(rows.length, 1250);
    assert.equal(new Set(rows.map(r => r.id)).size, 1250);
    for (let i = 0; i < 1250; i++) {
      assert.equal(rows[i].id, 'item-' + i);
    }
    assert.deepEqual(queries.map(q => q.offset), [0, 200, 400, 600, 600, 1000]);
    assert.equal(queries.length, 6);
    assert.deepEqual(queries.filter(q => q.exactCount).map(q => q.offset), [0]);
  });
});
