import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMultiplayerEntry, getInviteOutcome } from './invite-navigation';

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

  describe('getInviteOutcome', () => {
    const ownCode = '11111111-1111-1111-1111-111111111111';
    const otherCode = '22222222-2222-2222-2222-222222222222';
    const userId = 'user-1';
    const otherUser = 'user-2';

    it('identifies when an inviter opens their own invite link', () => {
      const outcome = getInviteOutcome({
        inviteCode: ownCode,
        duelInviteCode: ownCode.toUpperCase(),
        userId,
        ownerId: userId,
        hasGuest: false,
      });
      assert.equal(outcome, 'own-invite');
    });

    it('identifies when a guest opens the link of their own joined duel', () => {
      const outcome = getInviteOutcome({
        inviteCode: ownCode,
        duelInviteCode: ownCode,
        userId: otherUser,
        ownerId: userId,
        hasGuest: true,
      });
      assert.equal(outcome, 'already-joined');
    });

    it('identifies when a player in a paired duel opens another invite', () => {
      const outcomeAsOwner = getInviteOutcome({
        inviteCode: otherCode,
        duelInviteCode: ownCode,
        userId,
        ownerId: userId,
        hasGuest: true,
      });
      assert.equal(outcomeAsOwner, 'paired-conflict');

      const outcomeAsGuest = getInviteOutcome({
        inviteCode: otherCode,
        duelInviteCode: ownCode,
        userId: otherUser,
        ownerId: userId,
        hasGuest: true,
      });
      assert.equal(outcomeAsGuest, 'paired-conflict');
    });

    it('identifies when an unpaired solo duel owner can replace their duel', () => {
      const outcome = getInviteOutcome({
        inviteCode: otherCode,
        duelInviteCode: ownCode,
        userId,
        ownerId: userId,
        hasGuest: false,
      });
      assert.equal(outcome, 'solo-replaceable');
    });
  });
});
