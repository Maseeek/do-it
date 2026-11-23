import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHabitPlan, catalogHabits, isValidHabitPoints, STARTER_HABIT_TITLES } from './habit-catalog';
import type { Habit } from './types';

const catalog = catalogHabits('maciek');
const byTitle = (title: string) => catalog.find(habit => habit.title === title)!;

test('every first-run starter title exists in the catalog', () => {
  for (const title of STARTER_HABIT_TITLES) assert.ok(byTitle(title), `${title} is missing from the catalog`);
});

test('a new player sees the whole catalog as suggestions', () => {
  const { plan, catalogIds } = buildHabitPlan('maciek', []);
  assert.deepEqual(plan.map(habit => habit.id), catalog.map(habit => habit.id));
  assert.equal(catalogIds.size, catalog.length);
});

test('saved catalog picks replace their suggestion and custom habits follow', () => {
  const workout = { ...byTitle('Workout'), isActive: true, points: 40 };
  const custom: Habit = { ...workout, id: 'habit-custom', title: 'Climb', category: 'other' };
  const { plan, catalogIds } = buildHabitPlan('maciek', [custom, workout]);
  assert.equal(plan.length, catalog.length + 1);
  assert.equal(plan.find(habit => habit.id === workout.id)?.points, 40);
  assert.equal(plan.at(-1)?.id, 'habit-custom');
  assert.ok(catalogIds.has(workout.id));
  assert.ok(!catalogIds.has('habit-custom'));
});

test('a habit saved under an older catalog position is matched by title, not shown twice', () => {
  // Before "Sleep" and "Step goal" were inserted, "Move your body" sat at index 1.
  const moved = { ...byTitle('Move your body'), id: 'catalog-maciek-1', isActive: true };
  const { plan } = buildHabitPlan('maciek', [moved]);
  assert.equal(plan.filter(habit => habit.title === 'Move your body').length, 1);
  assert.equal(plan.filter(habit => habit.id === 'catalog-maciek-1').length, 1);
  const sleep = plan.find(habit => habit.title === 'Sleep 8.5 hours');
  assert.ok(sleep, 'the catalog entry whose id was taken is still offered');
  assert.notEqual(sleep.id, 'catalog-maciek-1');
  assert.equal(sleep.isActive, false);
  assert.equal(new Set(plan.map(habit => habit.id)).size, plan.length);
});

test('a catalog habit renamed in Settings keeps its slot', () => {
  const renamed = { ...byTitle('Workout'), title: 'Gym', isActive: true };
  const { plan } = buildHabitPlan('maciek', [renamed]);
  assert.equal(plan.length, catalog.length);
  assert.equal(plan.find(habit => habit.id === renamed.id)?.title, 'Gym');
});

test('points must be a whole number between 5 and the habit maximum', () => {
  const habit = byTitle('Workout');
  assert.equal(isValidHabitPoints({ ...habit, points: 5 }), true);
  assert.equal(isValidHabitPoints({ ...habit, points: 0 }), false);
  assert.equal(isValidHabitPoints({ ...habit, points: 12.5 }), false);
  assert.equal(isValidHabitPoints({ ...habit, points: 101 }), false);
  assert.equal(isValidHabitPoints({ ...habit, isQuantitative: true, maxQuantity: 20, pointsPerUnit: 1, points: 25 }), false);
});
