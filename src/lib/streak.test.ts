import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlayerScores } from './score-calculator';
import { CheckIn, RestDay } from './types';
import { INITIAL_HABITS } from './seed';
import { addDays, getTodayDateString } from './date-utils';

describe('Domain: Streak Engine & Rest-Day Protection Invariants', () => {
  const today = getTodayDateString();
  const dMinus1 = addDays(today, -1);
  const dMinus2 = addDays(today, -2);
  const dMinus3 = addDays(today, -3);
  const dMinus4 = addDays(today, -4);

  const habits = INITIAL_HABITS;

  it('calculates 3-day active streak when check-ins exist for today, yesterday, and 2 days ago', () => {
    const checkIns: CheckIn[] = [
      { id: '1', habitId: 'maciek-sleep', playerId: 'maciek', date: today, pointsEarned: 50, completedAt: '' },
      { id: '2', habitId: 'maciek-sleep', playerId: 'maciek', date: dMinus1, pointsEarned: 50, completedAt: '' },
      { id: '3', habitId: 'maciek-sleep', playerId: 'maciek', date: dMinus2, pointsEarned: 50, completedAt: '' },
    ];

    const scores = calculatePlayerScores('maciek', checkIns, habits);
    assert.strictEqual(scores.currentStreak, 3);
  });

  it('preserves active streak from yesterday when today is still in progress (not completed yet)', () => {
    const checkIns: CheckIn[] = [
      // Notice: NO check-in for today yet!
      { id: '1', habitId: 'maciek-sleep', playerId: 'maciek', date: dMinus1, pointsEarned: 50, completedAt: '' },
      { id: '2', habitId: 'maciek-sleep', playerId: 'maciek', date: dMinus2, pointsEarned: 50, completedAt: '' },
      { id: '3', habitId: 'maciek-sleep', playerId: 'maciek', date: dMinus3, pointsEarned: 50, completedAt: '' },
    ];

    const scores = calculatePlayerScores('maciek', checkIns, habits);
    // Streak is preserved at 3 because today is not over yet
    assert.strictEqual(scores.currentStreak, 3);
  });

  it('breaks streak when a non-rest day gap occurs between completions', () => {
    const checkIns: CheckIn[] = [
      { id: '1', habitId: 'maciek-sleep', playerId: 'maciek', date: today, pointsEarned: 50, completedAt: '' },
      // GAP on dMinus1
      { id: '2', habitId: 'maciek-sleep', playerId: 'maciek', date: dMinus2, pointsEarned: 50, completedAt: '' },
    ];

    const scores = calculatePlayerScores('maciek', checkIns, habits);
    assert.strictEqual(scores.currentStreak, 1);
  });

  it('PROTECTION INVARIANT: Scheduled RestDay bridges an active streak across rest periods without penalty', () => {
    const checkIns: CheckIn[] = [
      { id: '1', habitId: 'maciek-sleep', playerId: 'maciek', date: today, pointsEarned: 50, completedAt: '' },
      // dMinus1 was a scheduled Rest Day (no check-in logged)
      { id: '2', habitId: 'maciek-sleep', playerId: 'maciek', date: dMinus2, pointsEarned: 50, completedAt: '' },
      { id: '3', habitId: 'maciek-sleep', playerId: 'maciek', date: dMinus3, pointsEarned: 50, completedAt: '' },
    ];

    const restDays: RestDay[] = [
      {
        id: 'rd-1',
        playerId: 'maciek',
        date: dMinus1,
        reason: 'Scheduled Muscle Recovery & Rest',
        createdAt: new Date().toISOString(),
      },
    ];

    const scores = calculatePlayerScores('maciek', checkIns, habits, restDays);
    // Active check-in days = 3 (today, dMinus2, dMinus3). The Rest Day bridges them cleanly!
    assert.strictEqual(scores.currentStreak, 3);
    assert.strictEqual(scores.restDaysUsed, 1);
  });

  it('bridges multiple consecutive rest days cleanly', () => {
    const checkIns: CheckIn[] = [
      { id: '1', habitId: 'maciek-sleep', playerId: 'maciek', date: today, pointsEarned: 50, completedAt: '' },
      // dMinus1 and dMinus2 were weekend recovery rest days
      { id: '2', habitId: 'maciek-sleep', playerId: 'maciek', date: dMinus3, pointsEarned: 50, completedAt: '' },
      { id: '3', habitId: 'maciek-sleep', playerId: 'maciek', date: dMinus4, pointsEarned: 50, completedAt: '' },
    ];

    const restDays: RestDay[] = [
      { id: 'rd-1', playerId: 'maciek', date: dMinus1, reason: 'Rest 1', createdAt: '' },
      { id: 'rd-2', playerId: 'maciek', date: dMinus2, reason: 'Rest 2', createdAt: '' },
    ];

    const scores = calculatePlayerScores('maciek', checkIns, habits, restDays);
    assert.strictEqual(scores.currentStreak, 3);
    assert.strictEqual(scores.restDaysUsed, 2);
  });

  it('does not apply rest days of partner to current player', () => {
    const checkIns: CheckIn[] = [
      { id: '1', habitId: 'maciek-sleep', playerId: 'maciek', date: today, pointsEarned: 50, completedAt: '' },
      // gap on dMinus1
      { id: '2', habitId: 'maciek-sleep', playerId: 'maciek', date: dMinus2, pointsEarned: 50, completedAt: '' },
    ];

    // Rest day belongs to Myrna, not Maciek!
    const restDays: RestDay[] = [
      { id: 'rd-1', playerId: 'myrna', date: dMinus1, reason: 'Myrna Rest', createdAt: '' },
    ];

    const scores = calculatePlayerScores('maciek', checkIns, habits, restDays);
    // Maciek streak broke at today (1) because rest day was not his
    assert.strictEqual(scores.currentStreak, 1);
    assert.strictEqual(scores.restDaysUsed, 0);
  });

  it('returns streak of 0 when no check-ins exist', () => {
    const scores = calculatePlayerScores('maciek', [], habits);
    assert.strictEqual(scores.currentStreak, 0);
  });
});
