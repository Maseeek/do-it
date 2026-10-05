import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlayerScores, calculateHabitStreak, calculateWeeklyHabitStreak } from './score-calculator';
import { CheckIn, Habit, RestDay } from './types';

const dailyHabit: Habit = {
  id: 'daily',
  playerId: 'maciek',
  title: 'Daily habit',
  description: 'Daily streak fixture',
  category: 'physical',
  points: 10,
  iconName: 'Dumbbell',
  frequency: 'daily',
  order: 0,
  isActive: true,
};
const weeklyHabit: Habit = {
  ...dailyHabit,
  id: 'weekly',
  frequency: 'weekly',
  weeklyTargetDays: 3,
};

test('daily streaks count distinct completion dates and bridge only the player\'s rest days', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 0, 5, 12) });
  const checkIns: CheckIn[] = ['2026-01-04', '2026-01-04', '2026-01-02'].map((date, index) => ({
    id: `daily-${index}`,
    habitId: dailyHabit.id,
    playerId: 'maciek',
    date,
    pointsEarned: 10,
    completedAt: `${date}T12:00:00Z`,
  }));
  checkIns.push({ id: 'partner', habitId: 'partner-habit', playerId: 'myrna', date: '2026-01-05', pointsEarned: 100, completedAt: '2026-01-05T12:00:00Z' });
  const restDays: RestDay[] = ['2026-01-05', '2026-01-03'].map((date) => ({
    id: `rest-${date}`, playerId: 'maciek', date, createdAt: `${date}T12:00:00Z`,
  }));
  restDays.push({ id: 'partner-rest', playerId: 'myrna', date: '2026-01-01', createdAt: '2026-01-01T12:00:00Z' });

  assert.equal(calculateHabitStreak(dailyHabit, checkIns, restDays), 2);
  assert.deepEqual(calculatePlayerScores('maciek', checkIns, [dailyHabit], restDays), {
    today: 0, weekly: 0, monthly: 30, yearly: 30, karma: 30,
    currentStreak: 2, completionRateWeekly: 0, restDaysUsed: 2,
  });
});

test('weekly streaks group Monday-to-Sunday dates across the ISO year and ignore later weeks', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 0, 7, 12) });
  const dates = [
    '2026-01-05', '2026-01-06', '2026-01-07',
    '2025-12-29', '2025-12-30', '2026-01-01', '2026-01-01',
    '2025-12-22', '2025-12-23', '2025-12-24',
    '2025-12-15',
    '2026-01-19', '2026-01-20', '2026-01-21',
  ];
  const checkIns: CheckIn[] = dates.map((date, index) => ({
    id: `weekly-${index}`, habitId: weeklyHabit.id, playerId: 'maciek', date,
    pointsEarned: 10, completedAt: `${date}T12:00:00Z`,
  }));
  for (const date of ['2025-12-16', '2025-12-17']) {
    checkIns.push({ id: `other-${date}`, habitId: dailyHabit.id, playerId: 'maciek', date, pointsEarned: 10, completedAt: `${date}T12:00:00Z` });
  }

  assert.equal(calculateWeeklyHabitStreak(weeklyHabit, checkIns), 3);
});

test('an incomplete current week preserves the previous streak, but duplicate dates cannot meet a weekly target', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 0, 5, 12) });
  const checkIns: CheckIn[] = ['2026-01-05', '2025-12-29', '2025-12-30', '2026-01-01'].map((date, index) => ({
    id: `partial-${index}`, habitId: weeklyHabit.id, playerId: 'maciek', date,
    pointsEarned: 10, completedAt: `${date}T12:00:00Z`,
  }));
  assert.equal(calculateWeeklyHabitStreak(weeklyHabit, checkIns), 1);

  checkIns[3] = { ...checkIns[3], date: '2025-12-30', completedAt: '2025-12-30T13:00:00Z' };
  assert.equal(calculateWeeklyHabitStreak(weeklyHabit, checkIns), 0);
});
