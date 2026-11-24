import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createEgressFixture } from './egress-fixture.mjs';

const { db, owner, guest, outsider, duel } = await createEgressFixture();
const wagersMigration = await fs.readFile(new URL('wagers.sql', import.meta.url), 'utf8');

// Seed duplicate active stakes in the SAME window (2026-W41) plus an active Final Call stake from 2026-W40.
await db.query(`insert into public.duel_stakes values ($1, 'stake-final-call', $2)`, [
  duel,
  { id: 'stake-final-call', period: 'weekly', periodKey: '2026-W40', title: 'Last Week Dinner 🍕', description: 'Final call', status: 'active', dueDate: '2026-10-04' },
]);
await db.query(`insert into public.duel_stakes values ($1, 'stake-dup-old', $2)`, [
  duel,
  { id: 'stake-dup-old', period: 'weekly', periodKey: '2026-W41', title: 'Old Dinner 🍕', description: 'Old', status: 'active', dueDate: '2026-10-05' },
]);
await db.query(`insert into public.duel_stakes values ($1, 'stake-new', $2)`, [
  duel,
  { id: 'stake-new', period: 'weekly', periodKey: '2026-W41', title: 'New Dinner 🍕', description: 'Winner picks', status: 'active', dueDate: '2026-10-11' },
]);

// Apply migration twice to guarantee idempotency.
await db.exec(wagersMigration);
await db.exec(wagersMigration);

// 1. Same-window duplicates deduplicate without deleting history, while Final Call window stays active.
const seeded = (await db.query(`select id, data->>'status' as status from public.duel_stakes where duel_id = $1 order by id`, [duel])).rows;
assert.deepEqual(seeded, [
  { id: 'stake-dup-old', status: 'rolled_over' },
  { id: 'stake-final-call', status: 'active' },
  { id: 'stake-new', status: 'active' },
]);

// 2. Partial unique index rejects direct duplicate active insert for the same (period, periodKey).
await assert.rejects(
  db.query(`insert into public.duel_stakes values ($1, 'stake-dup', $2)`, [
    duel,
    { id: 'stake-dup', period: 'weekly', periodKey: '2026-W41', title: 'Dup', description: '', status: 'active', dueDate: '2026-10-11' },
  ]),
  /duel_stakes_one_active_per_period_key/
);

// 3. Realtime publication trimmed to only lightweight tables (duels, duel_sync_heads).
const pubTables = (await db.query(
  `select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by tablename`
)).rows.map(r => r.tablename);
assert.deepEqual(pubTables, ['duel_sync_heads', 'duels']);

async function asUser(id) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${id}'; set role authenticated;`);
}
async function sync(cursor = null) {
  return (await db.query('select public.sync_duel($1, $2) as value', [duel, cursor])).rows[0].value;
}
async function saveStake(stake) {
  return (await db.query('select public.save_duel_stake($1, $2) as value', [duel, stake])).rows[0].value;
}
async function deleteStake(id) {
  return (await db.query('select public.delete_duel_stake($1, $2) as value', [duel, id])).rows[0].value;
}

await asUser(owner);
const initialSync = await sync();
assert.equal(initialSync.snapshot.stakes.length, 3);

// 4. Unchanged sync_duel short-circuits cleanly.
const unchangedSync = await sync(initialSync.cursor);
assert.equal(unchangedSync.snapshot, null);
assert.deepEqual(unchangedSync.changes, []);

// 5. Concurrent active wager creation for the SAME periodKey merges cleanly into the canonical active row.
const merged = await saveStake({
  id: 'stake-race-client-id',
  period: 'weekly',
  periodKey: '2026-W41',
  title: '  Ramen Night 🍜  ',
  description: '  Loser pays  ',
  status: 'active',
  dueDate: '2026-10-11',
  extraJunk: 'should-be-stripped',
});
assert.equal(merged.changed, true);
assert.equal(merged.previousCursor, initialSync.cursor);
assert.notEqual(merged.cursor, merged.previousCursor);
assert.equal(merged.stake.id, 'stake-new');
assert.equal(merged.stake.title, 'Ramen Night 🍜');
assert.equal(merged.stake.description, 'Loser pays');
assert.equal('extraJunk' in merged.stake, false);

// Creating a new week's wager (2026-W42) does NOT clobber 2026-W41 (supports Final Call overlap).
const nextWeek = await saveStake({
  id: 'stake-w42',
  period: 'weekly',
  periodKey: '2026-W42',
  title: 'Coffee Run ☕',
  description: '',
  status: 'active',
  dueDate: '2026-10-18',
});
assert.equal(nextWeek.changed, true);
assert.equal(nextWeek.stake.id, 'stake-w42');

// 6. No-op edit does NOT bump duel_sync_heads revision or emit sync changes.
const noop = await saveStake({
  id: 'stake-new',
  period: 'weekly',
  periodKey: '2026-W41',
  title: 'Ramen Night 🍜',
  description: 'Loser pays',
  status: 'active',
  dueDate: '2026-10-11',
});
assert.equal(noop.changed, false);
assert.equal(noop.cursor, nextWeek.cursor);
assert.equal(noop.previousCursor, nextWeek.cursor);

// 7. Partner can create a monthly wager independently and scoreboard-settle the closed weekly wager.
await asUser(guest);
const monthly = await saveStake({
  id: 'stake-month-1',
  period: 'monthly',
  periodKey: '2026-10',
  title: 'Spa Day 🧖‍♀️',
  description: 'Full thermal bath',
  status: 'active',
  dueDate: '2026-10-31',
});
assert.equal(monthly.changed, true);
assert.equal(monthly.stake.id, 'stake-month-1');

const settledByGuest = await saveStake({
  id: 'stake-final-call',
  period: 'weekly',
  periodKey: '2026-W40',
  title: 'Last Week Dinner 🍕',
  description: 'Final call',
  status: 'completed',
  winnerId: 'myrna',
  dueDate: '2026-10-04',
});
assert.equal(settledByGuest.changed, true);
assert.equal(settledByGuest.stake.status, 'completed');
assert.equal(settledByGuest.stake.winnerId, 'myrna');

// Identical concurrent scoreboard settlement by owner is a zero-cost no-op (no cursor bump).
await asUser(owner);
const settledByOwner = await saveStake({
  id: 'stake-final-call',
  period: 'weekly',
  periodKey: '2026-W40',
  title: 'Last Week Dinner 🍕',
  description: 'Final call',
  status: 'completed',
  winnerId: 'myrna',
  dueDate: '2026-10-04',
});
assert.equal(settledByOwner.changed, false);
assert.equal(settledByOwner.cursor, settledByGuest.cursor);

// Completing without winnerId is rejected.
await asUser(guest);
await assert.rejects(
  saveStake({
    id: 'stake-month-1',
    period: 'monthly',
    periodKey: '2026-10',
    title: 'Spa Day 🧖‍♀️',
    description: '',
    status: 'completed',
    dueDate: '2026-10-31',
  }),
  /Completed wager requires a winner/
);

// Oversized title is rejected to protect free-tier storage/egress.
await assert.rejects(
  saveStake({
    id: 'stake-huge',
    period: 'weekly',
    periodKey: '2026-W43',
    title: 'x'.repeat(161),
    description: '',
    status: 'active',
    dueDate: '2026-10-25',
  }),
  /1 to 160 characters/
);

// 8. Delete RPC is atomic and idempotent (second delete does not bump revision).
const deleted1 = await deleteStake('stake-month-1');
assert.equal(deleted1.deleted, true);
assert.notEqual(deleted1.cursor, deleted1.previousCursor);

const deleted2 = await deleteStake('stake-month-1');
assert.equal(deleted2.deleted, false);
assert.equal(deleted2.cursor, deleted1.cursor);

// Owner sees the exact delta from initialSync to deleted1.
await asUser(owner);
const ownerDelta = await sync(initialSync.cursor);
assert.equal(ownerDelta.cursor, deleted1.cursor);
assert.equal(ownerDelta.changes.some(c => c.table === 'duel_stakes' && c.id === 'stake-final-call' && c.data.winnerId === 'myrna'), true);
assert.equal(ownerDelta.changes.some(c => c.table === 'duel_stakes' && c.id === 'stake-month-1' && c.deleted === true), true);

// 9. Outsider and anon are denied.
await asUser(outsider);
await assert.rejects(saveStake({
  id: 'stake-evil',
  period: 'weekly',
  periodKey: '2026-W43',
  title: 'Sneaky',
  description: '',
  status: 'active',
  dueDate: '2026-10-25',
}), /Duel unavailable/);
await assert.rejects(deleteStake('stake-new'), /Duel unavailable/);

await db.exec('reset role; set role anon;');
await assert.rejects(
  db.query('select public.save_duel_stake($1, $2)', [duel, {}]),
  /permission denied/
);
await assert.rejects(
  db.query('select public.delete_duel_stake($1, $2)', [duel, 'stake-new']),
  /permission denied/
);

console.log(JSON.stringify({
  migration: 'wagers.sql passes twice without losing history',
  realtimeTables: pubTables,
  checks: [
    'same-window duplicate active wager deduplication',
    'final-call and next-window active wagers coexist',
    'partial unique active-per-(period,periodKey) index',
    'concurrent active wager merge',
    'concurrent deterministic settlement is zero-cost no-op',
    'no-op edit preserves cursor',
    'validation and payload bounds',
    'idempotent delete RPC',
    'sync_duel short-circuit and delta propagation',
    'outsider and anon denial',
    'supabase_realtime publication trimmed',
  ],
}, null, 2));

await db.close();
