import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_HABITS } from './seed';

describe('Store: URL Automation & Deep Linking (iOS Shortcuts & Siri)', () => {
  it('parses valid quick-log checkin URL action and resolves habit', () => {
    const url = new URL('http://localhost:3000/?action=checkin&habit=maciek-sleep');
    const action = url.searchParams.get('action');
    const habitId = url.searchParams.get('habit');

    assert.strictEqual(action, 'checkin');
    assert.strictEqual(habitId, 'maciek-sleep');

    const targetHabit = INITIAL_HABITS.find((h) => h.id === habitId);
    assert.ok(targetHabit);
    assert.strictEqual(targetHabit.title, 'Sleep 8+ Hours');
    assert.strictEqual(targetHabit.points, 50);
  });

  it('resolves valid tab navigation query parameters', () => {
    const validTabs = ['today', 'duel', 'vault'];

    for (const tab of validTabs) {
      const url = new URL(`http://localhost:3000/?tab=${tab}`);
      const tabParam = url.searchParams.get('tab');
      assert.strictEqual(tabParam, tab);
    }
  });

  it('rejects unrecognized URL actions safely', () => {
    const url = new URL('http://localhost:3000/?action=delete_all&habit=unknown-habit');
    const action = url.searchParams.get('action');
    const habitId = url.searchParams.get('habit');

    assert.notStrictEqual(action, 'checkin');
    const targetHabit = INITIAL_HABITS.find((h) => h.id === habitId);
    assert.strictEqual(targetHabit, undefined);
  });
});
