import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHabitStreak,
  calculatePlayerScores,
  getCategoryBreakdown,
  getStakesRecord,
  getTierScore,
  getVersusComparison,
  getWeeklyDailyDuelPoints,
} from './score-calculator';
import { CheckIn, Habit, PlayerScoreSummary, Stake } from './types';
import { INITIAL_HABITS } from './seed';
import { addDays, getTodayDateString } from './date-utils';

describe('Domain: Score Calculator & Leaderboard Engine', () => {
  const today = getTodayDateString();
  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);

  const mockHabits: Habit[] = INITIAL_HABITS;

  describe('calculatePlayerScores', () => {
    it('calculates points across today, weekly, monthly, yearly, and lifetime karma', () => {
      const checkIns: CheckIn[] = [
        {
          id: 'c1',
          habitId: 'maciek-sleep',
          playerId: 'maciek',
          date: today,
          pointsEarned: 50,
          completedAt: new Date().toISOString(),
        },
        {
          id: 'c2',
          habitId: 'maciek-gym',
          playerId: 'maciek',
          date: yesterday,
          pointsEarned: 40,
          completedAt: new Date().toISOString(),
        },
        {
          id: 'c3',
          habitId: 'myrna-sleep',
          playerId: 'myrna',
          date: today,
          pointsEarned: 50,
          completedAt: new Date().toISOString(),
        },
      ];

      const maciekScore = calculatePlayerScores('maciek', checkIns, mockHabits);
      assert.strictEqual(maciekScore.today, 50);
      assert.strictEqual(maciekScore.karma, 90);
      assert.ok(maciekScore.weekly >= 50);
      assert.ok(maciekScore.monthly >= 50);
      assert.ok(maciekScore.yearly >= 50);

      const myrnaScore = calculatePlayerScores('myrna', checkIns, mockHabits);
      assert.strictEqual(myrnaScore.today, 50);
      assert.strictEqual(myrnaScore.karma, 50);
    });

    it('calculates weekly completion rate correctly', () => {
      const checkIns: CheckIn[] = [
        {
          id: 'c1',
          habitId: 'maciek-sleep',
          playerId: 'maciek',
          date: today,
          pointsEarned: 50,
          completedAt: new Date().toISOString(),
        },
      ];

      const summary = calculatePlayerScores('maciek', checkIns, mockHabits);
      assert.ok(summary.completionRateWeekly >= 0 && summary.completionRateWeekly <= 100);
    });
  });

  describe('getTierScore', () => {
    const summary: PlayerScoreSummary = {
      today: 100,
      weekly: 350,
      monthly: 1200,
      yearly: 5000,
      karma: 8500,
      currentStreak: 5,
      completionRateWeekly: 80,
      restDaysUsed: 1,
    };

    it('retrieves exact scores for each leaderboard tier', () => {
      assert.strictEqual(getTierScore(summary, 'weekly'), 350);
      assert.strictEqual(getTierScore(summary, 'monthly'), 1200);
      assert.strictEqual(getTierScore(summary, 'yearly'), 5000);
      assert.strictEqual(getTierScore(summary, 'karma'), 8500);
    });
  });

  describe('getVersusComparison (Tug-of-War Parity)', () => {
    const baseSummary: PlayerScoreSummary = {
      today: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0,
      karma: 0,
      currentStreak: 0,
      completionRateWeekly: 0,
      restDaysUsed: 0,
    };

    it('determines leader when Maciek is ahead', () => {
      const maciekSummary = { ...baseSummary, weekly: 200 };
      const myrnaSummary = { ...baseSummary, weekly: 100 };
      const comp = getVersusComparison(maciekSummary, myrnaSummary, 'weekly');
      assert.strictEqual(comp.leader, 'maciek');
      assert.strictEqual(comp.delta, 100);
      assert.strictEqual(comp.maciekPct, 67);
      assert.strictEqual(comp.myrnaPct, 33);
    });

    it('determines leader when Myrna is ahead', () => {
      const maciekSummary = { ...baseSummary, weekly: 100 };
      const myrnaSummary = { ...baseSummary, weekly: 300 };
      const comp = getVersusComparison(maciekSummary, myrnaSummary, 'weekly');
      assert.strictEqual(comp.leader, 'myrna');
      assert.strictEqual(comp.delta, 200);
      assert.strictEqual(comp.maciekPct, 25);
      assert.strictEqual(comp.myrnaPct, 75);
    });

    it('handles exact ties with 50/50 split and tie leader', () => {
      const maciekSummary = { ...baseSummary, weekly: 150 };
      const myrnaSummary = { ...baseSummary, weekly: 150 };
      const comp = getVersusComparison(maciekSummary, myrnaSummary, 'weekly');
      assert.strictEqual(comp.leader, 'tie');
      assert.strictEqual(comp.delta, 0);
      assert.strictEqual(comp.maciekPct, 50);
      assert.strictEqual(comp.myrnaPct, 50);
    });

    it('handles zero scores without division by zero', () => {
      const comp = getVersusComparison(baseSummary, baseSummary, 'weekly');
      assert.strictEqual(comp.leader, 'tie');
      assert.strictEqual(comp.maciekPct, 50);
      assert.strictEqual(comp.myrnaPct, 50);
    });
  });

  describe('getCategoryBreakdown', () => {
    it('compares points across all categories correctly', () => {
      const checkIns: CheckIn[] = [
        {
          id: 'c1',
          habitId: 'maciek-sleep', // foundation
          playerId: 'maciek',
          date: today,
          pointsEarned: 50,
          completedAt: new Date().toISOString(),
        },
        {
          id: 'c2',
          habitId: 'myrna-sleep', // foundation
          playerId: 'myrna',
          date: today,
          pointsEarned: 50,
          completedAt: new Date().toISOString(),
        },
        {
          id: 'c3',
          habitId: 'maciek-gym', // physical
          playerId: 'maciek',
          date: today,
          pointsEarned: 40,
          completedAt: new Date().toISOString(),
        },
      ];

      const breakdown = getCategoryBreakdown(checkIns, mockHabits, 'weekly');
      assert.strictEqual(breakdown.length, 11);

      const foundation = breakdown.find((b) => b.category === 'foundation');
      assert.ok(foundation);
      assert.strictEqual(foundation.maciekPoints, 50);
      assert.strictEqual(foundation.myrnaPoints, 50);
      assert.strictEqual(foundation.leader, 'tie');

      const physical = breakdown.find((b) => b.category === 'physical');
      assert.ok(physical);
      assert.strictEqual(physical.maciekPoints, 40);
      assert.strictEqual(physical.myrnaPoints, 0);
      assert.strictEqual(physical.leader, 'maciek');
    });
  });

  describe('getWeeklyDailyDuelPoints', () => {
    it('returns points for Monday through Sunday', () => {
      const checkIns: CheckIn[] = [
        {
          id: 'c1',
          habitId: 'maciek-sleep',
          playerId: 'maciek',
          date: today,
          pointsEarned: 50,
          completedAt: new Date().toISOString(),
        },
      ];

      const dailyPoints = getWeeklyDailyDuelPoints(checkIns);
      assert.strictEqual(dailyPoints.length, 7);

      const todayEntry = dailyPoints.find((d) => d.dateStr === today);
      assert.ok(todayEntry);
      assert.strictEqual(todayEntry.maciekPoints, 50);
      assert.strictEqual(todayEntry.myrnaPoints, 0);
    });
  });

  describe('calculateHabitStreak', () => {
    it('calculates consecutive completion days for an individual habit', () => {
      const sleepHabit = mockHabits.find((h) => h.id === 'maciek-sleep')!;
      const checkIns: CheckIn[] = [
        { id: '1', habitId: 'maciek-sleep', playerId: 'maciek', date: today, pointsEarned: 50, completedAt: '' },
        { id: '2', habitId: 'maciek-sleep', playerId: 'maciek', date: yesterday, pointsEarned: 50, completedAt: '' },
        { id: '3', habitId: 'maciek-sleep', playerId: 'maciek', date: twoDaysAgo, pointsEarned: 50, completedAt: '' },
      ];

      const streak = calculateHabitStreak(sleepHabit, checkIns);
      assert.strictEqual(streak, 3);
    });

    it('returns 0 when habit has no check-ins', () => {
      const sleepHabit = mockHabits.find((h) => h.id === 'maciek-sleep')!;
      const streak = calculateHabitStreak(sleepHabit, []);
      assert.strictEqual(streak, 0);
    });
  });

  describe('getStakesRecord', () => {
    it('tallies wins, ties, and completed counts accurately', () => {
      const stakes: Stake[] = [
        { id: 's1', period: 'weekly', periodKey: '2026-W36', title: 'A', description: '', status: 'completed', winnerId: 'maciek', dueDate: '2026-09-07' },
        { id: 's2', period: 'weekly', periodKey: '2026-W37', title: 'B', description: '', status: 'completed', winnerId: 'myrna', dueDate: '2026-09-14' },
        { id: 's3', period: 'weekly', periodKey: '2026-W38', title: 'C', description: '', status: 'completed', winnerId: 'tie', dueDate: '2026-09-21' },
        { id: 's4', period: 'weekly', periodKey: '2026-W39', title: 'D', description: '', status: 'active', dueDate: '2026-09-28' },
      ];

      const record = getStakesRecord(stakes);
      assert.strictEqual(record.maciekWins, 1);
      assert.strictEqual(record.myrnaWins, 1);
      assert.strictEqual(record.ties, 1);
      assert.strictEqual(record.totalCompleted, 3);
    });
  });
});
