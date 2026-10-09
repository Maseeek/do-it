import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getHeatmapCalendarWeeks, getWeekKey, isValidDateString } from './date-utils';
import { calculatePlayerBadges } from './badge-utils';
import { getInitialState } from './seed';
import { prepareQuickCheckIn } from './quick-checkin';
import { parseBackup } from './backup';

test('ISO week belongs to the Thursday year, including New Year boundaries', () => {
  assert.equal(getWeekKey('2021-01-01'), '2020-W53');
  assert.equal(getWeekKey('2024-12-30'), '2025-W01');
  assert.equal(getWeekKey('2026-09-28'), '2026-W40');
  assert.equal(isValidDateString('2026-02-30'), false);
});

test('GitHub calendar weeks align Monday through Sunday with month headers and future flags', () => {
  const weeks = getHeatmapCalendarWeeks(12, '2026-10-05'); // Monday Oct 5, 2026
  assert.equal(weeks.length, 12);
  for (const week of weeks) {
    assert.equal(week.days.length, 7);
    assert.equal(week.days[0].dayOfWeek, 0);
    assert.equal(week.days[6].dayOfWeek, 6);
  }
  const currentWeek = weeks[weeks.length - 1];
  assert.equal(currentWeek.days[0].dateStr, '2026-10-05');
  assert.equal(currentWeek.days[0].isToday, true);
  assert.equal(currentWeek.days[0].isFuture, false);
  assert.equal(currentWeek.days[1].dateStr, '2026-10-06');
  assert.equal(currentWeek.days[1].isFuture, true);
  assert.equal(currentWeek.days[6].dateStr, '2026-10-11');
  assert.equal(currentWeek.days[6].isFuture, true);

  const octFirstWeek = weeks.find((w) => w.days.some((d) => d.dateStr === '2026-10-01'));
  assert.ok(octFirstWeek);
  assert.equal(octFirstWeek.monthLabel, 'Oct');
});
test('daily par badge displays partial progress until 240 points', () => {
  const state = getInitialState();
  const badges = calculatePlayerBadges('maciek', [{ id: 'test', habitId: 'maciek-sleep', playerId: 'maciek', date: '2026-09-28', pointsEarned: 120, completedAt: new Date().toISOString() }], state.habits, [], 1);
  const par = badges.find((b) => b.badge.id === 'perfect_par')!;
  assert.equal(par.progress, 50);
  assert.equal(par.isUnlocked, false);
});
test('quick links respect ownership, required proof, quantities and existing check-ins', () => {
  const s = getInitialState();
  assert.ok(prepareQuickCheckIn('maciek-sleep', 'maciek', s.habits, [], '2026-09-28').habit);
  assert.equal(prepareQuickCheckIn('maciek-sleep', 'myrna', s.habits, [], '2026-09-28').habit, undefined);
  assert.equal(prepareQuickCheckIn('maciek-reading', 'maciek', s.habits, [], '2026-09-28').habit, undefined);
  const proofHabit = s.habits.find((h) => h.requiresProof && h.playerId === 'maciek')!;
  assert.equal(prepareQuickCheckIn(proofHabit.id, 'maciek', s.habits, [], '2026-09-28').habit, undefined);
  const logs = [{ id: 'test', habitId: 'maciek-sleep', playerId: 'maciek' as const, date: '2026-09-28', pointsEarned: 50, completedAt: new Date().toISOString() }];
  assert.equal(prepareQuickCheckIn('maciek-sleep', 'maciek', s.habits, logs, '2026-09-28').habit, undefined);
});
test('backup round trip accepts progress and rejects malformed or mismatched data', () => {
  const s = getInitialState();
  assert.equal(parseBackup(JSON.stringify(s)).habits.length, s.habits.length);
  assert.throws(() => parseBackup('{"players":{},"habits":{},"checkIns":[]}'));
  assert.throws(() => parseBackup(JSON.stringify({ ...s, checkIns: [{ id: 'bad', habitId: 'maciek-sleep', playerId: 'myrna', date: '2026-09-28', pointsEarned: 50, completedAt: new Date().toISOString() }] })));
  assert.throws(() => parseBackup(JSON.stringify({ ...s, habits: [...s.habits, s.habits[0]] })));
});
