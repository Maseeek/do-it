import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDuelPlayers, isDuelProfile, saveDuelColor, type DuelProfile } from './duel-profile';
import { getInitialState } from './seed';
import { PLAYER_COLORS } from './types';

const duel: DuelProfile = {
  id: 'duel', owner_id: 'owner', guest_id: 'guest', owner_name: 'Alex', guest_name: 'Sam',
  invite_code: 'invite', owner_color: 'blue', guest_color: 'purple', owner_invites: 0, guest_invites: 1,
};

describe('Immediate persisted colour selection', () => {
  it('selects immediately during a delayed save, then accepts the returned profile without another fetch', async () => {
    let visible = duel;
    let finish: (value: unknown) => void = () => { throw new Error('Save not started'); };
    const response = new Promise<unknown>(resolve => { finish = resolve; });
    const saving = saveDuelColor(duel, 'maciek', 'teal', value => { visible = value; }, () => response);
    assert.equal(visible.owner_color, 'teal');
    assert.equal(visible.guest_color, 'purple');
    finish({ ...duel, owner_color: 'teal', guest_color: 'orange' });
    await saving;
    assert.equal(visible.owner_color, 'teal');
    assert.equal(visible.guest_color, 'orange');
    const players = getDuelPlayers(getInitialState().players, visible);
    assert.equal(players.maciek.color, PLAYER_COLORS.find(color => color.id === 'teal')?.color);
    assert.equal(players.myrna.color, PLAYER_COLORS.find(color => color.id === 'orange')?.color);
  });

  it('restores the selected option after a rejected conflicting save', async () => {
    let visible = duel;
    await assert.rejects(saveDuelColor(duel, 'myrna', 'blue', value => { visible = value; }, async () => {
      assert.equal(visible.guest_color, 'blue');
      throw new Error('Your opponent is already using that colour.');
    }), /opponent/);
    assert.deepEqual(visible, duel);
  });

  it('rejects malformed or wrong-Duel responses instead of announcing a saved colour', async () => {
    for (const response of [null, {}, { ...duel, id: 'another-duel' }, { ...duel, owner_color: 'unknown' }]) {
      let visible = duel;
      await assert.rejects(saveDuelColor(duel, 'maciek', 'teal', value => { visible = value; }, async () => response), /confirm/);
      assert.deepEqual(visible, duel);
    }
    assert.equal(isDuelProfile({ ...duel, owner_invites: -1 }), false);
  });

  it('shows metadata received on a second device without reloading check-ins', () => {
    const players = getDuelPlayers(getInitialState().players, { ...duel, owner_color: 'green', guest_color: 'gold' });
    assert.equal(players.maciek.name, 'Alex');
    assert.equal(players.maciek.color, PLAYER_COLORS.find(color => color.id === 'green')?.color);
    assert.equal(players.myrna.inviteCount, 1);
  });
});
