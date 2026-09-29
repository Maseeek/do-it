import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_HABITS } from './seed';
import type { CheckIn } from './types';
import { canImportLegacyDatabase, needsLegacyReplacement, planLegacyReplacement, prepareLegacyImport } from './legacy-import';
import { catalogHabits } from './habit-catalog';

const oldHabit = INITIAL_HABITS.find(habit => habit.id === 'maciek-sleep')!;
const extraHabit = { ...INITIAL_HABITS.find(habit => habit.id === 'maciek-gym')!, id: 'old-extra' };
const oldCheckIns: CheckIn[] = [
  { id: 'old-1', habitId: oldHabit.id, playerId: 'maciek', date: '2026-01-01', pointsEarned: 50, completedAt: '2026-01-01T10:00:00Z' },
  { id: 'old-2', habitId: extraHabit.id, playerId: 'maciek', date: '2026-01-02', pointsEarned: 40, completedAt: '2026-01-02T10:00:00Z', proofUrl: 'saved-proof' },
];

test('previous database import is offered only to the matching account', () => {
  assert.equal(canImportLegacyDatabase('maciek', 'MaciekGeneja@gmail.com'), true);
  assert.equal(canImportLegacyDatabase('maciek', 'maciekgania@gmail.com'), false);
  assert.equal(canImportLegacyDatabase('maciek', 'someone@example.com'), false);
  assert.equal(canImportLegacyDatabase('myrna', 'MyrnaMarsh@icloud.com'), true);
  assert.equal(canImportLegacyDatabase('myrna', 'someone@example.com'), false);
});

test('merges missing history without replacing edited habits or existing check-ins', () => {
  const editedHabit = { ...oldHabit, title: 'My edited sleep habit', points: 35 };
  const currentCheckIn = { ...oldCheckIns[0], id: 'new-1', pointsEarned: 35 };
  const first = prepareLegacyImport('maciek', [oldHabit, extraHabit], oldCheckIns, [editedHabit], [currentCheckIn]);
  assert.equal(first.missingHabits.length, 1);
  assert.equal(first.missingHabits[0].id, 'old-extra');
  assert.equal(first.missingHabits[0].isActive, false);
  assert.equal(first.missingCheckIns.length, 1);
  assert.equal(first.missingCheckIns[0].pointsEarned, 40);
  assert.equal(first.missingCheckIns[0].proofUrl, 'saved-proof');
  const again = prepareLegacyImport('maciek', [oldHabit, extraHabit], oldCheckIns, [editedHabit, ...first.missingHabits], [currentCheckIn, ...first.missingCheckIns]);
  assert.deepEqual(again, { missingHabits: [], missingCheckIns: [], duplicatesConsolidated: 0 });
});

test('keeps proof when historical check-ins repeat on the same habit and date', () => {
  const duplicate = { ...oldCheckIns[0], id: 'old-1b', proofUrl: 'photo', proofUrls: ['photo'] };
  const result = prepareLegacyImport('maciek', [oldHabit], [oldCheckIns[0], duplicate], [], []);
  assert.equal(result.duplicatesConsolidated, 1);
  assert.equal(result.missingCheckIns.length, 1);
  assert.equal(result.missingCheckIns[0].proofUrl, 'photo');
});

test('replaces the catalog plan with restored habits without losing historical check-ins', () => {
  const previous = INITIAL_HABITS.filter(habit => habit.playerId === 'maciek');
  const catalog = catalogHabits('maciek').map((habit, index) => ({ ...habit, isActive: index === 0 }));
  const imported = previous.map(habit => ({ ...habit, isActive: false }));
  const sourceCheckIn = { id: 'old-check', habitId: previous[0].id, playerId: 'maciek' as const, date: '2026-09-22', pointsEarned: 50, completedAt: '2026-09-22T10:00:00Z' };
  const result = planLegacyReplacement('maciek', previous, [sourceCheckIn], [...catalog, ...imported], [sourceCheckIn]);
  assert.equal(result.habitsToSave.filter(habit => habit.isActive).length, previous.length);
  assert.equal(result.habitsToSave.filter(habit => habit.isArchived).length, catalog.length);
  assert.equal(result.missingCheckIns.length, 0);
  assert.ok(result.habitsToSave.filter(habit => habit.isActive).every(habit => !habit.id.startsWith('catalog-')));
  assert.equal(needsLegacyReplacement('maciek', [...catalog, ...imported]), true);
  assert.equal(needsLegacyReplacement('maciek', result.habitsToSave), false);
});

test('keeps a replaced catalog habit paused when it has a check-in', () => {
  const previous = INITIAL_HABITS.filter(habit => habit.playerId === 'maciek');
  const catalog = { ...catalogHabits('maciek')[0], isActive: true };
  const recentCheckIn = { id: 'recent-check', habitId: catalog.id, playerId: 'maciek' as const, date: '2026-09-29', pointsEarned: 20, completedAt: '2026-09-29T10:00:00Z' };
  const result = planLegacyReplacement('maciek', previous, [], [catalog], [recentCheckIn]);
  assert.equal(result.habitsToSave.find(habit => habit.id === catalog.id)?.isArchived, true);
  assert.equal(result.habitsToSave.find(habit => habit.id === catalog.id)?.isActive, false);
});
