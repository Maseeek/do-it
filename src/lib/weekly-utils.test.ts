import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rebalanceAllWeeklyCheckIns, rebalanceWeeklyHabitCheckIns } from './weekly-utils';
import { getWeekKey } from './date-utils';
import { getInitialState } from './seed';
import type { CheckIn } from './types';

test('grouped rebalancing preserves chronology, quantity caps, other habits and unchanged references', () => {
  const initial = getInitialState();
  const habit = { ...initial.habits[0], id: 'weekly', weeklyTargetDays: 2, isQuantitative: true, pointsPerUnit: 2, points: 10 };
  const second = { ...habit, id: 'second', weeklyTargetDays: 1 };
  const dates = ['2026-01-02', '2025-12-29', '2026-01-01', '2026-01-01', '2026-01-05'];
  const checkIns: CheckIn[] = dates.map((date, index) => ({ id: `${index}`, habitId: habit.id, playerId: habit.playerId, date, pointsEarned: 100, quantity: index + 1, completedAt: `${date}T${index === 2 ? '13' : '12'}:00:00Z` }));
  checkIns.push({ ...checkIns[0], id: 'second', habitId: second.id }, { ...checkIns[0], id: 'daily', habitId: initial.habits[0].id });
  const habits = [habit, second, initial.habits[0]];
  let expected = checkIns;
  for (const weeklyHabit of [habit, second]) {
    for (const week of new Set(checkIns.filter(c => c.habitId === weeklyHabit.id).map(c => getWeekKey(c.date)))) {
      expected = rebalanceWeeklyHabitCheckIns(expected, weeklyHabit, week);
    }
  }
  const result = rebalanceAllWeeklyCheckIns(checkIns, habits);
  assert.deepEqual(result, expected);
  assert.equal(result.find(c => c.id === 'daily'), checkIns.at(-1));
  assert.equal(result.find(c => c.id === '1')?.pointsEarned, 4);
  assert.equal(result.find(c => c.id === '3')?.pointsEarned, 8);
  assert.equal(result.find(c => c.id === '2')?.pointsEarned, 0);
  assert.equal(checkIns[0].pointsEarned, 100);
  assert.equal(rebalanceAllWeeklyCheckIns(result, habits), result);
});
