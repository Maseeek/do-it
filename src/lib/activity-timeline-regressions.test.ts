import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTimelineItems, compareTimelineItems, filterTimelineItems, parseTimelineTimestamp } from './activity-timeline';
import { getInitialState } from './seed';
import type { CheckIn, CouplesReaction, Habit, PlayerId } from './types';

const state = getInitialState();
function reading(playerId: PlayerId): Habit {
  const found = state.habits.find(item => item.id === playerId + '-reading');
  assert.ok(found);
  return found;
}
function check(id: string, item: Habit, date: string, completedAt: string, note?: string): CheckIn {
  return { id, habitId: item.id, playerId: item.playerId, date, completedAt, pointsEarned: 25, note };
}

test('Activity sorts backdated records by completion time and retains stable ties and timezone offsets', () => {
  const owner = reading('maciek');
  const guest = reading('myrna');
  const checkIns = [
    check('offset', owner, '2026-10-12', '2026-10-12T12:00:00+02:00'),
    check('old', owner, '2024-01-01', '2024-01-01T12:00:00Z', 'An older reflection'),
    check('backdated', owner, '2026-10-01', '2026-10-12T11:00:00Z'),
    check('tie', guest, '2026-10-12', '2026-10-12T10:00:00Z'),
    check('fallback', owner, '2026-10-11', ''),
  ];
  const reactions: CouplesReaction[] = [{ id: 'reaction', fromPlayerId: 'myrna', toPlayerId: 'maciek',
    emoji: 'x', message: 'Nice progress', timestamp: '2026-10-12T10:00:00Z' }];
  const items = buildTimelineItems({ checkIns, habits: state.habits, players: state.players, reactions });
  assert.deepEqual(items.map(item => item.id), ['backdated', 'offset', 'tie', 'reaction', 'fallback', 'old']);
  const options = { feedFilter: 'all', playerFilter: 'everyone', activePlayerId: 'maciek', partnerId: 'myrna', search: '' } as const;
  assert.deepEqual(filterTimelineItems(items, { ...options, search: 'older reflection' }).map(item => item.id), ['old']);
  assert.deepEqual(filterTimelineItems(items, { ...options, playerFilter: 'partner' }).map(item => item.id), ['tie', 'reaction']);
  assert.deepEqual(filterTimelineItems(items, { ...options, feedFilter: 'reaction' }).map(item => item.id), ['reaction']);
  assert.deepEqual(filterTimelineItems(items, { ...options, playerFilter: 'me' }).map(item => item.id), ['backdated', 'offset', 'fallback', 'old']);
});

test('Activity search includes records older than the initial visible page without truncating counts', () => {
  const owner = reading('maciek');
  const checkIns = Array.from({ length: 80 }, (_, index) => {
    const date = '2026-01-' + String(index % 28 + 1).padStart(2, '0');
    return check('record-' + index, owner, date, date + 'T12:00:00Z', index === 0 ? 'Rare archive note' : undefined);
  });
  const items = buildTimelineItems({ checkIns, habits: state.habits, players: state.players, reactions: [] });
  assert.equal(items.length, 80);
  const found = filterTimelineItems(items, { feedFilter: 'check_in', playerFilter: 'everyone',
    activePlayerId: 'maciek', partnerId: 'myrna', search: 'RARE ARCHIVE' });
  assert.deepEqual(found.map(item => item.id), ['record-0']);
});

test('Activity timestamp comparison retains missing, invalid and equal timestamp behavior', () => {
  assert.equal(parseTimelineTimestamp('2026-10-12T12:00:00+02:00'), Date.parse('2026-10-12T10:00:00Z'));
  assert.ok(Number.isNaN(parseTimelineTimestamp(undefined)));
  assert.ok(Number.isNaN(parseTimelineTimestamp('invalid')));
  assert.equal(compareTimelineItems({ timestampMs: 10 }, { timestampMs: 10 }), 0);
  assert.equal(compareTimelineItems({ timestampMs: NaN }, { timestampMs: 10 }), 0);
});
