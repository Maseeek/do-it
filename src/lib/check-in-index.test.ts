import assert from 'node:assert/strict';
import { test } from 'node:test';
import { indexCheckIns } from './check-in-index';
import { getWeeklyHabitCompletionsCount } from './weekly-utils';
import { getWeekKey } from './date-utils';
import type { CheckIn } from './types';

test('indexed lookups preserve first duplicates and distinct weekly dates across ISO years', () => {
  const checkIns: CheckIn[] = [
    ['a', '2025-12-29'], ['a', '2026-01-01'], ['a', '2026-01-01'],
    ['a', '2026-01-05'], ['b', '2026-01-01'],
  ].map(([habitId, date], index) => ({ id: `${index}`, habitId, date, playerId: 'maciek', pointsEarned: 10, completedAt: `${date}T12:00:00Z` }));
  const indexed = indexCheckIns(checkIns);
  for (const habitId of ['a', 'b', 'missing']) {
    for (const date of ['2025-12-29', '2026-01-01', '2026-01-05', '2026-02-01']) {
      assert.equal(indexed.byHabitAndDate.get(habitId)?.get(date), checkIns.find(c => c.habitId === habitId && c.date === date));
      assert.equal(indexed.weeklyDates.get(habitId)?.get(getWeekKey(date))?.size ?? 0, getWeeklyHabitCompletionsCount(habitId, date, checkIns));
    }
  }
  const changed = indexCheckIns(checkIns.filter(c => c.id !== '1' && c.id !== '2'));
  assert.equal(changed.byHabitAndDate.get('a')?.has('2026-01-01'), false);
  assert.equal(indexed.byHabitAndDate.get('a')?.get('2026-01-01'), checkIns[1]);
});
