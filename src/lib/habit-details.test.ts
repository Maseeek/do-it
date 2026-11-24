import assert from 'node:assert/strict';
import test from 'node:test';
import { applyHabitDetails, habitDetails, habitDetailsChanged } from './habit-details';
import type { Habit } from './types';

const habit: Habit = {
  id: 'habit-1', playerId: 'maciek', title: 'Read', description: 'Books', category: 'intellect',
  points: 20, iconName: 'BookOpen', order: 1, isActive: true, frequency: 'weekly', weeklyTargetDays: 4,
};

test('editing details keeps the habit id, points and schedule', () => {
  const edited = applyHabitDetails(habit, { ...habitDetails(habit), title: '  Read fiction ', description: ' 20 pages ', iconName: 'Sparkles' });
  assert.equal(edited.id, habit.id);
  assert.equal(edited.points, 20);
  assert.equal(edited.weeklyTargetDays, 4);
  assert.equal(edited.title, 'Read fiction');
  assert.equal(edited.description, '20 pages');
  assert.equal(edited.iconName, 'Sparkles');
});

test('rejects an empty name and ignores unknown icons', () => {
  assert.throws(() => applyHabitDetails(habit, { ...habitDetails(habit), title: '   ' }));
  assert.equal(applyHabitDetails(habit, { ...habitDetails(habit), iconName: 'Nope' }).iconName, 'BookOpen');
});

test('detects whether anything changed, ignoring surrounding whitespace', () => {
  assert.equal(habitDetailsChanged(habit, { ...habitDetails(habit), title: ' Read ' }), false);
  assert.equal(habitDetailsChanged(habit, { ...habitDetails(habit), requiresProof: true }), true);
});

test('editing a sleep habit updates its target sleep goal and default labels', () => {
  const sleepHabit: Habit = {
    id: 'catalog-maciek-1',
    playerId: 'maciek',
    title: 'Sleep 8.5 hours',
    description: 'Full points at 8.5 hours; partial points from 6.5 hours',
    category: 'foundation',
    points: 25,
    iconName: 'Moon',
    order: 1,
    isActive: true,
    automation: { metric: 'sleep', target: 8.5 },
  };
  const initial = habitDetails(sleepHabit);
  assert.equal(initial.sleepTarget, 8.5);
  assert.equal(habitDetailsChanged(sleepHabit, initial), false);
  assert.equal(habitDetailsChanged(sleepHabit, { ...initial, sleepTarget: 7.5 }), true);

  const updated = applyHabitDetails(sleepHabit, { ...initial, sleepTarget: 7.5 });
  assert.equal(updated.automation?.target, 7.5);
  assert.equal(updated.title, 'Sleep 7.5 hours');
  assert.equal(updated.description, 'Full points at 7.5 hours; partial points from 5.5 hours');
});
