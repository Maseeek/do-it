import assert from 'node:assert/strict';
import test from 'node:test';
import { sleepHours, workouts } from './health-data';

test('reads nested reconciled sleep summaries and stage fallback', () => {
  assert.equal(sleepHours([{ sleep: { summary: { minutesAsleep: '480' } } }]), 8);
  assert.equal(sleepHours([{ sleep: { stages: [
    { type: 'AWAKE', startTime: '2026-09-28T22:00:00Z', endTime: '2026-09-28T22:30:00Z' },
    { type: 'DEEP', startTime: '2026-09-28T22:30:00Z', endTime: '2026-09-29T00:30:00Z' },
  ] } }]), 2);
  assert.equal(sleepHours([{ sleep: { interval: { startTime: '2026-09-28T22:00:00Z', endTime: '2026-09-29T06:00:00Z' } } }]), 0);
});

test('uses active workout duration and separates strength from cardio', () => {
  assert.deepEqual(workouts([{ exercise: { exerciseType: 'STRENGTH_TRAINING', displayName: 'Hevy workout', activeDuration: '1800s' } }, { exercise: { exerciseType: 'RUNNING', displayName: 'Morning run', activeDuration: '1200s' } }]), [
    { metric: 'workout', minutes: 30, label: 'Hevy workout' },
    { metric: 'cardio', minutes: 20, label: 'Morning run' },
  ]);
});
