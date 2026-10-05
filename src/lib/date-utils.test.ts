import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,

  formatFriendlyDate,
  formatTimeAgo,
  getCurrentWeekDays,
  getHeatmapDays,
  getISOWeek,
  getMonthKey,
  getTodayDateString,
  getWeekKey,
  getYearKey,
  isDateInCurrentMonth,
  isDateInCurrentWeek,
  isDateInCurrentYear,
  isFutureDate,
  parseDate,
} from './date-utils';

describe('Domain: Calendar & Date Manipulation Utilities', () => {
  it('returns today date string in YYYY-MM-DD format', () => {
    const todayStr = getTodayDateString();
    assert.match(todayStr, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('correctly calculates ISO week numbers across calendar boundaries', () => {
    // 2026-01-01 was a Thursday -> Week 1 of 2026
    const d1 = parseDate('2026-01-01');
    assert.strictEqual(getISOWeek(d1).week, 1);
    assert.strictEqual(getISOWeek(d1).year, 2026);

    // 2026-09-28 is a Monday -> Week 40 of 2026
    const d2 = parseDate('2026-09-28');
    assert.strictEqual(getISOWeek(d2).week, 40);
    assert.strictEqual(getISOWeek(d2).year, 2026);

    // End of year leap week edge cases
    // 2020 had 53 weeks (Dec 31, 2020 was Thursday)
    const d3 = parseDate('2020-12-31');
    assert.strictEqual(getISOWeek(d3).week, 53);
    assert.strictEqual(getISOWeek(d3).year, 2020);

    // Jan 1, 2021 was Friday -> still week 53 of 2020 in ISO calendar
    const d4 = parseDate('2021-01-01');
    assert.strictEqual(getISOWeek(d4).week, 53);
    assert.strictEqual(getISOWeek(d4).year, 2020);

    // Jan 4, 2021 was Monday -> Week 1 of 2021
    const d5 = parseDate('2021-01-04');
    assert.strictEqual(getISOWeek(d5).week, 1);
    assert.strictEqual(getISOWeek(d5).year, 2021);

    // Format week keys
    assert.strictEqual(getWeekKey('2026-09-28'), '2026-W40');
    assert.strictEqual(getWeekKey('2021-01-01'), '2020-W53');
  });

  it('generates consistent period keys', () => {
    assert.strictEqual(getMonthKey('2026-09-28'), '2026-09');
    assert.strictEqual(getYearKey('2026-09-28'), '2026');
  });

  it('verifies membership in current periods', () => {
    const today = getTodayDateString();
    assert.strictEqual(isDateInCurrentWeek(today), true);
    assert.strictEqual(isDateInCurrentMonth(today), true);
    assert.strictEqual(isDateInCurrentYear(today), true);

    // Past year
    assert.strictEqual(isDateInCurrentYear('2020-05-15'), false);
    assert.strictEqual(isDateInCurrentMonth('2020-05-15'), false);
    assert.strictEqual(isDateInCurrentWeek('2020-05-15'), false);
  });

  it('formats friendly labels: Today and Yesterday', () => {
    const today = getTodayDateString();
    const yesterday = addDays(today, -1);
    assert.strictEqual(formatFriendlyDate(today), 'Today');
    assert.strictEqual(formatFriendlyDate(yesterday), 'Yesterday');
  });

  it('handles date addition across month and year boundaries', () => {
    assert.strictEqual(addDays('2026-01-01', 1), '2026-01-02');
    assert.strictEqual(addDays('2026-01-01', -1), '2025-12-31');
    assert.strictEqual(addDays('2026-02-28', 1), '2026-03-01'); // Not leap year
  });

  it('detects future dates correctly', () => {
    const today = getTodayDateString();
    const future = addDays(today, 1);
    const past = addDays(today, -1);

    assert.strictEqual(isFutureDate(today), false);
    assert.strictEqual(isFutureDate(future), true);
    assert.strictEqual(isFutureDate(past), false);
  });

  it('generates exactly 7 days for current week starting on Monday and ending on Sunday', () => {
    const weekDays = getCurrentWeekDays();
    assert.strictEqual(weekDays.length, 7);
    const monday = parseDate(weekDays[0].dateStr);
    assert.strictEqual(monday.getDay(), 1);
  });

  it('generates heatmap array of requested length (default 84 days = 12 weeks)', () => {
    const heatmap = getHeatmapDays(84);
    assert.strictEqual(heatmap.length, 84);
    assert.strictEqual(heatmap[heatmap.length - 1].dateStr, getTodayDateString());
  });

  it('formats relative time ago strings', () => {
    const now = new Date();
    assert.strictEqual(formatTimeAgo(now.toISOString()), 'Just now');

    const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
    assert.strictEqual(formatTimeAgo(tenMinsAgo.toISOString()), '10m ago');

    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    assert.strictEqual(formatTimeAgo(twoHoursAgo.toISOString()), '2h ago');
  });
});
