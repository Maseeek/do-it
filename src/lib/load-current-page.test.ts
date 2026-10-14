import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { hasAppVersionChanged } from './load-current-page';
import { createDeferredResource } from './deferred-resource';

test('detects a new deployment before requesting its old lazy chunks', () => {
  assert.equal(hasAppVersionChanged('deployment-a', { version: 'deployment-b' }), true);
  assert.equal(hasAppVersionChanged('deployment-a', { version: 'deployment-a' }), false);
});

test('missing or invalid version responses cannot force an update reload', () => {
  for (const response of [null, {}, { version: '' }, { version: 123 }, 'deployment-b']) {
    assert.equal(hasAppVersionChanged('deployment-a', response), false);
  }
  assert.equal(hasAppVersionChanged('', { version: 'deployment-b' }), false);
  assert.equal(hasAppVersionChanged(undefined, { version: 'deployment-b' }), false);
});

const settle = () => new Promise<void>(resolve => setImmediate(resolve));

function browser(t: TestContext, fetchVersion: typeof fetch, onLine = true) {
  const originals = new Map(['window', 'navigator', 'fetch'].map(name =>
    [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const previousVersion = process.env.NEXT_PUBLIC_APP_VERSION;
  const storage = new Map<string, string>();
  const navigations: string[] = [];
  const values = {
    window: {
      sessionStorage: { getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => { storage.set(key, value); } },
      location: { href: 'https://app.example.test/?action=checkin&habit=reading&invite=code',
        replace: (url: string) => { navigations.push(url); } },
    },
    navigator: { onLine },
    fetch: fetchVersion,
  };
  for (const [name, value] of Object.entries(values)) {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  process.env.NEXT_PUBLIC_APP_VERSION = 'deployment-old';
  t.after(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    if (previousVersion === undefined) delete process.env.NEXT_PUBLIC_APP_VERSION;
    else process.env.NEXT_PUBLIC_APP_VERSION = previousVersion;
  });
  return { storage, navigations };
}

test('deferred views honor actual deployment recovery before importing and cannot loop reloads', async t => {
  const context = browser(t, async () => new Response(JSON.stringify({ version: 'deployment-new' })));
  let imports = 0;
  const resource = createDeferredResource(async () => { imports++; return 'old view'; });
  const off = resource.subscribe(() => {});
  await settle();
  assert.equal(imports, 0);
  assert.equal(resource.getSnapshot().status, 'pending');
  assert.deepEqual(context.navigations, ['/?tab=today&invite=code']);
  off();
  const second = createDeferredResource(async () => { imports++; return 'old view'; });
  const offSecond = second.subscribe(() => {});
  await settle();
  const snapshot = second.getSnapshot();
  assert.equal(snapshot.status, 'error');
  assert.equal(imports, 0);
  assert.equal(context.navigations.length, 1);
  offSecond();
});

test('deferred views stay usable when the deployment endpoint is unavailable', async t => {
  const context = browser(t, async () => { throw new TypeError('Network unavailable'); });
  const resource = createDeferredResource(async () => 'cached view');
  const off = resource.subscribe(() => {});
  await settle();
  assert.deepEqual(resource.getSnapshot(), { status: 'ready', value: 'cached view' });
  assert.deepEqual(context.navigations, []);
  off();
});

test('offline deferred views do not issue a deployment request', async t => {
  let requests = 0;
  browser(t, async () => { requests++; return new Response('{}'); }, false);
  const resource = createDeferredResource(async () => 'offline view');
  const off = resource.subscribe(() => {});
  await settle();
  assert.equal(requests, 0);
  assert.deepEqual(resource.getSnapshot(), { status: 'ready', value: 'offline view' });
  off();
});
