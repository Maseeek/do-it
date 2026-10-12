import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCoalescedReloader } from './coalesced-reload';

const settle = () => new Promise<void>(resolve => setImmediate(resolve));
const fail = (error: unknown) => { throw error; };

function deferred() {
  let release: (() => void) | undefined;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, resolve: () => { assert.ok(release); release(); } };
}

test('rapid realtime events share one trailing reload', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let executions = 0;
  const reloader = createCoalescedReloader(async () => { executions++; }, { onError: fail });
  for (let event = 0; event < 5; event++) {
    reloader.schedule();
    t.mock.timers.tick(5);
  }
  t.mock.timers.tick(44);
  assert.equal(executions, 0);
  t.mock.timers.tick(1);
  assert.equal(executions, 1);
  await settle();
  t.mock.timers.tick(1000);
  assert.equal(executions, 1);
});

test('continuous realtime events cannot postpone a reload beyond the maximum wait', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let executions = 0;
  const reloader = createCoalescedReloader(async () => { executions++; }, { onError: fail });
  reloader.schedule();
  for (let event = 0; event < 3; event++) {
    t.mock.timers.tick(40);
    reloader.schedule();
  }
  t.mock.timers.tick(29);
  assert.equal(executions, 0);
  t.mock.timers.tick(1);
  assert.equal(executions, 1);
  await settle();
});

test('an immediate reload replaces a pending debounce timer', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let executions = 0;
  const reloader = createCoalescedReloader(async () => { executions++; }, { onError: fail });
  reloader.schedule();
  t.mock.timers.tick(20);
  reloader.schedule({ immediate: true });
  assert.equal(executions, 1);
  await settle();
  t.mock.timers.tick(1000);
  assert.equal(executions, 1);
});

test('events during a reload request one serialized follow-up', async () => {
  const first = deferred();
  const second = deferred();
  let executions = 0;
  const reloader = createCoalescedReloader(async () => {
    executions++;
    await (executions === 1 ? first.promise : second.promise);
  }, { onError: fail });
  reloader.schedule({ immediate: true });
  reloader.schedule();
  reloader.schedule();
  reloader.schedule({ immediate: true });
  assert.equal(executions, 1);
  first.resolve();
  await settle();
  assert.equal(executions, 2);
  second.resolve();
  await settle();
  assert.equal(executions, 2);
});

test('reload failures surface and a queued follow-up still runs', async () => {
  const first = deferred();
  const expected = new Error('Database connection failed');
  const errors: unknown[] = [];
  let executions = 0;
  const reloader = createCoalescedReloader(async () => {
    executions++;
    if (executions === 1) {
      await first.promise;
      throw expected;
    }
  }, { onError: error => { errors.push(error); } });
  reloader.schedule({ immediate: true });
  reloader.schedule();
  first.resolve();
  await settle();
  assert.deepEqual(errors, [expected]);
  assert.equal(executions, 2);
  reloader.schedule({ immediate: true });
  await settle();
  assert.equal(executions, 3);
});

test('cleanup stops timers and all later requests', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let executions = 0;
  const reloader = createCoalescedReloader(async () => { executions++; }, { onError: fail });
  reloader.schedule();
  reloader.cancel();
  assert.equal(reloader.isCancelled, true);
  t.mock.timers.tick(1000);
  reloader.schedule({ immediate: true });
  reloader.schedule();
  t.mock.timers.tick(1000);
  assert.equal(executions, 0);
});

test('cleanup during a reload stops follow-ups and late error callbacks', async () => {
  const first = deferred();
  let executions = 0;
  const errors: unknown[] = [];
  const reloader = createCoalescedReloader(async () => {
    executions++;
    await first.promise;
    throw new Error('Late network error');
  }, { onError: error => { errors.push(error); } });
  reloader.schedule({ immediate: true });
  reloader.schedule();
  reloader.cancel();
  first.resolve();
  await settle();
  assert.equal(executions, 1);
  assert.deepEqual(errors, []);
});

test('successive Duel effects do not share pending reloads', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let executionsA = 0;
  let executionsB = 0;
  const duelA = createCoalescedReloader(async () => { executionsA++; }, { onError: fail });
  const duelB = createCoalescedReloader(async () => { executionsB++; }, { onError: fail });
  duelA.schedule();
  duelB.schedule();
  duelA.cancel();
  t.mock.timers.tick(50);
  await settle();
  assert.equal(executionsA, 0);
  assert.equal(executionsB, 1);
});
