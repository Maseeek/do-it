import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BADGE_DEFINITIONS, calculatePlayerBadges } from './badge-utils';
import { CheckIn, Habit, Stake } from './types';
import { INITIAL_HABITS } from './seed';
import { getTodayDateString } from './date-utils';

describe('Domain: Trophy Cabinet & Badges Engine', () => {
  const habits: Habit[] = INITIAL_HABITS;
  const today = getTodayDateString();

  it('defines exactly 12 calibrated achievement badges', () => {
    assert.strictEqual(BADGE_DEFINITIONS.length, 12);
    const ids = BADGE_DEFINITIONS.map((b) => b.id);
    assert.ok(ids.includes('first_checkin'));
    assert.ok(ids.includes('perfect_par'));
    assert.ok(ids.includes('streak_3'));
    assert.ok(ids.includes('streak_7'));
    assert.ok(ids.includes('streak_14'));
    assert.ok(ids.includes('reading_100'));
    assert.ok(ids.includes('clean_space_sentinel'));
    assert.ok(ids.includes('gym_par'));
    assert.ok(ids.includes('polyglot'));
    assert.ok(ids.includes('deep_worker'));
    assert.ok(ids.includes('iron_couple'));
    assert.ok(ids.includes('stake_champion'));
  });

  it('unlocks first_checkin on initial completion', () => {
    const checkIns: CheckIn[] = [
      { id: '1', habitId: 'maciek-sleep', playerId: 'maciek', date: today, pointsEarned: 50, completedAt: '' },
    ];

    const badges = calculatePlayerBadges('maciek', checkIns, habits, [], 1);
    const firstCheckinBadge = badges.find((b) => b.badge.id === 'first_checkin')!;
    assert.strictEqual(firstCheckinBadge.isUnlocked, true);
    assert.strictEqual(firstCheckinBadge.progress, 100);
  });

  it('unlocks perfect_par when single day score reaches or exceeds 240', () => {
    // Single day total = 240
    const checkIns: CheckIn[] = [
      { id: '1', habitId: 'maciek-sleep', playerId: 'maciek', date: today, pointsEarned: 50, completedAt: '' },
      { id: '2', habitId: 'maciek-gym', playerId: 'maciek', date: today, pointsEarned: 40, completedAt: '' },
      { id: '3', habitId: 'maciek-sport', playerId: 'maciek', date: today, pointsEarned: 30, completedAt: '' },
      { id: '4', habitId: 'maciek-reading', playerId: 'maciek', date: today, pointsEarned: 25, completedAt: '' },
      { id: '5', habitId: 'maciek-deepwork', playerId: 'maciek', date: today, pointsEarned: 25, completedAt: '' },
      { id: '6', habitId: 'maciek-clean', playerId: 'maciek', date: today, pointsEarned: 20, completedAt: '' },
      { id: '7', habitId: 'maciek-mind', playerId: 'maciek', date: today, pointsEarned: 20, completedAt: '' },
      { id: '8', habitId: 'maciek-nutrition', playerId: 'maciek', date: today, pointsEarned: 15, completedAt: '' },
      { id: '9', habitId: 'maciek-craft', playerId: 'maciek', date: today, pointsEarned: 10, completedAt: '' },
      { id: '10', habitId: 'maciek-swedish', playerId: 'maciek', date: today, pointsEarned: 5, completedAt: '' },
    ];

    const badges = calculatePlayerBadges('maciek', checkIns, habits, [], 1);
    const perfectPar = badges.find((b) => b.badge.id === 'perfect_par')!;
    assert.strictEqual(perfectPar.isUnlocked, true);
    assert.strictEqual(perfectPar.progress, 100);
  });

  it('unlocks reading_100 when cumulative reading reaches 100 pages', () => {
    const readingHabit = habits.find((h) => h.id === 'maciek-reading')!;
    assert.ok(readingHabit.isQuantitative);

    const checkIns: CheckIn[] = [
      { id: '1', habitId: 'maciek-reading', playerId: 'maciek', date: '2026-09-01', pointsEarned: 25, quantity: 25, completedAt: '' },
      { id: '2', habitId: 'maciek-reading', playerId: 'maciek', date: '2026-09-02', pointsEarned: 25, quantity: 25, completedAt: '' },
      { id: '3', habitId: 'maciek-reading', playerId: 'maciek', date: '2026-09-03', pointsEarned: 25, quantity: 25, completedAt: '' },
      { id: '4', habitId: 'maciek-reading', playerId: 'maciek', date: '2026-09-04', pointsEarned: 25, quantity: 25, completedAt: '' },
    ];

    const badges = calculatePlayerBadges('maciek', checkIns, habits, [], 1);
    const readingBadge = badges.find((b) => b.badge.id === 'reading_100')!;
    assert.strictEqual(readingBadge.isUnlocked, true);
    assert.strictEqual(readingBadge.currentValue, 100);
  });

  it('unlocks clean_space_sentinel only when 5 check-ins contain proof (single or multi)', () => {
    const checkIns: CheckIn[] = [
      { id: '1', habitId: 'maciek-clean', playerId: 'maciek', date: '2026-09-01', pointsEarned: 20, proofUrl: 'https://img.com/1.jpg', completedAt: '' },
      { id: '2', habitId: 'maciek-clean', playerId: 'maciek', date: '2026-09-02', pointsEarned: 20, proofUrls: ['https://img.com/2.jpg'], completedAt: '' },
      { id: '3', habitId: 'maciek-clean', playerId: 'maciek', date: '2026-09-03', pointsEarned: 20, proofUrl: 'https://img.com/3.jpg', completedAt: '' },
      { id: '4', habitId: 'maciek-clean', playerId: 'maciek', date: '2026-09-04', pointsEarned: 20, proofUrls: ['https://img.com/4a.jpg', 'https://img.com/4b.jpg'], completedAt: '' },
      { id: '5', habitId: 'maciek-clean', playerId: 'maciek', date: '2026-09-05', pointsEarned: 20, proofUrl: 'https://img.com/5.jpg', completedAt: '' },
    ];

    const badges = calculatePlayerBadges('maciek', checkIns, habits, [], 1);
    const cleanBadge = badges.find((b) => b.badge.id === 'clean_space_sentinel')!;
    assert.strictEqual(cleanBadge.isUnlocked, true);
    assert.strictEqual(cleanBadge.currentValue, 5);
  });

  it('unlocks gym_par when hitting 4 gym workouts in the same ISO calendar week', () => {
    // 2026-09-28 (Mon) to 2026-10-01 (Thu) are in 2026-W40
    const checkIns: CheckIn[] = [
      { id: '1', habitId: 'maciek-gym', playerId: 'maciek', date: '2026-09-28', pointsEarned: 40, completedAt: '' },
      { id: '2', habitId: 'maciek-gym', playerId: 'maciek', date: '2026-09-29', pointsEarned: 40, completedAt: '' },
      { id: '3', habitId: 'maciek-gym', playerId: 'maciek', date: '2026-09-30', pointsEarned: 40, completedAt: '' },
      { id: '4', habitId: 'maciek-gym', playerId: 'maciek', date: '2026-10-01', pointsEarned: 40, completedAt: '' },
    ];

    const badges = calculatePlayerBadges('maciek', checkIns, habits, [], 1);
    const gymBadge = badges.find((b) => b.badge.id === 'gym_par')!;
    assert.strictEqual(gymBadge.isUnlocked, true);
    assert.strictEqual(gymBadge.currentValue, 4);
  });

  it('unlocks iron_couple only when both Maciek and Myrna score 240 Par on the SAME day', () => {
    const duelDate = '2026-09-20';

    // Maciek scores 240
    const maciekLogs: CheckIn[] = [
      { id: 'm1', habitId: 'maciek-sleep', playerId: 'maciek', date: duelDate, pointsEarned: 50, completedAt: '' },
      { id: 'm2', habitId: 'maciek-gym', playerId: 'maciek', date: duelDate, pointsEarned: 40, completedAt: '' },
      { id: 'm3', habitId: 'maciek-sport', playerId: 'maciek', date: duelDate, pointsEarned: 30, completedAt: '' },
      { id: 'm4', habitId: 'maciek-reading', playerId: 'maciek', date: duelDate, pointsEarned: 25, completedAt: '' },
      { id: 'm5', habitId: 'maciek-deepwork', playerId: 'maciek', date: duelDate, pointsEarned: 25, completedAt: '' },
      { id: 'm6', habitId: 'maciek-clean', playerId: 'maciek', date: duelDate, pointsEarned: 20, completedAt: '' },
      { id: 'm7', habitId: 'maciek-mind', playerId: 'maciek', date: duelDate, pointsEarned: 20, completedAt: '' },
      { id: 'm8', habitId: 'maciek-nutrition', playerId: 'maciek', date: duelDate, pointsEarned: 15, completedAt: '' },
      { id: 'm9', habitId: 'maciek-craft', playerId: 'maciek', date: duelDate, pointsEarned: 10, completedAt: '' },
      { id: 'm10', habitId: 'maciek-swedish', playerId: 'maciek', date: duelDate, pointsEarned: 5, completedAt: '' },
    ];

    // Myrna scores 240 on same day
    const myrnaLogs: CheckIn[] = [
      { id: 'y1', habitId: 'myrna-sleep', playerId: 'myrna', date: duelDate, pointsEarned: 50, completedAt: '' },
      { id: 'y2', habitId: 'myrna-pilates', playerId: 'myrna', date: duelDate, pointsEarned: 40, completedAt: '' },
      { id: 'y3', habitId: 'myrna-walk', playerId: 'myrna', date: duelDate, pointsEarned: 30, completedAt: '' },
      { id: 'y4', habitId: 'myrna-reading', playerId: 'myrna', date: duelDate, pointsEarned: 25, completedAt: '' },
      { id: 'y5', habitId: 'myrna-project', playerId: 'myrna', date: duelDate, pointsEarned: 25, completedAt: '' },
      { id: 'y6', habitId: 'myrna-clean', playerId: 'myrna', date: duelDate, pointsEarned: 20, completedAt: '' },
      { id: 'y7', habitId: 'myrna-skincare', playerId: 'myrna', date: duelDate, pointsEarned: 20, completedAt: '' },
      { id: 'y8', habitId: 'myrna-hydration', playerId: 'myrna', date: duelDate, pointsEarned: 15, completedAt: '' },
      { id: 'y9', habitId: 'myrna-outdoor', playerId: 'myrna', date: duelDate, pointsEarned: 10, completedAt: '' },
      { id: 'y10', habitId: 'myrna-language', playerId: 'myrna', date: duelDate, pointsEarned: 5, completedAt: '' },
    ];

    const badges = calculatePlayerBadges('maciek', [...maciekLogs, ...myrnaLogs], habits, [], 1);
    const ironCouple = badges.find((b) => b.badge.id === 'iron_couple')!;
    assert.strictEqual(ironCouple.isUnlocked, true);
  });

  it('unlocks stake_champion when player has won a completed stake', () => {
    const stakes: Stake[] = [
      {
        id: 'st-1',
        period: 'weekly',
        periodKey: '2026-W38',
        title: 'Sunday Dinner',
        description: '',
        status: 'completed',
        winnerId: 'maciek',
        dueDate: '2026-09-20',
      },
    ];

    const badges = calculatePlayerBadges('maciek', [], habits, stakes, 1);
    const stakeBadge = badges.find((b) => b.badge.id === 'stake_champion')!;
    assert.strictEqual(stakeBadge.isUnlocked, true);
    assert.strictEqual(stakeBadge.currentValue, 1);
  });
});
