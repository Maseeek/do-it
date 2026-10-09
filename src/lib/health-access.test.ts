import { test } from 'node:test';
import assert from 'node:assert/strict';
import { healthEnabled } from './health-access';

const owner = '11111111-1111-1111-1111-111111111111';
const partner = '22222222-2222-2222-2222-222222222222';
const stranger = '33333333-3333-3333-3333-333333333333';

function withConfig(enabled: string, allowedIds: string, run: () => void) {
  const previousEnabled = process.env.GOOGLE_HEALTH_ENABLED;
  const previousIds = process.env.GOOGLE_HEALTH_ALLOWED_USER_IDS;
  process.env.GOOGLE_HEALTH_ENABLED = enabled;
  process.env.GOOGLE_HEALTH_ALLOWED_USER_IDS = allowedIds;
  try { run(); }
  finally {
    if (previousEnabled === undefined) delete process.env.GOOGLE_HEALTH_ENABLED;
    else process.env.GOOGLE_HEALTH_ENABLED = previousEnabled;
    if (previousIds === undefined) delete process.env.GOOGLE_HEALTH_ALLOWED_USER_IDS;
    else process.env.GOOGLE_HEALTH_ALLOWED_USER_IDS = previousIds;
  }
}

test('private health access accepts only complete allowlisted account IDs', () => {
  withConfig('false', ` , ${owner}, ${partner},, `, () => {
    assert.equal(healthEnabled(), true);
    assert.equal(healthEnabled(owner), true);
    assert.equal(healthEnabled(partner), true);
    for (const id of [stranger, '', owner.slice(0, -1), `${owner}extra`]) {
      assert.equal(healthEnabled(id), false);
    }
  });
});

test('empty allowlists leave health disabled even when they contain separators', () => {
  withConfig('false', ' , , ', () => {
    assert.equal(healthEnabled(), false);
    assert.equal(healthEnabled(owner), false);
  });
});

test('removing an account from a private rollout revokes its access immediately', () => {
  withConfig('false', owner, () => {
    assert.equal(healthEnabled(owner), true);
    process.env.GOOGLE_HEALTH_ALLOWED_USER_IDS = partner;
    assert.equal(healthEnabled(owner), false);
    assert.equal(healthEnabled(partner), true);
  });
});

test('explicit public enablement allows accounts outside the private rollout', () => {
  withConfig('true', owner, () => {
    assert.equal(healthEnabled(stranger), true);
  });
});
