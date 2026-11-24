import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHealthProgress,
  getHealthProgressDetails,
  getManualSleepHours,
  formatHealthMetricValue,
} from './health-correlation';
import { Habit, HealthTelemetryRecord, CheckIn } from './types';

const sleepHabit: Habit = {
  id: 'maciek-sleep',
  playerId: 'maciek',
  title: 'Sleep 8.5+ Hours',
  description: 'Track sleep automatically via Google Health',
  category: 'foundation',
  points: 50,
  iconName: 'Moon',
  order: 1,
  isActive: true,
  automation: { metric: 'sleep', target: 8.5 },
};

const stepsHabit: Habit = {
  id: 'maciek-steps',
  playerId: 'maciek',
  title: '10,000 Steps',
  description: 'Walk 10,000 steps daily',
  category: 'cardio',
  points: 30,
  iconName: 'Footprints',
  order: 2,
  isActive: true,
  automation: { metric: 'steps', target: 10000 },
};

test('8 hours against 8.5h goal earns 90% with lime; 9 hours is capped at full green', () => {
  const result8 = calculateHealthProgress(8.0, 8.5, 'sleep');
  assert.equal(result8.tier, 'almost');
  assert.equal(result8.colorName, 'lime');
  assert.equal(result8.qualified, false);
  assert.equal(result8.isLocked, true);
  assert.equal(result8.percentage, 90);
  assert.equal(result8.target, 8.5);

  const result9 = calculateHealthProgress(9.0, 8.5, 'sleep');
  assert.equal(result9.tier, 'perfect');
  assert.equal(result9.colorName, 'green');
  assert.equal(result9.qualified, true);
  assert.equal(result9.isLocked, false);
  assert.equal(result9.percentage, 100);
});

test('custom sleep target adjusts full points and color tiers cleanly', () => {
  const met75 = calculateHealthProgress(7.5, 7.5, 'sleep');
  assert.equal(met75.tier, 'perfect');
  assert.equal(met75.colorName, 'green');
  assert.equal(met75.qualified, true);
  assert.equal(met75.percentage, 100);
  assert.equal(met75.target, 7.5);

  const almost7 = calculateHealthProgress(7.0, 7.5, 'sleep');
  assert.equal(almost7.tier, 'almost');
  assert.equal(almost7.colorName, 'lime');
  assert.equal(almost7.percentage, 90);

  const halfway6 = calculateHealthProgress(6.0, 7.5, 'sleep');
  assert.equal(halfway6.tier, 'halfway');
  assert.equal(halfway6.colorName, 'yellow');
  assert.equal(halfway6.percentage, 40);
});

test('3 hours of sleep correlates to dark orange and is locked', () => {
  const result3 = calculateHealthProgress(3.0, 8.5, 'sleep');
  assert.equal(result3.tier, 'low');
  assert.equal(result3.colorName, 'dark-orange');
  assert.equal(result3.hexColor, '#ea580c');
  assert.equal(result3.qualified, false);
  assert.equal(result3.isLocked, true);
  assert.equal(result3.percentage, 0);
});

test('2 hours or less of sleep correlates to red and is locked', () => {
  const result2 = calculateHealthProgress(2.0, 8.5, 'sleep');
  assert.equal(result2.tier, 'critical');
  assert.equal(result2.colorName, 'red');
  assert.equal(result2.hexColor, '#ef4444');
  assert.equal(result2.qualified, false);
  assert.equal(result2.isLocked, true);
  assert.equal(result2.percentage, 0);

  const result1 = calculateHealthProgress(1.0, 8.5, 'sleep');
  assert.equal(result1.tier, 'critical');
  assert.equal(result1.colorName, 'red');
  assert.equal(result1.isLocked, true);
});

test('sleep colors follow hours independently of reward percentage', () => {
  const result6 = calculateHealthProgress(6.5, 8.5, 'sleep');
  assert.equal(result6.colorName, 'dark-orange');
  assert.equal(result6.percentage, 20);
  assert.equal(result6.isLocked, true);

  const result5 = calculateHealthProgress(7.0, 8.5, 'sleep');
  assert.equal(result5.tier, 'halfway');
  assert.equal(result5.colorName, 'yellow');
  assert.equal(result5.percentage, 40);
  assert.equal(result5.isLocked, true);
  const result75 = calculateHealthProgress(7.5, 8.5, 'sleep');
  assert.equal(result75.colorName, 'lime');
  assert.equal(result75.percentage, 60);
});

test('returns null when no data recorded so habit is left blank and clickable', () => {
  const details = getHealthProgressDetails(sleepHabit, undefined, undefined);
  assert.equal(details, null);
});

test('manual check-in without Google Health telemetry leaves health progress blank', () => {
  const manualCheckIn: CheckIn = {
    id: 'c1',
    habitId: 'maciek-sleep',
    playerId: 'maciek',
    date: '2026-10-11',
    pointsEarned: 50,
    completedAt: new Date().toISOString(),
  };
  const details = getHealthProgressDetails(sleepHabit, undefined, manualCheckIn);
  assert.equal(details, null);
});

test('under-goal telemetry locks habit even if no check-in exists', () => {
  const telemetry: HealthTelemetryRecord = {
    habitId: 'maciek-sleep',
    playerId: 'maciek',
    date: '2026-10-11',
    metric: 'sleep',
    value: 3.0,
    target: 8.0,
    unit: 'hrs',
    source: 'google_health',
  };
  const details = getHealthProgressDetails(sleepHabit, telemetry, undefined);
  assert.ok(details);
  assert.equal(details.isLocked, true);
  assert.equal(details.colorName, 'dark-orange');
  assert.equal(details.value, 3.0);
});

test('correlates steps metric accurately', () => {
  const stepsTelemetry: HealthTelemetryRecord = {
    habitId: 'maciek-steps',
    playerId: 'maciek',
    date: '2026-10-11',
    metric: 'steps',
    value: 4000,
    target: 10000,
    unit: 'steps',
    source: 'google_health',
  };
  const details = getHealthProgressDetails(stepsHabit, stepsTelemetry, undefined);
  assert.ok(details);
  assert.equal(details.colorName, 'dark-orange');
  assert.equal(details.isLocked, true);
  assert.equal(details.formattedValue, '4,000 steps');
});

test("formatHealthMetricValue formats metrics cleanly", () => {
  assert.equal(formatHealthMetricValue(8.25, "sleep"), "8.25 hrs");
  assert.equal(formatHealthMetricValue(6.4999, "sleep"), "6.49 hrs");
  assert.equal(formatHealthMetricValue(10500, "steps"), "10,500 steps");
  assert.equal(formatHealthMetricValue(45, "workout"), "45 min");
});

test('a health check-in without a measured value leaves progress blank', () => {
  const entry: CheckIn = { id: 'unknown', habitId: sleepHabit.id, playerId: 'maciek', date: '2026-10-11', pointsEarned: 50, completedAt: '', source: 'google_health' };
  assert.equal(getHealthProgressDetails(sleepHabit, undefined, entry), null);
});

test('getManualSleepHours reads manual sleep values and ignores Google Health check-ins', () => {
  assert.equal(getManualSleepHours(sleepHabit, undefined), null);
  assert.equal(
    getManualSleepHours(sleepHabit, { id: 'm1', habitId: sleepHabit.id, playerId: 'maciek', date: '2026-10-11', pointsEarned: 30, completedAt: '', healthValue: 7.5 }),
    7.5
  );
  assert.equal(
    getManualSleepHours(sleepHabit, { id: 'm2', habitId: sleepHabit.id, playerId: 'maciek', date: '2026-10-11', pointsEarned: 45, completedAt: '', note: '8 h sleep' }),
    8
  );
  assert.equal(
    getManualSleepHours(sleepHabit, { id: 'm3', habitId: sleepHabit.id, playerId: 'maciek', date: '2026-10-11', pointsEarned: 50, completedAt: '' }),
    8.5
  );
  assert.equal(
    getManualSleepHours(sleepHabit, { id: 'g1', habitId: sleepHabit.id, playerId: 'maciek', date: '2026-10-11', pointsEarned: 45, completedAt: '', source: 'google_health', healthValue: 8 }),
    null
  );
});
