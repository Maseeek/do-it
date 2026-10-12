import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeferredResource } from './deferred-resource';

const settle = () => new Promise<void>(resolve => setImmediate(resolve));

test('reading or rendering the server snapshot never imports or activates a deferred view', () => {
  let imports = 0;
  let activations = 0;
  const resource = createDeferredResource(async () => { imports++; return 'view'; }, async load => {
    activations++;
    return load();
  });
  const initial = resource.getSnapshot();
  assert.equal(resource.getSnapshot(), initial);
  assert.equal(resource.getServerSnapshot(), initial);
  assert.equal(imports, 0);
  assert.equal(activations, 0);
});

test('intent preload shares one import but actual activation still runs the deployment guard', async () => {
  let imports = 0;
  let activations = 0;
  let notifications = 0;
  const resource = createDeferredResource(async () => { imports++; return 'view'; }, async load => {
    activations++;
    return load();
  });
  resource.preload();
  resource.preload();
  await settle();
  assert.equal(imports, 1);
  assert.equal(activations, 0);
  assert.equal(resource.getSnapshot().status, 'pending');
  const offA = resource.subscribe(() => { notifications++; });
  const offB = resource.subscribe(() => { notifications++; });
  await settle();
  assert.equal(imports, 1);
  assert.equal(activations, 1);
  assert.equal(notifications, 2);
  assert.deepEqual(resource.getSnapshot(), { status: 'ready', value: 'view' });
  offA(); offB();
  resource.subscribe(() => { notifications++; })();
  await settle();
  assert.equal(activations, 1);
  assert.equal(notifications, 2);
  assert.equal(resource.getServerSnapshot().status, 'pending');
});

test('a pending deployment check prevents importing or publishing a view on actual activation', async () => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let imports = 0;
  const resource = createDeferredResource(async () => { imports++; return 'view'; }, async load => {
    await gate;
    return load();
  });
  const off = resource.subscribe(() => {});
  await settle();
  assert.equal(imports, 0);
  assert.equal(resource.getSnapshot().status, 'pending');
  assert.ok(release);
  release();
  await settle();
  assert.equal(imports, 1);
  assert.equal(resource.getSnapshot().status, 'ready');
  off();
});

test('a failed intent preload remains silent and retries when the Player opens the view', async () => {
  let attempts = 0;
  const resource = createDeferredResource(async () => {
    attempts++;
    if (attempts === 1) throw new Error('Temporary connection failure');
    return 'view';
  });
  resource.preload();
  await settle();
  assert.equal(attempts, 1);
  assert.equal(resource.getSnapshot().status, 'pending');
  const off = resource.subscribe(() => {});
  await settle();
  assert.equal(attempts, 2);
  assert.deepEqual(resource.getSnapshot(), { status: 'ready', value: 'view' });
  off();
});

test('actual activation errors reach the snapshot and unsubscribed views receive no late updates', async () => {
  const error = new Error('View unavailable');
  let reject: ((error: Error) => void) | undefined;
  const pending = new Promise<string>((_, fail) => { reject = fail; });
  let notifications = 0;
  const resource = createDeferredResource(() => pending);
  const off = resource.subscribe(() => { notifications++; });
  await settle();
  off();
  assert.ok(reject);
  reject(error);
  await settle();
  assert.equal(notifications, 0);
  assert.deepEqual(resource.getSnapshot(), { status: 'error', error });
  assert.equal(resource.getServerSnapshot().status, 'pending');
});
