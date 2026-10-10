import type { CheckIn } from './types';
import { getWeekKey } from './date-utils';

export function indexCheckIns(checkIns: CheckIn[]) {
  const byHabitAndDate = new Map<string, Map<string, CheckIn>>();
  const weeklyDates = new Map<string, Map<string, Set<string>>>();
  const weekKeys = new Map<string, string>();
  for (const checkIn of checkIns) {
    let dates = byHabitAndDate.get(checkIn.habitId);
    if (!dates) {
      dates = new Map();
      byHabitAndDate.set(checkIn.habitId, dates);
    }
    // Match Array.find when legacy history contains duplicate dates.
    if (!dates.has(checkIn.date)) dates.set(checkIn.date, checkIn);

    let weekKey = weekKeys.get(checkIn.date);
    if (!weekKey) {
      weekKey = getWeekKey(checkIn.date);
      weekKeys.set(checkIn.date, weekKey);
    }
    let weeks = weeklyDates.get(checkIn.habitId);
    if (!weeks) {
      weeks = new Map();
      weeklyDates.set(checkIn.habitId, weeks);
    }
    let completedDates = weeks.get(weekKey);
    if (!completedDates) {
      completedDates = new Set();
      weeks.set(weekKey, completedDates);
    }
    completedDates.add(checkIn.date);
  }
  return { byHabitAndDate, weeklyDates };
}
