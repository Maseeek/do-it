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
    omitCount?: boolean;
    omitCountHeader?: boolean;
    failAtOffset?: number;
  }) {
    const data = Array.from({ length: options.totalRows }, (_, index) => ({
      id: 'row-' + String(index).padStart(6, '0'),
      data: { id: 'item-' + index, name: 'Item ' + index },
    }));
    const queries: { offset: number; exactCount: boolean }[] = [];
    const client = createClient('http://localhost:54321', 'mock-publishable-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: HttpOnlyTransport },
      global: {
        fetch: async (input, init) => {
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
          if (offset === options.failAtOffset) {
            return new Response(JSON.stringify({ message: 'Database unavailable', code: 'MOCK_FAILURE' }), { status: 400 });
          }
          const page = data.slice(offset, offset + Math.min(limit, options.pageCap ?? limit));
          const total = exactCount && !options.omitCount ? String(data.length) : '*';
          const range = page.length ? offset + '-' + (offset + page.length - 1) : '*';
          const headers = new Headers({ 'content-type': 'application/json' });
          if (!options.omitCountHeader) headers.set('content-range', range + '/' + total);
          return new Response(JSON.stringify(page), {
            headers,
          });
        },
      },
    });
    return { client, queries };
  }

  it('loads an empty history with one exact-count request', async () => {
    const { client, queries } = createClientFixture({ totalRows: 0 });
    assert.deepEqual(await fetchDuelRows(client, 'duel_habits', 'duel-test'), []);
    assert.deepEqual(queries, [{ offset: 0, exactCount: true }]);
  });

  it('stops at the known count for exactly one full page', async () => {
    const { client, queries } = createClientFixture({ totalRows: 1000 });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_habits', 'duel-test');
    assert.equal(rows.length, 1000);
    assert.equal(rows[0].id, 'item-0');
    assert.equal(rows[999].id, 'item-999');
    assert.deepEqual(queries, [{ offset: 0, exactCount: true }]);
  });

  it('loads all pages while requesting the exact count only once', async () => {
    const { client, queries } = createClientFixture({ totalRows: 2500 });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_check_ins', 'duel-test');
    assert.equal(rows.length, 2500);
    assert.equal(rows[0].id, 'item-0');
    assert.equal(rows[2499].id, 'item-2499');
    assert.deepEqual(queries, [
      { offset: 0, exactCount: true },
      { offset: 1000, exactCount: false },
      { offset: 2000, exactCount: false },
    ]);
  });

  it('retains full history when the backend caps each page below the requested limit', async () => {
    const { client, queries } = createClientFixture({ totalRows: 1250, pageCap: 400 });
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
  });

  it('treats a nonnumeric total as unavailable and reads through the empty page', async () => {
    const { client, queries } = createClientFixture({ totalRows: 2500, omitCount: true });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_check_ins', 'duel-test');
    assert.equal(rows.length, 2500);
    assert.deepEqual(queries, [
      { offset: 0, exactCount: true },
      { offset: 1000, exactCount: true },
      { offset: 2000, exactCount: true },
      { offset: 2500, exactCount: true },
    ]);
  });

  it('retains capped history when count headers are missing', async () => {
    const { client, queries } = createClientFixture({ totalRows: 1250, pageCap: 400, omitCountHeader: true });
    const rows = await fetchDuelRows<{ id: string }>(client, 'duel_check_ins', 'duel-test');
    assert.equal(rows.length, 1250);
    assert.equal(new Set(rows.map(row => row.id)).size, 1250);
    assert.equal(rows[1249].id, 'item-1249');
    assert.deepEqual(queries.map(query => query.offset), [0, 400, 800, 1200, 1250]);
    assert.ok(queries.every(query => query.exactCount));
  });

  it('propagates a later page failure instead of returning partial history', async () => {
    const { client, queries } = createClientFixture({ totalRows: 2500, failAtOffset: 1000 });
    await assert.rejects(fetchDuelRows(client, 'duel_check_ins', 'duel-test'), {
      message: 'Database unavailable', code: 'MOCK_FAILURE',
    });
    assert.equal(queries.length, 2);
  });
});
