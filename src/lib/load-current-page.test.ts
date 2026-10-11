import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasAppVersionChanged } from './load-current-page';

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
