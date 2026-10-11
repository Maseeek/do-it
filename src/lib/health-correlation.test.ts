import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHealthProgress,
  getHealthProgressDetails,
  formatHealthMetricValue,
} from './health-correlation';
import { Habit, HealthTelemetryRecord, CheckIn } from './types';

const sleepHabit: Habit = {
  id: 'maciek-sleep',
  playerId: 'maciek',
  title: 'Sleep 8+ Hours',
  description: 'Track sleep automatically via Google Health',
  category: 'foundation',
  points: 50,
  iconName: 'Moon',
  order: 1,
  isActive: true,
  automation: { metric: 'sleep', target: 8.0 },
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

test('8 or 9 hours of sleep is perfect green and unlocked', () => {
  const result8 = calculateHealthProgress(8.0, 8.0, 'sleep');
  assert.equal(result8.tier, 'perfect');
  assert.equal(result8.colorName, 'green');
  assert.equal(result8.hexColor, '#10b981');
  assert.equal(result8.qualified, true);
  assert.equal(result8.isLocked, false);
  assert.equal(result8.percentage, 100);

  const result9 = calculateHealthProgress(9.0, 8.0, 'sleep');
  assert.equal(result9.tier, 'perfect');
  assert.equal(result9.colorName, 'green');
  assert.equal(result9.qualified, true);
  assert.equal(result9.isLocked, false);
  assert.equal(result9.percentage, 113);
});

test('3 hours of sleep correlates to dark orange and is locked', () => {
  const result3 = calculateHealthProgress(3.0, 8.0, 'sleep');
  assert.equal(result3.tier, 'low');
  assert.equal(result3.colorName, 'dark-orange');
  assert.equal(result3.hexColor, '#ea580c');
  assert.equal(result3.qualified, false);
  assert.equal(result3.isLocked, true);
  assert.equal(result3.percentage, 38);
});

test('2 hours or less of sleep correlates to red and is locked', () => {
  const result2 = calculateHealthProgress(2.0, 8.0, 'sleep');
  assert.equal(result2.tier, 'critical');
  assert.equal(result2.colorName, 'red');
  assert.equal(result2.hexColor, '#ef4444');
  assert.equal(result2.qualified, false);
  assert.equal(result2.isLocked, true);
  assert.equal(result2.percentage, 25);

  const result1 = calculateHealthProgress(1.0, 8.0, 'sleep');
  assert.equal(result1.tier, 'critical');
  assert.equal(result1.colorName, 'red');
  assert.equal(result1.isLocked, true);
});

test('intermediate values map to lime and yellow', () => {
  const result6 = calculateHealthProgress(6.5, 8.0, 'sleep');
  assert.equal(result6.tier, 'almost');
  assert.equal(result6.colorName, 'lime');
  assert.equal(result6.isLocked, true);

  const result5 = calculateHealthProgress(5.0, 8.0, 'sleep');
  assert.equal(result5.tier, 'halfway');
  assert.equal(result5.colorName, 'yellow');
  assert.equal(result5.isLocked, true);
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
  assert.equal(formatHealthMetricValue(8.25, "sleep"), "8.3 hrs");
  assert.equal(formatHealthMetricValue(10500, "steps"), "10,500 steps");
  assert.equal(formatHealthMetricValue(45, "workout"), "45 min");
});
