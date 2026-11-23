import assert from 'node:assert/strict';
import test from 'node:test';
import { balanceHabitPlan, catalogHabits, pointsToCloseGap, categoryForSection, HABIT_SECTIONS, habitSectionTitle, weeklyPointPotential } from './habit-catalog';
import { INITIAL_HABITS } from './seed';

test('general catalog starts unselected and covers every onboarding section', () => {
  const catalog = catalogHabits('maciek');
  assert.ok(catalog.every(habit => !habit.isActive));
  assert.ok(HABIT_SECTIONS.filter(section => section.title !== 'Other').every(section => catalog.some(habit => section.categories.includes(habit.category))));
  assert.ok(catalog.every(habit => !INITIAL_HABITS.some(saved => saved.id === habit.id)));
});

test('different habit frequencies can be balanced to one weekly potential', () => {
  const [daily, weekly] = catalogHabits('myrna');
  const plan = [
    { ...daily, points: 20, isActive: true },
    { ...weekly, points: 30, frequency: 'weekly' as const, weeklyTargetDays: 2, isActive: true },
  ];
  const balanced = balanceHabitPlan(plan, 350);
  assert.ok(balanced);
  assert.equal(weeklyPointPotential(balanced), 350);
  assert.ok(balanced.every(habit => habit.points >= 5 && habit.points <= 100));
  assert.equal(weeklyPointPotential(plan), 200);
});

test('impossible targets leave the plan untouched', () => {
  const plan = [{ ...catalogHabits('maciek')[0], isActive: true }];
  assert.equal(balanceHabitPlan(plan, 101), null);
  assert.equal(plan[0].points, 25);
});

test('category dropdown maps sections to stored categories', () => {
  assert.deepEqual(HABIT_SECTIONS.map(section => section.title), ['Health', 'Education', 'Studying', 'Self-improvement', 'Finance', 'Other']);
  assert.equal(habitSectionTitle('deep_work'), 'Studying');
  assert.equal(habitSectionTitle('other'), 'Other');
  assert.equal(categoryForSection('Health', 'cardio'), 'cardio');
  assert.equal(categoryForSection('Health', 'finance'), 'foundation');
  assert.equal(categoryForSection('Other', 'skills'), 'other');
});

test('a single habit closes the gap only when it divides into its sessions', () => {
  const [daily, weekly] = catalogHabits('maciek');
  const dailyHabit = { ...daily, points: 20, isActive: true };
  const weeklyHabit = { ...weekly, points: 30, frequency: 'weekly' as const, weeklyTargetDays: 3, isActive: true };
  assert.equal(pointsToCloseGap(dailyHabit, 35), 25);
  assert.equal(pointsToCloseGap(dailyHabit, -70), 10);
  assert.equal(pointsToCloseGap(dailyHabit, 6), null);
  assert.equal(pointsToCloseGap(weeklyHabit, 6), 32);
  assert.equal(pointsToCloseGap(dailyHabit, -105), 5);
  assert.equal(pointsToCloseGap(dailyHabit, -112), null);
  assert.equal(pointsToCloseGap(dailyHabit, 0), null);
  assert.equal(pointsToCloseGap({ ...dailyHabit, isActive: false }, 35), null);
});
