import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDuelRows } from './duel-sync';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Duel Rows Pagination and Count Elimination Safety', () => {
  interface MockRow {
    id: string;
    duel_id: string;
    data: { id: string; name: string };
  }

  function createMockSupabaseClient(options: {
    totalRows: number;
    backendPageCap?: number;
    onQuery?: (params: { offset: number; pageSize: number; selectCountOption?: { count?: string } }) => void;
  }): { client: SupabaseClient; getQueries: () => Array<{ offset: number; selectCountOption?: { count?: string } }> } {
    const allData: MockRow[] = Array.from({ length: options.totalRows }, (_, i) => ({
      id: `row-${String(i).padStart(6, '0')}`,
      duel_id: 'duel-test',
      data: { id: `item-${i}`, name: `Item ${i}` },
    }));

    const queries: Array<{ offset: number; selectCountOption?: { count?: string } }> = [];

    const mockClient = {
      from(table: string) {
        assert.ok(table === 'duel_habits' || table === 'duel_check_ins');
        return {
          select(columns: string, selectOptions?: { count?: 'exact' }) {
            assert.equal(columns, 'data');
            return {
              eq(column: string, value: string) {
                assert.equal(column, 'duel_id');
                assert.equal(value, 'duel-test');
                return {
                  order(orderColumn: string) {
                    assert.equal(orderColumn, 'id');
                    return {
                      range(start: number, end: number) {
                        queries.push({ offset: start, selectCountOption: selectOptions });
                        options.onQuery?.({ offset: start, pageSize: end - start + 1, selectCountOption: selectOptions });

                        // Apply server-side max-rows cap if specified
                        const requestedCount = end - start + 1;
                        const effectiveLimit = options.backendPageCap
                          ? Math.min(requestedCount, options.backendPageCap)
                          : requestedCount;

                        const pageRows = allData.slice(start, start + effectiveLimit);
                        return Promise.resolve({
                          data: pageRows,
                          count: selectOptions?.count === 'exact' ? allData.length : null,
                          error: null,
                        });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    } as unknown as SupabaseClient;

    return { client: mockClient, getQueries: () => queries };
  }

  it('pagination returns complete history for 0 rows', async () => {
    const { client, getQueries } = createMockSupabaseClient({ totalRows: 0 });
    const rows = await fetchDuelRows<{ id: string; name: string }>(client, 'duel_habits', 'duel-test');

    assert.deepStrictEqual(rows, []);
    assert.strictEqual(getQueries().length, 1);
    assert.strictEqual(getQueries()[0].selectCountOption?.count, 'exact');
  });

  it('pagination returns complete history for exactly 1000 rows in single query with count', async () => {
    const { client, getQueries } = createMockSupabaseClient({ totalRows: 1000 });
    const rows = await fetchDuelRows<{ id: string; name: string }>(client, 'duel_habits', 'duel-test');

    assert.strictEqual(rows.length, 1000);
    assert.strictEqual(rows[0].id, 'item-0');
    assert.strictEqual(rows[999].id, 'item-999');
    assert.strictEqual(getQueries().length, 1, 'Should complete in 1 page when count matches total rows');
    assert.strictEqual(getQueries()[0].selectCountOption?.count, 'exact');
  });

  it('pagination returns complete history for >1000 rows without repeated count queries', async () => {
    const total = 2500;
    const { client, getQueries } = createMockSupabaseClient({ totalRows: total });
    const rows = await fetchDuelRows<{ id: string; name: string }>(client, 'duel_check_ins', 'duel-test');

    assert.strictEqual(rows.length, 2500);
    assert.strictEqual(rows[0].id, 'item-0');
    assert.strictEqual(rows[2499].id, 'item-2499');

    const queries = getQueries();
    assert.strictEqual(queries.length, 3, '2500 rows should take 3 pages (1000, 1000, 500)');
    // First query requests count exact
    assert.strictEqual(queries[0].selectCountOption?.count, 'exact', 'First query requests count exact');
    // Subsequent queries must NOT request count exact (safely eliminated!)
    assert.strictEqual(queries[1].selectCountOption?.count, undefined, 'Second query eliminates count exact');
    assert.strictEqual(queries[2].selectCountOption?.count, undefined, 'Third query eliminates count exact');
  });

  it('pagination handles PostgREST backend capping page below 1000 without dropping records', async () => {
    // PostgREST max-rows configured to 400, but table has 1250 rows
    const total = 1250;
    const { client, getQueries } = createMockSupabaseClient({
      totalRows: total,
      backendPageCap: 400,
    });

    const rows = await fetchDuelRows<{ id: string; name: string }>(client, 'duel_check_ins', 'duel-test');

    // Must return all 1250 rows without dropping any records!
    assert.strictEqual(rows.length, 1250, 'All 1250 records must be present');
    assert.strictEqual(rows[0].id, 'item-0');
    assert.strictEqual(rows[1249].id, 'item-1249');

    const queries = getQueries();
    // 400 + 400 + 400 + 50 = 1250 (4 queries)
    assert.strictEqual(queries.length, 4);
    assert.strictEqual(queries[0].selectCountOption?.count, 'exact', 'Count requested on page 0');
    assert.strictEqual(queries[1].selectCountOption?.count, undefined, 'Subsequent pages omit count');
    assert.strictEqual(queries[2].selectCountOption?.count, undefined);
    assert.strictEqual(queries[3].selectCountOption?.count, undefined);
  });
});
