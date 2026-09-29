import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_HABITS } from './seed';
import type { CheckIn } from './types';
import { canImportLegacyDatabase, prepareLegacyImport } from './legacy-import';

const oldHabit = INITIAL_HABITS.find(habit => habit.id === 'maciek-sleep')!;
const extraHabit = { ...INITIAL_HABITS.find(habit => habit.id === 'maciek-gym')!, id: 'old-extra' };
const oldCheckIns: CheckIn[] = [
  { id: 'old-1', habitId: oldHabit.id, playerId: 'maciek', date: '2026-01-01', pointsEarned: 50, completedAt: '2026-01-01T10:00:00Z' },
  { id: 'old-2', habitId: extraHabit.id, playerId: 'maciek', date: '2026-01-02', pointsEarned: 40, completedAt: '2026-01-02T10:00:00Z', proofUrl: 'saved-proof' },
];

test('previous database import is offered only to the matching account', () => {
  assert.equal(canImportLegacyDatabase('maciek', 'MaciekGania@gmail.com', null), true);
  assert.equal(canImportLegacyDatabase('maciek', 'someone@example.com', null), false);
  assert.equal(canImportLegacyDatabase('myrna', undefined, 'Mina'), true);
  assert.equal(canImportLegacyDatabase('myrna', undefined, 'Another player'), false);
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
