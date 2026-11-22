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
