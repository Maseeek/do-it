import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMultiplayerEntry } from './invite-navigation';

describe('invite navigation', () => {
  it('shows an invitation outcome to a signed-in player who already has a duel', () => {
    assert.equal(getMultiplayerEntry(true, true, true, '00000000-0000-0000-0000-000000000000'), 'invite-conflict');
  });

  it('sends a player without a duel to the join gate', () => {
    assert.equal(getMultiplayerEntry(true, true, false, '00000000-0000-0000-0000-000000000000'), 'gate');
  });

  it('keeps the dashboard for a signed-in player without an invite', () => {
    assert.equal(getMultiplayerEntry(true, true, true, null), 'app');
  });
});
