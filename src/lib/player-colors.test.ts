import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPlayerColorUnlocked } from './player-colors';

describe('Domain: Karma-gated player colors', () => {
  it('keeps colors locked immediately below each lifetime-point threshold', () => {
    assert.equal(isPlayerColorUnlocked('teal', 249), false);
    assert.equal(isPlayerColorUnlocked('orange', 499), false);
    assert.equal(isPlayerColorUnlocked('pink', 999), false);
    assert.equal(isPlayerColorUnlocked('green', 2499), false);
    assert.equal(isPlayerColorUnlocked('rainbow', 9999), false);
  });

  it('unlocks each color at its exact lifetime-point milestone', () => {
    assert.equal(isPlayerColorUnlocked('teal', 250), true);
    assert.equal(isPlayerColorUnlocked('orange', 500), true);
    assert.equal(isPlayerColorUnlocked('pink', 1000), true);
    assert.equal(isPlayerColorUnlocked('green', 2500), true);
    assert.equal(isPlayerColorUnlocked('rainbow', 10000), true);
  });

  it('keeps the default blue and purple colors available from the start', () => {
    assert.equal(isPlayerColorUnlocked('blue', 0), true);
    assert.equal(isPlayerColorUnlocked('purple', 0), true);
  });
});
