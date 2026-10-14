import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculatePlayerBadges } from './badge-utils';
import { indexCheckIns } from './check-in-index';
import { addDays } from './date-utils';
import { calculateHabitStreak, calculateWeeklyHabitStreak, getWeeklyDailyDuelPoints } from './score-calculator';
import { getInitialState } from './seed';
import type { CheckIn, Habit, RestDay } from './types';

const state = getInitialState();
function habit(id: string): Habit {
  const found = state.habits.find(item => item.id === id);
  assert.ok(found);
  return found;
}
function log(item: Habit, date: string, extra: Partial<CheckIn> = {}): CheckIn {
  return { id: `${item.id}-${date}`, habitId: item.id, playerId: item.playerId, date,
    pointsEarned: item.points, completedAt: `${date}T12:00:00Z`, ...extra };
}

test('badges retain duplicate records, zero-quantity fallback, proofs and multiple physical habits', () => {
  const reading = habit('maciek-reading');
  const clean = habit('maciek-clean');
  const gym = habit('maciek-gym');
  const secondGym = { ...gym, id: 'second-gym' };
  const date = '2025-12-29';
  const checks = [
    log(reading, date, { id: 'read-zero', quantity: 0 }),
    log(reading, date, { id: 'read-quantity', quantity: 15 }),
    log(clean, date, { id: 'proof-single', proofUrl: 'photo' }),
    log(clean, date, { id: 'proof-empty', proofUrls: [] }),
    log(clean, date, { id: 'proof-multiple', proofUrls: ['one', 'two'] }),
    log(gym, date, { id: 'gym-1' }), log(gym, date, { id: 'gym-2' }),
    log(gym, date, { id: 'gym-3' }), log(secondGym, date),
    log(habit('maciek-language'), date),
    log(habit('myrna-gym'), date, { pointsEarned: 240 }),
  ];
  const badges = calculatePlayerBadges('maciek', checks, [...state.habits, secondGym], [], 5);
  const value = (id: string) => badges.find(item => item.badge.id === id)?.currentValue;
  assert.equal(value('first_checkin'), 10);
  assert.equal(value('reading_100'), 40);
  assert.equal(value('clean_space_sentinel'), 2);
  assert.equal(value('gym_par'), 4);
  assert.equal(value('polyglot'), 1);
  assert.equal(value('perfect_par'), 260);
  assert.equal(value('iron_couple'), 1);
});

test('metadata-only proofs preserve badge values before photos are loaded', () => {
  const clean = habit('maciek-clean');
  const photos = Array.from({ length: 5 }, (_, index) =>
    log(clean, addDays('2026-10-14', -index), { proofUrls: ['photo'] }));
  const metadata = photos.map(({ proofUrls, ...checkIn }) => ({
    ...checkIn, proofCount: proofUrls?.length ?? 0,
  }));
  const expected = calculatePlayerBadges('maciek', photos, state.habits, [], 5);
  const actual = calculatePlayerBadges('maciek', metadata, state.habits, [], 5);
  assert.deepEqual(actual, expected);
  assert.equal(actual.find(item => item.badge.id === 'clean_space_sentinel')?.isUnlocked, true);
});

test('weekly Duel points include duplicate records and both sides of the civil New Year', () => {
  const owner = habit('maciek-gym');
  const guest = habit('myrna-gym');
  const checks = [log(owner, '2025-12-29', { pointsEarned: 50 }),
    log(owner, '2025-12-29', { id: 'duplicate', pointsEarned: 20 }),
    log(guest, '2025-12-29'), log(owner, '2026-01-01', { pointsEarned: 100 }),
    log(owner, '2026-01-04', { pointsEarned: 15 }),
    log(owner, '2025-12-28', { pointsEarned: 999 }), log(owner, '2026-01-05', { pointsEarned: 999 })];
  const days = getWeeklyDailyDuelPoints(checks, '2026-01-01');
  assert.deepEqual(days.map(day => day.maciekPoints), [70, 0, 0, 100, 0, 0, 15]);
  assert.deepEqual(days.map(day => day.myrnaPoints), [40, 0, 0, 0, 0, 0, 0]);
  assert.equal(days[3].dateStr, '2026-01-01');
});

test('indexed daily streaks bridge only the Player rest day over a DST civil boundary', () => {
  const item = habit('maciek-reading');
  const checks = ['2026-10-25', '2026-10-24', '2026-10-22', '2026-10-21'].map(date => log(item, date));
  checks.push(log(item, '2026-10-22', { id: 'duplicate' }));
  const rest: RestDay = { id: 'rest', playerId: 'maciek', date: '2026-10-23', createdAt: '' };
  const indexed = indexCheckIns(checks);
  assert.equal(calculateHabitStreak(item, checks, [rest], '2026-10-25'), 4);
  assert.equal(calculateHabitStreak(item, checks, [rest], '2026-10-25', indexed), 4);
  assert.equal(calculateHabitStreak(item, checks, [{ ...rest, playerId: 'myrna' }], '2026-10-25', indexed), 2);
  assert.equal(calculateHabitStreak(item, [], [rest], '2026-10-25', indexCheckIns([])), 0);
});

test('daily streaks retain the 365-calendar-day cap when indexed', () => {
  const item = habit('maciek-reading');
  const checks = Array.from({ length: 730 }, (_, day) => log(item, addDays('2026-10-12', -day)));
  const indexed = indexCheckIns(checks);
  assert.equal(calculateHabitStreak(item, checks, [], '2026-10-12'), 365);
  assert.equal(calculateHabitStreak(item, checks, [], '2026-10-12', indexed), 365);
});

test('weekly streaks retain 52 prior weeks and distinguish partial, completed and duplicate-only weeks', () => {
  const item = habit('maciek-gym');
  const today = '2026-10-14';
  const checks: CheckIn[] = [];
  for (let week = 1; week <= 60; week++) {
    for (let day = 0; day < 4; day++) checks.push(log(item, addDays('2026-10-12', -7 * week + day)));
  }
  checks.push(log(item, '2026-10-12'));
  assert.equal(calculateWeeklyHabitStreak(item, checks, today, indexCheckIns(checks)), 52);
  for (let day = 1; day < 4; day++) checks.push(log(item, addDays('2026-10-12', day)));
  assert.equal(calculateWeeklyHabitStreak(item, checks, today), 53);
  assert.equal(calculateWeeklyHabitStreak(item, checks, today, indexCheckIns(checks)), 53);
  const duplicates = Array.from({ length: 4 }, (_, index) => log(item, '2026-10-12', { id: `duplicate-${index}` }));
  assert.equal(calculateWeeklyHabitStreak(item, duplicates, today, indexCheckIns(duplicates)), 0);
});
