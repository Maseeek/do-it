import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySleepTarget,
  calculateHealthPoints,
  calculateSleepRewardRatio,
  createManualSleepCheckIn,
  createSleepCheckIn,
  reconcileSleepTelemetry,
} from './health-rewards';
import { calculatePlayerScores } from './score-calculator';
import { rebalanceAllWeeklyCheckIns, rebalanceWeeklyHabitCheckIns } from './weekly-utils';
import { getTodayDateString, getWeekKey } from './date-utils';
import type { CheckIn, Habit, HealthTelemetryRecord } from './types';

const habit: Habit = { id: 'sleep', playerId: 'maciek', title: 'Sleep 8.5 hours', description: 'Full points at 8.5 hours; partial points from 6.5 hours', category: 'foundation', points: 50, iconName: 'Moon', order: 1, isActive: true, automation: { metric: 'sleep', target: 8.5 } };
const date = getTodayDateString();
const telemetry = (value: number): HealthTelemetryRecord => ({ habitId: habit.id, playerId: habit.playerId, date, metric: 'sleep', value, target: 8.5, unit: 'hrs' });

test('sleep rewards match each agreed milestone and cap extra sleep for default 8.5h target', () => {
  for (const [hours, percentage, points] of [[6.5, 20, 10], [7, 40, 20], [7.5, 60, 30], [8, 90, 45], [8.5, 100, 50], [9, 100, 50], [12, 100, 50]]) {
    assert.ok(Math.abs(calculateSleepRewardRatio(hours) * 100 - percentage) < 1e-10);
    assert.equal(calculateHealthPoints(habit, hours), points);
    const entry = createSleepCheckIn(habit, date, hours);
    assert.equal(entry?.pointsEarned, points);
    assert.equal(entry?.healthValue, hours);
  }
});

test('the 6.5-hour cutoff is exact for 8.5h target, including the deliberate reward jump', () => {
  for (const hours of [-1, 0, 3, 6, 6.49, 6.499999, NaN, Infinity]) {
    assert.equal(calculateSleepRewardRatio(hours), 0);
    assert.equal(createSleepCheckIn(habit, date, hours), null);
  }
  assert.equal(calculateHealthPoints(habit, 6.5), 10);
});

test('custom sleep targets shift the reward curve proportionally', () => {
  const sevenHalfGoal = applySleepTarget(habit, 7.5);
  assert.equal(sevenHalfGoal.automation?.target, 7.5);
  assert.equal(sevenHalfGoal.title, 'Sleep 7.5 hours');
  assert.equal(sevenHalfGoal.description, 'Full points at 7.5 hours; partial points from 5.5 hours');

  for (const [hours, percentage, points] of [[5.49, 0, 0], [5.5, 20, 10], [6, 40, 20], [6.5, 60, 30], [7, 90, 45], [7.5, 100, 50], [8.5, 100, 50]]) {
    assert.ok(Math.abs(calculateSleepRewardRatio(hours, 7.5) * 100 - percentage) < 1e-10);
    assert.equal(calculateHealthPoints(sevenHalfGoal, hours), points);
  }

  // Custom titles and descriptions stay untouched when changing sleep goal.
  const customHabit = applySleepTarget({ ...habit, title: 'Beauty Sleep', description: 'Lights out early' }, 9);
  assert.equal(customHabit.title, 'Beauty Sleep');
  assert.equal(customHabit.description, 'Lights out early');
  assert.equal(customHabit.automation?.target, 9);
  assert.equal(calculateHealthPoints(customHabit, 8.5), 45);
  assert.equal(calculateHealthPoints(customHabit, 9), 50);
});

test('intermediate sleep earns interpolated rewards; only final points are rounded', () => {
  for (const [hours, percentage] of [[6.75, 30], [7.25, 50], [7.75, 75], [8.25, 95]]) {
    assert.ok(Math.abs(calculateSleepRewardRatio(hours) * 100 - percentage) < 1e-10);
  }
  assert.equal(calculateHealthPoints(habit, 7.75), 38);
  assert.equal(calculateHealthPoints(habit, 7.51), 30);
  assert.equal(calculateHealthPoints({ ...habit, points: 25 }, 8), 23);
  assert.equal(calculateHealthPoints({ ...habit, automation: { metric: 'sleep', target: 10 } }, 8.5), 20);
  assert.equal(calculateHealthPoints({ ...habit, automation: { metric: 'sleep', target: 10 } }, 10), 50);
});

test('manual sleep slider check-ins award proportional points, preserve custom notes, and stay unlocked', () => {
  const created = createManualSleepCheckIn(habit, date, 7.5, undefined, { today: date, id: 'manual-sleep-1' });
  assert.ok(created);
  assert.equal(created.source, undefined);
  assert.equal(created.healthValue, 7.5);
  assert.equal(created.pointsEarned, 30);
  assert.equal(created.note, '7.5 h sleep');

  const withCustomNote: CheckIn = { ...created, note: 'Slept after late flight' };
  const adjusted = createManualSleepCheckIn(habit, date, 8, withCustomNote, { today: date });
  assert.ok(adjusted);
  assert.equal(adjusted.id, created.id);
  assert.equal(adjusted.healthValue, 8);
  assert.equal(adjusted.pointsEarned, 45);
  assert.equal(adjusted.note, 'Slept after late flight');

  // Sliding below the partial-points cutoff clears the check-in.
  assert.equal(createManualSleepCheckIn(habit, date, 6.25, adjusted, { today: date }), null);
  assert.equal(createManualSleepCheckIn(habit, date, 0, adjusted, { today: date }), null);
});

test('weekly rebalancing preserves partial points for manual sleep slider check-ins', () => {
  const weeklyHabit = { ...habit, weeklyTargetDays: 2 };
  const entries = [
    createManualSleepCheckIn(weeklyHabit, '2026-10-05', 7, undefined, { id: 'm1' }),
    createManualSleepCheckIn(weeklyHabit, '2026-10-06', 7.5, undefined, { id: 'm2' }),
    createManualSleepCheckIn(weeklyHabit, '2026-10-07', 8, undefined, { id: 'm3' }),
  ].filter((entry): entry is CheckIn => entry !== null);
  const balanced = rebalanceAllWeeklyCheckIns(entries, [weeklyHabit]);
  assert.deepEqual(balanced.map(entry => entry.pointsEarned), [20, 30, 0]);
});

test('sync replaces an earlier manual reward with measured sleep, preserves proof, and updates idempotently', () => {
  const manual: CheckIn = { id: 'manual', habitId: habit.id, playerId: habit.playerId, date, pointsEarned: 50, completedAt: '2026-10-01T12:00:00Z', proofUrl: 'proof.jpg' };
  const first = reconcileSleepTelemetry([manual], habit, telemetry(7.5));
  assert.equal(first.length, 1);
  assert.equal(first[0].pointsEarned, 30);
  assert.equal(first[0].source, 'google_health');
  assert.equal(first[0].proofUrl, 'proof.jpg');
  assert.equal(first[0].id, manual.id);
  assert.deepEqual(reconcileSleepTelemetry(first, habit, telemetry(7.5)), first);
  const revised = reconcileSleepTelemetry(first, habit, telemetry(8));
  assert.equal(revised[0].pointsEarned, 45);
  assert.equal(revised[0].completedAt, manual.completedAt);
  assert.deepEqual(reconcileSleepTelemetry(revised, habit, telemetry(6.49)), []);
});

test('a sync result awards partial points to all score windows and lifetime Karma', () => {
  const entries = reconcileSleepTelemetry([], habit, telemetry(7.5));
  const score = calculatePlayerScores(habit.playerId, entries, [habit], [], date);
  for (const points of [score.today, score.weekly, score.monthly, score.yearly, score.karma]) assert.equal(points, 30);
});

test('weekly rebalancing preserves partial rewards and restores them when a capped session becomes eligible', () => {
  const weeklyHabit = { ...habit, weeklyTargetDays: 2 };
  const entries = [
    createSleepCheckIn(weeklyHabit, '2026-10-05', 7),
    createSleepCheckIn(weeklyHabit, '2026-10-06', 7.5),
    createSleepCheckIn(weeklyHabit, '2026-10-07', 8),
  ].filter((entry): entry is CheckIn => entry !== null);
  const balanced = rebalanceAllWeeklyCheckIns(entries, [weeklyHabit]);
  assert.deepEqual(balanced.map(entry => entry.pointsEarned), [20, 30, 0]);
  const restored = rebalanceWeeklyHabitCheckIns(balanced.slice(1), weeklyHabit, getWeekKey('2026-10-07'));
  assert.deepEqual(restored.map(entry => entry.pointsEarned), [30, 45]);
});

test('unrelated players and dates remain intact; invalid telemetry does not change rewards', () => {
  const other: CheckIn = { id: 'other', habitId: 'other', playerId: 'myrna', date, pointsEarned: 50, completedAt: '' };
  const entries = [other];
  assert.equal(reconcileSleepTelemetry(entries, habit, { ...telemetry(8), playerId: 'myrna' }), entries);
  assert.equal(reconcileSleepTelemetry(entries, habit, telemetry(NaN)), entries);
  assert.equal(reconcileSleepTelemetry(entries, habit, telemetry(7.5))[0], other);
});

test('steps and workout still require their full target; manual sleep without telemetry stays unchanged', () => {
  for (const metric of ['steps', 'workout', 'cardio'] satisfies Array<'steps' | 'workout' | 'cardio'>) {
    const other = { ...habit, automation: { metric, target: 100 } };
    assert.equal(calculateHealthPoints(other, 99), 0);
    assert.equal(calculateHealthPoints(other, 100), 50);
    assert.equal(calculateHealthPoints(other, 120), 50);
  }
  const manual: CheckIn = { id: 'manual', habitId: habit.id, playerId: habit.playerId, date, pointsEarned: 50, completedAt: '' };
  assert.deepEqual(rebalanceAllWeeklyCheckIns([manual], [{ ...habit, weeklyTargetDays: 1 }]), [manual]);
});
